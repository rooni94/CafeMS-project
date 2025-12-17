import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api } from "../services/api";
import { StoreSettings } from "../types";
import { copy } from "../config/copy";

type StoreSettingsContextValue = {
  settings: StoreSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreSettingsContext = createContext<
  StoreSettingsContextValue | undefined
>(undefined);

const fallbackSettings: StoreSettings = {
  store_name: copy.brandFallback,
  tagline: copy.taglineFallback,
  hero_title: "تجربة قهوة دافئة في كل كوب.",
  hero_subtitle: "اكتشف نكهات قهوتنا المختارة بعناية، وجودة تليق بذوقك في كل وقت.",
  hero_button_text: "اطلب الآن",
  about_title: "عن مقهى الخليج",
  about_subtitle: "نصنع القهوة بحب ونقدم تجربة تليق بك.",
  about_description: "نؤمن أن القهوة لحظة؛ لذلك نختار أفضل الحبوب ونعدها بعناية لتقديم كوب مثالي في كل مرة.",
  contact_title: "تواصل معنا",
  contact_description: "نسعد باستقبال رسائلك واستفساراتك عبر قنوات التواصل المتاحة، وسنرد عليك بأقرب وقت.",
  contact_address: copy.contactFallback.address,
  contact_phone: copy.contactFallback.phone,
  contact_email: copy.contactFallback.email,
  contact_hours: copy.contactFallback.hours,
  contact_whatsapp: copy.contactFallback.whatsapp,
  hero_cards: copy.heroFallback,
};


export const StoreSettingsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("store/settings/public/");
      if (res.data) {
        setSettings({ ...fallbackSettings, ...res.data });
      } else {
        setSettings(fallbackSettings);
      }
    } catch (error) {
      console.warn("store settings error", error);
      setSettings(fallbackSettings);
    } finally {
      setLoading(false);
    }
  }, []);

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