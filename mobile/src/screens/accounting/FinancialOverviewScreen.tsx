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
      <Text style={styles.title}>{t("accounting.financialOverviewTitle", "مؤشرات مالية")}</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.revenueToday", "إيرادات اليوم")}</Text>
          <Text style={styles.value}>{(kpis.revenue_today ?? 0).toFixed?.(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.revenueMonth", "إيرادات الشهر")}</Text>
          <Text style={styles.value}>{(kpis.revenue_month ?? 0).toFixed?.(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>{t("accounting.expensesMonth", "مصروفات الشهر")}</Text>
          <Text style={[styles.value, { color: "#b91c1c" }]}>
            {(kpis.expenses_month ?? 0).toFixed?.(2)}
          </Text>
        </View>
      </View>
      <Button label={t("common.refresh", "تحديث")} onPress={load} />
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
