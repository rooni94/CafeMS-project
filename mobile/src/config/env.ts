// src/config/env.ts
import Constants from 'expo-constants';

/**
 * نحاول قراءة apiUrl من هذه المصادر، بالأولوية:
 * 1. Constants.expoConfig.extra.apiUrl  (موجود بعد build من EAS أو app.config.js)
 * 2. process.env.EXPO_PUBLIC_API_URL (مفيد للـ dev / local)
 * 3. process.env.API_URL (احتياطي)
 * 4. fallback ثابت (نطاقك)
 */

const getExtra = (key: string) => {
  try {
    // Expo v46+ قد يستخدم expoConfig أو manifest
    const extra = (Constants.expoConfig && Constants.expoConfig.extra) ||
                  (Constants.manifest && (Constants.manifest as any).extra) ||
                  {};
    return (extra as any)[key];
  } catch {
    return undefined;
  }
};

const normalizeBaseUrl = (url?: string | null) => {
  if (!url) return 'https://example.invalid/api/'; // fallback آمن
  if (!url.endsWith('/')) {
    return `${url}/`;
  }
  return url;
};

const fromConstants =
  (getExtra('apiUrl') as string | undefined) ??
  (getExtra('API_URL') as string | undefined);
const fromEnv = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;

export const ENV = {
  apiUrl: normalizeBaseUrl(fromConstants ?? fromEnv ?? null),
};
