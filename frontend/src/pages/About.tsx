import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { getSocialIcon } from "../utils/socialIcons";
import { DEFAULT_MAP_EMBED } from "../utils/mapEmbedFallback";

const DEFAULT_HIGHLIGHTS = [
  "حبوب قهوة مختارة وتحضير متقن لكل كوب.",
  "مشروبات ساخنة وباردة تناسب كل الأوقات.",
  "حلويات ومخبوزات طازجة ترافق قهوتك بأفضل شكل.",
  "خدمة لطيفة وتجربة طلب سهلة من البداية للنهاية.",
];

const About: React.FC = () => {
  const { settings } = useStoreSettings();
  const storeName = settings?.store_name?.trim() || "CafeMS Demo";
  const aboutTitle =
    settings?.about_title?.trim() || `من نحن – ${storeName}`;
  const aboutSubtitle =
    settings?.about_subtitle?.trim() ||
    "نحن مساحة دافئة تحتضن شغف القهوة والنكهات التي تُبهج يومك.";
  const aboutDescription =
    settings?.about_description?.trim() ||
    `${storeName} هو متجر كافيه يقدم القهوة والمشروبات الساخنة والمشروبات الباردة والمنعشة، بالإضافة إلى الحلويات والمخبوزات. نحرص على أن تكون تجربتك بسيطة ولطيفة: تختار، تطلب، وتستمتع.`;
  const highlights =
    settings?.about_highlights && settings.about_highlights.length > 0
      ? settings.about_highlights
      : DEFAULT_HIGHLIGHTS;
  const socialEntries = settings?.social_links
    ? Object.entries(settings.social_links).filter(([, url]) => !!url)
    : [];

  const aboutImage =
    settings?.about_image_url ||
    settings?.hero_image_url ||
    "/media/products/lk_menu/v60.jpg";
  const mapEmbed =
    (settings?.contact_map_embed && settings.contact_map_embed.trim()) ||
    DEFAULT_MAP_EMBED;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-[1.1fr_0.9fr] gap-6 items-center"
        >
          <div className="text-right space-y-3">
            <p className="text-xs text-amber-600">رحلة الطعم الأصيل</p>
            <h1 className="text-2xl md:text-3xl font-extrabold">{aboutTitle}</h1>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed">
              {aboutSubtitle}
            </p>
          </div>
          <div className="rounded-3xl overflow-hidden shadow border border-amber-100">
            <img
              src={aboutImage}
              alt={`عن ${storeName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        <div className="bg-white rounded-3xl shadow border border-amber-100 p-6 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-right"
          >
            <p className="text-sm leading-relaxed text-gray-700">
              {aboutDescription}
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              تبدأ حكايتنا من تفاصيل اليوم: اختيار حبوب القهوة بعناية، ضبط الطحن،
              وتجهيز المشروبات والحلى لتكون جاهزة لك في الوقت المناسب. نؤمن أن
              الجودة تظهر في التفاصيل الصغيرة قبل الكبيرة.
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              رؤيتنا أن يكون{" "}
              <span className="font-semibold text-amber-700">{storeName}</span>{" "}
              وجهتك اليومية التي تجد فيها كوباً متقناً ومذاقاً ثابتاً، مع خيارات
              ساخنة وباردة تناسب مزاجك، وحلويات ومخبوزات تكمل التجربة. نحدّث
              قائمتنا باستمرار ونستمع لملاحظاتكم لنحافظ على توازن رائع بين الطعم
              والخدمة وسهولة الطلب.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid md:grid-cols-2 gap-4"
          >
            {highlights.map((item, idx) => (
              <div
                key={`highlight-${idx}`}
                className="border border-amber-100 rounded-2xl px-4 py-3 text-sm flex items-start gap-3 bg-amber-50/40"
              >
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{item}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid md:grid-cols-3 gap-4 text-sm text-gray-700"
          >
            <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/40">
              <h3 className="font-semibold text-amber-700 mb-2">كيف نعمل؟</h3>
              <p className="leading-relaxed">
                فريق المطبخ يعمل على دفعات صغيرة ليبقي كل شيء طازجاً. نستلم
                الطلبات رقمياً أو من شاشة الكاشير، ثم نجهزها حسب تفضيلاتكم
                ونبلغكم فور جهوزيتها.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/40">
              <h3 className="font-semibold text-amber-700 mb-2">
                لماذا نختلف؟
              </h3>
              <p className="leading-relaxed">
                لأننا نمزج بين شغف القهوة وروح ضيافة تضع الضيف في المقام الأول.
                نصغي لآرائكم ونطوّر وصفاتنا وطريقة تحضيرنا باستمرار لنصنع تجربة
                قهوة صادقة ومختلفة.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/40">
              <h3 className="font-semibold text-amber-700 mb-2">
                رؤيتنا للمستقبل
              </h3>
              <p className="leading-relaxed">
                أن يصبح{" "}
                <span className="font-semibold text-amber-700">{storeName}</span>{" "}
                خياركم الأول للاستراحة ولقاءات الأصدقاء، وأن تظل التفاصيل
                الرقمية تسند تجربة الضيافة الواقعية.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid md:grid-cols-[1.2fr_0.8fr] gap-6"
          >
            <div className="rounded-3xl border border-amber-100 p-5 space-y-3 bg-white">
              <h3 className="text-base font-semibold text-amber-700">
                ملامح هويتنا
              </h3>
              <ul className="list-disc pr-5 text-sm text-gray-700 space-y-1">
                <li>قهوة مختارة وتحضير يركز على جودة الكوب.</li>
                <li>مشروبات ساخنة وباردة ومنعشة لكل الأوقات.</li>
                <li>حلويات ومخبوزات طازجة ترافق مشروبك.</li>
                <li>خدمة لطيفة وتجربة طلب سهلة وسريعة.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-amber-100 p-5 space-y-3 bg-white">
              <h3 className="text-base font-semibold text-amber-700">
                تواصلوا معنا
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                يسعدنا سماع آرائكم دائماً. يمكنكم ترك رسالة عبر{" "}
                <Link to="/contact" className="text-amber-700 underline">
                  صفحة تواصل معنا
                </Link>{" "}
                أو زيارة الكافيه في أي وقت خلال ساعات العمل.
              </p>
              <div className="text-sm space-y-1 text-gray-700">
                {settings?.contact_phone && (
                  <p>
                    الهاتف:{" "}
                    <a
                      href={`tel:${settings.contact_phone}`}
                      className="text-amber-700"
                    >
                      {settings.contact_phone}
                    </a>
                  </p>
                )}
                {settings?.contact_email && (
                  <p>
                    البريد:{" "}
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="text-amber-700"
                    >
                      {settings.contact_email}
                    </a>
                  </p>
                )}
                {settings?.contact_address && (
                  <p>العنوان: {settings.contact_address}</p>
                )}
              </div>
              {socialEntries.length > 0 && (
                <div className="pt-1">
                  <h4 className="text-xs font-semibold text-gray-600 mb-1">
                    تابعونا
                  </h4>
                  <div className="flex flex-wrap gap-2 w-full justify-start">
                    {socialEntries.map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row-reverse items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-50 text-right"
                      >
                        {getSocialIcon(platform)}
                        <span className="capitalize">{platform}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {mapEmbed && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="rounded-3xl border border-amber-100 p-5 space-y-3 bg-white"
            >
              <h3 className="text-base font-semibold text-amber-700">موقعنا</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {settings?.contact_address ||
                  "يمكنك إضافة عنوان الفرع من إعدادات المتجر عند تشغيل نسخة العرض المحلية."}
              </p>
              <div
                className="rounded-2xl overflow-hidden border border-amber-100"
                dangerouslySetInnerHTML={{ __html: mapEmbed }}
              />
            </motion.div>
          )}
        </div>
        <div className="text-center">
          <Link
            to="/menu"
            className="inline-flex items-center px-5 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow hover:bg-amber-600"
          >
            تصفح قائمتنا الكاملة
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;

