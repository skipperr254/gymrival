import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { languageDetector } from "./languageDetector";
import { DEFAULT_LANGUAGE } from "./languages";

import enCommon from "@/locales/en/common.json";
import enAuth from "@/locales/en/auth.json";
import enNotifications from "@/locales/en/notifications.json";
import enExercises from "@/locales/en/exercises.json";
import enProfile from "@/locales/en/profile.json";
import enTrain from "@/locales/en/train.json";
import enProgress from "@/locales/en/progress.json";
import enSocial from "@/locales/en/social.json";
import enCompete from "@/locales/en/compete.json";
import enLogpr from "@/locales/en/logpr.json";

import nlCommon from "@/locales/nl/common.json";
import nlAuth from "@/locales/nl/auth.json";
import nlNotifications from "@/locales/nl/notifications.json";
import nlExercises from "@/locales/nl/exercises.json";
import nlProfile from "@/locales/nl/profile.json";
import nlTrain from "@/locales/nl/train.json";
import nlProgress from "@/locales/nl/progress.json";
import nlSocial from "@/locales/nl/social.json";
import nlCompete from "@/locales/nl/compete.json";
import nlLogpr from "@/locales/nl/logpr.json";

import esCommon from "@/locales/es/common.json";
import esAuth from "@/locales/es/auth.json";
import esNotifications from "@/locales/es/notifications.json";
import esExercises from "@/locales/es/exercises.json";
import esProfile from "@/locales/es/profile.json";
import esTrain from "@/locales/es/train.json";
import esProgress from "@/locales/es/progress.json";
import esSocial from "@/locales/es/social.json";
import esCompete from "@/locales/es/compete.json";
import esLogpr from "@/locales/es/logpr.json";

import deCommon from "@/locales/de/common.json";
import deAuth from "@/locales/de/auth.json";
import deNotifications from "@/locales/de/notifications.json";
import deExercises from "@/locales/de/exercises.json";
import deProfile from "@/locales/de/profile.json";
import deTrain from "@/locales/de/train.json";
import deProgress from "@/locales/de/progress.json";
import deSocial from "@/locales/de/social.json";
import deCompete from "@/locales/de/compete.json";
import deLogpr from "@/locales/de/logpr.json";

import ptCommon from "@/locales/pt/common.json";
import ptAuth from "@/locales/pt/auth.json";
import ptNotifications from "@/locales/pt/notifications.json";
import ptExercises from "@/locales/pt/exercises.json";
import ptProfile from "@/locales/pt/profile.json";
import ptTrain from "@/locales/pt/train.json";
import ptProgress from "@/locales/pt/progress.json";
import ptSocial from "@/locales/pt/social.json";
import ptCompete from "@/locales/pt/compete.json";
import ptLogpr from "@/locales/pt/logpr.json";

import arCommon from "@/locales/ar/common.json";
import arAuth from "@/locales/ar/auth.json";
import arNotifications from "@/locales/ar/notifications.json";
import arExercises from "@/locales/ar/exercises.json";
import arProfile from "@/locales/ar/profile.json";
import arTrain from "@/locales/ar/train.json";
import arProgress from "@/locales/ar/progress.json";
import arSocial from "@/locales/ar/social.json";
import arCompete from "@/locales/ar/compete.json";
import arLogpr from "@/locales/ar/logpr.json";

export const defaultNS = "common";

export const resources = {
  en: { common: enCommon, auth: enAuth, notifications: enNotifications, exercises: enExercises, profile: enProfile, train: enTrain, progress: enProgress, social: enSocial, compete: enCompete, logpr: enLogpr },
  nl: { common: nlCommon, auth: nlAuth, notifications: nlNotifications, exercises: nlExercises, profile: nlProfile, train: nlTrain, progress: nlProgress, social: nlSocial, compete: nlCompete, logpr: nlLogpr },
  es: { common: esCommon, auth: esAuth, notifications: esNotifications, exercises: esExercises, profile: esProfile, train: esTrain, progress: esProgress, social: esSocial, compete: esCompete, logpr: esLogpr },
  de: { common: deCommon, auth: deAuth, notifications: deNotifications, exercises: deExercises, profile: deProfile, train: deTrain, progress: deProgress, social: deSocial, compete: deCompete, logpr: deLogpr },
  pt: { common: ptCommon, auth: ptAuth, notifications: ptNotifications, exercises: ptExercises, profile: ptProfile, train: ptTrain, progress: ptProgress, social: ptSocial, compete: ptCompete, logpr: ptLogpr },
  ar: { common: arCommon, auth: arAuth, notifications: arNotifications, exercises: arExercises, profile: arProfile, train: arTrain, progress: arProgress, social: arSocial, compete: arCompete, logpr: arLogpr },
} as const;

let readyPromise: Promise<void> | null = null;

/**
 * Initialises i18next once. Safe to call multiple times — subsequent calls
 * return the same in-flight/completed promise.
 */
export function initI18n(): Promise<void> {
  if (!readyPromise) {
    readyPromise = i18n
      .use(languageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: DEFAULT_LANGUAGE,
        defaultNS,
        ns: Object.keys(resources[DEFAULT_LANGUAGE]),
        interpolation: { escapeValue: false },
        returnNull: false,
      })
      .then(() => undefined);
  }
  return readyPromise;
}

export default i18n;
