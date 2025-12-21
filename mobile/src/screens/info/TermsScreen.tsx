import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const TermsScreen: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
    <DashboardShell title="الشروط والأحكام" subtitle="يرجى قراءة الشروط بعناية قبل استخدام التطبيق.">
      <DashboardSection>
        <Paragraph>
          باستخدامك لموقع CafeMS Demo أو إنشاءك لحساب، فإنك توافق على الشروط
          والأحكام التالية. يرجى قراءتها بعناية.
        </Paragraph>

        <SectionTitle>١. إنشاء الحساب</SectionTitle>
        <Bullet>يجب أن تكون جميع البيانات المقدّمة صحيحة ومحدّثة.</Bullet>
        <Bullet>أنت مسؤول عن سرية بيانات الدخول لحسابك.</Bullet>

        <SectionTitle>٢. الطلبات والدفع</SectionTitle>
        <Bullet>عند تأكيد الطلب، يلتزم العميل باستلامه ودفع المبلغ المستحق.</Bullet>
        <Bullet>قد يتم إلغاء الطلب في حالات خاصة (عدم توفر منتج، خطأ سعري، إلخ).</Bullet>

        <SectionTitle>٣. التوصيل والاستلام</SectionTitle>
        <Bullet>يجب التأكد من صحة عنوان التوصيل ورقم الجوال.</Bullet>
        <Bullet>في حال تعذّر التواصل معك قد يتم إلغاء الطلب.</Bullet>

        <SectionTitle>٤. الاستخدام المسموح</SectionTitle>
        <Bullet>يُمنع إساءة استخدام المنصة أو محاولة اختراقها.</Bullet>
        <Bullet>يحق لإدارة الكافتيريا إيقاف أي حساب مخالف أو مسيء دون إشعار مسبق.</Bullet>

        <SectionTitle>٥. التعديلات على الشروط</SectionTitle>
        <Paragraph>
          يحق لنا تحديث هذه الشروط والأحكام في أي وقت، وسيتم نشر النسخة المحدثة
          على هذه الصفحة، ويُعتبر استمرار استخدامك للمنصة موافقة على التعديلات.
        </Paragraph>

        <Paragraph>
          في حال عدم موافقتك على أي من هذه الشروط، يرجى التوقف عن استخدام الموقع.
        </Paragraph>
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
      marginTop: 6,
      writingDirection: "rtl",
    },
    paragraph: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: "right",
      writingDirection: "rtl",
    },
    bulletRow: {
      flexDirection: "row-reverse",
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
      textAlign: "right",
      writingDirection: "rtl",
    },
  });

export default TermsScreen;

