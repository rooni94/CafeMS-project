import React, { useMemo } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../components/ui";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useTheme } from "../../theme";
import { normalizeArabicText } from "../../utils/text";
import { goToTab } from "../../navigation/helpers";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const DEFAULT_HIGHLIGHTS = [
  "منتجات يومية بجودة عالية وطعم ثابت.",
  "خيارات متنوعة تناسب جميع الأذواق.",
  "طلب سريع وتجربة استخدام سهلة.",
  "خدمة عملاء سريعة ومتابعة للطلبات.",
];

const extractFirstUrlFromEmbed = (html?: string | null) => {
  if (!html) return null;
  const match = html.match(/src\\s*=\\s*['\"]([^'\"]+)['\"]/i);
  return match?.[1] || null;
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

const AboutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { settings } = useStoreSettings();

  const aboutTitle = normalizeArabicText((settings as any)?.about_title) || "من نحن";
  const aboutSubtitle = normalizeArabicText((settings as any)?.about_subtitle) || "معلومات عن المتجر ورسالتنا.";
  const aboutDescription =
    normalizeArabicText((settings as any)?.about_description) ||
    "نقدّم لك تجربة مميزة من الساندوتشات والمشروبات والحلويات بجودة عالية وخدمة سريعة. هدفنا أن تكون عملية الطلب سهلة وواضحة من أول خطوة حتى استلام الطلب.";

  const aboutImageUrl = (settings as any)?.about_image_url || (settings as any)?.hero_image_url || null;
  const highlights: string[] =
    Array.isArray((settings as any)?.about_highlights) && (settings as any).about_highlights.length
      ? (settings as any).about_highlights.map((x: any) => normalizeArabicText(String(x)))
      : DEFAULT_HIGHLIGHTS;

  const socialEntries: [string, string][] =
    (settings as any)?.social_links && typeof (settings as any).social_links === "object"
      ? Object.entries((settings as any).social_links as Record<string, string>).filter(([, url]) => !!url)
      : [];

  const contactPhone = String((settings as any)?.contact_phone || "").trim();
  const contactEmail = String((settings as any)?.contact_email || (settings as any)?.support_email || "").trim();
  const contactAddress = normalizeArabicText((settings as any)?.contact_address) || "";
  const mapUrl = extractFirstUrlFromEmbed((settings as any)?.contact_map_embed);

  return (
    <DashboardShell title="من نحن" subtitle={aboutSubtitle} contentContainerStyle={styles.container}>
      <DashboardSection title={aboutTitle} subtitle="نبذة سريعة عن المتجر">
        {aboutImageUrl ? <Image source={{ uri: aboutImageUrl }} style={styles.heroImage} resizeMode="cover" /> : null}
        <Text style={styles.body}>{aboutDescription}</Text>
        <Button title="اذهب إلى القائمة" onPress={() => goToTab(navigation, "Menu")} />
      </DashboardSection>

      <DashboardSection title="لماذا نحن؟" subtitle="أبرز ما يميزنا">
        <View style={styles.list}>
          {highlights.map((item) => (
            <View key={item} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.palette.success} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="تواصل معنا" subtitle="نسعد بخدمتك دائماً">
        <View style={styles.contactList}>
          {contactPhone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${contactPhone}`)} style={styles.contactRow}>
              <Ionicons name="call-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactText}>{contactPhone}</Text>
            </Pressable>
          ) : null}
          {contactEmail ? (
            <Pressable onPress={() => Linking.openURL(`mailto:${contactEmail}`)} style={styles.contactRow}>
              <Ionicons name="mail-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactText}>{contactEmail}</Text>
            </Pressable>
          ) : null}
          {contactAddress ? (
            <View style={styles.contactRow}>
              <Ionicons name="location-outline" size={18} color={theme.palette.accent} />
              <Text style={styles.contactText}>{contactAddress}</Text>
            </View>
          ) : null}
          {mapUrl ? <Button title="فتح الموقع على الخريطة" variant="secondary" onPress={() => Linking.openURL(mapUrl)} /> : null}
          <Button title="راسلنا الآن" onPress={() => navigation.navigate("Contact")} />
        </View>

        {socialEntries.length ? (
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
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingBottom: 18,
    },
    heroImage: {
      width: "100%",
      height: 160,
      backgroundColor: theme.palette.surfaceAlt,
      borderRadius: 18,
    },
    body: {
      fontSize: 13,
      color: theme.palette.text,
      textAlign: "right",
      lineHeight: 20,
      writingDirection: "rtl",
    },
    list: {
      gap: 10,
      paddingTop: 4,
    },
    listRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    listText: {
      flex: 1,
      textAlign: "right",
      color: theme.palette.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      writingDirection: "rtl",
    },
    contactList: {
      gap: 10,
    },
    contactRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 10,
    },
    contactText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: theme.palette.text,
      textAlign: "right",
      writingDirection: "rtl",
    },
    socialWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
      paddingTop: 10,
    },
    socialPill: {
      flexDirection: "row-reverse",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.palette.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.palette.border,
    },
    socialText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.palette.text,
      writingDirection: "rtl",
    },
  });

export default AboutScreen;

