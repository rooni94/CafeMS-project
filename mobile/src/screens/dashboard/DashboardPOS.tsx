import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import CurrencyAmount from "../../components/CurrencyAmount";
import DashboardShell from "./components/DashboardShell";

type POSOrder = {
  id: number;
  table?: number;
  status: string;
  total?: number;
  created_at: string;
};

const DashboardPOS: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [tableId, setTableId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [qty, setQty] = useState<string>("1");

  const { data: orders } = useQuery<POSOrder[]>({
    queryKey: ["pos-orders"],
    queryFn: async () => {
      const res = await api.get("orders/pos/cashier/orders/");
      return res.data.results || res.data;
    },
  });

  const createPOSOrder = async () => {
    if (!productId) {
      Alert.alert("تنبيه", "أدخل رقم المنتج على الأقل.");
      return;
    }
    try {
      await api.post("orders/pos/cashier/orders/", {
        table: tableId ? Number(tableId) : null,
        items: [{ product: Number(productId), quantity: Number(qty) || 1 }],
      });
      Alert.alert("تم", "تم إنشاء الطلب.");
      setProductId("");
      setQty("1");
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
    } catch {
      Alert.alert("خطأ", "تعذر إنشاء الطلب.");
    }
  };

  return (
    <DashboardShell title="نقطة البيع" subtitle="إنشاء طلبات سريعة ومتابعة طلبات الصالة.">
        <Card>
          <Text style={styles.title}>كاشير POS</Text>
          <Text style={styles.helper}>إنشاء طلبات سريعة وربطها بالطاولات.</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>إنشاء طلب جديد</Text>
          <TextInput
            placeholder="رقم الطاولة (اختياري)"
            placeholderTextColor="#94a3b8"
            value={tableId}
            onChangeText={setTableId}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <TextInput
            placeholder="رقم المنتج"
            placeholderTextColor="#94a3b8"
            value={productId}
            onChangeText={setProductId}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <TextInput
            placeholder="الكمية"
            placeholderTextColor="#94a3b8"
            value={qty}
            onChangeText={setQty}
            style={styles.input}
            keyboardType="numeric"
            textAlign="right"
          />
          <Button title="إنشاء الطلب" onPress={createPOSOrder} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>أحدث الطلبات</Text>
          {orders && orders.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {orders.slice(0, 6).map((order) => (
                <View key={order.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.orderTitle}>طلب #{order.id}</Text>
                    <Text style={styles.orderSub}>
                      طاولة: {order.table || "-"} • {order.status}
                    </Text>
                    <Text style={styles.orderSub}>
                      {new Date(order.created_at).toLocaleString()}
                    </Text>
                  </View>
                  {order.total ? (
                    <CurrencyAmount value={order.total} color="#111827" symbolSize={14} textStyle={styles.orderPrice} />
                  ) : (
                    <Text style={styles.orderPrice}>-</Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا توجد طلبات حالياً.</Text>
          )}
        </Card>
    </DashboardShell>
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
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  orderSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
});

export default DashboardPOS;
