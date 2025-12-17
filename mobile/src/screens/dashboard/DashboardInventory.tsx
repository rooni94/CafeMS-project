import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Screen from "../../components/Screen";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import StatBadge from "./components/StatBadge";

type InventorySummary = {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
};

type InventoryItem = {
  id: number;
  name: string;
  stock?: number;
  available?: boolean;
};

const DashboardInventory: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [adjustId, setAdjustId] = useState<string>("");
  const [adjustQty, setAdjustQty] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showLow, setShowLow] = useState(false);
  const [showOut, setShowOut] = useState(false);

  const { data: summary } = useQuery<InventorySummary>({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const res = await api.get("orders/pos/inventory/summary/");
      return res.data;
    },
  });

  const { data: items } = useQuery<InventoryItem[]>({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data.results || res.data;
    },
  });

  const filteredItems = useMemo(() => {
    return (items || [])
      .filter((i) => (search ? i.name.toLowerCase().includes(search.toLowerCase()) : true))
      .filter((i) => (showLow ? (i.stock ?? 0) < 5 && (i.stock ?? 0) > 0 : true))
      .filter((i) => (showOut ? (i.stock ?? 0) <= 0 : true));
  }, [items, search, showLow, showOut]);

  const adjustInventory = async () => {
    if (!adjustId || !adjustQty) {
      Alert.alert("تنبيه", "أدخل معرف المنتج والكمية.");
      return;
    }
    try {
      await api.post("orders/pos/inventory/adjust/", {
        product_id: Number(adjustId),
        quantity_change: Number(adjustQty),
      });
      qc.invalidateQueries({ queryKey: ["inventory-summary"] });
      qc.invalidateQueries({ queryKey: ["inventory-items"] });
      setAdjustId("");
      setAdjustQty("");
    } catch {
      Alert.alert("خطأ", "تعذر تحديث المخزون.");
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.palette.background }}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        <Card>
          <Text style={styles.title}>المخزون</Text>
          <View style={styles.statsRow}>
            <StatBadge label="إجمالي الأصناف" value={summary?.total_items ?? "-"} />
            <StatBadge label="كمية منخفضة" value={summary?.low_stock_items ?? "-"} color="#f59e0b" />
            <StatBadge label="نفدت" value={summary?.out_of_stock_items ?? "-"} color="#ef4444" />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>ضبط المخزون</Text>
          <Text style={styles.helper}>زيادة أو تخفيض كمية منتج محدد.</Text>
          <TextInput
            placeholder="معرف المنتج"
            value={adjustId}
            onChangeText={setAdjustId}
            keyboardType="number-pad"
            style={styles.input}
          />
          <TextInput
            placeholder="التغير في الكمية (+/-)"
            value={adjustQty}
            onChangeText={setAdjustQty}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Button title="تحديث المخزون" onPress={adjustInventory} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>الأصناف</Text>
          <TextInput
            placeholder="بحث عن منتج"
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            textAlign="right"
          />
          <View style={styles.filtersRow}>
            <Button
              title="منخفضة"
              variant={showLow ? "primary" : "ghost"}
              onPress={() => setShowLow((v) => !v)}
            />
            <Button
              title="نفدت"
              variant={showOut ? "primary" : "ghost"}
              onPress={() => setShowOut((v) => !v)}
            />
          </View>
          {filteredItems && (
            <View style={{ marginTop: 8, gap: 10 }}>
              {filteredItems.slice(0, 20).map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.sub}>
                      {item.stock ?? "-"} حبة ? {item.available ? "متاح" : "غير متاح"}
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
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
  filtersRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
});

export default DashboardInventory;
