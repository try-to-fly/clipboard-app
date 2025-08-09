import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCommon from '../locales/zh/common.json';
import zhClipboard from '../locales/zh/clipboard.json';
import zhPreferences from '../locales/zh/preferences.json';
import zhStatistics from '../locales/zh/statistics.json';

import enCommon from '../locales/en/common.json';
import enClipboard from '../locales/en/clipboard.json';
import enPreferences from '../locales/en/preferences.json';
import enStatistics from '../locales/en/statistics.json';

import jaCommon from '../locales/ja/common.json';
import jaClipboard from '../locales/ja/clipboard.json';
import jaPreferences from '../locales/ja/preferences.json';
import jaStatistics from '../locales/ja/statistics.json';

import esCommon from '../locales/es/common.json';
import esClipboard from '../locales/es/clipboard.json';
import esPreferences from '../locales/es/preferences.json';
import esStatistics from '../locales/es/statistics.json';

import frCommon from '../locales/fr/common.json';
import frClipboard from '../locales/fr/clipboard.json';
import frPreferences from '../locales/fr/preferences.json';
import frStatistics from '../locales/fr/statistics.json';

import deCommon from '../locales/de/common.json';
import deClipboard from '../locales/de/clipboard.json';
import dePreferences from '../locales/de/preferences.json';
import deStatistics from '../locales/de/statistics.json';

import koCommon from '../locales/ko/common.json';
import koClipboard from '../locales/ko/clipboard.json';
import koPreferences from '../locales/ko/preferences.json';
import koStatistics from '../locales/ko/statistics.json';

import ptCommon from '../locales/pt/common.json';
import ptClipboard from '../locales/pt/clipboard.json';
import ptPreferences from '../locales/pt/preferences.json';
import ptStatistics from '../locales/pt/statistics.json';

import ruCommon from '../locales/ru/common.json';
import ruClipboard from '../locales/ru/clipboard.json';
import ruPreferences from '../locales/ru/preferences.json';
import ruStatistics from '../locales/ru/statistics.json';

import itCommon from '../locales/it/common.json';
import itClipboard from '../locales/it/clipboard.json';
import itPreferences from '../locales/it/preferences.json';
import itStatistics from '../locales/it/statistics.json';

const resources = {
  zh: {
    common: zhCommon,
    clipboard: zhClipboard,
    preferences: zhPreferences,
    statistics: zhStatistics,
  },
  en: {
    common: enCommon,
    clipboard: enClipboard,
    preferences: enPreferences,
    statistics: enStatistics,
  },
  ja: {
    common: jaCommon,
    clipboard: jaClipboard,
    preferences: jaPreferences,
    statistics: jaStatistics,
  },
  es: {
    common: esCommon,
    clipboard: esClipboard,
    preferences: esPreferences,
    statistics: esStatistics,
  },
  fr: {
    common: frCommon,
    clipboard: frClipboard,
    preferences: frPreferences,
    statistics: frStatistics,
  },
  de: {
    common: deCommon,
    clipboard: deClipboard,
    preferences: dePreferences,
    statistics: deStatistics,
  },
  ko: {
    common: koCommon,
    clipboard: koClipboard,
    preferences: koPreferences,
    statistics: koStatistics,
  },
  pt: {
    common: ptCommon,
    clipboard: ptClipboard,
    preferences: ptPreferences,
    statistics: ptStatistics,
  },
  ru: {
    common: ruCommon,
    clipboard: ruClipboard,
    preferences: ruPreferences,
    statistics: ruStatistics,
  },
  it: {
    common: itCommon,
    clipboard: itClipboard,
    preferences: itPreferences,
    statistics: itStatistics,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    defaultNS: 'common',
    ns: ['common', 'clipboard', 'preferences', 'statistics'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => {
        // Convert detected language to supported languages
        if (lng.startsWith('en')) return 'en';
        if (lng.startsWith('zh')) return 'zh';
        if (lng.startsWith('ja')) return 'ja';
        if (lng.startsWith('es')) return 'es';
        if (lng.startsWith('fr')) return 'fr';
        if (lng.startsWith('de')) return 'de';
        if (lng.startsWith('ko')) return 'ko';
        if (lng.startsWith('pt')) return 'pt';
        if (lng.startsWith('ru')) return 'ru';
        if (lng.startsWith('it')) return 'it';
        return 'en'; // Default to English
      },
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

export const getSystemLanguage = () => {
  const systemLang = navigator.language || navigator.languages?.[0];
  if (systemLang?.startsWith('en')) return 'en';
  if (systemLang?.startsWith('zh')) return 'zh';
  if (systemLang?.startsWith('ja')) return 'ja';
  if (systemLang?.startsWith('es')) return 'es';
  if (systemLang?.startsWith('fr')) return 'fr';
  if (systemLang?.startsWith('de')) return 'de';
  if (systemLang?.startsWith('ko')) return 'ko';
  if (systemLang?.startsWith('pt')) return 'pt';
  if (systemLang?.startsWith('ru')) return 'ru';
  if (systemLang?.startsWith('it')) return 'it';
  return 'en'; // Default to English
};

export default i18n;