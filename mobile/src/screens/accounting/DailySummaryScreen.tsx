import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { useI18n } from "../../i18n";

const DailySummaryScreen: React.FC = () => {
  const [data, setData] = useState<{ incoming: number; outgoing: number; net: number }>({
    incoming: 0,
    outgoing: 0,
    net: 0,
  });
  const { t, isRTL } = useI18n();

  const load = async () => {
    const res = await accountingApi.cashflow();
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.dailySummaryTitle", "Ø¬Ø±Ø¯ Ù†Ù‡Ø§ÙŠØ© Ø§Ù„ÙŠÙˆÙ…")}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t("accounting.incomingLabel", "ÙˆØ§Ø±Ø¯")}</Text>
        <Text style={styles.value}>{data.incoming?.toFixed?.(2)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t("accounting.outgoingLabel", "ØµØ§Ø¯Ø±")}</Text>
        <Text style={[styles.value, { color: "#b91c1c" }]}>{data.outgoing?.toFixed?.(2)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{t("accounting.netLabel", "ØµØ§ÙÙŠ")}</Text>
        <Text style={styles.value}>{data.net?.toFixed?.(2)}</Text>
      </View>
      <Button title={t("common.refresh", "ØªØ­Ø¯ÙŠØ«")} onPress={load} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  label: { fontSize: 13, color: "#6b7280" },
  value: { fontSize: 16, fontWeight: "700", color: "#111827" },
});

export default DailySummaryScreen;
