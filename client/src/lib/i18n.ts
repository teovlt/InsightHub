import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as en from "../locales/en.json";
import * as fr from "../locales/fr.json";

export const listOfLocales = ["en", "fr"];

const STORAGE_KEY = "i18nextLng";

// Saved choice first, then the browser language (fr-FR, fr-CA… → fr), English otherwise
const initialLanguage = (): string => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && listOfLocales.includes(saved)) return saved;
  } catch {
    // Storage blocked (private mode…): fall through to the browser language
  }
  const browser = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return browser.toLowerCase().startsWith("fr") ? "fr" : "en";
};

export const saveLanguage = (language: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted, the choice still applies to this visit
  }
};

i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
});

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: initialLanguage(),
  fallbackLng: "en",
});

document.documentElement.lang = i18n.language;

const localeNames: { [key: string]: string } = {
  en: "English",
  fr: "Français",
  // ...
};

export const getFullNamesOfLocales = (locale: string) => {
  return localeNames[locale] || "";
};
