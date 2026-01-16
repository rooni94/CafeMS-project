import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { accountingApi } from "../../services/accounting";
import { Button } from "../../components/ui";
import { useI18n } from "../../i18n";

const FinancialOverviewScreen: React.FC = () => {
  const [kpis, setKpis] = useState<any>({});
  const { t, isRTL } = useI18n();

  const load = async () => {
    const res = await accountingApi.dashboard();
    setKpis(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.financialOverviewTitle", "Ù…Ø¤Ø´Ø±Ø§Øª Ù…Ø§Ù„ÙŠØ©")}</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.revenueToday", "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„ÙŠÙˆÙ…")}</Text>
          <Text style={styles.value}>{(kpis.revenue_today ?? 0).toFixed?.(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.revenueMonth", "Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ø´Ù‡Ø±")}</Text>
          <Text style={styles.value}>{(kpis.revenue_month ?? 0).toFixed?.(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.expensesMonth", "Ù…ØµØ±ÙˆÙØ§Øª Ø§Ù„Ø´Ù‡Ø±")}</Text>
          <Text style={[styles.value, { color: "#b91c1c" }]}>
            {(kpis.expenses_month ?? 0).toFixed?.(2)}
          </Text>
        </View>
      </View>
      <Button title={t("common.refresh", "ØªØ­Ø¯ÙŠØ«")} onPress={load} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  grid: { gap: 10 },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
  },
  label: { fontSize: 13, color: "#6b7280" },
  value: { fontSize: 16, fontWeight: "700", color: "#111827" },
});

export default FinancialOverviewScreen;
