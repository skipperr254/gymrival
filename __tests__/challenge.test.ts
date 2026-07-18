/**
 * Unit tests for the pure challenge helpers. `@/lib/i18n` is mocked so `t()`
 * echoes the key back — this lets us assert which branch was taken (the actual
 * logic under test) without coupling to translation copy.
 */
jest.mock("@/lib/i18n", () => ({
  __esModule: true,
  default: {
    language: "en",
    t: (key: string) => key,
  },
}));

import {
  formatChallengeScore,
  msUntilEnd,
  endsInLabel,
} from "@/types/challenge";

describe("formatChallengeScore", () => {
  it("prefixes a plus sign for the most_improved metric", () => {
    expect(formatChallengeScore(1234, "most_improved", "kg")).toBe("+1,234kg");
  });

  it("omits the sign for absolute metrics", () => {
    expect(formatChallengeScore(1234, "highest_pr", "kg")).toBe("1,234kg");
    expect(formatChallengeScore(50, "total_volume", " reps")).toBe("50 reps");
  });
});

describe("msUntilEnd", () => {
  it("is positive for a future date and negative for a past one", () => {
    expect(msUntilEnd(new Date(Date.now() + 60_000).toISOString())).toBeGreaterThan(0);
    expect(msUntilEnd(new Date(Date.now() - 60_000).toISOString())).toBeLessThan(0);
  });
});

describe("endsInLabel", () => {
  it("reports ended for a past deadline", () => {
    expect(endsInLabel(new Date(Date.now() - 1000).toISOString())).toBe(
      "compete:endsIn.ended",
    );
  });

  it("selects the days branch when more than a day remains", () => {
    expect(endsInLabel(new Date(Date.now() + 3 * 86_400_000).toISOString())).toBe(
      "compete:endsIn.days",
    );
  });

  it("selects the hours branch when less than a day remains", () => {
    expect(endsInLabel(new Date(Date.now() + 5 * 3_600_000).toISOString())).toBe(
      "compete:endsIn.hours",
    );
  });

  it("selects the minutes branch when less than an hour remains", () => {
    expect(endsInLabel(new Date(Date.now() + 10 * 60_000).toISOString())).toBe(
      "compete:endsIn.minutes",
    );
  });
});
