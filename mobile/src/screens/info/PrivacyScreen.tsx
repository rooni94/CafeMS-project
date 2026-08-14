import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import { useI18n } from "../../i18n";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { normalizeBrandName } from "../../utils/text";

const PrivacyScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { settings } = useStoreSettings();
  const storeName = normalizeBrandName((settings as any)?.store_name, "CafeMS Demo");

  const Bullet = ({ children }: { children: string }) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: theme.palette.accent }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.palette.text }]}>{children}</Text>
    </View>
  );

  const Paragraph = ({ children }: { children: string }) => (
    <Text style={[styles.paragraph, { color: theme.palette.muted }]}>{children}</Text>
  );

  const SectionTitle = ({ children }: { children: string }) => (
    <Text style={[styles.sectionTitle, { color: theme.palette.text }]}>{children}</Text>
  );

  return (
    <DashboardShell title={t("privacy.title", "سياسة الخصوصية")} subtitle={t("privacy.subtitle", "نحترم خصوصيتك ونعامل بياناتك بسرية تامة.")}>
      <DashboardSection>
        <Paragraph>
          {t(
            "privacy.intro",
            `في ${storeName} نحترم خصوصيتك ونعامل بياناتك الشخصية بسرية تامة. تهدف هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية معلوماتك عند استخدامك لموقعنا أو تطبيقنا.`
          )}
        </Paragraph>

        <SectionTitle>{t("privacy.section1Title", "١. المعلومات التي نجمعها")}</SectionTitle>
        <Bullet>{t("privacy.section1Bullet1", "معلومات الحساب مثل الاسم، البريد الإلكتروني، رقم الجوال.")}</Bullet>
        <Bullet>{t("privacy.section1Bullet2", "عناوين التوصيل التي تقوم بإضافتها.")}</Bullet>
        <Bullet>{t("privacy.section1Bullet3", "بيانات الطلبات مثل الأطباق، المبالغ وطريقة الدفع.")}</Bullet>

        <SectionTitle>{t("privacy.section2Title", "٢. استخدام المعلومات")}</SectionTitle>
        <Paragraph>{t("privacy.section2Intro", "نستخدم بياناتك من أجل:")}</Paragraph>
        <Bullet>{t("privacy.section2Bullet1", "إنشاء الطلبات وتنفيذها وتحديث حالتها.")}</Bullet>
        <Bullet>{t("privacy.section2Bullet2", "التواصل معك بخصوص طلباتك أو استفساراتك.")}</Bullet>
        <Bullet>{t("privacy.section2Bullet3", "تحسين تجربة الاستخدام والخدمات المقدّمة.")}</Bullet>

        <SectionTitle>{t("privacy.section3Title", "٣. حماية البيانات")}</SectionTitle>
        <Paragraph>
          {t(
            "privacy.section3Body",
            "نلتزم باتخاذ الإجراءات التقنية والتنظيمية المناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الحذف."
          )}
        </Paragraph>

        <SectionTitle>{t("privacy.section4Title", "٤. مشاركة البيانات")}</SectionTitle>
        <Paragraph>
          {t(
            "privacy.section4Body",
            "لا نقوم ببيع بياناتك لأي طرف ثالث. قد نشارك بعض المعلومات مع مزودي الخدمات (مثل شركات التوصيل أو مزودي الدفع) فقط بالقدر اللازم لتنفيذ الخدمة."
          )}
        </Paragraph>

        <SectionTitle>{t("privacy.section5Title", "٥. حقوقك")}</SectionTitle>
        <Paragraph>{t("privacy.section5Intro", "يمكنك في أي وقت:")}</Paragraph>
        <Bullet>{t("privacy.section5Bullet1", "تحديث بيانات حسابك من صفحة البروفايل.")}</Bullet>
        <Bullet>{t("privacy.section5Bullet2", "طلب حذف حسابك وفقاً للأنظمة المعمول بها.")}</Bullet>

        <Paragraph>
          {t(
            "privacy.conclusion",
            "في حال وجود أي استفسار بخصوص الخصوصية يمكنك التواصل معنا من خلال صفحة \"اتصل بنا\"."
          )}
        </Paragraph>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
      marginTop: 6,
    },
    paragraph: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: isRTL ? "right" : "left",
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    bulletDot: {
      width: 18,
      textAlign: "center",
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "900",
    },
    bulletText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      textAlign: isRTL ? "right" : "left",
    },
  });

export default PrivacyScreen;
