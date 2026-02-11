import React, { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { getSocialIcon } from "../utils/socialIcons";
import { DEFAULT_MAP_EMBED } from "../utils/mapEmbedFallback";

const Contact: React.FC = () => {
  const { settings } = useStoreSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const socialEntries = settings?.social_links
    ? Object.entries(settings.social_links).filter(([, url]) => !!url)
    : [];

  const mapEmbed =
    (settings?.contact_map_embed && settings.contact_map_embed.trim()) ||
    DEFAULT_MAP_EMBED;

  const fallbackPhone = settings?.contact_phone?.trim() || "+10000000000";
  const fallbackWhatsapp =
    settings?.contact_whatsapp?.trim() || "+10000000000";
  const supportEmail =
    settings?.support_email?.trim() || "contact@example.invalid";

  const sanitizeTel = (value: string) => {
    const raw = value.replace(/[^0-9+]/g, "");
    if (!raw) return "";
    return raw.startsWith("+") ? raw : `+${raw}`;
  };
  const buildTelLink = (value: string) => {
    const sanitized = sanitizeTel(value);
    return sanitized ? `tel:${sanitized}` : "";
  };
  const buildWhatsAppLink = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-right space-y-2"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold">
            {settings?.contact_title?.trim() || "تواصل معنا"}
          </h1>
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">
            {settings?.contact_subtitle?.trim() ||
              "يسعدنا سماع رسالتك ومساعدتك في أي استفسار."}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl shadow border border-amber-100 p-6 space-y-4 text-sm text-right"
          >
            <p className="text-gray-700 leading-relaxed">
            {settings?.contact_description?.trim() ||
                "للاستفسارات حول الطلبات، القهوة والمشروبات، الحلويات والمخبوزات، أو لأي ملاحظة لتحسين تجربتك في لاڤـا كافيـه—اترك رسالتك وسنرد عليك في أقرب وقت ممكن."}
            </p>
            <div className="space-y-2 text-gray-700 text-right">
              {fallbackPhone && (
                <p>
                  الهاتف:{" "}
                  <a href={buildTelLink(fallbackPhone)} className="text-amber-700 font-semibold" dir="ltr">
                    {fallbackPhone}
                  </a>
                </p>
              )}
              {supportEmail && (
                <p>
                  بريد الدعم الفني:{" "}
                  <a
                    href={`mailto:${supportEmail}`}
                    className="text-amber-700 font-semibold"
                    dir="ltr"
                  >
                    {supportEmail}
                  </a>
                </p>
              )}
              {fallbackWhatsapp && (
                <p>
                  واتساب:{" "}
                  <a
                    href={buildWhatsAppLink(fallbackWhatsapp)}
                    className="text-amber-700 font-semibold"
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                  >
                    {fallbackWhatsapp}
                  </a>
                </p>
              )}
              {settings?.contact_address && (
                <p>العنوان: {settings.contact_address}</p>
              )}
              {settings?.contact_hours && <p>ساعات العمل: {settings.contact_hours}</p>}
            </div>

            {socialEntries.length > 0 && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold mb-2">روابط التواصل</h3>
                <div className="flex flex-wrap gap-2 w-full justify-start">
                  {socialEntries.map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-amber-100 hover:bg-amber-50"
                    >
                      {getSocialIcon(platform)}
                      <span className="capitalize">{platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {mapEmbed && (
              <div className="pt-3 border-t border-dashed border-amber-100">
                <h3 className="text-sm font-semibold mb-2">موقعنا على الخريطة</h3>
                <div
                  className="rounded-2xl overflow-hidden border border-amber-100"
                  dangerouslySetInnerHTML={{ __html: mapEmbed }}
                />
              </div>
            )}
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl shadow border border-amber-100 p-6 space-y-4 text-sm"
          >
            <div className="space-y-1">
              <label className="block text-gray-700">الاسم الكامل</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-700">رقم الجوال</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966"
                className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-700">البريد الإلكتروني</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-700">محتوى الرسالة</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full border border-amber-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50/40 resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end items-center gap-3">
              {status === "success" && (
                <span className="text-xs text-emerald-600">
                  تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا.
                </span>
              )}
              {status === "error" && (
                <span className="text-xs text-red-500">
                  حدث خطأ أثناء الإرسال، حاول مرة أخرى.
                </span>
              )}
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
              >
                {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
