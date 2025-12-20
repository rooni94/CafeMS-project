import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../components/ui";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";

const tiers = [
  {
    name: "المستوى 1",
    points: "0 - 299 نقطة",
    perks: ["خصم 10% على منتجات محددة", "هدية صغيرة عند أول طلب"],
  },
  {
    name: "المستوى 2",
    points: "300 - 699 نقطة",
    perks: ["خصم 15% على منتجات مختارة", "عروض خاصة", "هدية شهرية"],
  },
  {
    name: "المستوى 3",
    points: "700+ نقطة",
    perks: ["خصومات أعلى", "أولوية في الدعم", "مفاجآت موسمية"],
  },
];

const actions = [
  { icon: "cafe-outline", title: "اجمع نقاطك", copy: "اطلب عبر التطبيق لتحصل على نقاط." },
  { icon: "gift-outline", title: "استبدل المكافآت", copy: "حوّل نقاطك إلى خصومات ومزايا." },
  { icon: "people-outline", title: "شارك مع الأصدقاء", copy: "ادعُ أصدقاءك واستفد من العروض." },
];

const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  return (
    <DashboardShell title="المكافآت" subtitle="برنامج الولاء والمزايا.">
      <DashboardSection title="نقاط الولاء" subtitle="قريباً بشكل كامل داخل التطبيق.">
        <Text style={[styles.subtitle, { color: theme.palette.muted }]}>
          سجّل دخولك لمتابعة نقاطك والاستفادة من العروض. قد تختلف المزايا حسب تحديثات البرنامج.
        </Text>
        <Button title="تسجيل الدخول" onPress={() => navigation.navigate("Login")} variant="secondary" />
      </DashboardSection>

      <DashboardSection title="مستويات البرنامج" subtitle="مزايا تدريجية حسب النقاط">
        {tiers.map((tier) => (
          <View key={tier.name} style={[styles.tierCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
            <View style={styles.tierHeader}>
              <Text style={[styles.tierName, { color: theme.palette.text }]}>{tier.name}</Text>
              <Text style={[styles.tierPoints, { color: theme.palette.accent }]}>{tier.points}</Text>
            </View>
            {tier.perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <View style={[styles.dot, { backgroundColor: theme.palette.accent }]} />
                <Text style={[styles.perkText, { color: theme.palette.text }]}>{perk}</Text>
              </View>
            ))}
          </View>
        ))}
      </DashboardSection>

      <DashboardSection title="كيف تبدأ؟" subtitle="خطوات بسيطة">
        {actions.map((action) => (
          <View key={action.title} style={styles.actionRow}>
            <View style={[styles.badge, { backgroundColor: theme.palette.accentSoft }]}>
              <Ionicons name={action.icon as any} size={18} color={theme.palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: theme.palette.text }]}>{action.title}</Text>
              <Text style={[styles.actionCopy, { color: theme.palette.muted }]}>{action.copy}</Text>
            </View>
          </View>
        ))}
      </DashboardSection>
    </DashboardShell>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "right",
    writingDirection: "rtl",
  },
  tierCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  tierHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  tierName: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
  },
  tierPoints: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
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
  },
  perkText: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
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
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
    writingDirection: "rtl",
  },
  actionCopy: {
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
  },
});

export default RewardsScreen;

