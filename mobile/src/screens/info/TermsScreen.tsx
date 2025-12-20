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
    <DashboardShell title="الشروط والأحكام" subtitle="يرجى قراءة الشروط قبل استخدام التطبيق.">
      <DashboardSection>
        <Paragraph>
          باستخدامك للتطبيق فإنك توافق على هذه الشروط. إذا لم توافق، يرجى التوقف عن استخدام التطبيق.
        </Paragraph>

        <SectionTitle>استخدام التطبيق</SectionTitle>
        <Bullet>يلتزم المستخدم بتقديم معلومات صحيحة ومحدثة عند إنشاء الحساب.</Bullet>
        <Bullet>يُمنع إساءة استخدام التطبيق أو محاولة الوصول غير المصرح به للخدمات.</Bullet>

        <SectionTitle>الطلبات والأسعار</SectionTitle>
        <Bullet>الأسعار المعروضة تشمل ما يتم عرضه داخل التطبيق وقد تتغير وفقاً للعرض أو التحديث.</Bullet>
        <Bullet>قد تختلف توافر المنتجات حسب المخزون، وسيتم توضيح ذلك قدر الإمكان.</Bullet>

        <SectionTitle>الدفع والاستلام</SectionTitle>
        <Bullet>يُطلب من المستخدم اختيار طريقة الدفع وطريقة الاستلام/التوصيل حسب المتاح.</Bullet>
        <Bullet>قد تتطلب بعض الطلبات تأكيداً إضافياً قبل التنفيذ.</Bullet>

        <SectionTitle>الإلغاء والاسترجاع</SectionTitle>
        <Paragraph>
          تختلف سياسات الإلغاء والاسترجاع حسب حالة الطلب ونوع المنتج. يمكن التواصل مع الدعم لمراجعة حالتك.
        </Paragraph>

        <SectionTitle>المسؤولية</SectionTitle>
        <Paragraph>
          نبذل أقصى جهد لضمان دقة المعلومات واستمرارية الخدمة، لكن قد تحدث انقطاعات أو أخطاء خارجة عن الإرادة.
        </Paragraph>

        <SectionTitle>تحديث الشروط</SectionTitle>
        <Paragraph>
          قد نقوم بتحديث هذه الشروط من وقت لآخر. استمرار استخدامك للتطبيق بعد التحديث يعني موافقتك على النسخة الجديدة.
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

