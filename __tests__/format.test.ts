/**
 * Unit tests for the locale-aware formatting helpers.
 *
 * `@/lib/i18n` is mocked to a fixed English instance so assertions are
 * deterministic and the tests don't drag in the full i18next init chain
 * (language detector, AsyncStorage, expo-localization).
 */
jest.mock("@/lib/i18n", () => ({
  __esModule: true,
  default: { language: "en" },
}));

import { formatNumber, formatCompactNumber } from "@/lib/i18n/format";

describe("formatNumber", () => {
  it("groups thousands using the active locale", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats zero and small values without grouping", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
  });

  it("honours explicit Intl options", () => {
    expect(formatNumber(5, { minimumFractionDigits: 2 })).toBe("5.00");
  });
});

describe("formatCompactNumber", () => {
  it("compacts large values", () => {
    expect(formatCompactNumber(1200)).toBe("1.2K");
    expect(formatCompactNumber(2_500_000)).toBe("2.5M");
  });

  it("leaves small values readable", () => {
    expect(formatCompactNumber(999)).toBe("999");
  });
});
