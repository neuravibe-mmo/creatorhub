"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE, NestedKeyOf } from "./types";
import { zhCN, TranslationSchema } from "./locales/zh-CN";
import { vi } from "./locales/vi";
import { en } from "./locales/en";

const dictionaries: Record<Locale, TranslationSchema> = {
  "zh-CN": zhCN,
  vi,
  en,
};

export type TxKey = NestedKeyOf<TranslationSchema>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TxKey, params?: Record<string, string | number>) => string;
  locales: typeof SUPPORTED_LOCALES;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "creatorhub_locale";

// Deep helper to resolve nested string by dot notation
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale;
      if (saved && ["zh-CN", "vi", "en"].includes(saved)) {
        setLocaleState(saved);
      } else {
        // Auto detect browser language
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith("vi")) {
          setLocaleState("vi");
        } else if (browserLang.startsWith("zh")) {
          setLocaleState("zh-CN");
        } else if (browserLang.startsWith("en")) {
          setLocaleState("en");
        }
      }
    } catch {}
    setIsInitialized(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch {}
  }, []);

  const t = useCallback(
    (key: TxKey, params?: Record<string, string | number>): string => {
      const currentDict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
      let value = getNestedValue(currentDict, key);

      // Fallback to zh-CN if missing in other languages
      if (!value && locale !== DEFAULT_LOCALE) {
        value = getNestedValue(dictionaries[DEFAULT_LOCALE], key);
      }

      if (!value) {
        return key; // return key if completely missing
      }

      // Parameter replacement {var}
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          value = value!.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramVal));
        });
      }

      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        locales: SUPPORTED_LOCALES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
