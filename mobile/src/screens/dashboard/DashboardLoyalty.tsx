import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import CurrencyAmount from "../../components/CurrencyAmount";

type LoyaltyProfile = {
  points?: number;
  balance?: number;
  tier?: string;
  member_code?: string;
};

type LoyaltySettings = {
  earn_rate?: number;
  redeem_rate?: number;
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
  const qc = useQueryClient();
  const { data: profile } = useQuery<LoyaltyProfile>({
    queryKey: ["loyalty-profile"],
    queryFn: async () => {
      const res = await api.get("loyalty/profile/");
      return res.data;
    },
  });

  const { data: settings } = useQuery<LoyaltySettings>({
    queryKey: ["loyalty-settings"],
    queryFn: async () => {
      const res = await api.get("loyalty/settings/");
      return res.data;
    },
  });

  const { data: transactions } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["loyalty-transactions"],
    queryFn: async () => {
      const res = await api.get("loyalty/transactions/");
      return res.data.results || res.data;
    },
  });

  const [earnRate, setEarnRate] = useState("");
  const [redeemRate, setRedeemRate] = useState("");

  useEffect(() => {
    if (settings) {
      setEarnRate(settings.earn_rate ? String(settings.earn_rate) : "");
      setRedeemRate(settings.redeem_rate ? String(settings.redeem_rate) : "");
    }
  }, [settings]);

  const saveSettings = async () => {
    try {
      await api.patch("loyalty/settings/", {
        earn_rate: earnRate ? Number(earnRate) : undefined,
        redeem_rate: redeemRate ? Number(redeemRate) : undefined,
      });
      qc.invalidateQueries({ queryKey: ["loyalty-settings"] });
      Alert.alert("تم", "تم حفظ إعدادات الولاء.");
    } catch {
      Alert.alert("خطأ", "تعذر حفظ إعدادات الولاء.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>برنامج الولاء</Text>
          <Text style={styles.helper}>رصيد النقاط، الرصيد النقدي، والمستوى الحالي.</Text>
          <Text style={styles.helper}>النقاط: {profile?.points ?? "-"}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.helper}>الرصيد:</Text>
            <CurrencyAmount
              value={profile?.balance ?? "-"}
              color={theme.palette.accent}
              symbolSize={12}
              textStyle={[styles.helper, { color: theme.palette.accent, fontWeight: "800", marginTop: 0 }]}
            />
          </View>
          <Text style={styles.helper}>المستوى: {profile?.tier ?? "-"}</Text>
          <Text style={styles.helper}>رمز العضوية: {profile?.member_code ?? "-"}</Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>إعدادات الكسب والاستبدال</Text>
          <TextInput
            placeholder="معدل الكسب (نقطة لكل ريال)"
            value={earnRate}
            onChangeText={setEarnRate}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <TextInput
            placeholder="معدل الاستبدال (عدد النقاط)"
            value={redeemRate}
            onChangeText={setRedeemRate}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <Button title="حفظ الإعدادات" onPress={saveSettings} />
          <View style={{ flexDirection: "row-reverse", gap: 8, marginTop: 10 }}>
            <Button title="فتح Google Wallet" variant="secondary" onPress={() => api.get("loyalty/pass/android/")} />
            <Button title="فتح Apple Wallet" variant="ghost" onPress={() => api.get("loyalty/pass/apple/")} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>أحدث الحركات</Text>
          {transactions && (
            <View style={{ marginTop: 8, gap: 10 }}>
              {transactions.slice(0, 15).map((t) => (
                <View key={t.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>{t.description || "عملية"}</Text>
                    <Text style={styles.sub}>
                      {t.points ?? t.amount ?? "-"} ? {new Date(t.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  balanceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    textAlign: "right",
    marginTop: 6,
  },
});

export default DashboardLoyalty;
