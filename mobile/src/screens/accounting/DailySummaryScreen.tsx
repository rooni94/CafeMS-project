import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";

const DailySummaryScreen: React.FC = () => {
  const [data, setData] = useState<{ incoming: number; outgoing: number; net: number }>({
    incoming: 0,
    outgoing: 0,
    net: 0,
  });

  const load = async () => {
    const res = await accountingApi.cashflow();
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>جرد نهاية اليوم</Text>
      <View style={styles.card}>
        <Text style={styles.label}>وارد</Text>
        <Text style={styles.value}>{data.incoming?.toFixed?.(2)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>صادر</Text>
        <Text style={[styles.value, { color: "#b91c1c" }]}>{data.outgoing?.toFixed?.(2)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>صافي</Text>
        <Text style={styles.value}>{data.net?.toFixed?.(2)}</Text>
      </View>
      <Button label="تحديث" onPress={load} />
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
