import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useNavigation } from "@react-navigation/native";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { useTheme } from "../../theme";
import { copy } from "../../config/copy";

const differentiators = [
  {
    title: "خبز طازج وصلصات منزلية",
    description: "نحضّر الخبز والحشوات يومياً لترافق كل لقمة بطعم متجدد.",
    icon: "leaf-outline",
  },
  {
    title: "ضيافة سريعة وواضحة",
    description: "واجهة الطلب تدعم الاستلام أو التوصيل والجدولة لتبقى تجربتك سهلة.",
    icon: "people-outline",
  },
  {
    title: "تجديد موسمي",
    description: "بطاقات الهيرو والعروض تتحدث دورياً لتناسب الموسم وذائقتك.",
    icon: "sparkles-outline",
  },
];

const stats = [
  { label: "سنوات الخبرة", value: "8+" },
  { label: "فروع قيد التشغيل", value: "15" },
  { label: "أصناف في القائمة", value: "120" },
];

const timeline = [
  {
    year: "2018",
    title: "الانطلاق",
    copy: "افتتاح أول فرع مع قائمة سندوتشات طازجة وخدمة سريعة.",
  },
  {
    year: "2020",
    title: "التجربة الرقمية",
    copy: "إطلاق الطلب المسبق عبر الموقع مع مزايا الولاء.",
  },
  {
    year: "2023",
    title: "توسع الفروع",
    copy: "تطوير القائمة وإضافة الحلويات والعروض الموسمية.",
  },
  {
    year: "2025",
    title: "تطبيق موحد",
    copy: "منصة واحدة للعميل والكاشير والسائق لتسريع الخدمة.",
  },
];

const AboutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { settings } = useStoreSettings();
  const theme = useTheme();
  const brandName = settings?.store_name || copy.brandFallback;
  const subtitle =
    settings?.about_subtitle ||
    "نحن مساحة دافئة تحتضن شغف الطعام ونكهاته الأصيلة.";
  const body =
    settings?.about_description ||
    "CafeMS Demo محطتكم اليومية للاستمتاع بساندوتشات طازجة، خفايف شهية، ومشروبات تناسب ذائقتكم. نهتم بالتفاصيل لتكون تجربة الطلب سريعة وواضحة بضيافة ودودة.";

  return (
    <Screen>
      <Card>
        <Text style={styles.headline}>{brandName}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.body}>{body}</Text>
        <Button
          title="تصفح القائمة"
          onPress={() => navigation.navigate("Menu")}
          style={{ marginTop: 8 }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>لماذا نختلفٟ</Text>
        {differentiators.map((item) => (
          <View key={item.title} style={styles.listRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon as any} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listCopy}>{item.description}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>محطات من رحلتنا</Text>
        {timeline.map((step) => (
          <View key={step.year} style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineYear}>{step.year}</Text>
              <Text style={styles.listTitle}>{step.title}</Text>
              <Text style={styles.listCopy}>{step.copy}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>المؤشرات</Text>
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[styles.statCard, { borderColor: theme.palette.border }]}
            >
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headline: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "right",
  },
  body: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "right",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  listRow: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  listCopy: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
  },
  timelineRow: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingVertical: 10,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
    marginTop: 8,
  },
  timelineYear: {
    fontSize: 12,
    color: "#f59e0b",
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
});

export default AboutScreen;
