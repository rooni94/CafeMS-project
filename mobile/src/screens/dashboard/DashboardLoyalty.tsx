import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { has } from "./components/permissions";

type LoyaltyProfile = {
  points?: number;
  balance?: number;
  tier?: string;
  member_code?: string;
};

type LoyaltySettings = {
  earn_rate?: number;
  redeem_rate?: number;
  tier_one_max?: number;
  tier_two_max?: number;
};

type LoyaltyTransaction = {
  id: number;
  points?: number;
  amount?: number;
  created_at: string;
  description?: string;
};

const DashboardLoyalty: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_manage_loyalty");

  const { data: profile } = useQuery<LoyaltyProfile>({
    queryKey: ["dashboard", "loyalty-profile"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("loyalty/profile/");
      return res.data;
    },
  });

  const { data: settings } = useQuery<LoyaltySettings>({
    queryKey: ["dashboard", "loyalty-settings"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("loyalty/settings/");
      return res.data;
    },
  });

  const { data: transactions = [] } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["dashboard", "loyalty-transactions"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("loyalty/transactions/");
      return res.data?.results || res.data || [];
    },
  });

  const [earnRate, setEarnRate] = useState("");
  const [redeemRate, setRedeemRate] = useState("");
  const [tierOneMax, setTierOneMax] = useState("");
  const [tierTwoMax, setTierTwoMax] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEarnRate(settings.earn_rate != null ? String(settings.earn_rate) : "");
    setRedeemRate(settings.redeem_rate != null ? String(settings.redeem_rate) : "");
    setTierOneMax(settings.tier_one_max != null ? String(settings.tier_one_max) : "");
    setTierTwoMax(settings.tier_two_max != null ? String(settings.tier_two_max) : "");
  }, [settings]);

  if (!allowed) {
    return <DashboardAccessDenied title="برنامج الولاء" subtitle="إدارة إعدادات الولاء وحركة النقاط." />;
  }

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch("loyalty/settings/", {
        earn_rate: earnRate.trim() ? Number(earnRate) : undefined,
        redeem_rate: redeemRate.trim() ? Number(redeemRate) : undefined,
        tier_one_max: tierOneMax.trim() ? Number(tierOneMax) : undefined,
        tier_two_max: tierTwoMax.trim() ? Number(tierTwoMax) : undefined,
      });
      qc.invalidateQueries({ queryKey: ["dashboard", "loyalty-settings"] });
      Alert.alert("تم الحفظ", "تم تحديث إعدادات برنامج الولاء.");
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ إعدادات الولاء.");
    } finally {
      setSaving(false);
    }
  };

// ... (الجزء العلوي من الملف بدون تغيير) ...

  return (
    <DashboardShell title="برنامج الولاء" subtitle="إدارة إعدادات الولاء ومتابعة العمليات.">
      <DashboardSection title="الملف" subtitle="معلومات العضوية الحالية.">
        <View style={styles.profileRow}>
          <Text style={[styles.profileLabel, { color: theme.palette.muted }]}>النقاط</Text>
          <Text style={[styles.profileValue, { color: theme.palette.text }]}>{profile?.points ?? "-"}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={[styles.profileLabel, { color: theme.palette.muted }]}>الرصيد</Text>
          <CurrencyAmount value={profile?.balance ?? "-"} color={theme.palette.accent} symbolSize={12} textStyle={styles.balanceText} />
        </View>
        <View style={styles.profileRow}>
          <Text style={[styles.profileLabel, { color: theme.palette.muted }]}>المستوى</Text>
          <Text style={[styles.profileValue, { color: theme.palette.text }]}>{profile?.tier ?? "-"}</Text>
        </View>
        <View style={styles.profileRow}>
          <Text style={[styles.profileLabel, { color: theme.palette.muted }]}>كود العضوية</Text>
          <Text style={[styles.profileValue, { color: theme.palette.text }]}>{profile?.member_code ?? "-"}</Text>
        </View>
      </DashboardSection>

      <DashboardSection title="الإعدادات" subtitle="معدل الكسب ومعدل الاستبدال.">
        <Input
          label="معدل كسب النقاط"
          value={earnRate}
          onChangeText={setEarnRate}
          keyboardType="decimal-pad"
          hint="مثال: 0.1 يعني نقطة لكل 10 ريالات."
        />
        <Input
          label="معدل الاستبدال"
          value={redeemRate}
          onChangeText={setRedeemRate}
          keyboardType="decimal-pad"
          hint="مثال: 1 يعني ريال لكل نقطة (حسب إعدادك)."
        />
        <Input
          label="الحد الأقصى للمستوى الأول (نقطة)"
          value={tierOneMax}
          onChangeText={setTierOneMax}
          keyboardType="number-pad"
          hint="مثال: 299"
        />
        <Input
          label="الحد الأقصى للمستوى الثاني (نقطة)"
          value={tierTwoMax}
          onChangeText={setTierTwoMax}
          keyboardType="number-pad"
          hint="مثال: 699"
        />
        <Button title={saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"} onPress={saveSettings} disabled={saving} />
      </DashboardSection>

      <DashboardSection title="العمليات" subtitle="آخر عمليات النقاط.">
        {transactions.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد عمليات.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {transactions.slice(0, 40).map((t) => (
              <DashboardListItem
                key={t.id}
                title={t.description?.trim() ? t.description : "عملية"}
                subtitle={`${t.points != null ? `${t.points} نقطة` : t.amount != null ? `${t.amount}` : "-"} • ${new Date(t.created_at).toLocaleString()}`}
                icon="sparkles-outline"
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

// ... (باقي الكود بدون تغيير) ...

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    profileRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    profileLabel: {
      fontSize: 12,
      fontWeight: "900",
    },
    profileValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "left",
    },
    balanceText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.accent,
    },
    empty: {
      textAlign: "auto",
      fontSize: 13,
    },
  });

export default DashboardLoyalty;

