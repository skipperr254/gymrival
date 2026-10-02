import type { Plan } from '@/lib/billing';

/** How many months one billing period covers. Null = not a recurring period. */
const MONTHS_IN_PERIOD: Record<Plan['period'], number | null> = {
  weekly: 1 / 4.345,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
  lifetime: null,
  unknown: null,
};

/**
 * "Save 17%" relative to paying monthly for the same span.
 *
 * Returns null unless the comparison is honest: both plans need a real
 * recurring period, a known amount, and the *same currency* — the store
 * localises prices per storefront, and comparing EUR against USD would quietly
 * invent a discount.
 */
export function savingsVsMonthly(plan: Plan, monthly: Plan | undefined): number | null {
  if (!monthly || plan.id === monthly.id) return null;
  if (plan.priceAmountMicros == null || monthly.priceAmountMicros == null) return null;
  if (plan.currencyCode !== monthly.currencyCode) return null;

  const months = MONTHS_IN_PERIOD[plan.period];
  if (!months || months <= 1) return null;

  const equivalentMonthlyCost = monthly.priceAmountMicros * months;
  if (equivalentMonthlyCost <= 0) return null;

  const percent = Math.round((1 - plan.priceAmountMicros / equivalentMonthlyCost) * 100);
  return percent > 0 ? percent : null;
}

/**
 * The plan's price expressed per month, formatted in the plan's own currency.
 *
 * Uses Intl rather than slicing `priceString`, which is already localised and
 * can put the symbol on either side. Returns null for non-recurring plans and
 * for a monthly plan (where it would just repeat the headline price).
 */
export function pricePerMonth(plan: Plan, locale: string): string | null {
  const months = MONTHS_IN_PERIOD[plan.period];
  if (!months || months <= 1) return null;
  if (plan.priceAmountMicros == null || !plan.currencyCode) return null;

  const perMonth = plan.priceAmountMicros / 1_000_000 / months;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: plan.currencyCode,
    }).format(perMonth);
  } catch {
    // An unexpected currency code shouldn't take the paywall down with it.
    return null;
  }
}

/** The plan a paywall should preselect: the offering's default, else the longest. */
export function preferredPlan(plans: Plan[], defaultPlanId: string | null): Plan | undefined {
  if (defaultPlanId) {
    const match = plans.find((p) => p.id === defaultPlanId);
    if (match) return match;
  }
  const byLength = [...plans].sort(
    (a, b) => (MONTHS_IN_PERIOD[b.period] ?? 0) - (MONTHS_IN_PERIOD[a.period] ?? 0)
  );
  return byLength[0];
}
