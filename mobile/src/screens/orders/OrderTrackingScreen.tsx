import React, { useEffect, useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View, I18nManager } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useTheme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { Button, Input } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import OrderTimeline from "../../components/OrderTimeline";
import FloatingCart from "../../components/FloatingCart";
import { OrderDetails, OrderSummary } from "../../types";
import { formatDateTime } from "../../utils/format";
import { decodeUnicodeEscapes, normalizeArabicText } from "../../utils/text";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import DashboardTile from "../dashboard/components/DashboardTile";
import { AppStackParamList } from "../../navigation/AppNavigator";

const T = {
  trackTitle: "\\u062a\\u062a\\u0628\\u0639 \\u0627\\u0644\\u0637\\u0644\\u0628",
  myOrdersTitle: "\\u0637\\u0644\\u0628\\u0627\\u062a\\u064a",
  orderWord: "\\u0637\\u0644\\u0628",
  dot: "\\u2022",
  dash: "\\u2014",
  shellSubtitleGuest:
    "\\u0623\\u062f\\u062e\\u0644 \\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628 \\u0644\\u0645\\u0639\\u0631\\u0641\\u0629 \\u062d\\u0627\\u0644\\u062a\\u0647 \\u0648\\u062a\\u062d\\u0645\\u064a\\u0644 \\u0627\\u0644\\u0641\\u0627\\u062a\\u0648\\u0631\\u0629 \\u0625\\u0646 \\u0648\\u062c\\u062f\\u062a.",
  shellSubtitleUser:
    "\\u0627\\u0633\\u062a\\u0639\\u0631\\u0636 \\u0622\\u062e\\u0631 \\u0637\\u0644\\u0628\\u0627\\u062a\\u0643 \\u0648\\u062a\\u062a\\u0628\\u0639 \\u062d\\u0627\\u0644\\u062a\\u0647\\u0627 \\u0623\\u0648 \\u0623\\u062f\\u062e\\u0644 \\u0631\\u0642\\u0645 \\u0637\\u0644\\u0628 \\u0644\\u0644\\u062a\\u062a\\u0628\\u0639.",
  trackSectionSubtitle:
    "\\u0623\\u062f\\u062e\\u0644 \\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628 \\u062b\\u0645 \\u0627\\u0636\\u063a\\u0637 \\u062a\\u062a\\u0628\\u0639.",
  orderIdLabel: "\\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628",
  orderIdPlaceholder: "\\u0645\\u062b\\u0627\\u0644: 123",
  trackBtn: "\\u062a\\u062a\\u0628\\u0639",
  guestTitle:
    "\\u0633\\u062c\\u0651\\u0644 \\u062f\\u062e\\u0648\\u0644\\u0643 \\u0644\\u0644\\u0648\\u0635\\u0648\\u0644 \\u0625\\u0644\\u0649 \\u0637\\u0644\\u0628\\u0627\\u062a\\u0643",
  guestSubtitle:
    "\\u0633\\u062c\\u0651\\u0644 \\u062f\\u062e\\u0648\\u0644\\u0643 \\u0644\\u0639\\u0631\\u0636 \\u0622\\u062e\\u0631 \\u0627\\u0644\\u0637\\u0644\\u0628\\u0627\\u062a\\u060c \\u062d\\u0641\\u0638 \\u0627\\u0644\\u0639\\u0646\\u0627\\u0648\\u064a\\u0646\\u060c \\u0648\\u0646\\u0642\\u0627\\u0637 \\u0627\\u0644\\u0648\\u0644\\u0627\\u0621.",
  login: "\\u062a\\u0633\\u062c\\u064a\\u0644 \\u0627\\u0644\\u062f\\u062e\\u0648\\u0644",
  loginSub: "\\u0627\\u062f\\u062e\\u0644 \\u0625\\u0644\\u0649 \\u062d\\u0633\\u0627\\u0628\\u0643",
  register: "\\u0625\\u0646\\u0634\\u0627\\u0621 \\u062d\\u0633\\u0627\\u0628",
  registerSub: "\\u0623\\u0646\\u0634\\u0626 \\u062d\\u0633\\u0627\\u0628\\u0627\\u064b \\u062c\\u062f\\u064a\\u062f\\u0627\\u064b",
  lastOrders: "\\u0622\\u062e\\u0631 \\u0637\\u0644\\u0628\\u0627\\u062a\\u064a",
  loadingOrders: "\\u062c\\u0627\\u0631\\u064d \\u062a\\u062d\\u0645\\u064a\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628\\u0627\\u062a...",
  tapAnyOrder: "\\u0627\\u0636\\u063a\\u0637 \\u0639\\u0644\\u0649 \\u0623\\u064a \\u0637\\u0644\\u0628 \\u0644\\u0639\\u0631\\u0636 \\u0627\\u0644\\u062a\\u0641\\u0627\\u0635\\u064a\\u0644.",
  noOrdersYet: "\\u0644\\u0627 \\u062a\\u0648\\u062c\\u062f \\u0637\\u0644\\u0628\\u0627\\u062a \\u0644\\u062f\\u064a\\u0643 \\u062d\\u062a\\u0649 \\u0627\\u0644\\u0622\\u0646.",
  loading: "\\u062c\\u0627\\u0631\\u064d \\u0627\\u0644\\u062a\\u062d\\u0645\\u064a\\u0644...",
  noOrdersToShow: "\\u0644\\u0627 \\u062a\\u0648\\u062c\\u062f \\u0637\\u0644\\u0628\\u0627\\u062a \\u0644\\u0639\\u0631\\u0636\\u0647\\u0627.",
  detailsTitle: "\\u062a\\u0641\\u0627\\u0635\\u064a\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628",
  detailsFound: "\\u062a\\u0645 \\u0627\\u0644\\u0639\\u062b\\u0648\\u0631 \\u0639\\u0644\\u0649 \\u0627\\u0644\\u0637\\u0644\\u0628.",
  detailsNone: "\\u0644\\u0645 \\u064a\\u062a\\u0645 \\u062a\\u062d\\u062f\\u064a\\u062f \\u0637\\u0644\\u0628 \\u0628\\u0639\\u062f.",
  enterToSee:
    "\\u0623\\u062f\\u062e\\u0644 \\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628 \\u0641\\u064a \\u0627\\u0644\\u0623\\u0639\\u0644\\u0649 \\u0644\\u0645\\u0634\\u0627\\u0647\\u062f\\u0629 \\u0627\\u0644\\u062a\\u0641\\u0627\\u0635\\u064a\\u0644.",
  stagesTitle: "\\u0645\\u0631\\u0627\\u062d\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628",
  stagesSub:
    "\\u062a\\u0627\\u0628\\u0639 \\u062a\\u0642\\u062f\\u0645 \\u0637\\u0644\\u0628\\u0643 \\u062e\\u0637\\u0648\\u0629 \\u0628\\u062e\\u0637\\u0648\\u0629.",
  invoice: "\\u062a\\u062d\\u0645\\u064a\\u0644 \\u0627\\u0644\\u0641\\u0627\\u062a\\u0648\\u0631\\u0629",
  noInvoice:
    "\\u0644\\u0627 \\u062a\\u0648\\u062c\\u062f \\u0641\\u0627\\u062a\\u0648\\u0631\\u0629 \\u0645\\u062a\\u0627\\u062d\\u0629 \\u0644\\u0647\\u0630\\u0627 \\u0627\\u0644\\u0637\\u0644\\u0628 \\u062d\\u062a\\u0649 \\u0627\\u0644\\u0622\\u0646.",
  errEmpty: "\\u064a\\u0631\\u062c\\u0649 \\u0625\\u062f\\u062e\\u0627\\u0644 \\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628.",
  errNotFound: "\\u0644\\u0645 \\u064a\\u062a\\u0645 \\u0627\\u0644\\u0639\\u062b\\u0648\\u0631 \\u0639\\u0644\\u0649 \\u0637\\u0644\\u0628 \\u0628\\u0647\\u0630\\u0627 \\u0627\\u0644\\u0631\\u0642\\u0645.",
  errGeneric: "\\u062a\\u0639\\u0630\\u0631 \\u062c\\u0644\\u0628 \\u062a\\u0641\\u0627\\u0635\\u064a\\u0644 \\u0627\\u0644\\u0637\\u0644\\u0628. \\u062d\\u0627\\u0648\\u0644 \\u0645\\u0631\\u0629 \\u0623\\u062e\\u0631\\u0649.",
  orderNumber: "\\u0631\\u0642\\u0645 \\u0627\\u0644\\u0637\\u0644\\u0628",
  status: "\\u0627\\u0644\\u062d\\u0627\\u0644\\u0629",
  date: "\\u0627\\u0644\\u062a\\u0627\\u0631\\u064a\\u062e",
  total: "\\u0627\\u0644\\u0625\\u062c\\u0645\\u0627\\u0644\\u064a",
};

const OrderTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<AppStackParamList, "OrderTracking">>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const t = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(T)) out[key] = decodeUnicodeEscapes(String(val));
    return out as typeof T;
  }, []);

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
      setError(T.errEmpty);
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
      if (err?.response?.status === 404) setError(T.errNotFound);
      else setError(T.errGeneric);
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

  const screenTitle = user ? t.myOrdersTitle : t.trackTitle;
  const screenSubtitle = user ? t.shellSubtitleUser : t.shellSubtitleGuest;

  const statusLabel =
    normalizeArabicText((order as any)?.status_display) ||
    normalizeArabicText((order as any)?.status) ||
    "";

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

  return (
    <View style={{ flex: 1 }}>
      <DashboardShell title={screenTitle} subtitle={screenSubtitle}>
      <DashboardSection title={t.trackTitle} subtitle={t.trackSectionSubtitle}>
        <Input
          label={t.orderIdLabel}
          value={orderId}
          onChangeText={setOrderId}
          keyboardType="number-pad"
          placeholder={t.orderIdPlaceholder}
        />
        <Button title={t.trackBtn} loading={loading} onPress={() => fetchOrder(orderId)} disabled={loading} style={styles.primaryBtn} />
        {error ? <Text style={[styles.error, { color: theme.palette.danger }]}>{error}</Text> : null}
      </DashboardSection>

      {!user ? (
        <DashboardSection title={t.guestTitle} subtitle={t.guestSubtitle}>
          <View style={styles.singleColTiles}>
            <DashboardTile
              title={t.login}
              subtitle={t.loginSub}
              icon="log-in-outline"
              onPress={() => navigation.navigate("Login")}
              color={theme.palette.accent}
              style={{ width: "100%" }}
            />
            <DashboardTile
              title={t.register}
              subtitle={t.registerSub}
              icon="person-add-outline"
              onPress={() => navigation.navigate("Register")}
              color={theme.palette.accentSoft}
              style={{ width: "100%" }}
            />
          </View>
        </DashboardSection>
      ) : (
        <DashboardSection title={t.lastOrders} subtitle={myOrdersLoading ? t.loadingOrders : myOrders.length ? t.tapAnyOrder : t.noOrdersYet}>
          {myOrdersLoading ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>{t.loading}</Text>
          ) : myOrders.length === 0 ? (
            <Text style={[styles.muted, { color: theme.palette.muted }]}>{t.noOrdersToShow}</Text>
          ) : (
            <View style={styles.listGap}>
              {myOrders.slice(0, 15).map((o) => (
                <DashboardListItem
                  key={o.id}
                  title={`${t.orderWord} #${o.id}`}
                  subtitle={`${normalizeArabicText((o as any).status || "")} ${t.dot} ${formatDateTime((o as any).created_at)}`}
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

      <DashboardSection title={t.detailsTitle} subtitle={order ? t.detailsFound : t.detailsNone}>
        {order ? (
          <View style={styles.detailsWrap}>
            <View style={styles.summaryGrid}>
              <InfoCard icon="receipt-outline" label={t.orderNumber} value={`#${order.id}`} />
              <InfoCard icon="pulse-outline" label={t.status} value={statusLabel || t.dash} />
              <InfoCard icon="calendar-outline" label={t.date} value={formatDateTime((order as any).created_at)} />
              <InfoCard
                icon="pricetag-outline"
                label={t.total}
                value={<CurrencyAmount value={(order as any).total} color={theme.palette.text} symbolSize={12} textStyle={styles.amountBig} />}
              />
            </View>

            <View style={[styles.stageCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
              <View style={styles.stageHeader}>
                <View style={[styles.stageIcon, { backgroundColor: `${theme.palette.accent}14`, borderColor: `${theme.palette.accent}33` }]}>
                  <Ionicons name="git-branch-outline" size={18} color={theme.palette.accent} />
                </View>
                <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                  <Text style={[styles.stageTitle, { color: theme.palette.text }]}>{t.stagesTitle}</Text>
                  <Text style={[styles.stageSub, { color: theme.palette.muted }]}>{t.stagesSub}</Text>
                </View>
              </View>

              <OrderTimeline status={(order as any).status} />
            </View>

            {invoiceUrl ? (
              <Button title={t.invoice} variant="secondary" onPress={() => Linking.openURL(invoiceUrl)} />
            ) : (
              <Text style={[styles.muted, { color: theme.palette.muted }]}>{t.noInvoice}</Text>
            )}
          </View>
        ) : (
          <Text style={[styles.muted, { color: theme.palette.muted }]}>{t.enterToSee}</Text>
        )}
      </DashboardSection>

    </DashboardShell>
      <FloatingCart />
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
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
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
      fontWeight: "800",
    },
    muted: {
      textAlign: I18nManager.isRTL ? "right" : "left",
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
      alignItems: "flex-end",
      gap: 4,
    },
    infoLabel: {
      fontSize: 11,
      fontWeight: "800",
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    infoValue: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: I18nManager.isRTL ? "right" : "left",
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
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    stageSub: {
      fontSize: 12,
      textAlign: I18nManager.isRTL ? "right" : "left",
      lineHeight: 18,
    },
  });

export default OrderTrackingScreen;
