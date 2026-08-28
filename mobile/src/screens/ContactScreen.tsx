import React, { useMemo, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Button, Input } from "../components/ui";
import { useStoreSettings } from "../context/StoreSettingsContext";
import { useTheme } from "../theme";
import { api, parseApiError } from "../services/api";
import { normalizeArabicText } from "../utils/text";
import DashboardShell from "./dashboard/components/DashboardShell";
import DashboardSection from "./dashboard/components/DashboardSection";
import { useI18n } from "../i18n";

const extractFirstUrlFromEmbed = (html?: string | null) => {
  if (!html) return null;
  const match = html.match(/src\\s*=\\s*['\"]([^'\"]+)['\"]/i);
  return match?.[1] || null;
};

const sanitizeTel = (value: string) => value.replace(/[^0-9+]/g, "");
const buildTelLink = (value: string) => {
  const raw = sanitizeTel(value);
  if (!raw) return null;
  return raw.startsWith("+") ? `tel:${raw}` : `tel:+${raw}`;
};
const buildWhatsAppLink = (value: string) => {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
};

const socialIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
  const p = platform.toLowerCase();
  if (p.includes("instagram")) return "logo-instagram";
  if (p.includes("facebook")) return "logo-facebook";
  if (p.includes("tiktok")) return "logo-tiktok";
  if (p.includes("snap")) return "logo-snapchat";
  if (p.includes("twitter") || p.includes("x")) return "logo-twitter";
  if (p.includes("youtube")) return "logo-youtube";
  if (p.includes("whatsapp")) return "logo-whatsapp";
  return "globe-outline";
};

const ContactScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { settings } = useStoreSettings();

  const title = normalizeArabicText((settings as any)?.contact_title) || t("contact.title", "تواصل معنا");
  const subtitle =
    normalizeArabicText((settings as any)?.contact_subtitle) ||
    t("contact.subtitle", "رأيك يهمنا ويساعدنا على التطوير المستمر لخدمتنا.");

  const description =
    normalizeArabicText((settings as any)?.contact_description) ||
    t(
      "contact.description",
      "رأيك يهمنا. شاركنا رأيك حول الخدمة أو الجودة أو إذا كان عندك أي شكوى حول الخدمة المقدمة وسنقوم بمتابعة ملاحظتك خلال 24 ساعة"
    );

  const fallbackPhone = String((settings as any)?.contact_phone || "").trim();
  const fallbackWhatsapp = String((settings as any)?.contact_whatsapp || "").trim();
  const supportEmail = String((settings as any)?.support_email || "").trim();

  const address = normalizeArabicText((settings as any)?.contact_address) || "";
  const hours = normalizeArabicText((settings as any)?.contact_hours) || "";
  const mapUrl = extractFirstUrlFromEmbed((settings as any)?.contact_map_embed);

  const socialEntries: [string, string][] =
    (settings as any)?.social_links && typeof (settings as any).social_links === "object"
      ? Object.entries((settings as any).social_links as Record<string, string>).filter(([, url]) => !!url)
      : [];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert(
        t("contact.missingTitle", "بيانات ناقصة"),
        t("contact.missingBody", "يرجى إدخال الاسم والبريد الإلكتروني والرسالة.")
      );
      return;
    }

    setStatus(null);
    setSending(true);
    try {
      await api.post("contact/", {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setStatus("success");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus("error");
      Alert.alert(
        t("contact.sendErrorTitle", "تعذر الإرسال"),
        parseApiError(error, t("contact.sendErrorBody", "حدث خطأ أثناء الإرسال، حاول مرة أخرى."))
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell title={title} subtitle={subtitle} contentContainerStyle={{ paddingBottom: 18 }}>
      <DashboardSection title={t("contact.detailsTitle", "بيانات التواصل")} subtitle={description}>
        <View style={styles.contactList}>
          {fallbackPhone ? (
            <Pressable
              onPress={() => {
                const link = buildTelLink(fallbackPhone);
                if (link) Linking.openURL(link);
              }}
              style={styles.contactRow}
            >
              <Ionicons name="call-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactValue}>{fallbackPhone}</Text>
            </Pressable>
          ) : null}

          {supportEmail ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${supportEmail}`)} style={styles.contactRow}>
              <Ionicons name="mail-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactValue}>{supportEmail}</Text>
            </Pressable>
          ) : null}

          {fallbackWhatsapp ? (
            <Pressable
              onPress={() => {
                const link = buildWhatsAppLink(fallbackWhatsapp);
                if (link) Linking.openURL(link);
              }}
              style={styles.contactRow}
            >
              <Ionicons name="logo-whatsapp" size={18} color={theme.palette.accent} />
              <Text style={styles.contactValue}>{fallbackWhatsapp}</Text>
            </Pressable>
          ) : null}

          {address ? (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactValue}>{address}</Text>
            </View>
          ) : null}
          {hours ? (
            <View style={styles.contactRow}>
              <Ionicons name="time-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactValue}>{hours}</Text>
            </View>
          ) : null}

          {mapUrl ? (
            <Button title={t("contact.mapButton", "موقعنا على الخريطة")} variant="secondary" onPress={() => Linking.openURL(mapUrl)} />
          ) : null}
        </View>

        {socialEntries.length > 0 ? (
          <View style={styles.socialWrap}>
            {socialEntries.map(([platform, url]) => (
              <Pressable key={platform} onPress={() => Linking.openURL(url)} style={styles.socialPill}>
                <Ionicons name={socialIcon(platform)} size={16} color={theme.palette.accent} />
                <Text style={styles.socialText}>{platform}</Text>
              </Pressable>
            ))}
          </View>
      ) : null}
    </DashboardSection>

      <DashboardSection title={t("contact.formTitle", "إرسال رسالة")} subtitle={t("contact.formSubtitle", "شاركنا استفسارك أو ملاحظتك.")}>
        <Input label={t("contact.nameLabel", "الاسم الكامل")} value={name} onChangeText={setName} placeholder={t("contact.namePlaceholder", "اكتب اسمك")} />
        <Input label={t("contact.phoneLabel", "رقم الجوال")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+966" />
        <Input label={t("auth.emailLabel", "البريد الإلكتروني")} value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="example@mail.com" />
        <Input label={t("contact.messageLabel", "محتوى الرسالة")} value={message} onChangeText={setMessage} multiline numberOfLines={4} />

        {status === "success" ? (
          <Text style={[styles.status, { color: theme.palette.success }]}>{t("contact.success", "تم إرسال رسالتك بنجاح، شكراً لتواصلك معنا.")}</Text>
        ) : null}
        {status === "error" ? (
          <Text style={[styles.status, { color: theme.palette.danger }]}>{t("contact.sendErrorBody", "حدث خطأ أثناء الإرسال، حاول مرة أخرى.")}</Text>
        ) : null}

        <Button
          title={sending ? t("contact.sending", "جاري الإرسال...") : t("contact.sendButton", "إرسال الرسالة")}
          onPress={handleSend}
          disabled={sending}
        />
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    contactList: {
      gap: 10,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    contactValue: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: theme.palette.text,
      textAlign: isRTL ? "right" : "left",
    },
    socialWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingTop: 10,
    },
    socialPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surfaceAlt,
    },
    socialText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.palette.text,
      textAlign: isRTL ? "right" : "left",
    },
    status: {
      fontSize: 12,
      lineHeight: 18,
      textAlign: isRTL ? "right" : "left",
    },
  });

export default ContactScreen;
