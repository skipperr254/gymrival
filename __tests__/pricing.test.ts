/**
 * Unit tests for the paywall's price maths.
 *
 * Pure functions over our own `Plan` type — no billing SDK, no rendering. The
 * interesting cases are the ones where the answer must be "don't show a
 * number" rather than a wrong number: a mismatched currency would invent a
 * discount out of a storefront difference, and a missing amount would show
 * "Save NaN%".
 */
import {
  savingsVsMonthly,
  pricePerMonth,
  preferredPlan,
} from "@/components/features/paywall/pricing";
import type { Plan } from "@/lib/billing/types";

function plan(over: Partial<Plan> & Pick<Plan, "id" | "period">): Plan {
  return {
    productId: over.id,
    title: over.id,
    description: null,
    priceString: "",
    priceAmountMicros: null,
    currencyCode: "EUR",
    trialDays: null,
    ...over,
  } as Plan;
}

// The real GymRival products: EUR 4.99/month and EUR 49.99/year.
const monthly = plan({
  id: "$rc_monthly",
  period: "monthly",
  priceAmountMicros: 4_990_000,
  priceString: "€4.99",
});
const yearly = plan({
  id: "$rc_annual",
  period: "yearly",
  priceAmountMicros: 49_990_000,
  priceString: "€49.99",
});

describe("savingsVsMonthly", () => {
  it("computes the real discount for the live price points", () => {
    // 49.99 vs 12 x 4.99 (59.88) = 16.5% -> 17%
    expect(savingsVsMonthly(yearly, monthly)).toBe(17);
  });

  it("returns null for the monthly plan compared against itself", () => {
    expect(savingsVsMonthly(monthly, monthly)).toBeNull();
  });

  it("refuses to compare across currencies", () => {
    // Same numbers, different storefront. Treating this as a discount would
    // be inventing one out of a currency difference.
    const usdMonthly = plan({ ...monthly, currencyCode: "USD" });
    expect(savingsVsMonthly(yearly, usdMonthly)).toBeNull();
  });

  it("returns null when an amount is unknown", () => {
    expect(savingsVsMonthly(plan({ ...yearly, priceAmountMicros: null }), monthly)).toBeNull();
    expect(savingsVsMonthly(yearly, plan({ ...monthly, priceAmountMicros: null }))).toBeNull();
  });

  it("returns null when there is no monthly plan to compare against", () => {
    expect(savingsVsMonthly(yearly, undefined)).toBeNull();
  });

  it("returns null rather than a negative when the longer plan costs more", () => {
    const badYearly = plan({ ...yearly, priceAmountMicros: 99_990_000 });
    expect(savingsVsMonthly(badYearly, monthly)).toBeNull();
  });

  it("returns null for lifetime, which has no monthly equivalent", () => {
    const lifetime = plan({ id: "$rc_lifetime", period: "lifetime", priceAmountMicros: 199_000_000 });
    expect(savingsVsMonthly(lifetime, monthly)).toBeNull();
  });
});

describe("pricePerMonth", () => {
  it("divides a yearly price into a formatted monthly figure", () => {
    // 49.99 / 12 = 4.165... -> rounded by Intl to the currency's precision
    expect(pricePerMonth(yearly, "en")).toBe("€4.17");
  });

  it("returns null for a monthly plan, which would just repeat the headline", () => {
    expect(pricePerMonth(monthly, "en")).toBeNull();
  });

  it("returns null when the currency is unknown", () => {
    expect(pricePerMonth(plan({ ...yearly, currencyCode: null }), "en")).toBeNull();
  });

  it("survives a nonsense currency code instead of taking the paywall down", () => {
    expect(pricePerMonth(plan({ ...yearly, currencyCode: "NOTACURRENCY" }), "en")).toBeNull();
  });
});

describe("preferredPlan", () => {
  it("honours the offering's declared default", () => {
    expect(preferredPlan([monthly, yearly], "$rc_monthly")?.id).toBe("$rc_monthly");
  });

  it("falls back to the longest plan when the default is missing", () => {
    expect(preferredPlan([monthly, yearly], null)?.id).toBe("$rc_annual");
  });

  it("falls back to the longest plan when the default names something absent", () => {
    expect(preferredPlan([monthly, yearly], "$rc_weekly")?.id).toBe("$rc_annual");
  });

  it("returns undefined for an empty offering", () => {
    expect(preferredPlan([], null)).toBeUndefined();
  });
});
