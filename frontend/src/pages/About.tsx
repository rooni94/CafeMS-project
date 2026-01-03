import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { getSocialIcon } from "../utils/socialIcons";
import { DEFAULT_MAP_EMBED } from "../utils/mapEmbedFallback";

const DEFAULT_HIGHLIGHTS = [
  "خبز طازج وصلصات منزلية نحضّرها بشكل يومي لترافق كل لقمة.",
  "محطة قهوة مختصة ومشروبات موسمية تكتمل بها استراحتك.",
  "قائمة جانبية متوازنة بين الخفايف والسندوتشات السريعة.",
  "طاقم بخبرة محلية يقدم الضيافة الخليجية بابتسامة دائمة.",
];

const About: React.FC = () => {
  const { settings } = useStoreSettings();
  const aboutTitle =
    settings?.about_title?.trim() || "من نحن – CafeMS Demo";
  const aboutSubtitle =
    settings?.about_subtitle?.trim() ||
    "نحن مساحة دافئة تحتضن شغف الطعام ونكهاته الأصيلة.";
  const aboutDescription =
    settings?.about_description?.trim() ||
    "CafeMS Demo محطتكم اليومية للاستمتاع بسندوتشات طازجة، خفايف شهية، ومشروبات تعكس ذائقة الخليج. نؤمن بأن تجربة الطعام لا تكتمل دون خدمة مفعمة بالامتنان وسهولة في كل خطوة من الطلب حتى الاستلام.";
  const highlights =
    settings?.about_highlights && settings.about_highlights.length > 0
      ? settings.about_highlights
      : DEFAULT_HIGHLIGHTS;
  const socialEntries = settings?.social_links
    ? Object.entries(settings.social_links).filter(([, url]) => !!url)
    : [];

  const aboutImage =
    settings?.about_image_url || settings?.hero_image_url || "/Hero1.jpg";
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
              alt="عن CafeMS Demo"
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
              تبدأ حكايتنا من المطبخ؛ حيث نستيقظ باكراً لتحميص الخبز، تقطيع
              الخضار، وتحضير خلطاتنا الخاصة قبل فتح الأبواب. كل طبق يمر عبر فريق
              يضع معياراً للجودة ويهتم بإيصال الطعام سريعاً من دون التفريط بطعمه.
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              رؤيتنا أن تكون CafeMS Demo محطةً يشعر فيها الضيف أنه يعرفنا منذ
              زمن: وصفات أصيلة بطابع عصري، سرعة في الخدمة، واهتمام بالتفاصيل
              الصغيرة من اختيار التوابل وحتى نبرة الترحيب. نحدّث قائمتنا باستمرار
              ونراقب تعليقات عملائنا لنحافظ على هذا التوازن بين الأصالة
              والتجربة الحديثة.
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
                لأننا نمزج بين طهاة يعشقون التفاصيل وروح ضيافة تضع الضيف في
                المقام الأول. نصغي لآرائكم ونطور وصفاتنا وطريقة تقديمنا باستمرار
                لنصنع تجربة طعام صادقة ومختلفة.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 p-4 bg-amber-50/40">
              <h3 className="font-semibold text-amber-700 mb-2">
                رؤيتنا للمستقبل
              </h3>
              <p className="leading-relaxed">
                أن تصبح CafeMS Demo خياركم الأول لوجبات العمل ولقاءات
                الأصدقاء، وأن تظل التفاصيل الرقمية تسند تجربة الضيافة الواقعية.
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
                <li>نكهات أصيلة مستوحاة من الشارع الخليجي.</li>
                <li>مكونات طازجة يتم تجهيزها في لحظتها.</li>
                <li>خدمة سريعة ولطيفة تضع الامتنان في الواجهة.</li>
                <li>منيو متجدد يوازن بين السندوتشات والخفايف.</li>
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
                  "يمكنك زيارتنا في the demo cafe location، حيث نرحب بك في أي وقت خلال ساعات العمل."}
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

