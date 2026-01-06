import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../services/api";
import { StoreSettings } from "../types";
import { normalizeBrandName } from "../utils/text";
import { useI18n } from "../i18n";

type StoreSettingsContextValue = {
  settings: StoreSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreSettingsContext = createContext<
  StoreSettingsContextValue | undefined
>(undefined);

export const StoreSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { copy, t } = useI18n();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fallbackSettings: StoreSettings = useMemo(
    () => ({
      store_name: copy.brandFallback,
      tagline: copy.taglineFallback,
      hero_title: t("store.heroTitle", "تجربة قهوة دافئة في كل كوب."),
      hero_subtitle: t("store.heroSubtitle", "اكتشف نكهات قهوتنا المختارة بعناية، وجودة تليق بذوقك في كل وقت."),
      hero_button_text: t("store.heroButton", "اطلب الآن"),
      about_title: t("store.aboutTitle", "عن مقهى الخليج"),
      about_subtitle: t("store.aboutSubtitle", "نصنع القهوة بحب ونقدم تجربة تليق بك."),
      about_description: t(
        "store.aboutDescription",
        "نؤمن أن القهوة لحظة؛ لذلك نختار أفضل الحبوب ونعدها بعناية لتقديم كوب مثالي في كل مرة."
      ),
      contact_title: t("store.contactTitle", "تواصل معنا"),
      contact_description: t(
        "store.contactDescription",
        "نسعد باستقبال رسائلك واستفساراتك عبر قنوات التواصل المتاحة، وسنرد عليك بأقرب وقت."
      ),
      contact_address: copy.contactFallback.address,
      contact_phone: copy.contactFallback.phone,
      contact_email: copy.contactFallback.email,
      contact_hours: copy.contactFallback.hours,
      contact_whatsapp: copy.contactFallback.whatsapp,
      hero_cards: copy.heroFallback,
    }),
    [copy, t]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("store/settings/public/");
      if (res.data) {
        const merged = { ...fallbackSettings, ...res.data };
        setSettings({
          ...merged,
          store_name: normalizeBrandName(merged.store_name, copy.brandFallback),
        });
      } else {
        setSettings(fallbackSettings);
      }
    } catch (error) {
      console.warn("store settings error", error);
      setSettings(fallbackSettings);
    } finally {
      setLoading(false);
    }
  }, [copy, fallbackSettings]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) throw new Error("useStoreSettings must be used within provider");
  return ctx;
};
