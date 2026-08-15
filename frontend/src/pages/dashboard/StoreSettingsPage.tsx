// src/pages/dashboard/StoreSettingsPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";
import { useStoreSettings } from "../../context/StoreSettingsContext";

type EditableLink = { label: string; url: string };
type EditableSocial = { platform: string; url: string };
type HeroCard = {
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  image: string;
};

type StoreSettingsForm = {
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
  verification_email: string;
  verification_smtp_host: string;
  verification_smtp_port: string;
  verification_smtp_username: string;
  verification_smtp_password: string;
  verification_smtp_use_tls: boolean;
  verification_smtp_use_ssl: boolean;
  verification_smtp_password_set: boolean;
  support_reply_email: string;
  support_smtp_host: string;
  support_smtp_port: string;
  support_smtp_username: string;
  support_smtp_password: string;
  support_smtp_use_tls: boolean;
  support_smtp_use_ssl: boolean;
  support_smtp_password_set: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_password_set: boolean;
  header_links: EditableLink[];
  footer_links: EditableLink[];
  social_links: EditableSocial[];
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_button_link: string;
  hero_cards: HeroCard[];
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
  apple_pass_template: string;
  google_wallet_jwt_template: string;
};

const defaultLink: EditableLink = { label: "", url: "" };
const defaultSocial: EditableSocial = { platform: "", url: "" };
const HERO_CARDS_TEMPLATE: HeroCard[] = [
  {
    title: "قهوة V60 المقطرة",
    description:
      "تحضير يدوي هادئ يبرز نكهات القهوة بوضوح وقوام خفيف ومتوازن.",
    button_text: "اطلب V60",
    button_link: "/menu",
    image: "/media/products/lk_menu/v60.jpg",
  },
  {
    title: "سموثي مانجو وبرتقال",
    description:
      "مزيج فاكهي بارد من المانجو والبرتقال لانتعاش طبيعي في كل وقت.",
    button_text: "تصفّح المنعشات",
    button_link: "/menu",
    image: "/media/products/lk_menu/mango_orange_smoothie.jpg",
  },
  {
    title: "دانش فواكه طازج",
    description:
      "مخبوز هش مزين بالفواكه والتوت، مناسب لمرافقة كوب القهوة.",
    button_text: "استكشف المخبوزات",
    button_link: "/menu",
    image: "/media/products/lk_menu/fruit_danish.jpg",
  },
];
const defaultHeroCard: HeroCard = {
  title: "",
  description: "",
  button_text: "",
  button_link: "",
  image: "",
};

const colorFields: { key: keyof StoreSettingsForm; label: string }[] = [
  { key: "primary_color", label: "اللون الأساسي" },
  { key: "secondary_color", label: "اللون الثانوي" },
  { key: "accent_color", label: "لون إبراز" },
  { key: "background_color", label: "لون خلفية الواجهة" },
  { key: "text_color", label: "لون النص" },
];

const StoreSettingsPage: React.FC = () => {
  const { refresh } = useStoreSettings();
  const [form, setForm] = useState<StoreSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [aboutImageFile, setAboutImageFile] = useState<File | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [clearFavicon, setClearFavicon] = useState(false);
  const [clearHero, setClearHero] = useState(false);
  const [clearAboutImage, setClearAboutImage] = useState(false);
  const [heroCardFiles, setHeroCardFiles] = useState<(File | null)[]>([]);
  const [heroCardImageClears, setHeroCardImageClears] = useState<boolean[]>([]);
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false);
  const [clearVerificationSmtpPassword, setClearVerificationSmtpPassword] = useState(false);
  const [clearSupportSmtpPassword, setClearSupportSmtpPassword] = useState(false);
  const [aboutHighlightDraft, setAboutHighlightDraft] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("store/settings/");
      const data = res.data || {};
      const heroCards = (() => {
        const incoming = Array.isArray(data.hero_cards) ? data.hero_cards : [];
        if (incoming.length === 0) {
          return HERO_CARDS_TEMPLATE.map((card) => ({ ...card }));
        }
        return HERO_CARDS_TEMPLATE.map((template, idx) => {
          const source = incoming[idx] || {};
          return {
            title: source.title ?? template.title,
            description: source.description ?? template.description,
            button_text: source.button_text ?? template.button_text,
            button_link: source.button_link ?? template.button_link,
            image: source.image ?? template.image,
          };
        });
      })();

      setForm({
        store_name: data.store_name || "",
        tagline: data.tagline || "",
        primary_color: data.primary_color || "#f59e0b",
        secondary_color: data.secondary_color || "#4c1d95",
        accent_color: data.accent_color || "#0f172a",
        background_color: data.background_color || "#f8fafc",
        text_color: data.text_color || "#111827",
        header_title: data.header_title || "",
        header_subtitle: data.header_subtitle || "",
        footer_text: data.footer_text || "",
        contact_email: data.contact_email || "",
        support_email: data.support_email || "",
        notification_email: data.notification_email || "",
        contact_phone: data.contact_phone || "",
        verification_email: data.verification_email || "",
        verification_smtp_host: data.verification_smtp_host || "",
        verification_smtp_port:
          data.verification_smtp_port !== undefined && data.verification_smtp_port !== null
            ? String(data.verification_smtp_port)
            : "587",
        verification_smtp_username: data.verification_smtp_username || "",
        verification_smtp_password: "",
        verification_smtp_use_tls:
          typeof data.verification_smtp_use_tls === "boolean"
            ? data.verification_smtp_use_tls
            : true,
        verification_smtp_use_ssl:
          typeof data.verification_smtp_use_ssl === "boolean"
            ? data.verification_smtp_use_ssl
            : false,
        verification_smtp_password_set: Boolean(
          data.verification_smtp_password_set
        ),
        support_reply_email: data.support_reply_email || "",
        support_smtp_host: data.support_smtp_host || "",
        support_smtp_port:
          data.support_smtp_port !== undefined && data.support_smtp_port !== null
            ? String(data.support_smtp_port)
            : "587",
        support_smtp_username: data.support_smtp_username || "",
        support_smtp_password: "",
        support_smtp_use_tls:
          typeof data.support_smtp_use_tls === "boolean"
            ? data.support_smtp_use_tls
            : true,
        support_smtp_use_ssl:
          typeof data.support_smtp_use_ssl === "boolean"
            ? data.support_smtp_use_ssl
            : false,
        support_smtp_password_set: Boolean(data.support_smtp_password_set),
        smtp_host: data.smtp_host || "",
        smtp_port:
          data.smtp_port !== undefined && data.smtp_port !== null
            ? String(data.smtp_port)
            : "587",
        smtp_username: data.smtp_username || "",
        smtp_password: "",
        smtp_use_tls:
          typeof data.smtp_use_tls === "boolean" ? data.smtp_use_tls : true,
        smtp_use_ssl:
          typeof data.smtp_use_ssl === "boolean" ? data.smtp_use_ssl : false,
        smtp_password_set: Boolean(data.smtp_password_set),
        about_title: data.about_title || "",
        about_subtitle: data.about_subtitle || "",
        about_description: data.about_description || "",
        about_highlights: Array.isArray(data.about_highlights)
          ? data.about_highlights
          : [],
        contact_title: data.contact_title || "",
        contact_subtitle: data.contact_subtitle || "",
        contact_description: data.contact_description || "",
        contact_address: data.contact_address || "",
        contact_hours: data.contact_hours || "",
        contact_map_embed: data.contact_map_embed || "",
        contact_whatsapp: data.contact_whatsapp || "",
        wallet_pass_base_url:
          data.wallet_pass_base_url || "https://example.invalid",
        apple_pass_template: data.apple_pass_template || "",
        google_wallet_jwt_template: data.google_wallet_jwt_template || "",
        header_links: Array.isArray(data.header_links)
          ? data.header_links
          : [],
        footer_links: Array.isArray(data.footer_links)
          ? data.footer_links
          : [],
        social_links: data.social_links
          ? Object.entries(data.social_links).map(([platform, url]) => ({
              platform,
              url: String(url ?? ""),
            }))
          : [],
        logo_url: data.logo_url || null,
        favicon_url: data.favicon_url || null,
        hero_image_url: data.hero_image_url || null,
        about_image_url: data.about_image_url || null,
        hero_title: data.hero_title || "",
        hero_subtitle: data.hero_subtitle || "",
        hero_button_text: data.hero_button_text || "",
        hero_button_link: data.hero_button_link || "",
        hero_cards: heroCards,
      });
      setHeroCardFiles(heroCards.map(() => null));
      setHeroCardImageClears(heroCards.map(() => false));
      setLogoFile(null);
      setFaviconFile(null);
      setHeroFile(null);
      setAboutImageFile(null);
      setClearLogo(false);
      setClearFavicon(false);
      setClearHero(false);
      setClearAboutImage(false);
      setClearSmtpPassword(false);
      setClearVerificationSmtpPassword(false);
      setClearSupportSmtpPassword(false);
      setAboutHighlightDraft("");
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل إعدادات المتجر. تحقق من الخادم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = (key: keyof StoreSettingsForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateLink = (
    type: "header_links" | "footer_links",
    index: number,
    field: keyof EditableLink,
    value: string
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            [type]: prev[type].map((item, idx) =>
              idx === index ? { ...item, [field]: value } : item
            ),
          }
        : prev
    );
  };

  const updateSocial = (
    index: number,
    field: keyof EditableSocial,
    value: string
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            social_links: prev.social_links.map((item, idx) =>
              idx === index ? { ...item, [field]: value } : item
            ),
          }
        : prev
    );
  };

  type ToggleField =
    | "smtp_use_tls"
    | "smtp_use_ssl"
    | "verification_smtp_use_tls"
    | "verification_smtp_use_ssl"
    | "support_smtp_use_tls"
    | "support_smtp_use_ssl";

  const toggleSmtpOption = (field: ToggleField, value: boolean) => {
    const pairs: Record<ToggleField, ToggleField> = {
      smtp_use_tls: "smtp_use_ssl",
      smtp_use_ssl: "smtp_use_tls",
      verification_smtp_use_tls: "verification_smtp_use_ssl",
      verification_smtp_use_ssl: "verification_smtp_use_tls",
      support_smtp_use_tls: "support_smtp_use_ssl",
      support_smtp_use_ssl: "support_smtp_use_tls",
    };
    setForm((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
            ...(value ? { [pairs[field]]: false } : {}),
          }
        : prev
    );
  };

  const addLink = (type: "header_links" | "footer_links") => {
    setForm((prev) =>
      prev ? { ...prev, [type]: [...prev[type], { ...defaultLink }] } : prev
    );
  };

  const removeLink = (type: "header_links" | "footer_links", index: number) => {
    setForm((prev) =>
      prev
        ? { ...prev, [type]: prev[type].filter((_, idx) => idx !== index) }
        : prev
    );
  };

  const addSocial = () => {
    setForm((prev) =>
      prev ? { ...prev, social_links: [...prev.social_links, { ...defaultSocial }] } : prev
    );
  };

  const removeSocial = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            social_links: prev.social_links.filter((_, idx) => idx !== index),
          }
        : prev
    );
  };

  const heroCardLimit = HERO_CARDS_TEMPLATE.length;

  const addHeroCard = () => {
    let added = false;
    setForm((prev) => {
      if (!prev) return prev;
      if (prev.hero_cards.length >= heroCardLimit) {
        return prev;
      }
      const template =
        HERO_CARDS_TEMPLATE[prev.hero_cards.length] || defaultHeroCard;
      added = true;
      return {
        ...prev,
        hero_cards: [...prev.hero_cards, { ...template }],
      };
    });
    if (added) {
      setHeroCardFiles((prev) => [...prev, null]);
      setHeroCardImageClears((prev) => [...prev, false]);
    }
  };

  const updateHeroCard = (
    index: number,
    field: keyof HeroCard,
    value: string
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            hero_cards: prev.hero_cards.map((card, idx) =>
              idx === index ? { ...card, [field]: value } : card
            ),
          }
        : prev
    );
  };

  const removeHeroCard = (index: number) => {
    let removed = false;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            hero_cards: prev.hero_cards.filter((_, idx) => {
              if (idx === index) {
                removed = true;
              }
              return idx !== index;
            }),
          }
        : prev
    );
    if (removed) {
      setHeroCardFiles((prev) => prev.filter((_, idx) => idx !== index));
      setHeroCardImageClears((prev) =>
        prev.filter((_, idx) => idx !== index)
      );
    }
  };

  const resetHeroCard = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            hero_cards: prev.hero_cards.map((card, idx) =>
              idx === index
                ? { ...(HERO_CARDS_TEMPLATE[idx] || defaultHeroCard) }
                : card
            ),
          }
        : prev
    );

    setHeroCardFiles((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });

    setHeroCardImageClears((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  const handleHeroCardImageChange = (index: number, file: File | null) => {
    setHeroCardFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
    if (file) {
      setHeroCardImageClears((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  const handleHeroCardImageClearToggle = (
    index: number,
    checked: boolean
  ) => {
    setHeroCardImageClears((prev) => {
      const next = [...prev];
      next[index] = checked;
      return next;
    });
    if (checked) {
      setHeroCardFiles((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    }
  };

  const addAboutHighlight = () => {
    if (!aboutHighlightDraft.trim()) return;
    setForm((prev) =>
      prev
        ? {
            ...prev,
            about_highlights: [...prev.about_highlights, aboutHighlightDraft.trim()],
          }
        : prev
    );
    setAboutHighlightDraft("");
  };

  const updateAboutHighlight = (index: number, value: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            about_highlights: prev.about_highlights.map((item, idx) =>
              idx === index ? value : item
            ),
          }
        : prev
    );
  };

  const removeAboutHighlight = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            about_highlights: prev.about_highlights.filter((_, idx) => idx !== index),
          }
        : prev
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      const appendValue = (key: string, value: unknown) => {
        if (value === null || value === undefined) return;
        formData.append(key, String(value));
      };

      appendValue("store_name", form.store_name);
      appendValue("tagline", form.tagline);
      appendValue("header_title", form.header_title);
      appendValue("header_subtitle", form.header_subtitle);
      appendValue("footer_text", form.footer_text);
      appendValue("contact_email", form.contact_email);
      appendValue("support_email", form.support_email);
      appendValue("notification_email", form.notification_email);
      appendValue("contact_phone", form.contact_phone);
      appendValue("smtp_host", form.smtp_host);
      appendValue("smtp_port", form.smtp_port || "587");
      appendValue("smtp_username", form.smtp_username);
      appendValue("smtp_use_tls", form.smtp_use_tls ? "1" : "0");
      appendValue("smtp_use_ssl", form.smtp_use_ssl ? "1" : "0");
      appendValue("hero_title", form.hero_title);
      appendValue("hero_subtitle", form.hero_subtitle);
      appendValue("hero_button_text", form.hero_button_text);
      appendValue("hero_button_link", form.hero_button_link);
      appendValue("about_title", form.about_title);
      appendValue("about_subtitle", form.about_subtitle);
      appendValue("about_description", form.about_description);
      appendValue("contact_title", form.contact_title);
      appendValue("contact_subtitle", form.contact_subtitle);
      appendValue("contact_description", form.contact_description);
      appendValue("contact_address", form.contact_address);
      appendValue("contact_hours", form.contact_hours);
      appendValue("contact_map_embed", form.contact_map_embed);
      appendValue("contact_whatsapp", form.contact_whatsapp);
      appendValue("wallet_pass_base_url", form.wallet_pass_base_url || "");
      appendValue("apple_pass_template", form.apple_pass_template || "");
      appendValue("google_wallet_jwt_template", form.google_wallet_jwt_template || "");
      appendValue("verification_email", form.verification_email);
      appendValue("verification_smtp_host", form.verification_smtp_host);
      appendValue(
        "verification_smtp_port",
        form.verification_smtp_port || "587"
      );
      appendValue(
        "verification_smtp_username",
        form.verification_smtp_username
      );
      appendValue(
        "verification_smtp_use_tls",
        form.verification_smtp_use_tls ? "1" : "0"
      );
      appendValue(
        "verification_smtp_use_ssl",
        form.verification_smtp_use_ssl ? "1" : "0"
      );
      appendValue("support_reply_email", form.support_reply_email);
      appendValue("support_smtp_host", form.support_smtp_host);
      appendValue("support_smtp_port", form.support_smtp_port || "587");
      appendValue("support_smtp_username", form.support_smtp_username);
      appendValue(
        "support_smtp_use_tls",
        form.support_smtp_use_tls ? "1" : "0"
      );
      appendValue(
        "support_smtp_use_ssl",
        form.support_smtp_use_ssl ? "1" : "0"
      );

      if (form.smtp_password && form.smtp_password.trim().length > 0) {
        formData.append("smtp_password", form.smtp_password);
      } else if (clearSmtpPassword) {
        formData.append("clear_smtp_password", "1");
      }
      if (
        form.verification_smtp_password &&
        form.verification_smtp_password.trim().length > 0
      ) {
        formData.append(
          "verification_smtp_password",
          form.verification_smtp_password
        );
      } else if (clearVerificationSmtpPassword) {
        formData.append("clear_verification_smtp_password", "1");
      }
      if (
        form.support_smtp_password &&
        form.support_smtp_password.trim().length > 0
      ) {
        formData.append("support_smtp_password", form.support_smtp_password);
      } else if (clearSupportSmtpPassword) {
        formData.append("clear_support_smtp_password", "1");
      }

      colorFields.forEach(({ key }) => {
        appendValue(key as string, form[key]);
      });

      const cleanLinks = (links: EditableLink[]) =>
        links.filter((link) => link.label || link.url);

      formData.append(
        "header_links",
        JSON.stringify(cleanLinks(form.header_links))
      );
      formData.append(
        "footer_links",
        JSON.stringify(cleanLinks(form.footer_links))
      );

      const socialObject: Record<string, string> = {};
      form.social_links.forEach((item) => {
        if (item.platform && item.url) {
          socialObject[item.platform] = item.url;
        }
      });
      formData.append("social_links", JSON.stringify(socialObject));

      const cleanHeroCards = form.hero_cards
        .slice(0, heroCardLimit)
        .map((card) => ({
          title: card.title || "",
          description: card.description || "",
          button_text: card.button_text || "",
          button_link: card.button_link || "",
          image: card.image || "",
        }));
      formData.append("hero_cards", JSON.stringify(cleanHeroCards));

      formData.append(
        "about_highlights",
        JSON.stringify(
          form.about_highlights
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        )
      );

      cleanHeroCards.forEach((_, idx) => {
        const file = heroCardFiles[idx];
        const shouldClear = heroCardImageClears[idx];
        if (file) {
          formData.append(`hero_card_image_${idx + 1}`, file);
        }
        if (shouldClear) {
          formData.append(`clear_hero_card_image_${idx + 1}`, "1");
        }
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (faviconFile) {
        formData.append("favicon", faviconFile);
      }
      if (heroFile) {
        formData.append("hero_image", heroFile);
      }
      if (aboutImageFile) {
        formData.append("about_image", aboutImageFile);
      }

      if (clearLogo) formData.append("clear_logo", "1");
      if (clearFavicon) formData.append("clear_favicon", "1");
      if (clearHero) formData.append("clear_hero_image", "1");
      if (clearAboutImage) formData.append("clear_about_image", "1");

      await api.patch("store/settings/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess("تم حفظ إعدادات المتجر بنجاح.");
      await refresh();
      await loadSettings();
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        "تعذر حفظ الإعدادات، تأكد من صحة البيانات.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <div>جاري تحميل إعدادات المتجر...</div>;
  }

  const canAddHeroCard = form.hero_cards.length < heroCardLimit;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold mb-1">إعدادات واجهة المتجر</h2>
        <p className="text-sm text-gray-600">
          من هنا يمكنك التحكم في الهوية البصرية، النصوص، الروابط والوسائط التي تظهر
          على واجهة العملاء دون الحاجة لأي تعديل برمجي.
        </p>
      </div>

      {(error || success) && (
        <div
          className={`text-xs rounded-lg px-3 py-2 ${
            error
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {error || success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              اسم المتجر
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.store_name}
              onChange={(e) => updateField("store_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              وصف قصير / سطر تعريفي
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              البريد الرئيسي للتواصل
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={form.contact_email}
              onChange={(e) => updateField("contact_email", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              بريد الدعم الفني
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={form.support_email}
              onChange={(e) => updateField("support_email", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              بريد التنبيهات والتحقق
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={form.notification_email}
              onChange={(e) =>
                updateField("notification_email", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              هاتف أو واتساب لخدمة العملاء
            </label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.contact_phone}
              onChange={(e) => updateField("contact_phone", e.target.value)}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">إعدادات بريد التحقق/إعادة التعيين</h3>
            <p className="text-xs text-gray-500 mt-1">
              استخدم هذه الإعدادات لإرسال رسائل التحقق من البريد أو إعادة تعيين كلمة المرور من عنوان مختلف.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                بريد التحقق
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={form.verification_email}
                onChange={(e) => updateField("verification_email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                عنوان الخادم
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.verification_smtp_host}
                onChange={(e) =>
                  updateField("verification_smtp_host", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">المنفذ</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={form.verification_smtp_port}
                onChange={(e) =>
                  updateField("verification_smtp_port", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">اسم المستخدم</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.verification_smtp_username}
                onChange={(e) =>
                  updateField("verification_smtp_username", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                كلمة المرور (لا تظهر لأسباب أمنية)
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                placeholder={
                  form.verification_smtp_password_set && !clearVerificationSmtpPassword
                    ? "مضبوطة سابقاً"
                    : ""
                }
                value={form.verification_smtp_password}
                onChange={(e) => {
                  const value = e.target.value;
                  setClearVerificationSmtpPassword(false);
                  setForm((prev) =>
                    prev ? { ...prev, verification_smtp_password: value } : prev
                  );
                }}
              />
              {form.verification_smtp_password_set && !clearVerificationSmtpPassword && (
                <p className="text-[11px] text-gray-500 mt-1">
                  تم تقديم كلمة مرور سابقاً. اكتب قيمة جديدة لتحديثها أو حدد خيار الإزالة.
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-[11px] text-red-500 mt-2">
                <input
                  type="checkbox"
                  checked={clearVerificationSmtpPassword}
                  onChange={(e) => {
                    setClearVerificationSmtpPassword(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev
                          ? { ...prev, verification_smtp_password: "", verification_smtp_password_set: false }
                          : prev
                      );
                    }
                  }}
                />
                إزالة كلمة المرور الحالية
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.verification_smtp_use_tls}
                  onChange={(e) =>
                    toggleSmtpOption("verification_smtp_use_tls", e.target.checked)
                  }
                />
                استخدام TLS
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.verification_smtp_use_ssl}
                  onChange={(e) =>
                    toggleSmtpOption("verification_smtp_use_ssl", e.target.checked)
                  }
                />
                استخدام SSL
              </label>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">إعدادات بريد الرد على الدعم</h3>
            <p className="text-xs text-gray-500 mt-1">
              خصص الإعدادات الخاصة ببريد الرد على الشكاوى والاقتراحات حتى يرسل من عنوان مختلف.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                بريد الرد على الدعم
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2"
                value={form.support_reply_email}
                onChange={(e) => updateField("support_reply_email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">عنوان الخادم</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.support_smtp_host}
                onChange={(e) => updateField("support_smtp_host", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">المنفذ</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={form.support_smtp_port}
                onChange={(e) => updateField("support_smtp_port", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">اسم المستخدم</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.support_smtp_username}
                onChange={(e) =>
                  updateField("support_smtp_username", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                كلمة المرور (لا تظهر لأسباب أمنية)
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                placeholder={
                  form.support_smtp_password_set && !clearSupportSmtpPassword
                    ? "مضبوطة سابقاً"
                    : ""
                }
                value={form.support_smtp_password}
                onChange={(e) => {
                  const value = e.target.value;
                  setClearSupportSmtpPassword(false);
                  setForm((prev) =>
                    prev ? { ...prev, support_smtp_password: value } : prev
                  );
                }}
              />
              {form.support_smtp_password_set && !clearSupportSmtpPassword && (
                <p className="text-[11px] text-gray-500 mt-1">
                  تم حفظ كلمة مرور لهذا البريد مسبقاً. اكتب كلمة جديدة أو احذف الحالية.
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-[11px] text-red-500 mt-2">
                <input
                  type="checkbox"
                  checked={clearSupportSmtpPassword}
                  onChange={(e) => {
                    setClearSupportSmtpPassword(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev
                          ? { ...prev, support_smtp_password: "", support_smtp_password_set: false }
                          : prev
                      );
                    }
                  }}
                />
                إزالة كلمة المرور الحالية
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.support_smtp_use_tls}
                  onChange={(e) =>
                    toggleSmtpOption("support_smtp_use_tls", e.target.checked)
                  }
                />
                استخدام TLS
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.support_smtp_use_ssl}
                  onChange={(e) =>
                    toggleSmtpOption("support_smtp_use_ssl", e.target.checked)
                  }
                />
                استخدام SSL
              </label>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">إعدادات البريد المرسل (SMTP)</h3>
            <p className="text-xs text-gray-500 mt-1">
              حدّد الخادم وبيانات الدخول التي يستخدمها المتجر لإرسال رسائل
              التحقق والتنبيهات. تأكد من مطابقة الإعدادات مع مزود خدمة البريد.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                عنوان الخادم (SMTP Host)
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.smtp_host}
                onChange={(e) => updateField("smtp_host", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                المنفذ (Port)
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={form.smtp_port}
                onChange={(e) => updateField("smtp_port", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                اسم المستخدم
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.smtp_username}
                onChange={(e) => updateField("smtp_username", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                كلمة مرور البريد (لا تظهر لأسباب أمنية)
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2"
                placeholder={
                  form.smtp_password_set && !clearSmtpPassword
                    ? "مضبوطة سابقاً"
                    : ""
                }
                value={form.smtp_password}
                onChange={(e) => {
                  const value = e.target.value;
                  setClearSmtpPassword(false);
                  setForm((prev) =>
                    prev ? { ...prev, smtp_password: value } : prev
                  );
                }}
              />
              {form.smtp_password_set && !clearSmtpPassword && (
                <p className="text-[11px] text-gray-500 mt-1">
                  تم حفظ كلمة مرور مسبقاً. اكتب كلمة جديدة لتحديثها أو حدد خيار
                  الإزالة.
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-[11px] text-red-500 mt-2">
                <input
                  type="checkbox"
                  checked={clearSmtpPassword}
                  onChange={(e) => {
                    setClearSmtpPassword(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev
                          ? { ...prev, smtp_password: "", smtp_password_set: false }
                          : prev
                      );
                    }
                  }}
                />
                إزالة كلمة المرور الحالية
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.smtp_use_tls}
                  onChange={(e) => toggleSmtpOption("smtp_use_tls", e.target.checked)}
                />
                استخدام TLS
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.smtp_use_ssl}
                  onChange={(e) => toggleSmtpOption("smtp_use_ssl", e.target.checked)}
                />
                استخدام SSL
              </label>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">تخصيص صفحة "من نحن"</h3>
            <p className="text-xs text-gray-500 mt-1">
              عدّل النصوص التي تظهر في صفحة التعريف بالمتجر، مع إمكانية إبراز نقاط
              القوة على شكل عناصر تبرز أمام العملاء.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                عنوان قسم من نحن
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.about_title}
                onChange={(e) => updateField("about_title", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                وصف قصير يظهر أسفل العنوان
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.about_subtitle}
                onChange={(e) => updateField("about_subtitle", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                المحتوى الرئيسي
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={4}
                value={form.about_description}
                onChange={(e) =>
                  updateField("about_description", e.target.value)
                }
              />
            </div>
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-600">
                نقاط القوة / ما يميزنا
              </h4>
              <div className="flex gap-2">
                <input
                  className="border rounded-lg px-3 py-1 text-xs"
                  placeholder="أضف نقطة جديدة"
                  value={aboutHighlightDraft}
                  onChange={(e) => setAboutHighlightDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs"
                  onClick={addAboutHighlight}
                >
                  + إضافة
                </button>
              </div>
            </div>
            {form.about_highlights.length === 0 && (
              <p className="text-xs text-gray-500">
                لا توجد نقاط مضافة حالياً. أضف ٣ نقاط كحد أدنى لتظهر الواجهة
                أكثر ثراءً.
              </p>
            )}
            <div className="space-y-2">
              {form.about_highlights.map((item, idx) => (
                <div
                  key={`highlight-${idx}`}
                  className="flex items-center gap-2 border rounded-lg px-3 py-2"
                >
                  <span className="text-[11px] text-gray-500">{idx + 1}.</span>
                  <input
                    className="flex-1 text-xs border-none focus:ring-0"
                    value={item}
                    onChange={(e) => updateAboutHighlight(idx, e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-[11px] text-red-500"
                    onClick={() => removeAboutHighlight(idx)}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">تخصيص صفحة "تواصل معنا"</h3>
            <p className="text-xs text-gray-500 mt-1">
              تحكّم في نصوص ومعلومات الاتصال التي تظهر للعملاء، بما في ذلك العنوان
              وساعات العمل وخريطة الموقع ورقم الواتساب.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                عنوان قسم التواصل
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.contact_title}
                onChange={(e) => updateField("contact_title", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                وصف قصير
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.contact_subtitle}
                onChange={(e) => updateField("contact_subtitle", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">
                محتوى إضافي / رسالة للعميل
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                value={form.contact_description}
                onChange={(e) =>
                  updateField("contact_description", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                العنوان التفصيلي
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.contact_address}
                onChange={(e) => updateField("contact_address", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                ساعات العمل
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.contact_hours}
                onChange={(e) => updateField("contact_hours", e.target.value)}
              />
            </div>
            <div>

              <label className="block text-xs text-gray-500 mb-1">

                رقم واتساب خدمة العملاء

              </label>

              <input

                className="w-full border rounded-lg px-3 py-2"

                value={form.contact_whatsapp}

                onChange={(e) =>

                  updateField("contact_whatsapp", e.target.value)

                }

                placeholder="+9665..."

              />

            </div>

            <div>

              <label className="block text-xs text-gray-500 mb-1">

                رابط بطاقات الولاء (الدومين الأساسي)

              </label>

              <input

                type="url"

                className="w-full border rounded-lg px-3 py-2"

                value={form.wallet_pass_base_url}

                onChange={(e) =>

                  updateField("wallet_pass_base_url", e.target.value)

                }

                placeholder="https://example.invalid"

              />

              <p className="text-[11px] text-gray-500 mt-1">

                سيتم استخدام هذا الرابط لتوليد الروابط الخاصة ببطاقات Apple/Google.

              </p>

            </div>
            <div>

              <label className="block text-xs text-gray-500 mb-1">
                إعداد Apple Wallet (pass.json)
              </label>

              <textarea
                dir="ltr"
                className="w-full border rounded-lg px-3 py-2 text-xs min-h-[120px] font-mono text-left"

                value={form.apple_pass_template}

                onChange={(e) =>
                  updateField("apple_pass_template", e.target.value)
                }

                placeholder={`{
  "description": "Loyalty Card",
  "passTypeIdentifier": "pass.com.yourcafe.loyalty"
}`}

              />

              <p className="text-[11px] text-gray-500 mt-1">
                احتفظ هنا بقالب pass.json أو أي بيانات مطلوبة من منصة Apple Wallet.
              </p>

            </div>

            <div>

              <label className="block text-xs text-gray-500 mb-1">
                إعداد Google Wallet (JWT)
              </label>

              <textarea
                dir="ltr"
                className="w-full border rounded-lg px-3 py-2 text-xs min-h-[120px] font-mono text-left"

                value={form.google_wallet_jwt_template}

                onChange={(e) =>
                  updateField("google_wallet_jwt_template", e.target.value)
                }

                placeholder={`{
  "iss": "service-account@yourcafe.iam.gserviceaccount.com",
  "payload": {
    "loyaltyClasses": [],
    "loyaltyObjects": []
  }
}`}

              />

              <p className="text-[11px] text-gray-500 mt-1">
                ضع هنا قالب JWT أو أي تفاصيل فنية تحتاجها لتكامل Google Wallet.
              </p>

            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                كود تضمين خريطة جوجل (iframe)
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-[11px]"
                rows={3}
                value={form.contact_map_embed}
                onChange={(e) =>
                  updateField("contact_map_embed", e.target.value)
                }
                placeholder='مثال: &lt;iframe src="..." /&gt;'
              />
              <p className="text-[11px] text-gray-400 mt-1">
                الصق كود Google Maps المضمن هنا لتحديث الخريطة المعروضة في صفحات
                الواجهة متى ما رغبت.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <div>
            <h3 className="font-semibold text-sm">إعدادات قسم الهيرو</h3>
            <p className="text-xs text-gray-500 mt-1">
              تحكّم بما يظهر في واجهة المتجر الرئيسية دون الحاجة للتعديل اليدوي على
              الكود.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                عنوان الهيرو
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.hero_title}
                onChange={(e) => updateField("hero_title", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                نص الزر الرئيسي
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.hero_button_text}
                onChange={(e) =>
                  updateField("hero_button_text", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                رابط الزر الرئيسي
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={form.hero_button_link}
                onChange={(e) =>
                  updateField("hero_button_link", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                وصف قصير
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                value={form.hero_subtitle}
                onChange={(e) => updateField("hero_subtitle", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-3 leading-relaxed">
            <p className="text-xs text-amber-900 font-semibold mb-1">
              بطاقات الصور الثلاث
            </p>
            <p className="text-[11px] text-amber-900/80">
              يتم حالياً عرض ثلاث صور في واجهة المتجر (سندوتشات، خفايف، أطباق
              جانبية). يمكنك تعديل النصوص والروابط لكل بطاقة من هنا. في حال ترك
              أي حقل فارغ سيتم استخدام النص الافتراضي تلقائياً.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-600">
                عدد البطاقات الحالية: {form.hero_cards.length} / {heroCardLimit}
              </p>
              <p className="text-[11px] text-gray-500">
                لا يمكن إضافة أكثر من ثلاث بطاقات للحفاظ على نفس تصميم الواجهة.
              </p>
            </div>
            <button
              type="button"
              disabled={!canAddHeroCard}
              className={`text-xs px-3 py-1 rounded-full ${
                canAddHeroCard
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
              onClick={addHeroCard}
            >
              + إضافة بطاقة
            </button>
          </div>

          {!canAddHeroCard && (
            <p className="text-[11px] text-gray-500">
              تم الوصول إلى الحد الأقصى (٣ بطاقات). أعد تعيين أي بطاقة إذا رغبت
              في البدء من جديد.
            </p>
          )}

          <div className="space-y-3">
            {form.hero_cards.length === 0 && (
              <p className="text-xs text-gray-500">
                لا توجد بطاقات محفوظة حالياً، سيتم استخدام البطاقات الافتراضية في
                الواجهة.
              </p>
            )}
            {form.hero_cards.map((card, idx) => {
              const selectedFile = heroCardFiles[idx] || null;
              const isClearing = heroCardImageClears[idx] || false;
              const hasImage = Boolean(card.image && card.image.trim().length);
              return (
                <div
                  key={`hero-card-${idx}`}
                  className="border border-amber-100 rounded-2xl p-4 space-y-3 bg-amber-50/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        البطاقة رقم {idx + 1}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        ترتبط بالصورة {idx + 1} الظاهرة في واجهة الزوار.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        className="px-3 py-1 rounded-full border border-amber-300 text-amber-700 hover:bg-white"
                        onClick={() => resetHeroCard(idx)}
                      >
                        استعادة الافتراضي
                      </button>
                      {form.hero_cards.length > 1 && (
                        <button
                          type="button"
                          className="px-3 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => removeHeroCard(idx)}
                        >
                          حذف البطاقة
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        عنوان البطاقة
                      </label>
                      <input
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={card.title}
                        onChange={(e) =>
                          updateHeroCard(idx, "title", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        رابط الزر
                      </label>
                      <input
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={card.button_link}
                        onChange={(e) =>
                          updateHeroCard(idx, "button_link", e.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-gray-500 mb-1">
                        وصف مختصر
                      </label>
                      <textarea
                        className="w-full border rounded px-2 py-1 text-xs"
                        rows={2}
                        value={card.description}
                        onChange={(e) =>
                          updateHeroCard(idx, "description", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        نص الزر
                      </label>
                      <input
                        className="w-full border rounded px-2 py-1 text-xs"
                        value={card.button_text}
                        onChange={(e) =>
                          updateHeroCard(idx, "button_text", e.target.value)
                        }
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-[11px] text-gray-500">
                        صورة البطاقة
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                        {hasImage ? (
                          <div className="relative">
                            <img
                              src={card.image}
                              alt={`معاينة البطاقة ${idx + 1}`}
                              className={`h-20 w-20 rounded-lg object-cover border border-amber-100 ${
                                isClearing ? "opacity-40" : ""
                              }`}
                            />
                            {isClearing && (
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-red-600 bg-white/70 rounded-lg">
                                سيتم الإزالة
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            لا توجد صورة محفوظة حالياً.
                          </span>
                        )}
                        {selectedFile && (
                          <span className="text-[11px] text-amber-700 font-medium">
                            تم اختيار: {selectedFile.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <input
                          className="border rounded px-2 py-1 text-xs flex-1"
                          placeholder="رابط الصورة أو مسارها"
                          value={card.image}
                          onChange={(e) =>
                            updateHeroCard(idx, "image", e.target.value)
                          }
                        />
                        <input
                          type="file"
                          accept="image/*"
                          className="text-xs"
                          onChange={(e) =>
                            handleHeroCardImageChange(
                              idx,
                              e.target.files?.[0] || null
                            )
                          }
                        />
                      </div>
                      {hasImage && (
                        <label className="inline-flex items-center gap-2 text-[11px] text-red-500">
                          <input
                            type="checkbox"
                            checked={isClearing}
                            onChange={(e) =>
                              handleHeroCardImageClearToggle(
                                idx,
                                e.target.checked
                              )
                            }
                          />
                          إزالة الصورة الحالية عند الحفظ
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-3">
          <h3 className="font-semibold text-sm">الألوان العامة</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {colorFields.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                <input
                  type="color"
                  className="w-12 h-10 border rounded-lg"
                  value={form[key] as string}
                  onChange={(e) => updateField(key, e.target.value)}
                />
                <div>
                  <p className="text-xs text-gray-600">{label}</p>
                  <input
                    className="w-full border rounded px-2 py-1 text-xs mt-1"
                    value={form[key] as string}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              نص يظهر في الهيدر العلوي (اختياري)
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={form.header_title}
              onChange={(e) => updateField("header_title", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              وصف قصير للهيدر
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={form.header_subtitle}
              onChange={(e) => updateField("header_subtitle", e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">
              نص الفوتر
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={form.footer_text}
              onChange={(e) => updateField("footer_text", e.target.value)}
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">روابط الهيدر</h3>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white"
              onClick={() => addLink("header_links")}
            >
              + إضافة رابط
            </button>
          </div>
          <div className="space-y-2">
            {form.header_links.length === 0 && (
              <p className="text-xs text-gray-500">
                لا توجد روابط إضافية في الهيدر حالياً.
              </p>
            )}
            {form.header_links.map((link, idx) => (
              <div
                key={`header-link-${idx}`}
                className="grid md:grid-cols-[1fr_1fr_auto] gap-2 border rounded-lg px-3 py-2 items-center"
              >
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="النص الظاهر"
                  value={link.label}
                  onChange={(e) =>
                    updateLink("header_links", idx, "label", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="الرابط / المسار"
                  value={link.url}
                  onChange={(e) =>
                    updateLink("header_links", idx, "url", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="text-xs text-red-500"
                  onClick={() => removeLink("header_links", idx)}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">روابط الفوتر</h3>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white"
              onClick={() => addLink("footer_links")}
            >
              + إضافة رابط
            </button>
          </div>
          <div className="space-y-2">
            {form.footer_links.length === 0 && (
              <p className="text-xs text-gray-500">
                لا توجد روابط في الفوتر حالياً.
              </p>
            )}
            {form.footer_links.map((link, idx) => (
              <div
                key={`footer-link-${idx}`}
                className="grid md:grid-cols-[1fr_1fr_auto] gap-2 border rounded-lg px-3 py-2 items-center"
              >
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="النص الظاهر"
                  value={link.label}
                  onChange={(e) =>
                    updateLink("footer_links", idx, "label", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="الرابط / المسار"
                  value={link.url}
                  onChange={(e) =>
                    updateLink("footer_links", idx, "url", e.target.value)
                  }
                />
                <button
                  type="button"
                  className="text-xs text-red-500"
                  onClick={() => removeLink("footer_links", idx)}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">روابط التواصل الاجتماعي</h3>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white"
              onClick={addSocial}
            >
              + إضافة رابط
            </button>
          </div>
          <div className="space-y-2">
            {form.social_links.length === 0 && (
              <p className="text-xs text-gray-500">
                لم تتم إضافة أي روابط تواصل حتى الآن.
              </p>
            )}
            {form.social_links.map((item, idx) => (
              <div
                key={`social-${idx}`}
                className="grid md:grid-cols-[1fr_1fr_auto] gap-2 border rounded-lg px-3 py-2 items-center"
              >
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="اسم المنصة (Instagram)"
                  value={item.platform}
                  onChange={(e) =>
                    updateSocial(idx, "platform", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="الرابط"
                  value={item.url}
                  onChange={(e) => updateSocial(idx, "url", e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs text-red-500"
                  onClick={() => removeSocial(idx)}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-4 text-sm space-y-4">
          <h3 className="font-semibold text-sm">الشعارات والوسائط</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">
                شعار المتجر (Logo)
              </label>
              {form.logo_url && !clearLogo && (
                <img
                  src={form.logo_url}
                  alt="الشعار الحالي"
                  className="h-16 object-contain border rounded-lg p-2 bg-gray-50"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={clearLogo}
                  onChange={(e) => {
                    setClearLogo(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev ? { ...prev, logo_url: null } : prev
                      );
                    }
                  }}
                />
                إزالة الشعار الحالي
              </label>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">
                أيقونة المتصفح (Favicon)
              </label>
              {form.favicon_url && !clearFavicon && (
                <img
                  src={form.favicon_url}
                  alt="Favicon"
                  className="h-12 w-12 object-contain border rounded-lg p-2 bg-gray-50"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={clearFavicon}
                  onChange={(e) => {
                    setClearFavicon(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev ? { ...prev, favicon_url: null } : prev
                      );
                    }
                  }}
                />
                إزالة الأيقونة الحالية
              </label>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">
                صورة رئيسية / بانر
              </label>
              {form.hero_image_url && !clearHero && (
                <img
                  src={form.hero_image_url}
                  alt="صورة الواجهة"
                  className="h-20 object-cover border rounded-lg"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={clearHero}
                  onChange={(e) => {
                    setClearHero(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev ? { ...prev, hero_image_url: null } : prev
                      );
                    }
                  }}
                />
                إزالة الصورة الحالية
              </label>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500">
                صورة صفحة "من نحن"
              </label>
              {form.about_image_url && !clearAboutImage && (
                <img
                  src={form.about_image_url}
                  alt="صورة من نحن"
                  className="h-20 w-full object-cover border rounded-lg"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAboutImageFile(e.target.files?.[0] || null)}
              />
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={clearAboutImage}
                  onChange={(e) => {
                    setClearAboutImage(e.target.checked);
                    if (e.target.checked) {
                      setForm((prev) =>
                        prev ? { ...prev, about_image_url: null } : prev
                      );
                    }
                  }}
                />
                إزالة صورة من نحن الحالية
              </label>
            </div>
          </div>
        </section>

        <div className="flex justify-start">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreSettingsPage;
