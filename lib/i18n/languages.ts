export type LanguageCode = "en" | "nl" | "es" | "de" | "pt" | "ar";

export interface LanguageOption {
  code: LanguageCode;
  /** Name in its own language — shown in the picker regardless of current UI language. */
  nativeName: string;
  /** Whether real translations exist yet. Flip to true once a language's locale files are filled in. */
  available: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", nativeName: "English", available: true },
  { code: "nl", nativeName: "Nederlands", available: true },
  { code: "es", nativeName: "Español", available: true },
  { code: "de", nativeName: "Deutsch", available: true },
  { code: "pt", nativeName: "Português", available: true },
  { code: "ar", nativeName: "العربية", available: true },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

const SUPPORTED_LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(code: string): code is LanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as string[]).includes(code);
}

/** Languages to show in the in-app language picker — only ones with real translations. */
export function pickerLanguages(): LanguageOption[] {
  return LANGUAGES.filter((l) => l.available);
}
