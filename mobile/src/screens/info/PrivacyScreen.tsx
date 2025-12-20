import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const PrivacyScreen: React.FC = () => {
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
    <DashboardShell title="سياسة الخصوصية" subtitle="كيف نجمع بياناتك ونستخدمها ونحميها.">
      <DashboardSection>
        <Paragraph>
          نلتزم بحماية خصوصيتك. توضّح هذه السياسة نوع البيانات التي نجمعها وكيف نستخدمها ومع من نشاركها وكيف يمكنك التواصل معنا بشأن أي استفسار.
        </Paragraph>

        <SectionTitle>المعلومات التي نجمعها</SectionTitle>
        <Bullet>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الجوال.</Bullet>
        <Bullet>معلومات الطلب: المنتجات، العنوان، طريقة الدفع وطريقة الاستلام.</Bullet>
        <Bullet>معلومات تقنية: مثل نوع الجهاز وإصدار التطبيق لأغراض تحسين الأداء.</Bullet>

        <SectionTitle>كيف نستخدم المعلومات</SectionTitle>
        <Bullet>لتنفيذ الطلبات ومتابعة حالتها وإصدار الفواتير.</Bullet>
        <Bullet>للتواصل معك بشأن الطلبات أو الدعم وخدمة العملاء.</Bullet>
        <Bullet>لتحسين تجربة التطبيق وتطوير الخدمات.</Bullet>

        <SectionTitle>مشاركة المعلومات</SectionTitle>
        <Paragraph>
          لا نبيع بياناتك. قد نشارك بعض المعلومات بالقدر اللازم مع مزوّدي الخدمة (مثل الدفع أو التوصيل) لإتمام الطلب، أو إذا طُلب منا ذلك نظامياً.
        </Paragraph>

        <SectionTitle>حماية البيانات</SectionTitle>
        <Paragraph>
          نستخدم إجراءات أمنية مناسبة لحماية البيانات من الوصول غير المصرح به أو التعديل أو الفقدان، مع مراعاة أن الإنترنت ليس بيئة خالية من المخاطر بنسبة 100%.
        </Paragraph>

        <SectionTitle>حقوقك</SectionTitle>
        <Bullet>طلب تحديث بياناتك أو تصحيحها.</Bullet>
        <Bullet>طلب حذف الحساب وفقاً للمتطلبات النظامية والقيود التشغيلية.</Bullet>

        <SectionTitle>التواصل</SectionTitle>
        <Paragraph>
          إذا كان لديك أي استفسار حول سياسة الخصوصية، تواصل معنا عبر شاشة "تواصل معنا" داخل التطبيق.
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

export default PrivacyScreen;

