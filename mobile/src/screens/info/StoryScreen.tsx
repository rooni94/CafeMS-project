import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../components/Screen";
import { Button, Card } from "../../components/ui";
import { useTheme } from "../../theme";

const differentiators = [
  "نحضر كل طبق عند الطلب بمكونات مختارة.",
  "قائمة متنوعة تناسب كل الأذواق الحديثة والتقليدية.",
  "مرونة كاملة للطلب أونلاين وتتبع حالة الاستلام.",
  "فريق ودود يكرس كل ضيف لتجربة تظل إلى توقعاته.",
];

const digitalPerks = [
  "بحث سريع عن آخر الأصناف وعروض الهيرو الموسمية.",
  "إضافة الطلبات إلى السلة ودفع آمن.",
  "إنشاء حساب لتخزين العناوين ومتابعة الطلبات.",
  "تتبع الحالة لحظة بلحظة حتى تسليم الطلب.",
];

const StoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <Screen>
      <Card>
        <Text style={[styles.title, { color: theme.palette.brandDark }]}>
          قصة كافيتريا الخليج
        </Text>
        <Text style={[styles.paragraph, { color: theme.palette.muted }]}>
          نبدأ كمكان صغير يجتمع فيه الأصدقاء وعائلات الحي لتذوق سندويشات طازجة ومشروبات قهوة
          مَحمصة بكرامة سعودية أصيلة. مع كل موسم تطورنا لنقدم تجربة متكاملة للضيوف في الفروع وعلى التطبيق.
        </Text>
        <Text style={[styles.paragraph, { color: theme.palette.muted }]}>
          عَصرنّا إدارة المقهى إلكترونياً لنسهل الطلب، الدفع، والتتبع من هاتفك المحمول مع التحفيل بالهارموني الذي تراه في الواجهة الرئيسية.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.palette.brandDark }]}>رؤيتنا</Text>
        <Text style={[styles.paragraph, { color: theme.palette.muted }]}>
          أن نكون الخيار الأول للضيف الذي يحتاج وجبة شهية سهلة وسريعة، سواء للاستلام المباشر أو التوصيل.
        </Text>
        <Text style={[styles.sectionTitle, { color: theme.palette.brandDark }]}>ماذا يميزنا؟</Text>
        <View style={styles.list}>
          {differentiators.map((item) => (
            <Text key={item} style={[styles.listItem, { color: theme.palette.brandDark }]}>
              • {item}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.palette.brandDark }]}>خدمتنا الرقمية</Text>
        <Text style={[styles.paragraph, { color: theme.palette.muted }]}>
          بضغطة واحدة تظهر قائمة الأصناف، تحفظ العناوين، وترسل استفساراتك لفريق الدعم. إليك مصادر الراحة اليومية:
        </Text>
        <View style={styles.list}>
          {digitalPerks.map((item) => (
            <Text key={item} style={[styles.listItem, { color: theme.palette.brandDark }]}>
              • {item}
            </Text>
          ))}
        </View>
        <Button
          title="اتصل بنا"
          variant="secondary"
          onPress={() => navigation.navigate("Contact")}
        />
      </Card>

      <Card>
        <Text style={[styles.footerNote, { color: theme.palette.muted }]}>
          يسعدنا سماع مقترحاتك من خلال شاشة تواصل معنا، ونعدك بتطوير مستمر للتطبيق ليظل مع جميع تفاصيل الموقع الرئيسي.
        </Text>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
  },
  list: {
    gap: 6,
  },
  listItem: {
    fontSize: 13,
    textAlign: "right",
  },
  footerNote: {
    fontSize: 12,
    textAlign: "right",
  },
});

export default StoryScreen;
