import i18n from "./index";

/**
 * Locale-aware date/number formatting. All helpers read the *current*
 * i18next language at call time (not import time) so they stay correct
 * immediately after a runtime language switch — never hardcode a locale
 * like 'en-US' at a call site, use these instead.
 */

function toDate(input: string | Date): Date {
  return typeof input === "string" ? new Date(input) : input;
}

/** Short date, e.g. "Mar 4" (en) / "4 mrt" (nl). Matches the previous default across the app. */
export function formatDate(
  input: string | Date,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return new Intl.DateTimeFormat(i18n.language, options).format(toDate(input));
}

/** Long date, e.g. "March 2024" — used for "member since" style copy. */
export function formatMonthYear(input: string | Date): string {
  return new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    toDate(input)
  );
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(i18n.language, options).format(value);
}

/** Compact form for large values, e.g. "1.2K" (en) / "1,2 k" (es) — used for chart axis labels. */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * "3 minutes ago" / "3 minuten geleden" / "hace 3 minutos" — granularity
 * matches what the app actually needs (seconds through days). Callers that
 * fall back to an absolute date beyond ~7 days should keep doing so and call
 * formatDate() for that branch, same as before.
 */
export function formatRelativeTime(input: string | Date): string {
  const date = toDate(input);
  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });

  if (Math.abs(diffSeconds) < 60) return rtf.format(Math.round(diffSeconds), "second");

  const diffMinutes = diffSeconds / 60;
  if (Math.abs(diffMinutes) < 60) return rtf.format(Math.round(diffMinutes), "minute");

  const diffHours = diffMinutes / 60;
  if (Math.abs(diffHours) < 24) return rtf.format(Math.round(diffHours), "hour");

  const diffDays = diffHours / 24;
  return rtf.format(Math.round(diffDays), "day");
}

/**
 * "Today" / "Yesterday" / "3 days ago" for a calendar-day difference you've
 * already computed (e.g. Math.floor((Date.now() - date) / 86_400_000)) —
 * unlike formatRelativeTime(), the day boundary is exact regardless of how
 * many hours have elapsed today, which is what date-divider labels need.
 */
export function formatRelativeDay(daysAgo: number): string {
  return new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" }).format(-daysAgo, "day");
}
