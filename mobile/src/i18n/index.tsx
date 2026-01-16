import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { DevSettings } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import { copy as copyAr } from "../config/copy";
import { copyEn } from "../config/copy.en";
import { strings } from "./strings";
import { applyLayoutDirection, normalizeLocale, LayoutLocale } from "./layoutDirection";

export type Locale = LayoutLocale;

type Copy = typeof copyAr;

type I18nContextValue = {
  locale: Locale;
  isRTL: boolean;
  copy: Copy;
  t: (key: string, fallback?: string) => string;
  setLocale: (next: Locale) => Promise<void>;
};

const STORAGE_KEY = "cafe_language";

const LanguageContext = createContext<I18nContextValue | undefined>(undefined);

const resolveLocale = (value?: string | null): Locale => normalizeLocale(value);

const getSystemLocale = (): Locale => {
  const locales = Localization.getLocales?.();
  const languageCode = locales?.[0]?.languageCode;
  return resolveLocale(languageCode);
};

const getNestedValue = (source: unknown, key: string): string | undefined => {
  if (!source || typeof source !== "object") return undefined;
  return key.split(".").reduce((acc: any, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return acc[part];
    }
    return undefined;
  }, source as any);
};

const ensureRTL = async (nextLocale: Locale) => {
  const { shouldReload } = applyLayoutDirection(nextLocale, { log: __DEV__ });

  if (!shouldReload) return;

  // Avoid reload loops in Expo Go/dev; layout direction is already forced in JS.
  if (__DEV__) {
    console.log("[rtl] skip reload in dev/Expo Go");
    return;
  }

  try {
    if (Updates?.reloadAsync) {
      await Updates.reloadAsync();
    } else if (DevSettings.reload) {
      DevSettings.reload();
    }
  } catch (error) {
    console.warn("rtl reload failed", error);
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const initial = resolveLocale(stored || getSystemLocale());
        if (!mounted) return;
        setLocaleState(initial);
        await ensureRTL(initial);
      } catch (error) {
        console.warn("language init failed", error);
      } finally {
        if (mounted) setReady(true);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    const resolved = resolveLocale(next);
    setLocaleState(resolved);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, resolved);
    } catch (error) {
      console.warn("language persist failed", error);
    }
    await ensureRTL(resolved);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const resolved = getNestedValue(strings[locale] || {}, key);
      if (typeof resolved === "string") return resolved;
      return fallback ?? key;
    },
    [locale]
  );

  const copy = useMemo(() => (locale === "en" ? copyEn : copyAr), [locale]);

  const value = useMemo(
    () => ({
      locale,
      isRTL: locale === "ar",
      copy,
      t,
      setLocale,
    }),
    [locale, copy, t, setLocale]
  );

  if (!ready) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
};
