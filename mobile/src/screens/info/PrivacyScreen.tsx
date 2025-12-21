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
    <DashboardShell title="سياسة الخصوصية" subtitle="نحترم خصوصيتك ونعامل بياناتك بسرية تامة.">
      <DashboardSection>
        <Paragraph>
          في CafeMS Demo نحترم خصوصيتك ونعامل بياناتك الشخصية بسرية تامة. تهدف
          هذه السياسة إلى توضيح كيفية جمع واستخدام وحماية معلوماتك عند استخدامك
          لموقعنا أو تطبيقنا.
        </Paragraph>

        <SectionTitle>١. المعلومات التي نجمعها</SectionTitle>
        <Bullet>معلومات الحساب مثل الاسم، البريد الإلكتروني، رقم الجوال.</Bullet>
        <Bullet>عناوين التوصيل التي تقوم بإضافتها.</Bullet>
        <Bullet>بيانات الطلبات مثل الأطباق، المبالغ وطريقة الدفع.</Bullet>

        <SectionTitle>٢. استخدام المعلومات</SectionTitle>
        <Paragraph>نستخدم بياناتك من أجل:</Paragraph>
        <Bullet>إنشاء الطلبات وتنفيذها وتحديث حالتها.</Bullet>
        <Bullet>التواصل معك بخصوص طلباتك أو استفساراتك.</Bullet>
        <Bullet>تحسين تجربة الاستخدام والخدمات المقدّمة.</Bullet>

        <SectionTitle>٣. حماية البيانات</SectionTitle>
        <Paragraph>
          نلتزم باتخاذ الإجراءات التقنية والتنظيمية المناسبة لحماية بياناتك من
          الوصول غير المصرح به أو التعديل أو الحذف.
        </Paragraph>

        <SectionTitle>٤. مشاركة البيانات</SectionTitle>
        <Paragraph>
          لا نقوم ببيع بياناتك لأي طرف ثالث. قد نشارك بعض المعلومات مع مزودي
          الخدمات (مثل شركات التوصيل أو مزودي الدفع) فقط بالقدر اللازم لتنفيذ
          الخدمة.
        </Paragraph>

        <SectionTitle>٥. حقوقك</SectionTitle>
        <Paragraph>يمكنك في أي وقت:</Paragraph>
        <Bullet>تحديث بيانات حسابك من صفحة البروفايل.</Bullet>
        <Bullet>طلب حذف حسابك وفقاً للأنظمة المعمول بها.</Bullet>

        <Paragraph>
          في حال وجود أي استفسار بخصوص الخصوصية يمكنك التواصل معنا من خلال صفحة
          "اتصل بنا".
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

