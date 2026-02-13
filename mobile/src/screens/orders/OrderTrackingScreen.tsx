import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { api, parseApiError } from "../../services/api";
import { Button, Input } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import OrderTimeline from "../../components/OrderTimeline";
import FloatingCart from "../../components/FloatingCart";
import { OrderDetails, OrderSummary } from "../../types";
import { useCart } from "../../context/CartContext";
import { formatDateTime } from "../../utils/format";
import { normalizeArabicText } from "../../utils/text";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import DashboardTile from "../dashboard/components/DashboardTile";
import { AppStackParamList } from "../../navigation/AppNavigator";
import { useI18n } from "../../i18n";

const DOT = "\u2022";
const DASH = "\u2014";

const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AppStackParamList, "OrderTracking">>();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();
  const labels = useMemo(
    () => ({
      trackTitle: t("orders.trackTitle", "تتبع الطلب"),
      myOrdersTitle: t("orders.myOrdersTitle", "طلباتي"),
      shellSubtitleGuest: t(
        "orders.trackGuestSubtitle",
        "أدخل رقم الطلب لمعرفة حالته وتحميل الفاتورة إن وجدت."
      ),
      shellSubtitleUser: t(
        "orders.trackUserSubtitle",
        "استعرض آخر طلباتك وتتبع حالتها أو أدخل رقم طلب للتتبع."
      ),
      trackSectionSubtitle: t("orders.trackSectionSubtitle", "أدخل رقم الطلب ثم اضغط تتبع."),
      orderIdLabel: t("orders.orderIdLabel", "رقم الطلب"),
      orderIdPlaceholder: t("orders.orderIdPlaceholder", "مثال: 123"),
      trackBtn: t("orders.trackBtn", "تتبع"),
      guestTitle: t("orders.guestTitle", "سجّل دخولك للوصول إلى طلباتك"),
      guestSubtitle: t(
        "orders.guestDescription",
        "سجّل دخولك لعرض آخر الطلبات، حفظ العناوين، ونقاط الولاء."
      ),
      login: t("auth.loginTitle", "تسجيل الدخول"),
      loginSub: t("profile.tileLoginSubtitle", "ادخل إلى حسابك"),
      register: t("auth.createAccount", "إنشاء حساب"),
      registerSub: t("profile.tileRegisterSubtitle", "أنشئ حساباً جديداً"),
      lastOrders: t("orders.lastOrdersTitle", "آخر طلباتي"),
      loadingOrders: t("orders.loadingOrders", "جارٍ تحميل الطلبات..."),
      tapAnyOrder: t("orders.tapAnyOrder", "اضغط على أي طلب لعرض التفاصيل."),
      noOrdersYet: t("orders.noOrdersYet", "لا توجد طلبات لديك حتى الآن."),
      loading: t("common.loading", "جارٍ التحميل..."),
      noOrdersToShow: t("orders.noOrdersToShow", "لا توجد طلبات لعرضها."),
      detailsTitle: t("orders.detailsTitle", "تفاصيل الطلب"),
      detailsFound: t("orders.detailsFound", "تم العثور على الطلب."),
      detailsNone: t("orders.detailsNone", "لم يتم تحديد طلب بعد."),
      enterToSee: t("orders.enterToSee", "أدخل رقم الطلب في الأعلى لمشاهدة التفاصيل."),
      stagesTitle: t("orders.stagesTitle", "مراحل الطلب"),
      stagesSub: t("orders.stagesSubtitle", "تابع تقدم طلبك خطوة بخطوة."),
      invoice: t("orders.invoice", "تحميل الفاتورة"),
      noInvoice: t("orders.noInvoice", "لا توجد فاتورة متاحة لهذا الطلب حتى الآن."),
      errEmpty: t("orders.errorEmpty", "يرجى إدخال رقم الطلب."),
      errNotFound: t("orders.notFound", "لم يتم العثور على طلب بهذا الرقم."),
      errGeneric: t("orders.fetchError", "تعذر جلب تفاصيل الطلب. حاول مرة أخرى."),
      orderNumber: t("orders.orderNumberLabel", "رقم الطلب"),
      status: t("orders.statusLabel", "الحالة"),
      date: t("orders.dateLabel", "التاريخ"),
      total: t("orders.totalLabel", "الإجمالي"),
      orderLabel: t("common.orderLabel", "طلب"),
    }),
    [t]
  );
  const statusLabels = useMemo(
    () => ({
      pending: t("orders.timeline.pending", "قيد المراجعة"),
      confirmed: t("orders.timeline.confirmed", "تم التأكيد"),
      preparing: t("orders.timeline.preparing", "قيد التحضير"),
      ready: t("orders.timeline.ready", "جاهز للاستلام"),
      completed: t("orders.timeline.completed", "مكتمل"),
      paid: t("orders.timeline.completed", "مكتمل"),
      failed: t("orders.timeline.failed", "فشلت العملية"),
      refunded: t("orders.timeline.refunded", "تم استرجاع المبلغ"),
      cancelled: t("orders.timeline.cancelled", "تم إلغاء الطلب"),
    }),
    [t]
  );

  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myOrders, setMyOrders] = useState<OrderSummary[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const fetchOrder = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setError(labels.errEmpty);
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
      if (err?.response?.status === 404) setError(labels.errNotFound);
      else setError(labels.errGeneric);
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
    const initialId = (route.params as any)?.orderId;
    if (!initialId) return;
    const asString = String(initialId);
    setOrderId(asString);
    fetchOrder(asString);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(route.params as any)?.orderId]);

  const screenTitle = user ? labels.myOrdersTitle : labels.trackTitle;
  const screenSubtitle = user ? labels.shellSubtitleUser : labels.shellSubtitleGuest;

  const rawStatus = (order as any)?.status as keyof typeof statusLabels | undefined;
  const statusLabel =
    (rawStatus && statusLabels[rawStatus]) ||
    normalizeArabicText((order as any)?.status_display) ||
    normalizeArabicText((order as any)?.status) ||
    "";

  const labelForStatus = (value?: string | null) => {
    const normalized = String(value || "").toLowerCase().trim();
    const table: Record<string, string> = {
      pending: statusLabels.pending,
      confirmed: statusLabels.confirmed,
      preparing: statusLabels.preparing,
      ready: statusLabels.ready,
      completed: statusLabels.completed,
      complated: statusLabels.completed,
      paid: statusLabels.paid,
      failed: statusLabels.failed,
      refunded: statusLabels.refunded,
      cancelled: statusLabels.cancelled,
      canceled: statusLabels.cancelled,
    };
    return table[normalized] || normalizeArabicText(value || "") || DASH;
  };

  const InfoCard = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: React.ReactNode;
  }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: `${theme.palette.accent}14`, borderColor: `${theme.palette.accent}33` }]}>
        <Ionicons name={icon} size={18} color={theme.palette.accent} />
      </View>
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, { color: theme.palette.muted }]} numberOfLines={1}>
          {label}
        </Text>
        {typeof value === "string" ? (
          <Text style={[styles.infoValue, { color: theme.palette.text }]} numberOfLines={2}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );

  const handleReorder = async (targetOrderId: number) => {
    try {
      const res = await api.get(`orders/${targetOrderId}/`);
      const orderItems = Array.isArray(res.data?.items) ? res.data.items : [];
      if (!orderItems.length) {
        setError(t("orders.reorderNoItems", "لا توجد عناصر متاحة لإعادة الطلب."));
        return;
      }

      clearCart();
      for (const item of orderItems) {
        const quantity = Number(item?.quantity) || 1;
        const unitPrice = Number(item?.price) || 0;
        const product = item?.product || {};
        const addons = Array.isArray(item?.addons)
          ? item.addons.map((addon: any) => ({
              id: Number(addon?.addon_id || addon?.id),
              name: String(addon?.name || ""),
              price_delta: Number(addon?.price_delta) || 0,
            }))
          : [];

        addItem(
          {
            id: Number(product?.id),
            name: String(product?.name || t("orders.reorderItemFallback", "منتج")),
            price: unitPrice,
            image: product?.image || undefined,
            addons,
            quantity,
          },
          quantity
        );
      }

      navigation.navigate("Cart");
    } catch (error) {
      setError(parseApiError(error, t("orders.reorderFailed", "تعذر إعادة نفس الطلب.")));
    }
  };

  const renderOrderDetails = () => {
    if (!order) {
      return <Text style={[styles.muted, { color: theme.palette.muted }]}>{labels.enterToSee}</Text>;
    }

    return (
      <View style={styles.detailsWrap}>
        <View style={styles.summaryGrid}>
          <InfoCard icon="receipt-outline" label={labels.orderNumber} value={`#${order.id}`} />
          <InfoCard icon="pulse-outline" label={labels.status} value={statusLabel || DASH} />
          <InfoCard icon="calendar-outline" label={labels.date} value={formatDateTime((order as any).created_at)} />
          <InfoCard
            icon="pricetag-outline"
            label={labels.total}
            value={<CurrencyAmount value={(order as any).total} color={theme.palette.text} symbolSize={12} textStyle={styles.amountBig} />}
          />
        </View>

        <View style={[styles.stageCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}> 
          <View style={styles.stageHeader}>
            <View style={[styles.stageIcon, { backgroundColor: `${theme.palette.accent}14`, borderColor: `${theme.palette.accent}33` }]}>
              <Ionicons name="git-branch-outline" size={18} color={theme.palette.accent} />
            </View>
            <View style={styles.stageText}>
              <Text style={[styles.stageTitle, { color: theme.palette.text }]}>{labels.stagesTitle}</Text>
              <Text style={[styles.stageSub, { color: theme.palette.muted }]}>{labels.stagesSub}</Text>
            </View>
          </View>

          <OrderTimeline status={(order as any).status} />
        </View>

        <Button
          title={t("orders.reorder", "إعادة الطلب")}
          variant="secondary"
          onPress={() => handleReorder(order.id)}
        />

        {invoiceUrl ? (
          <Button title={labels.invoice} variant="secondary" onPress={() => Linking.openURL(invoiceUrl)} />
        ) : (
          <Text style={[styles.muted, { color: theme.palette.muted }]}>{labels.noInvoice}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <DashboardShell title={screenTitle} subtitle={screenSubtitle}>
      <DashboardSection title={labels.trackTitle} subtitle={labels.trackSectionSubtitle}>
        <Input
          label={labels.orderIdLabel}
          value={orderId}
          onChangeText={setOrderId}
          keyboardType="number-pad"
          placeholder={labels.orderIdPlaceholder}
        />
        <Button
          title={labels.trackBtn}
          loading={loading}
          onPress={() => {
            setExpandedOrderId(null);
            fetchOrder(orderId);
          }}
          disabled={loading}
          style={styles.primaryBtn}
        />
        {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
      </DashboardSection>

      {!user ? (
        <DashboardSection title={labels.guestTitle} subtitle={labels.guestSubtitle}>
          <View style={styles.singleColTiles}>
            <DashboardTile
              title={labels.login}
              subtitle={labels.loginSub}
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title={labels.register}
              subtitle={labels.registerSub}
              icon="person-add-outline"
              onPress={() => navigation.navigate("Register")}
              color={theme.palette.accentSoft}
              style={{ width: "100%" }}
            />
          </View>
        </DashboardSection>
      ) : (
        <DashboardSection
          title={labels.lastOrders}
          subtitle={myOrdersLoading ? labels.loadingOrders : myOrders.length ? labels.tapAnyOrder : labels.noOrdersYet}
        >
          {myOrdersLoading ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>{labels.loading}</Text>
          ) : myOrders.length === 0 ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>{labels.noOrdersToShow}</Text>
          ) : (
            <View style={styles.listGap}>
              {myOrders.slice(0, 15).map((o) => (
                <View key={o.id}>
                  <DashboardListItem
                    title={`${labels.orderLabel} #${o.id}`}
                    subtitle={`${labelForStatus((o as any).status)} ${DOT} ${formatDateTime((o as any).created_at)}`}
                    icon="receipt-outline"
                    onPress={() => {
                      setOrderId(String(o.id));
                      setExpandedOrderId(o.id);
                      fetchOrder(String(o.id));
                    }}
                    right={<CurrencyAmount value={(o as any).total} color={theme.palette.text} symbolSize={12} textStyle={styles.amount} />}
                  />
                  {expandedOrderId === o.id && order?.id === o.id ? (
                    <View style={styles.inlineDetailsCard}>{renderOrderDetails()}</View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </DashboardSection>
      )}

      {!(expandedOrderId && order && expandedOrderId === order.id) ? (
        <DashboardSection title={labels.detailsTitle} subtitle={order ? labels.detailsFound : labels.detailsNone}>
          {renderOrderDetails()}
        </DashboardSection>
      ) : null}

    </DashboardShell>
      <FloatingCart />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
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
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "800",
    },
    muted: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
      lineHeight: 18,
    },
    amount: {
      fontSize: 13,
      fontWeight: "900",
    },
    amountBig: {
      fontSize: 14,
      fontWeight: "900",
    },
    detailsWrap: {
      gap: 12,
    },
    inlineDetailsCard: {
      marginTop: -4,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: theme.palette.border,
      borderRadius: 14,
      padding: 10,
      backgroundColor: theme.palette.surface,
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    infoCard: {
      width: "49.5%",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
      padding: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    infoIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    infoBody: {
      flex: 1,
      alignItems: isRTL ? "flex-end" : "flex-start",
      gap: 4,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: "800",
      textAlign: isRTL ? "right" : "left",
    },
    infoValue: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
      lineHeight: 18,
    },
    stageCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 10,
      gap: 10,
    },
    stageHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stageText: {
      flex: 1,
      alignItems: isRTL ? "flex-end" : "flex-start",
      gap: 2,
    },
    stageIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    stageTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    stageSub: {
      fontSize: 12,
      textAlign: isRTL ? "right" : "left",
      lineHeight: 18,
    },
  });

export default OrderTrackingScreen;
