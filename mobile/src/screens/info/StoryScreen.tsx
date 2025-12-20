import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../components/ui";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const differentiators = [
  "مكونات مختارة وجودة ثابتة.",
  "قائمة متنوعة تناسب الجميع.",
  "سرعة في تجهيز الطلب وخدمة مريحة.",
  "دعم سريع ومتابعة للطلبات.",
];

const digitalPerks = [
  "تصفّح سريع للمنتجات والأقسام.",
  "إضافة للسلة مع خيارات إضافات المنتج.",
  "تتبّع الطلبات بسهولة من داخل التطبيق.",
  "حفظ العناوين وتحديث بيانات الحساب.",
];

const StoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <DashboardShell title="قصتنا" subtitle="تعرف على رحلتنا وما نقدمه لك.">
      <DashboardSection title="نبذة" subtitle="من المطبخ إلى بابك">
        <Text style={[styles.paragraph, { color: theme.palette.muted }]}>
          بدأنا بهدف تقديم طعام ومشروبات بجودة عالية وخدمة سريعة. نؤمن أن تجربة الطلب يجب أن تكون بسيطة وممتعة، لذلك نعمل باستمرار على تحسين القائمة والتطبيق وخدمة العملاء.
        </Text>
      </DashboardSection>

      <DashboardSection title="ما الذي يميزنا؟" subtitle="نقاط قوة نعتز بها">
        <View style={styles.list}>
          {differentiators.map((item) => (
            <Text key={item} style={[styles.listItem, { color: theme.palette.text }]}>
              • {item}
            </Text>
          ))}
        </View>
      </DashboardSection>

      <DashboardSection title="مزايا رقمية" subtitle="تجربة أسهل داخل التطبيق">
        <View style={styles.list}>
          {digitalPerks.map((item) => (
            <Text key={item} style={[styles.listItem, { color: theme.palette.text }]}>
              • {item}
            </Text>
          ))}
        </View>

        <Button title="تواصل معنا" variant="secondary" onPress={() => navigation.navigate("Contact")} />
      </DashboardSection>
    </DashboardShell>
  );
};

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  list: {
    gap: 8,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

export default StoryScreen;

