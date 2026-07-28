import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import bm from './locales/bm.json';

const LANGUAGE_KEY = 'app_language';

const resources = { en: { translation: en }, bm: { translation: bm } };

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

// Load saved language or detect device locale
export async function initLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && (saved === 'en' || saved === 'bm')) {
      await i18n.changeLanguage(saved);
      return;
    }
    const deviceLang = Localization.getLocales()[0]?.languageCode;
    if (deviceLang === 'ms') {
      await i18n.changeLanguage('bm');
    } else {
      await i18n.changeLanguage('en');
    }
  } catch {
    await i18n.changeLanguage('en');
  }
}

export async function setLanguage(lang: 'en' | 'bm') {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
}

export default i18n;
