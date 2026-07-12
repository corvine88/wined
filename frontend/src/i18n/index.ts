import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as storage from '../storage';
import it from './locales/it.json';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

export const FALLBACK_LANGUAGE = 'it';
export const SUPPORTED_LANGUAGES = ['it', 'en', 'de', 'fr', 'es', 'ja', 'ko'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  it: { translation: it },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  ja: { translation: ja },
  ko: { translation: ko },
};

const deviceLanguage = Localization.getLocales()[0]?.languageCode || FALLBACK_LANGUAGE;
const initialLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLanguage)
  ? deviceLanguage
  : FALLBACK_LANGUAGE;

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

// The device-detected language (or the italian fallback), used when the user picks "Automatic".
export function getDeviceLanguage(): SupportedLanguage {
  return initialLanguage as SupportedLanguage;
}

// Called once at app startup: if the user previously forced a language, apply it over the
// device-detected default before any screen renders.
export async function applyStoredLanguage(): Promise<void> {
  const stored = await storage.getLanguagePreference();
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    await i18n.changeLanguage(stored);
  }
}

// Called from the language picker in Profile. Pass null to go back to "Automatic (device)".
export async function setAppLanguage(lang: SupportedLanguage | null): Promise<void> {
  await storage.setLanguagePreference(lang);
  await i18n.changeLanguage(lang || getDeviceLanguage());
}

export default i18n;
