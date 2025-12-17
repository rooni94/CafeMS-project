import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme";

const tiers = [
  {
    name: "Tier 1 - الضيافة",
    points: "0 - 299 نقطة",
    perks: ["خصم 10% على الطلبات الصباحية", "قهوة مجانية بعد 5 زيارات"],
  },
  {
    name: "Tier 2 - الذهبية",
    points: "300 - 699 نقطة",
    perks: ["خصم 15% على جميع الأصناف", "هدية عيد ميلاد", "دعم أولوية في الفروع"],
  },
  {
    name: "Tier 3 - النادي الخاص",
    points: "700+ نقطة",
    perks: ["خدمة باريستا شخصية", "تجربة المنتجات الجديدة أولاً", "مقاعد محجوزة"],
  },
];

const actions = [
  { icon: "cafe-outline", title: "التقاط الفاتورة", copy: "أرفق صورة الفاتورة وسنضيف النقاط" },
  { icon: "gift-outline", title: "استبدل النقاط", copy: "اختر العرض المناسب من متجر الولاء" },
  { icon: "people-outline", title: "أرسل هدية", copy: "شارك نقاطك مع من تحب مباشرةً" },
];

const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <Screen>
      <Card>
        <Text style={styles.headline}>برنامج الولاء</Text>
        <Text style={styles.subtitle}>
          نجمع بين القهوة والامتنان، كل ريال = نقطة. استبدلها بعروض موسمية وتجارب خاصة.
        </Text>
        <Button
          title="تسجيل الدخول لتتبع النقاط"
          onPress={() => navigation.navigate("Login")}
          variant="secondary"
          style={{ marginTop: 8 }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>مستويات المكافآت</Text>
        {tiers.map((tier) => (
          <View key={tier.name} style={styles.tierCard}>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPoints}>{tier.points}</Text>
            {tier.perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <View style={styles.dot} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>كيف تجمع النقاطٟ</Text>
        {actions.map((action) => (
          <View key={action.title} style={styles.actionRow}>
            <View style={[styles.badge, { backgroundColor: theme.palette.accent }]}>
              <Ionicons name={action.icon as any} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionCopy}>{action.copy}</Text>
            </View>
          </View>
        ))}
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
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  tierCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  tierPoints: {
    fontSize: 13,
    color: "#f59e0b",
    textAlign: "right",
  },
  perkRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  perkText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
    textAlign: "right",
  },
  actionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  actionCopy: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
  },
});

export default RewardsScreen;
