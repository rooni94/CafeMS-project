import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../components/Screen";
import OrderTimeline from "../../components/OrderTimeline";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { OrderDetails, OrderSummary } from "../../types";
import { formatDateTime } from "../../utils/format";
import { copy } from "../../config/copy";
import { normalizeArabicText } from "../../utils/text";
import CurrencyAmount from "../../components/CurrencyAmount";

const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderSummary[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);

  const fetchOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    setInvoiceUrl(null);
    try {
      const res = await api.get(`orders/public/${id}/`);
      setOrder({
        ...res.data,
        status: normalizeArabicText(res.data.status),
      });
      try {
        const invoice = await api.get(`invoices/public/by-order/${id}/`);
        setInvoiceUrl(invoice.data?.pdf_url || null);
      } catch {
        setInvoiceUrl(null);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(copy.orders.notFound);
      } else {
        setError(copy.orders.fetchError);
      }
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
          status: normalizeArabicText(o.status),
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

  const handleSubmit = () => {
    const trimmed = orderId.trim();
    if (trimmed) {
      fetchOrder(trimmed);
    } else {
      setError(copy.orders.errorEmpty);
    }
  };

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>تتبع طلبك</Text>
        <View style={styles.formRow}>
          <TextInput
            style={styles.input}
            placeholder="أدخل رقم الطلب"
            placeholderTextColor="#a8a29e"
            value={orderId}
            onChangeText={setOrderId}
            keyboardType="numeric"
            textAlign="right"
          />
          <Pressable onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryText}>تتبع</Text>
          </Pressable>
        </View>
        <Text style={styles.prompt}>{copy.orders.prompt}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {!user ? (
        <View style={styles.guestCard}>
          <Text style={styles.subtitle}>{copy.orders.guestTitle}</Text>
          <Text style={styles.guestText}>{copy.orders.guestDescription}</Text>
          <Button title={copy.orders.login} onPress={() => navigation.navigate("Login")} />
          <Button title={copy.orders.register} variant="ghost" color="transparent" textColor="#6138A1" onPress={() => navigation.navigate("Register")} style={{ borderWidth: 1, borderColor: "#6138A1" }} />
        </View>
      ) : null}

      {user ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>طلباتي الأخيرة</Text>
          {myOrdersLoading ? (
            <LoadingState message="جارٍ تحميل الطلبات..." />
          ) : myOrders.length === 0 ? (
            <EmptyState title="لا توجد طلبات سابقة" />
          ) : (
            <View style={{ gap: 8 }}>
              {myOrders.map((o) => (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    setOrderId(String(o.id));
                    fetchOrder(String(o.id));
                  }}
                  style={styles.orderButton}
                >
                  <View>
                    <Text style={styles.orderTitle}>طلب #{o.id}</Text>
                    <Text style={styles.orderMeta}>{formatDateTime(o.created_at)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <CurrencyAmount value={o.total} color="#b45309" symbolSize={14} textStyle={styles.orderAmount} />
                    <Text style={styles.orderStatus}>{o.status}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {loading ? (
        <LoadingState message="جارٍ جلب تفاصيل الطلب..." />
      ) : order ? (
        <View style={styles.card}>
          <Text style={styles.title}>تفاصيل الطلب #{order.id}</Text>
          <View style={styles.orderMetaRow}>
            <Text style={styles.orderMeta}>الإجمالي:</Text>
            <CurrencyAmount value={order.total} color="#b45309" symbolSize={12} textStyle={styles.orderMetaAmount} />
          </View>
          <OrderTimeline status={order.status} />
          {invoiceUrl ? (
            <Pressable onPress={() => Linking.openURL(invoiceUrl)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>تحميل الفاتورة</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <EmptyState title="أدخل رقم الطلب لعرض التفاصيل" />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#fef3c7",
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    color: "#F59E0B",
  },
  prompt: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
  },
  primaryButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  error: {
    color: "#dc2626",
    textAlign: "right",
  },
  guestCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#fffbeb",
    backgroundColor: "#fffbeb",
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  guestText: {
    fontSize: 13,
    color: "#F59E0B",
    textAlign: "right",
  },
  orderButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  orderTitle: {
    fontWeight: "600",
  },
  orderMeta: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },
  orderMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  orderMetaAmount: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b45309",
  },
  orderAmount: {
    fontWeight: "700",
    color: "#b45309",
  },
  orderStatus: {
    fontSize: 12,
    color: "#6b7280",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#f59e0b",
    fontWeight: "700",
  },
});

export default OrderTrackingScreen;
