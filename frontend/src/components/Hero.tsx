// src/components/Hero.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
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
    image: "/Hero1.jpg",
    title: "ساندوتشات تُحضّر بشغف",
    description:
      "من ساندوتش الدجاج المكسيكي إلى الحلوم المشوي، كل لقمة مصنوعة بعناية لتمنحك بداية يوم مميزة",
    ctaText: "عرض الساندوتشات",
    ctaLink: "/menu?category=2",
  },
  {
    image: "/Hero2.jpg",
    title: "خفائف تمنحك الطاقة",
    description:
      "برجر، فلافل، وخيارات خفيفة تجعل استراحة منتصف اليوم ألذ وأسعد",
    ctaText: "عرض الخفايف",
    ctaLink: "/menu?category=3",
  },
  {
    image: "/Hero3.jpg",
    title: "أطباق جانبية تكتمل بها الوجبة",
    description:
      "أطباقنا الجانبية محضّرة لتدعم وتغني نكهة اختيارك الرئيسي",
    ctaText: "الأطباق الجانبية",
    ctaLink: "/menu?category=4",
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
    const queryIndex = link.indexOf("?");
    if (queryIndex === -1) return null;
    const query = new URLSearchParams(link.slice(queryIndex));
    const categoryParam = query.get("category");
    const numeric = categoryParam ? Number(categoryParam) : null;
    return numeric && Number.isFinite(numeric) ? numeric : null;
  }
};

const Hero: React.FC<HeroProps> = ({ onCategorySelect }) => {
  const { settings } = useStoreSettings();
  const [index, setIndex] = useState(0);

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
      5000
    );
    return () => clearInterval(interval);
  }, [slides.length]);

  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 300], [0, 80]);
  const activeSlide = slides[index % slides.length];

  return (
    <section
      dir="rtl"
      className="relative h-[75vh] md:h-[80vh] w-full overflow-hidden rounded-b-[48px] md:rounded-b-[88px]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${activeSlide.image}')`,
            y: parallaxY,
          }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-6xl mx-auto w-full px-4 md:px-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-black/35 backdrop-blur-[2px] rounded-3xl px-4 py-5 md:px-6 md:py-6 shadow-lg max-w-xl border border-white/10 text-center"
          >
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs md:text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm text-amber-100 border border-white/20 inline-block"
            >
              {settings?.tagline && settings.tagline.trim().length
                ? settings.tagline
                : "CafeMS Demo – نكهة أصيلة... بلمسة من الامتنان"}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-2xl md:text-4xl font-extrabold leading-tight text-white drop-shadow-lg text-center mt-4 mb-3"
            >
              {settings?.hero_title && settings.hero_title.trim().length ? (
                <span>{settings.hero_title}</span>
              ) : (
                <>
                  أهلاً بكم في{" "}
                  <span className="text-gulfOrange">كافتيريا </span>
                  <span className="text-gulfPurple">الخليج</span>
                </>
              )}
              <span className="block text-base md:text-xl font-normal mt-3 text-amber-100">
              {settings?.hero_subtitle && settings.hero_subtitle.trim().length
                ? settings.hero_subtitle
                : activeSlide.title}
            </span>
          </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm md:text-base leading-relaxed text-gray-100 text-center mb-4"
            >
              {activeSlide.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="flex flex-wrap gap-3 pt-2 justify-center"
            >
              <Link
                to={settings?.hero_button_link || "/menu"}
                className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 shadow-md"
              >
                {settings?.hero_button_text && settings.hero_button_text.trim()
                  ? settings.hero_button_text
                  : "ابدأ الطلب الآن"}
              </Link>

              <Link
                to="/order-tracking"
                className="px-5 py-2.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-semibold backdrop-blur hover:bg-white/25"
              >
                تتبع الطلب
              </Link>

              {activeSlide.ctaText && (
                (() => {
                  const categoryId = extractCategoryId(activeSlide.ctaLink);
                  if (categoryId && onCategorySelect) {
                    return (
                      <button
                        type="button"
                        onClick={() => onCategorySelect(categoryId)}
                        className="px-5 py-2.5 rounded-full bg-white text-amber-700 text-sm font-semibold border border-amber-300 hover:bg-amber-50"
                      >
                        {activeSlide.ctaText}
                      </button>
                    );
                  }
                  if (activeSlide.ctaLink) {
                    return (
                      <Link
                        to={activeSlide.ctaLink}
                        className="px-5 py-2.5 rounded-full bg-white text-amber-700 text-sm font-semibold border border-amber-300 hover:bg-amber-50"
                      >
                        {activeSlide.ctaText}
                      </Link>
                    );
                  }
                  return null;
                })()
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
