import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../components/ui";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const StoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <DashboardShell title="CafeMS Demo" subtitle="تعرف على قصتنا ورؤيتنا ومزايا الخدمة.">
      <DashboardSection title="نبذة" subtitle="حكاية بدأت بفكرة بسيطة">
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          CafeMS Demo بدأت كفكرة بسيطة: مكان يجتمع فيه الأصدقاء للاستمتاع
          بسندويتشات لذيذة ومشروبات طازجة وخدمة سريعة وودودة. مع الوقت تحولت هذه
          الفكرة إلى علامة موثوقة في الحي، تقدم تجربة مختلفة عن الكافيهات
          التقليدية.
        </Text>
      </DashboardSection>

      <DashboardSection title="رؤيتنا" subtitle="الخيار الأول للوجبة السريعة">
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          أن نكون الخيار الأول لكل شخص يبحث عن وجبة سريعة، طازجة، وبسعر مناسب،
          سواءً للاستلام من الفرع أو التوصيل للمنزل أو مكان العمل.
        </Text>
      </DashboardSection>

      <DashboardSection title="ماذا يميزنا؟" subtitle="نقاط نعتز بها">
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • تحضير الطلبات عند الطلب باستخدام مكونات مختارة بعناية.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • قائمة متنوعة تناسب مختلف الأذواق.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • إمكانية الطلب أونلاين وتتبع حالة الطلب لحظة بلحظة.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • فريق عمل ودود يحرص على رضا العميل في كل مرة.
          </Text>
        </View>
      </DashboardSection>

      <DashboardSection title="خدمتنا الإلكترونية" subtitle="كل ما تحتاجه من داخل التطبيق">
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          من خلال هذا التطبيق يمكنك:
        </Text>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • استعراض القائمة واختيار الأطباق المفضلة.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • إضافة الطلب إلى السلة وتحديد طريقة الاستلام والدفع.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • إنشاء حساب لمتابعة طلباتك السابقة والاحتفاظ بعناوينك.
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            • تتبع طلبك ومعرفة حالته بدقة حتى لحظة الاستلام.
          </Text>
        </View>

        <Text style={[styles.note, { color: theme.palette.muted }]}>
          نسعد بخدمتكم دائماً، ويسعدنا سماع اقتراحاتكم عبر صفحة "اتصل بنا".
        </Text>

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
  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

export default StoryScreen;


