import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import type { LanguageDetectorAsyncModule } from "i18next";
import { DEFAULT_LANGUAGE, isSupportedLanguage } from "./languages";

export const LANGUAGE_STORAGE_KEY = "@gymrival/language";

function detectDeviceLanguage(): string {
  for (const locale of Localization.getLocales()) {
    if (locale.languageCode && isSupportedLanguage(locale.languageCode)) {
      return locale.languageCode;
    }
  }
  return DEFAULT_LANGUAGE;
}

async function resolveLanguage(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (cached && isSupportedLanguage(cached)) return cached;
  } catch {
    // AsyncStorage unavailable — fall through to device detection
  }
  return detectDeviceLanguage();
}

/**
 * Custom i18next language detector for React Native (the bundled
 * i18next-browser-languagedetector is web-only). Resolution order:
 *   1. A language the user explicitly picked in Settings (cached locally).
 *   2. The device's locale, mapped to the nearest supported language.
 *   3. English.
 */
export const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  init: () => {},
  detect: (callback) => {
    resolveLanguage().then(callback);
  },
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      // best-effort cache only
    }
  },
};
