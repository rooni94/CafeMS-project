import React, { useMemo, useState } from "react";
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

type POSOrder = {
  id: number;
  table?: number;
  status: string;
  total?: number;
  created_at: string;
};

const DashboardPOS: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_access_cashier");

  const [tableId, setTableId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [creating, setCreating] = useState(false);

  const { data: orders = [], isLoading } = useQuery<POSOrder[]>({
    queryKey: ["dashboard", "pos-orders"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/pos/cashier/orders/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="الكاشير (POS)" subtitle="إنشاء طلبات نقطة البيع واستعراض آخر الطلبات." />;
  }

  const createPOSOrder = async () => {
    if (!productId.trim()) {
      Alert.alert("بيانات ناقصة", "أدخل رقم المنتج.");
      return;
    }
    setCreating(true);
    try {
      await api.post("orders/pos/cashier/orders/", {
        table: tableId.trim() ? Number(tableId) : null,
        items: [{ product: Number(productId), quantity: Number(qty) || 1 }],
      });
      setProductId("");
      setQty("1");
      qc.invalidateQueries({ queryKey: ["dashboard", "pos-orders"] });
      Alert.alert("تم الإنشاء", "تم إنشاء طلب POS بنجاح.");
    } catch {
      Alert.alert("تعذر الإنشاء", "حدث خطأ أثناء إنشاء الطلب.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardShell title="الكاشير (POS)" subtitle="إنشاء طلبات نقطة البيع واستعراض آخر الطلبات.">
      <DashboardSection title="إنشاء طلب جديد" subtitle="أدخل رقم المنتج والكمية، ويمكن ربطه بطاولة.">
        <Input label="رقم الطاولة (اختياري)" value={tableId} onChangeText={setTableId} keyboardType="number-pad" />
        <Input label="رقم المنتج" value={productId} onChangeText={setProductId} keyboardType="number-pad" />
        <Input label="الكمية" value={qty} onChangeText={setQty} keyboardType="number-pad" />
        <Button title={creating ? "جارٍ الإنشاء..." : "إنشاء الطلب"} onPress={createPOSOrder} disabled={creating} />
      </DashboardSection>

      <DashboardSection title="آخر الطلبات" subtitle={isLoading ? "جاري التحميل..." : "آخر 20 طلباً."}>
        {orders.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد طلبات POS.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {orders.slice(0, 20).map((o) => (
              <DashboardListItem
                key={o.id}
                title={`طلب #${o.id}`}
                subtitle={`طاولة: ${o.table ?? "-"} • ${o.status} • ${new Date(o.created_at).toLocaleString()}`}
                icon="cash-outline"
                right={
                  o.total != null ? (
                    <CurrencyAmount value={o.total} color={theme.palette.text} symbolSize={12} textStyle={styles.totalText} />
                  ) : (
                    <Text style={[styles.totalText, { color: theme.palette.text }]}>-</Text>
                  )
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    empty: {
      textAlign: "right",
      fontSize: 13,
    },
    totalText: {
      fontSize: 13,
      fontWeight: "900",
    },
  });

export default DashboardPOS;
