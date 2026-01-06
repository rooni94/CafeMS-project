import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import { useI18n } from "../../i18n";

const TermsScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);

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
    <DashboardShell title={t("terms.title", "الشروط والأحكام")} subtitle={t("terms.subtitle", "يرجى قراءة الشروط بعناية قبل استخدام التطبيق.")}>
      <DashboardSection>
        <Paragraph>{t("terms.intro", "باستخدامك لموقع CafeMS Demo أو إنشاءك لحساب، فإنك توافق على الشروط والأحكام التالية. يرجى قراءتها بعناية.")}</Paragraph>

        <SectionTitle>{t("terms.section1Title", "١. إنشاء الحساب")}</SectionTitle>
        <Bullet>{t("terms.section1Bullet1", "يجب أن تكون جميع البيانات المقدّمة صحيحة ومحدّثة.")}</Bullet>
        <Bullet>{t("terms.section1Bullet2", "أنت مسؤول عن سرية بيانات الدخول لحسابك.")}</Bullet>

        <SectionTitle>{t("terms.section2Title", "٢. الطلبات والدفع")}</SectionTitle>
        <Bullet>{t("terms.section2Bullet1", "عند تأكيد الطلب، يلتزم العميل باستلامه ودفع المبلغ المستحق.")}</Bullet>
        <Bullet>{t("terms.section2Bullet2", "قد يتم إلغاء الطلب في حالات خاصة (عدم توفر منتج، خطأ سعري، إلخ).")}</Bullet>

        <SectionTitle>{t("terms.section3Title", "٣. التوصيل والاستلام")}</SectionTitle>
        <Bullet>{t("terms.section3Bullet1", "يجب التأكد من صحة عنوان التوصيل ورقم الجوال.")}</Bullet>
        <Bullet>{t("terms.section3Bullet2", "في حال تعذّر التواصل معك قد يتم إلغاء الطلب.")}</Bullet>

        <SectionTitle>{t("terms.section4Title", "٤. الاستخدام المسموح")}</SectionTitle>
        <Bullet>{t("terms.section4Bullet1", "يُمنع إساءة استخدام المنصة أو محاولة اختراقها.")}</Bullet>
        <Bullet>{t("terms.section4Bullet2", "يحق لإدارة الكافيه إيقاف أي حساب مخالف أو مسيء دون إشعار مسبق.")}</Bullet>

        <SectionTitle>{t("terms.section5Title", "٥. التعديلات على الشروط")}</SectionTitle>
        <Paragraph>
          {t(
            "terms.section5Paragraph",
            "يحق لنا تحديث هذه الشروط والأحكام في أي وقت، وسيتم نشر النسخة المحدثة على هذه الصفحة، ويُعتبر استمرار استخدامك للمنصة موافقة على التعديلات."
          )}
        </Paragraph>

        <Paragraph>{t("terms.conclusion", "في حال عدم موافقتك على أي من هذه الشروط، يرجى التوقف عن استخدام الموقع.")}</Paragraph>
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

export default TermsScreen;
