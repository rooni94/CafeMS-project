import React, { useEffect, useState } from "react";
import { View, Text, TextInput, StyleSheet, FlatList } from "react-native";
import { Button } from "../../components/ui";
import { accountingApi } from "../../services/accounting";
import { InventoryItem } from "../../types";
import { useI18n } from "../../i18n";

const InventoryCheckScreen: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const { t, isRTL } = useI18n();

  useEffect(() => {
    accountingApi.listInventory().then(setItems).catch(() => {});
  }, []);

  const filtered = items.filter((i) => i.name_ar?.includes(query) || i.sku?.includes(query));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("accounting.inventoryCheckTitle", "جرد سريع")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("accounting.inventorySearchPlaceholder", "بحث بالاسم أو الباركود")}
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.rowTitle}>{item.name_ar}</Text>
              <Text style={styles.rowSub}>{t("accounting.skuLabel", "SKU")}: {item.sku}</Text>
            </View>
            <Text style={styles.rowQty}>{item.quantity_on_hand}</Text>
          </View>
        )}
      />
      <Button label={t("common.refresh", "تحديث")} onPress={() => accountingApi.listInventory().then(setItems)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, color: "#6b7280" },
  rowQty: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
});

export default InventoryCheckScreen;
