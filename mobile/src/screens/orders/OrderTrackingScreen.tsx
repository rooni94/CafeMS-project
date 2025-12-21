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
      setError("يرجى إدخال رقم الطلب.");
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
      if (err?.response?.status === 404) setError("لم يتم العثور على طلب بهذا الرقم.");
      else setError("تعذر جلب تفاصيل الطلب. حاول مرة أخرى.");
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
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        const normalized = (data || []).map((o: OrderSummary) => ({
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

  const screenTitle = user ? "طلباتي" : "تتبع الطلب";
  const screenSubtitle = user
    ? "استعرض آخر طلباتك وتتبع حالتها أو أدخل رقم طلب للتتبع."
    : "أدخل رقم الطلب لمعرفة حالته وتحميل الفاتورة إن وجدت.";

  const statusLabel =
    normalizeArabicText((order as any)?.status_display) ||
    normalizeArabicText((order as any)?.status) ||
    "";

  return (
    <DashboardShell title={screenTitle} subtitle={screenSubtitle}>
      <DashboardSection title="تتبع الطلب" subtitle="أدخل رقم الطلب ثم اضغط تتبع.">
        <Input
          label="رقم الطلب"
          value={orderId}
          onChangeText={setOrderId}
          keyboardType="number-pad"
          placeholder="مثال: 123"
        />
        <Button
          title="تتبع"
          loading={loading}
          onPress={() => fetchOrder(orderId)}
          disabled={loading}
          style={styles.primaryBtn}
        />
        {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
      </DashboardSection>

      {!user ? (
        <DashboardSection
          title="سجّل دخولك للوصول إلى طلباتك"
          subtitle="سجّل دخولك لعرض آخر الطلبات، حفظ العناوين، ونقاط الولاء."
        >
          <View style={styles.singleColTiles}>
            <DashboardTile
              title="تسجيل الدخول"
              subtitle="ادخل إلى حسابك"
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title="إنشاء حساب"
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
          title="آخر طلباتي"
          subtitle={
            myOrdersLoading
              ? "جارٍ تحميل الطلبات..."
              : myOrders.length
              ? "اضغط على أي طلب لعرض التفاصيل."
              : "لا توجد طلبات لديك حتى الآن."
          }
        >
          {myOrdersLoading ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>جارٍ التحميل...</Text>
          ) : myOrders.length === 0 ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد طلبات لعرضها.</Text>
          ) : (
            <View style={styles.listGap}>
              {myOrders.slice(0, 15).map((o) => (
                <DashboardListItem
                  key={o.id}
                  title={`طلب #${o.id}`}
                  subtitle={`${normalizeArabicText((o as any).status || "")} • ${formatDateTime((o as any).created_at)}`}
                  icon="receipt-outline"
                  onPress={() => {
                    setOrderId(String(o.id));
                    fetchOrder(String(o.id));
                  }}
                  right={
                    <CurrencyAmount
                      value={(o as any).total}
                      color={theme.palette.text}
                      symbolSize={12}
                      textStyle={styles.amount}
                    />
                  }
                />
              ))}
            </View>
          )}
        </DashboardSection>
      )}

      <DashboardSection title="تفاصيل الطلب" subtitle={order ? "تم العثور على الطلب." : "لم يتم تحديد طلب بعد."}>
        {order ? (
          <View style={styles.detailsWrap}>
            <View style={styles.detailsHeader}>
              <View style={{ alignItems: "flex-end", flex: 1, gap: 4 }}>
                <Text style={styles.detailsTitle}>{`طلب #${order.id}`}</Text>
                <Text style={[styles.detailsSub, { color: theme.palette.muted }]}>{formatDateTime((order as any).created_at)}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={[styles.statusText, { color: theme.palette.accent }]} numberOfLines={1}>
                  {statusLabel || "—"}
                </Text>
              </View>
            </View>

            <View style={styles.kv}>
              <Text style={[styles.k, { color: theme.palette.muted }]}>الإجمالي</Text>
              <CurrencyAmount value={(order as any).total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />
            </View>

            <OrderTimeline status={(order as any).status} />

            {invoiceUrl ? (
              <Button title="تحميل الفاتورة" variant="secondary" onPress={() => Linking.openURL(invoiceUrl)} />
            ) : (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>لا توجد فاتورة متاحة لهذا الطلب حتى الآن.</Text>
            )}
          </View>
        ) : (
          <Text style={[styles.muted, { color: theme.palette.muted }]}>أدخل رقم الطلب في الأعلى لمشاهدة التفاصيل.</Text>
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
    singleColTiles: {
      gap: 8,
    },
    listGap: {
      gap: 10,
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
    detailsWrap: {
      gap: 12,
    },
    detailsHeader: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 6,
    },
    detailsTitle: {
      fontSize: 15,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
      color: "#0f172a",
    },
    detailsSub: {
      fontSize: 12,
      textAlign: "right",
      writingDirection: "rtl",
    },
    statusPill: {
      maxWidth: 160,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: "#ede9fe",
      borderWidth: 1,
      borderColor: "#ddd6fe",
    },
    statusText: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
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
