import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import { Card } from "../../components/ui";

const termsSections = [
  {
    title: "1. التعريفات",
    body: "يشير مصطلح «المتجر» إلى CafeMS Demo، ويشير «المستخدم» إلى أي شخص يقوم بإنشاء حساب أو يطلب من خلال التطبيق.",
  },
  {
    title: "2. حساب المستخدم",
    body: "يجب أن تكون المعلومات المدخلة صحيحة ومحدثة. يحتفظ المتجر بحق تعليق الحسابات التي تخالف السياسات.",
  },
  {
    title: "3. الطلبات والدفع",
    body: "إتمام الطلب عبر التطبيق يعتبر موافقة على الأسعار الحالية. يمكن إلغاء الطلب قبل مرحلة التحضير فقط.",
  },
  {
    title: "4. الضمان والمسؤولية",
    body: "نبذل أقصى جهد لتقديم تجربة ممتازة، لكن لا نتحمل أي خسائر ناتجة عن سوء استخدام التطبيق أو مشاركة الحساب.",
  },
];

const TermsScreen: React.FC = () => {
  return (
    <Screen>
      <Card>
        <Text style={styles.headline}>الشروط والأحكام</Text>
        <Text style={styles.body}>
          باستخدامك لتطبيق CafeMS Demo فإنك توافق على البنود التالية. نحدّث هذه الشروط من حين لآخر
          لتواكب تجربة المتجر الرقمية.
        </Text>
      </Card>
      <Card>
        {termsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headline: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: "#475569",
    textAlign: "right",
  },
  section: {
    marginBottom: 12,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
});

export default TermsScreen;
