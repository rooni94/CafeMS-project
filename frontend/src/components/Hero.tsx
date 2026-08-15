import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStoreSettings } from "../context/StoreSettingsContext";

type Slide = {
  image: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
};

const FALLBACK_SLIDES: Slide[] = [
  {
    image: "/media/products/lk_menu/v60.jpg",
    title: "قهوة V60 المقطرة",
    description:
      "تحضير يدوي هادئ يبرز نكهات القهوة بوضوح وقوام خفيف ومتوازن.",
    ctaText: "اطلب V60",
    ctaLink: "/menu",
  },
  {
    image: "/media/products/lk_menu/mango_orange_smoothie.jpg",
    title: "سموثي مانجو وبرتقال",
    description:
      "مزيج فاكهي بارد من المانجو والبرتقال لانتعاش طبيعي في كل وقت.",
    ctaText: "تصفّح المنعشات",
    ctaLink: "/menu",
  },
  {
    image: "/media/products/lk_menu/fruit_danish.jpg",
    title: "دانش فواكه طازج",
    description:
      "مخبوز هش مزين بالفواكه والتوت، مناسب لمرافقة كوب القهوة.",
    ctaText: "استكشف المخبوزات",
    ctaLink: "/menu",
  },
];

type HeroProps = {
  onCategorySelect?: (categoryId: number) => void;
};

const extractCategoryId = (link?: string | null): number | null => {
  if (!link) return null;
  try {
    const url = new URL(
      link,
      typeof window !== "undefined" ? window.location.origin : "http://localhost"
    );
    const categoryParam = url.searchParams.get("category");
    if (!categoryParam) return null;
    const numeric = Number(categoryParam);
    return Number.isFinite(numeric) ? numeric : null;
  } catch {
    return null;
  }
};

const Hero: React.FC<HeroProps> = ({ onCategorySelect }) => {
  const { settings } = useStoreSettings();
  const [index, setIndex] = useState(0);
  const storeName = settings?.store_name?.trim() || "CafeMS Demo";
  const brandPrimary = settings?.primary_color || "#f59e0b";

  const slides = useMemo(() => {
    if (settings?.hero_cards && settings.hero_cards.length > 0) {
      return settings.hero_cards.map((card, idx) => {
        const fallback = FALLBACK_SLIDES[idx % FALLBACK_SLIDES.length];
        return {
          image: card.image || fallback.image,
          title: card.title || fallback.title,
          description: card.description || fallback.description,
          ctaText: card.button_text || fallback.ctaText,
          ctaLink: card.button_link || fallback.ctaLink,
        };
      });
    }
    return FALLBACK_SLIDES;
  }, [settings?.hero_cards]);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((prev) => (prev + 1) % slides.length),
      6000
    );
    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[index % slides.length];
  const slideKey = `${index}-${activeSlide.title}-${activeSlide.image}`;
  const categoryId = extractCategoryId(activeSlide.ctaLink);

  const primaryAction = categoryId && onCategorySelect ? (
    <button
      type="button"
      onClick={() => onCategorySelect(categoryId)}
      className="rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
    >
      {activeSlide.ctaText}
    </button>
  ) : (
    <Link
      to={activeSlide.ctaLink || "/menu"}
      className="rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-950/20 transition hover:-translate-y-0.5 hover:bg-amber-400"
    >
      {activeSlide.ctaText || "تصفّح القائمة"}
    </Link>
  );

  return (
    <section
      dir="rtl"
      className="relative w-full overflow-hidden rounded-b-[42px] bg-[#211714] text-white shadow-[0_18px_45px_rgba(70,36,21,0.18)] md:rounded-b-[64px]"
    >
      <div className="mx-auto grid min-h-[540px] max-w-7xl md:min-h-[575px] md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative order-1 min-h-[270px] overflow-hidden md:order-2 md:min-h-[575px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={slideKey}
              src={activeSlide.image}
              alt={activeSlide.title}
              className="absolute inset-0 h-full w-full object-cover object-center"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-[#211714]/70 via-transparent to-[#211714]/10" />
          <div className="absolute bottom-5 right-5 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs text-amber-100 backdrop-blur-md">
            من قائمة {storeName}
          </div>
        </div>

        <div className="relative order-2 flex items-center overflow-hidden px-6 py-10 md:order-1 md:px-12 lg:px-16">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-rose-900/30 blur-3xl" />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slideKey}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative z-10 w-full max-w-xl"
            >
              <p
                className="mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide text-amber-100"
                style={{ borderColor: `${brandPrimary}66`, backgroundColor: `${brandPrimary}18` }}
              >
                {settings?.tagline?.trim() || `${storeName} — قهوة تُحضّر بذوق`}
              </p>

              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em]" style={{ color: brandPrimary }}>
                {storeName}
              </p>

              <h1 className="max-w-lg text-3xl font-black leading-[1.18] text-white md:text-5xl">
                {activeSlide.title}
              </h1>

              <p className="mt-5 max-w-lg text-base leading-8 text-stone-200 md:text-lg">
                {activeSlide.description}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {primaryAction}
                <Link
                  to="/order-tracking"
                  className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-stone-100 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  تتبع الطلب
                </Link>
              </div>

              <div className="mt-8 flex items-center gap-2" aria-label="شرائح الهيرو">
                {slides.map((slide, slideIndex) => (
                  <button
                    key={`${slide.title}-${slideIndex}`}
                    type="button"
                    aria-label={`عرض ${slide.title}`}
                    onClick={() => setIndex(slideIndex)}
                    className={`h-1.5 rounded-full transition-all ${
                      slideIndex === index % slides.length
                        ? "w-10 bg-amber-400"
                        : "w-5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Hero;
