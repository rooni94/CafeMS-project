// src/pages/Home.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/outline";
import { api } from "../services/api";
import Hero from "../components/Hero";
import { useCart } from "../context/CartContext";
import { useStoreSettings } from "../context/StoreSettingsContext";
import ProductAddonModal, { ProductAddon } from "../components/product/ProductAddonModal";
import CurrencyAmount from "../components/common/CurrencyAmount";

type Category = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
  description?: string;
  category?: number | { id: number; name: string } | null;
  addons?: ProductAddon[];
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  "المشروبات الساخنة": "/media/products/lk_menu/americano.jpg",
  "المشروبات الباردة": "/media/products/lk_menu/caramel_iced_latte.jpg",
  "المخبوزات": "/media/products/lk_menu/fruit_danish.jpg",
  "الحلويات": "/media/products/lk_menu/red_velvet_cake.jpg",
  "فطور خفيف": "/media/products/lk_menu/breakfast_burger.png",
  "عصائر ومشروبات منعشة": "/media/products/lk_menu/mango_orange_smoothie.jpg",
};

const getCategoryFallback = (category: Category) =>
  CATEGORY_FALLBACKS[category.name] ||
  "/media/products/lk_menu/assets/latte_art_1.jpg";

const FALLBACK_SOCIAL_LINKS: Record<string, string> = {
  instagram: "",
  snapchat: "",
  twitter: "",
  facebook: "",
};

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "إنستغرام", gradient: "from-rose-500 to-orange-400" },
  { key: "snapchat", label: "سناب شات", gradient: "from-yellow-400 to-amber-500" },
  { key: "twitter", label: "تويتر", gradient: "from-sky-500 to-blue-500" },
  { key: "facebook", label: "فيسبوك", gradient: "from-blue-500 to-indigo-600" },
];

const CONTACT_INFO_FALLBACK = {
  address: "",
  hours: "يومياً من 8 صباحاً حتى 12 منتصف الليل",
  phone: "",
  email: "",
  whatsapp: "",
};

const renderSocialIcon = (platform: string) => {
  switch (platform) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "snapchat":
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M7 7.8C7 4.7 9.5 3 12 3s5 1.7 5 4.8c0 3 1 4 2 4.8-1.1 1.1-2.8 1.2-3 2.9-.6 0-1 0-1.6.5-.8.7-2.1 1.9-3.4 1.9s-2.6-1.2-3.4-1.9c-.6-.5-1-.5-1.6-.5-.1-1.7-1.8-1.8-3-2.9 1-.8 2-1.8 2-4.8Z" />
        </svg>
      );
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M21 6.5c-.7.3-1.4.5-2.1.6a3.4 3.4 0 0 0-5.8 3v.7a9.7 9.7 0 0 1-8-4.2s-2.5 6.8 4.8 9.8c-3 .2-4.4 1.9-4.4 1.9s3.2 1 6.4-.4c3.3-1.4 5.8-4.8 5.8-8.8a3 3 0 0 0 0-.6A4.8 4.8 0 0 0 21 6.5Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M13.5 21v-6.7h2.3l.4-2.7h-2.7V9.1c0-.8.3-1.3 1.3-1.3H16V5.3a15.5 15.5 0 0 0-1.9-.1c-2 0-3.4 1.2-3.4 3.5v1.9H9v2.6h1.7V21h2.8Z" />
        </svg>
      );
    default:
      return (
        <span className="w-4 h-4 rounded-full bg-white/40 inline-flex items-center justify-center">
          •
        </span>
      );
  }
};

const getContactChannelIcon = (key: string): React.ReactNode => {
  switch (key) {
    case "whatsapp":
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-green-600"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2a9.9 9.9 0 0 0-8.4 15.3L2 22l4.9-1.6A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.1-2.9 1 1-2.8-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-5.9c-.2-.1-1.3-.7-1.5-.8s-.4-.1-.6.1l-.6.7a.5.5 0 0 1-.6.1 6.7 6.7 0 0 1-3.2-2.8.5.5 0 0 1 0-.6l.4-.5a1.2 1.2 0 0 0 .1-.6 10 10 0 0 0-.5-1.2c-.1-.3-.3-.7-.4-1s-.3-.3-.6-.4h-.5a1 1 0 0 0-.7.3c-.3.3-1 1-1 2.3s1 2.7 1.2 2.9a13.8 13.8 0 0 0 5 3.6 4.7 4.7 0 0 0 2.2.4c.3 0 1.3-.5 1.5-1s.2-1 .2-1.1-.1-.3-.3-.4Z" />
        </svg>
      );
    case "email":
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-amber-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 6 8 6 8-6" />
        </svg>
      );
    case "phone":
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-amber-600"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6.6 2h2.4c.4 0 .8.3.9.7l1 3.4a1 1 0 0 1-.3 1L8.8 8.8c1 2.2 2.9 4 5.1 5.1l1.7-1.8a1 1 0 0 1 1-.2l3.4 1c.4.1.8.5.8.9v2.4a1 1 0 0 1-1 1A14.8 14.8 0 0 1 4 5.6c0-.5.4-1 1-1Z" />
        </svg>
      );
    default:
      return (
        <span className="inline-block w-4 h-4 rounded-full bg-amber-200" aria-hidden="true" />
      );
  }
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name?.trim() || "CafeMS Demo";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const productsSectionRef = useRef<HTMLElement | null>(null);
  const [pendingScrollToProducts, setPendingScrollToProducts] =
    useState(false);

  // نموذج الشكاوى والاقتراحات
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);

  const contactInfo = {
    address: settings?.contact_address?.trim() || CONTACT_INFO_FALLBACK.address,
    hours: settings?.contact_hours?.trim() || CONTACT_INFO_FALLBACK.hours,
    phone: settings?.contact_phone?.trim() || CONTACT_INFO_FALLBACK.phone,
    email: settings?.support_email?.trim() || CONTACT_INFO_FALLBACK.email,
    whatsapp: settings?.contact_whatsapp?.trim() || CONTACT_INFO_FALLBACK.whatsapp,
  };

  const sanitizeDigits = (value?: string) =>
    (value || "").replace(/[^0-9]/g, "");
  const sanitizeTel = (value?: string) => {
    if (!value) return "";
    const raw = value.replace(/[^0-9+]/g, "");
    if (!raw) return "";
    return raw.startsWith("+") ? raw : `+${raw}`;
  };
  const buildTelLink = (value?: string) => {
    const sanitized = sanitizeTel(value);
    return sanitized ? `tel:${sanitized}` : "";
  };
  const buildWhatsAppLink = (value?: string) => {
    const digits = sanitizeDigits(value);
    return digits ? `https://wa.me/${digits}` : "";
  };

  const missionTitle =
    settings?.about_title?.trim() || `رسالتنا في ${storeName}`;
  const missionTagline =
    settings?.about_subtitle?.trim() ||
    "نمزج بين شغف القهوة ولمساتنا الخاصة لنصنع لحظة ممتعة في كل كوب.";
  const missionParagraphs =
    settings?.about_description?.trim()
      ? settings.about_description
          .split("\n")
          .map((paragraph: string) => paragraph.trim())
          .filter((paragraph) => paragraph.length > 0)
      : [
          "رسالتنا بسيطة: نقدّم قهوة ومشروبات ساخنة وباردة وحلويات ومخبوزات تُحضّر بذوق لتمنحك لحظة استراحة حقيقية وسط إيقاع اليوم السريع. نعتني بالتفاصيل من اختيار الحبوب حتى تقديم الكوب.",
          `نراجع آراء ضيوفنا يومياً ونطوّر الوصفات وطريقة الخدمة لتبقى التجربة سهلة ودافئة سواء زرتنا في الفرع أو عبر الطلبات الرقمية. كل تفصيلة نضيفها هدفها أن تبقى رحلتك مع ${storeName} ألذ وأسهل.`,
        ];
  const summaryText =
    Array.isArray(settings?.about_highlights) && settings?.about_highlights?.length
      ? settings.about_highlights[0]
      : `إليك أهم بيانات التواصل اليومية مع ${storeName} في حال احتجت لأي دعم أو متابعة خاصة.`;
  const missionLinkLabel = "تعرف أكثر على قصتنا";
  const summaryTitle = "ملخص سريع";
  const summaryItems = [
    { label: "العنوان", value: contactInfo.address },
    { label: "ساعات العمل", value: contactInfo.hours },
    { label: "رقم التواصل", value: contactInfo.phone },
  ];

  const contactTitle = settings?.contact_title?.trim() || "الشكاوى والاقتراحات";
  const contactSubtitle =
    settings?.contact_description?.trim() ||
    "رأيك يهمنا. شاركنا رأيك حول الخدمة أو الجودة أو إذا كان عندك أي شكوى حول الخدمة المقدمة وسنقوم بمتابعة ملاحظتك خلال 24 ساعة";
  const socialHeading = "تابعنا على قنوات التواصل";
  const contactSocialText = "يمكنك أيضاً متابعتنا لمعرفة آخر العروض والأخبار.";

  const contactChannels = [
    {
      key: "whatsapp",
      label: "واتساب الخدمة",
      value: contactInfo.whatsapp,
      hint: "رد سريع خلال أوقات العمل.",
      href: buildWhatsAppLink(contactInfo.whatsapp),
      external: true,
    },
    {
      key: "email",
      label: "بريد الدعم الفني",
      value: contactInfo.email,
      hint: "لمتابعة الشكاوى الرسمية والاقتراحات.",
      href: contactInfo.email ? `mailto:${contactInfo.email}` : "",
    },
    {
      key: "phone",
      label: "هاتف مباشر",
      value: contactInfo.phone,
      hint: "تواصل فوري مع مشرف الفرع.",
      href: buildTelLink(contactInfo.phone),
    },
  ].filter((channel) => channel.value);

  const socialEntries = SOCIAL_PLATFORMS.map((platform) => {
    const value =
      (settings?.social_links && settings.social_links[platform.key]) ||
      FALLBACK_SOCIAL_LINKS[platform.key];
    if (!value) return null;
    return { ...platform, url: value };
  }).filter(Boolean) as {
    key: string;
    label: string;
    gradient: string;
    url: string;
  }[];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get("products/items/"),
          api.get("products/categories/"),
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
      } catch (error) {
        console.error("Error loading home data", error);
        setLoadError("تعذر تحميل القائمة حالياً. تأكد من الاتصال بالإنترنت ثم أعد المحاولة.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setSending(true);

    try {
      await api.post("contact/", {
        name,
        phone,
        email,
        message,
      });
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  const getCategoryId = (product: Product): number | null => {
    if (product.category == null) return null;
    if (typeof product.category === "number") return product.category;
    if (typeof product.category === "object" && "id" in product.category)
      return product.category.id;
    return null;
  };

  const visibleProducts = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => getCategoryId(p) === activeCategory);
  }, [products, activeCategory]);

  const requestProductsScroll = () => {
    setPendingScrollToProducts(true);
  };

  useEffect(() => {
    if (!pendingScrollToProducts) return;
    const frame = requestAnimationFrame(() => {
      if (productsSectionRef.current) {
        productsSectionRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      setPendingScrollToProducts(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingScrollToProducts]);

  const handleCategoryReveal = (categoryId: number | null) => {
    setActiveCategory(categoryId);
    setShowAllProducts(true);
    requestProductsScroll();
  };

  const handleAddRequest = (product: Product) => {
    if (product.addons && product.addons.length > 0) {
      setAddonProduct(product);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  const handleConfirmAddons = (addons: ProductAddon[]) => {
    if (!addonProduct) return;
    const addonsTotal = addons.reduce(
      (sum, addon) => sum + (Number(addon.price_delta) || 0),
      0
    );
    addItem({
      id: addonProduct.id,
      name: addonProduct.name,
      price: Number(addonProduct.price || 0) + addonsTotal,
      image: addonProduct.image,
      addons,
    });
    setAddonProduct(null);
  };

  return (
    <div className="max-w-full min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-gray-900">
      {/* HERO SECTION */}
      <div className="-mt-4 sm:-mt-6 mb-10">
        <Hero onCategorySelect={(id) => handleCategoryReveal(id)} />
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-14 space-y-10">
        {/* التصنيفات + عنوان القائمة */}
        <section className="pt-4">
          <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-4 md:p-6 text-center space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-amber-600">اختر ما تحب من أطباقنا</p>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                قائمة الأصناف المختارة
              </h2>
              <Link
                to="/menu"
                className="text-xs text-amber-700 hover:underline self-center"
              >
                اكتشف القائمة الكاملة
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {!loading &&
                categories.map((cat) => {
                  const img = cat.image || getCategoryFallback(cat);
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => handleCategoryReveal(cat.id)}
                      className={`rounded-3xl border text-right overflow-hidden transition ${
                        activeCategory === cat.id
                          ? "border-amber-400 shadow-lg"
                          : "border-amber-100 shadow-sm"
                      }`}
                    >
                      <div className="h-36 overflow-hidden">
                        <img
                          src={img}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 space-y-1 bg-white">
                        <p className="text-sm font-semibold">{cat.name}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {cat.description ||
                            "تذوق تشكيلتنا المتميزة من هذا الصنف."}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
            </div>

            <button
            onClick={() => handleCategoryReveal(null)}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
            >
              عرض جميع الأصناف
            </button>
          </div>
        </section>

        {/* الأصناف */}
        {(showAllProducts || activeCategory !== null) && (
        <section
          id="products"
          ref={productsSectionRef}
          className="space-y-4"
        >
          {loading ? (
            <p className="text-xs text-gray-500">جاري تحميل الأصناف...</p>
          ) : loadError ? (
            <div className="text-sm text-red-500 bg-white/70 border border-red-100 rounded-2xl px-4 py-3">
              {loadError}
            </div>
          ) : visibleProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              لا توجد أصناف بهذا التصنيف حالياً.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {visibleProducts.map((p, index) => (
                <motion.div
                  key={p.id}
                  className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden flex flex-col"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/product/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/product/${p.id}`);
                    }
                  }}
                >
                  <div className="aspect-[4/3] bg-amber-50 overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-amber-700">
                        صورة المنتج
                      </span>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-semibold text-sm mb-1">{p.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {p.description || `صنف من قائمة ${storeName}.`}
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-amber-700">
                        <CurrencyAmount value={p.price} />
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddRequest(p);
                          }}
                          aria-label="إضافة إلى السلة"
                          title="إضافة إلى السلة"
                          className="w-8 h-8 rounded-full bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
        )}

        {/* ABOUT / قسم تعريفي مختصر */}
        <section
          id="about"
          className="bg-white border border-amber-100 rounded-3xl py-8 px-4 md:px-6"
        >
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-3">
                <p className="text-xs tracking-wide text-amber-600">
                  {missionTagline}
                </p>
                <h2 className="text-xl md:text-2xl font-bold">
                  {missionTitle}
                </h2>
                {missionParagraphs.map((paragraph, idx) => (
                  <p
                    key={`mission-paragraph-${idx}`}
                    className="text-sm text-gray-700 leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
                <div className="pt-2">
                  <Link
                    to="/about"
                    className="inline-flex items-center text-xs text-amber-700 hover:underline gap-1"
                  >
                    <span>{missionLinkLabel}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm space-y-3"
            >
              <div>
                <h3 className="font-semibold mb-1">{summaryTitle}</h3>
                <p className="text-gray-700">{summaryText}</p>
              </div>
              <div className="space-y-3">
                {summaryItems.map((item) => (
                  <div
                    key={item.label}
                    className="bg-white/80 rounded-xl border border-amber-100 px-3 py-2"
                  >
                    <span className="text-xs text-gray-500">{item.label}</span>
                    <p className="text-sm font-medium text-gray-800 break-words">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* نموذج الشكاوى والاقتراحات (مختصر في الهوم) */}
        <section className="space-y-4">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl shadow-sm border border-amber-100 p-5 md:p-6 space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-start md:gap-6">
              <div className="text-right space-y-4 order-1 md:order-2 md:w-1/2">
                {contactChannels.length > 0 && (
                  <div className="grid sm:grid-cols-3 gap-3">
                    {contactChannels.map((channel) => (
                      <div
                        key={channel.key}
                        className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-right flex flex-col items-end"
                      >
                        <div className="flex items-center justify-between gap-2 w-full text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-gray-600">
                            {channel.label}
                          </span>
                          <span className="text-amber-600 text-base">
                            {getContactChannelIcon(channel.key)}
                          </span>
                        </div>
                        {channel.href ? (
                          <a
                            href={channel.href}
                            target={channel.external ? "_blank" : undefined}
                            rel={channel.external ? "noreferrer" : undefined}
                            className={`${
                              channel.key === "email"
                                ? "text-sm"
                                : "text-base"
                            } font-semibold text-gray-900 w-full text-left underline-offset-2 hover:underline ${
                              channel.key === "email"
                                ? "whitespace-normal break-words text-sm"
                                : "text-base"
                            }`}
                            dir="ltr"
                          >
                            {channel.value}
                          </a>
                        ) : (
                          <p
                            className="text-base font-semibold text-gray-900 break-all w-full text-left"
                            dir="ltr"
                          >
                            {channel.value}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-1 self-stretch text-right">
                          {channel.hint}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {socialEntries.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-700">
                        {socialHeading}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        {contactSocialText}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full justify-start">
                      {socialEntries.map(({ key, label, gradient, url }) => (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs bg-gradient-to-r ${gradient}`}
                        >
                          <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                            {renderSocialIcon(key)}
                          </span>
                          <span>{label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="order-2 md:order-1 md:w-1/2 space-y-3">
                <div className="text-right space-y-1">
                  <p className="text-xs font-semibold text-amber-600">
                    هل لديك شكوى أو اقتراح؟
                  </p>
                  <h2 className="text-lg md:text-xl font-bold">
                    {contactTitle}
                  </h2>
                </div>
                <p className="text-sm text-gray-700 text-right">
                  {contactSubtitle ||
                    "رأيك يهمنا. شاركنا رأيك حول الخدمة أو الجودة أو إذا كان عندك أي شكوى حول الخدمة المقدمة وسنقوم بمتابعة ملاحظتك خلال 24 ساعة."}
                </p>

                <form
                  onSubmit={handleContactSubmit}
                  className="grid md:grid-cols-2 gap-4 text-sm"
                >
              <div className="space-y-1 md:col-span-1">
                <label className="block text-gray-700">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
                />
              </div>

              <div className="space-y-1 md:col-span-1">
                <label className="block text-gray-700">رقم التواصل</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966"
                  className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
                />
              </div>

              <div className="space-y-1 md:col-span-2 md:col-start-1">
                <label className="block text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-gray-700">نص الشكوى أو الاقتراح</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40 resize-none"
                ></textarea>
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row justify-end items-center gap-3">
                <div className="flex-1 text-left sm:text-right text-xs">
                  {status === "success" && (
                    <span className="text-emerald-600">
                      تم استلام رسالتك وسنعاود الاتصال بك قريباً.
                    </span>
                  )}
                  {status === "error" && (
                    <span className="text-red-500">
                      حدث خطأ أثناء الإرسال، حاول مجدداً.
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
                >
                  {sending ? "جارٍ الإرسال..." : "إرسال الملاحظة"}
                </button>
              </div>
                </form>
              </div>
            </div>
          </motion.section>
        </section>
      </main>
      {addonProduct && (
        <ProductAddonModal
          product={addonProduct}
          onClose={() => setAddonProduct(null)}
          onConfirm={handleConfirmAddons}
        />
      )}

    </div>
  );
};

export default Home;

