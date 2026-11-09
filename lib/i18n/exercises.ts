import i18n from "./index";

/**
 * The display name of an exercise in the current language, from
 * `locales/<lang>/exercises.json` by its `exercise_types.key`. Falls back to the
 * database label for a key that has no translation yet.
 *
 * Applied where exercise rows are loaded (lib/api), not at render: changing
 * language reloads the app, so the language can't change under loaded data.
 */
export function exerciseLabel(key: string, fallback: string): string {
  return i18n.t(`exercises:${key}`, { defaultValue: fallback });
}
