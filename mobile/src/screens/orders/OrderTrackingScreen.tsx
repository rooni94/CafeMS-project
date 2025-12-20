import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";

import { useTheme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button, Input } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import OrderTimeline from "../../components/OrderTimeline";
import { OrderDetails, OrderSummary } from "../../types";
import { formatDateTime } from "../../utils/format";
import { normalizeArabicText } from "../../utils/text";
import { copy } from "../../config/copy";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import DashboardTile from "../dashboard/components/DashboardTile";
import { AppStackParamList } from "../../navigation/AppNavigator";

const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AppStackParamList, "OrderTracking">>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();

  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myOrders, setMyOrders] = useState<OrderSummary[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);

  const fetchOrder = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError(copy.orders.errorEmpty);
      return;
    }
    setLoading(true);
    setError(null);
    setOrder(null);
    setInvoiceUrl(null);
    try {
      const res = await api.get(`orders/public/${trimmed}/`);
      setOrder(res.data);
      try {
        const invoice = await api.get(`invoices/public/by-order/${trimmed}/`);
        setInvoiceUrl(invoice.data?.pdf_url || null);
      } catch {
        setInvoiceUrl(null);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) setError(copy.orders.notFound);
      else setError(copy.orders.fetchError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setMyOrders([]);
      return;
    }
    const loadOrders = async () => {
      setMyOrdersLoading(true);
      try {
        const res = await api.get("orders/my-orders/");
        const normalized = (res.data || []).map((o: OrderSummary) => ({
          ...o,
          status: normalizeArabicText((o as any).status),
        }));
        setMyOrders(normalized);
      } catch {
        setMyOrders([]);
      } finally {
        setMyOrdersLoading(false);
      }
    };
    loadOrders();
  }, [user]);

  useEffect(() => {
    const initialId = route.params?.orderId;
    if (!initialId) return;
    const asString = String(initialId);
    setOrderId(asString);
    fetchOrder(asString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.orderId]);

  return (
    <DashboardShell title="تتبع الطلب" subtitle="أدخل رقم الطلب لمعرفة حالته وتحميل الفاتورة إن وجدت.">
      <DashboardSection title="تتبع" subtitle="اكتب رقم الطلب ثم اضغط تتبع.">
        <Input
          label="رقم الطلب"
          value={orderId}
          onChangeText={setOrderId}
          keyboardType="number-pad"
          placeholder="مثال: 123"
        />
        <Button
          title={loading ? "جارٍ التتبع..." : "تتبع"}
          onPress={() => fetchOrder(orderId)}
          disabled={loading}
          style={styles.primaryBtn}
        />
        {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
      </DashboardSection>

      {!user ? (
        <DashboardSection title={copy.orders.guestTitle} subtitle={copy.orders.guestDescription}>
          <View style={{ gap: 8 }}>
            <DashboardTile
              title={copy.orders.login}
              subtitle="ادخل إلى حسابك"
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title={copy.orders.register}
              subtitle="أنشئ حساباً جديداً"
              icon="person-add-outline"
              onPress={() => navigation.navigate("Register")}
              color={theme.palette.accentSoft}
              style={{ width: "100%" }}
            />
          </View>
        </DashboardSection>
      ) : (
        <DashboardSection
          title="آخر الطلبات"
          subtitle={
            myOrdersLoading
              ? copy.messages.loading
              : myOrders.length
              ? "اضغط على طلب لتتبّع حالته."
              : "لا توجد طلبات حتى الآن."
          }
        >
          {myOrdersLoading ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>{copy.messages.loading}</Text>
          ) : myOrders.length === 0 ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد طلبات.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {myOrders.slice(0, 15).map((o) => (
                <DashboardListItem
                  key={o.id}
                  title={`طلب #${o.id}`}
                  subtitle={`${normalizeArabicText((o as any).status || "")} — ${formatDateTime((o as any).created_at)}`}
                  icon="receipt-outline"
                  onPress={() => {
                    setOrderId(String(o.id));
                    fetchOrder(String(o.id));
                  }}
                  right={<CurrencyAmount value={(o as any).total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />}
                />
              ))}
            </View>
          )}
        </DashboardSection>
      )}

      <DashboardSection title="تفاصيل الطلب" subtitle={order ? "تم العثور على الطلب." : "لم يتم تحديد طلب بعد."}>
        {order ? (
          <View style={{ gap: 12 }}>
            <View style={styles.kv}>
              <Text style={[styles.k, { color: theme.palette.muted }]}>الإجمالي</Text>
              <CurrencyAmount value={order.total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />
            </View>
            <OrderTimeline status={order.status} />
            {invoiceUrl ? (
              <Button title="تحميل الفاتورة" variant="secondary" onPress={() => Linking.openURL(invoiceUrl)} />
            ) : (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد فاتورة متاحة لهذا الطلب.</Text>
            )}
          </View>
        ) : (
          <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد بيانات لعرضها.</Text>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    primaryBtn: {
      alignSelf: "stretch",
    },
    error: {
      textAlign: "right",
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    muted: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
      writingDirection: "rtl",
    },
    kv: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    k: {
      fontSize: 12,
      fontWeight: "900",
      writingDirection: "rtl",
    },
    amount: {
      fontSize: 13,
      fontWeight: "900",
    },
  });

export default OrderTrackingScreen;

