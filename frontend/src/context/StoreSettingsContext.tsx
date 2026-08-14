import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
import { api } from "../services/api";
import { DEFAULT_MAP_EMBED } from "../utils/mapEmbedFallback";

export type StoreBranding = {
  store_name: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_title: string;
  header_subtitle: string;
  footer_text: string;
  contact_email: string;
  support_email: string;
  notification_email: string;
  contact_phone: string;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  header_links: { label: string; url: string }[];
  footer_links: { label: string; url: string }[];
  social_links: Record<string, string> | null;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_button_link: string;
  hero_cards: {
    title?: string;
    description?: string;
    button_text?: string;
    button_link?: string;
    image?: string;
  }[];
  about_title: string;
  about_subtitle: string;
  about_description: string;
  about_highlights: string[];
  contact_title: string;
  contact_subtitle: string;
  contact_description: string;
  contact_address: string;
  contact_hours: string;
  contact_map_embed: string;
  contact_whatsapp: string;
  wallet_pass_base_url: string;
};

type StoreSettingsContextValue = {
  settings: StoreBranding | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const StoreSettingsContext = createContext<StoreSettingsContextValue | undefined>(
  undefined
);

const HERO_CARDS_FALLBACK = [
  {
    image: "/media/products/lk_menu/v60.jpg",
    title: "قهوة مختصة تُحضّر بهدوء",
    description:
      "قهوة V60 مقطرة يدوياً، مع عناية بالتفاصيل في كل رشفة.",
    button_text: "اكتشف القهوة المختصة",
    button_link: "/menu",
  },
  {
    image: "/media/products/lk_menu/mango_orange_smoothie.jpg",
    title: "انتعاش بطعم الفاكهة",
    description:
      "سموثي مانجو وتوت ومشروبات باردة بطعم طبيعي منعش.",
    button_text: "تصفّح المنعشات",
    button_link: "/menu",
  },
  {
    image: "/media/products/lk_menu/fruit_danish.jpg",
    title: "مخبوزات وحلويات يومية",
    description:
      "دانش فواكه وحلويات طازجة ترافق قهوتك بلقمة حلوة.",
    button_text: "استكشف المخبوزات",
    button_link: "/menu",
  },
];

const DEFAULT_SOCIAL_LINKS: Record<string, string> = {
  instagram: "https://instagram.com/#",
  snapchat: "https://snapchat.com/add/#",
  twitter: "https://x.com/#",
  facebook: "https://facebook.com/#",
};

const fallbackSettings: StoreBranding = {
  store_name: "CafeMS Demo",
  tagline: "قهوة ومشروبات ساخنة وباردة وحلويات ومخبوزات… اطلبها بسهولة.",
  primary_color: "#f59e0b",
  secondary_color: "#4c1d95",
  accent_color: "#0f172a",
  background_color: "#f8fafc",
  text_color: "#111827",
  header_title: "",
  header_subtitle: "",
  footer_text: "",
  contact_email: "",
  support_email: "contact@example.invalid",
  notification_email: "",
  contact_phone: "",
  logo_url: null,
  favicon_url: null,
  hero_image_url: null,
  about_image_url: null,
  header_links: [],
  footer_links: [],
  social_links: { ...DEFAULT_SOCIAL_LINKS },
  hero_title: "",
  hero_subtitle: "",
  hero_button_text: "",
  hero_button_link: "",
  hero_cards: HERO_CARDS_FALLBACK,
  about_title: "من نحن – CafeMS Demo",
  about_subtitle: "نكهة قهوة دافئة… وتجربة لطيفة في كل زيارة.",
  about_description:
    "CafeMS Demo وجهتكم اليومية للقهوة والمشروبات الساخنة والباردة المنعشة، مع تشكيلة من الحلويات والمخبوزات التي تُقدَّم بطزاجة. نحرص على أن تكون تجربتكم سهلة ولطيفة من أول اختيار حتى الاستلام.",
  about_highlights: [
    "حبوب قهوة مختارة وتحضير متقن لكل كوب.",
    "مشروبات باردة ومنعشة تناسب كل الأوقات.",
    "حلويات ومخبوزات ترافق قهوتك بأفضل شكل.",
  ],
  contact_title: "تواصل معنا",
  contact_subtitle: "يسعدنا الاستماع إلى رسائلك واقتراحاتك.",
  contact_description:
    "إذا كان لديك استفسار عن الطلبات أو المنتجات أو أي ملاحظة لتحسين تجربتك، اكتب لنا وسنرد عليك في أقرب وقت ممكن.",
  contact_address: "Demo cafe address",
  contact_hours: "يومياً من 8:00 صباحاً حتى 12:00 منتصف الليل",
  contact_map_embed: DEFAULT_MAP_EMBED,
  contact_whatsapp: "",
  wallet_pass_base_url: "https://example.invalid",
};

const setCssVar = (name: string, value?: string) => {
  const root = document.documentElement;
  root.style.setProperty(name, value || "");
};

export const StoreSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<StoreBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("store/settings/public/");
      const data = res.data || {};
      const incomingSocial =
        data && typeof data.social_links === "object" && !Array.isArray(data.social_links)
          ? data.social_links
          : {};
      const mergedSocial = {
        ...DEFAULT_SOCIAL_LINKS,
        ...incomingSocial,
      };
      const cleanedSocial = Object.fromEntries(
        Object.entries(mergedSocial).filter(([, url]) => !!url)
      );
      const resolvedMapEmbed =
        typeof data.contact_map_embed === "string" && data.contact_map_embed.trim()
          ? data.contact_map_embed
          : fallbackSettings.contact_map_embed;
      setSettings({
        ...fallbackSettings,
        ...data,
        header_links: Array.isArray(data.header_links) ? data.header_links : [],
        footer_links: Array.isArray(data.footer_links) ? data.footer_links : [],
        social_links: cleanedSocial,
        contact_map_embed: resolvedMapEmbed,
        wallet_pass_base_url:
          (data.wallet_pass_base_url && String(data.wallet_pass_base_url).trim()) ||
          fallbackSettings.wallet_pass_base_url,
        about_image_url: data.about_image_url || fallbackSettings.about_image_url,
        hero_cards:
          Array.isArray(data.hero_cards) && data.hero_cards.length > 0
            ? data.hero_cards
            : HERO_CARDS_FALLBACK,
        about_highlights:
          Array.isArray(data.about_highlights) && data.about_highlights.length > 0
            ? data.about_highlights
            : fallbackSettings.about_highlights,
      });
    } catch (error) {
      console.error("Failed to load store settings:", error);
      setSettings(fallbackSettings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const s = settings || fallbackSettings;
    setCssVar("--store-primary", s.primary_color);
    setCssVar("--store-secondary", s.secondary_color);
    setCssVar("--store-accent", s.accent_color);
    setCssVar("--store-background", s.background_color);
    setCssVar("--store-text", s.text_color);
  }, [settings]);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) {
    throw new Error("useStoreSettings must be used within StoreSettingsProvider");
  }
  return ctx;
};

