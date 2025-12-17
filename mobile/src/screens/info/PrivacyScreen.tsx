import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import { Card } from "../../components/ui";

const privacyPoints = [
  {
    title: "البيانات المجمعة",
    body: "نجمع الاسم، رقم الجوال، البريد، والموقع التقريبي لتحسين التجربة وخدمة الولاء.",
  },
  {
    title: "كيف نستخدم المعلومات",
    body: "لإتمام الطلبات، إرسال التحديثات، وتحليل الأداء. لا نشارك بياناتك مع طرف ثالث دون موافقة صريحة.",
  },
  {
    title: "حقوقك",
    body: "يمكنك طلب حذف الحساب، تحديث بياناتك، أو إيقاف الرسائل التسويقية من الإعدادات في أي وقت.",
  },
  {
    title: "الأمان",
    body: "نستخدم تشفير TLS وممارسات أمان داخلية لحماية بيانات الدفع وسجل الطلبات.",
  },
];

const PrivacyScreen: React.FC = () => {
  return (
    <Screen>
      <Card>
        <Text style={styles.headline}>سياسة الخصوصية</Text>
        <Text style={styles.body}>
          نحترم خصوصيتك، وهذه الوثيقة توضّح أنواع البيانات التي نجمعها وكيف نتعامل معها للحفاظ على
          تجربة آمنة وشفافة.
        </Text>
      </Card>

      <Card>
        {privacyPoints.map((item) => (
          <View key={item.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
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

export default PrivacyScreen;
