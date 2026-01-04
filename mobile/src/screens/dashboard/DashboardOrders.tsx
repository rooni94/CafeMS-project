import React, { useMemo, useState } from "react";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import CurrencyAmount from "../../components/CurrencyAmount";
import OrderTimeline from "../../components/OrderTimeline";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import { normalizeArabicText } from "../../utils/text";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardListItem from "./components/DashboardListItem";
import DashboardSection from "./components/DashboardSection";
import DashboardShell from "./components/DashboardShell";
import StatBadge from "./components/StatBadge";
import { has, hasAny } from "./components/permissions";

type DashboardStats = {
  total_orders: number;
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_orders: number;
  revenue?: number;
};

type OrderStatusValue = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

type OrderRow = {
  id: number;
  total: number;
  status: string;
  status_display?: string;
  user_name?: string | null;
  created_at: string;
  payment_method?: string;
  order_type?: string;
  delivery?: boolean;
  table?: { id: number; label: string; number?: number | null } | null;
};

type OrderDetailsRow = {
  id: number;
  total: number;
  status: string;
  status_display?: string;
  user_name?: string | null;
  customer_name?: string | null;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  paid?: boolean;
  order_type?: string;
  delivery?: boolean;
  delivery_address?: string | null;
  delivery_fee?: number | string | null;
  discount_type?: "amount" | "percent";
  discount_value?: number | string | null;
  discount_amount?: number | string | null;
  note?: string | null;
  served_by_name?: string | null;
  table?: { id: number; label: string; number?: number | null } | null;
  items?: Array<{
    id: number;
    quantity: number;
    price: number | string;
    product?: { id: number; name: string; image?: string | null } | null;
    addons?: Array<{ id: number; name: string; price_delta: number | string }>;
  }>;
};

const STATUS_OPTIONS: Array<{ value: OrderStatusValue | null; label: string }> = [
  { value: null, label: "الكل" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز للتسليم" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const statusLabel = (value?: string | null, display?: string | null) =>
  normalizeArabicText(display) || normalizeArabicText(value) || "";

const orderTypeLabel = (value?: string | null) => {
  if (!value) return "";
  if (value === "dine_in") return "طلب داخل الصالة";
  if (value === "takeaway") return "سفري";
  if (value === "delivery") return "توصيل";
  return normalizeArabicText(value);
};

const paymentMethodLabel = (value?: string | null) => {
  if (!value) return "";
  if (value === "cash") return "نقدي";
  if (value === "card" || value === "card_pos") return "بطاقة / نقاط بيع";
  if (value === "online") return "دفع إلكتروني";
  if (value === "wallet") return "محفظة";
  return normalizeArabicText(value);
};

const paymentStatusLabel = (value?: string | null) => {
  if (!value) return "";
  if (value === "pending") return "بانتظار الدفع";
  if (value === "paid") return "مدفوع";
  if (value === "failed") return "فشل الدفع";
  if (value === "refunded") return "تم الاسترجاع";
  return normalizeArabicText(value);
};

const safeNumber = (val: unknown): number => {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const n = Number(val.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (val && typeof val === "object") {
    const obj = val as any;
    if (obj.$numberDecimal != null) return safeNumber(obj.$numberDecimal);
    if (obj.value != null) return safeNumber(obj.value);
    if (obj.amount != null) return safeNumber(obj.amount);
  }
  return 0;
};

const DashboardOrders: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, ["can_manage_orders", "can_view_dashboard"]);
  const canManageOrders = has(user, permissions, "can_manage_orders");

  const [filterStatus, setFilterStatus] = useState<OrderStatusValue | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["dashboard", "orders-stats"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/dashboard-stats/");
      return res.data;
    },
  });

  const {
    data: orders = [],
    isLoading,
    error: ordersError,
  } = useQuery<OrderRow[]>({
    queryKey: ["dashboard", "orders", filterStatus],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/", {
        params: filterStatus ? { status: filterStatus } : undefined,
      });
      return res.data?.results || res.data || [];
    },
  });

  const { data: orderDetails, isLoading: detailsLoading } = useQuery<OrderDetailsRow | null>({
    queryKey: ["dashboard", "order-details", expandedId],
    enabled: allowed && !!expandedId,
    queryFn: async () => {
      if (!expandedId) return null;
      const res = await api.get(`orders/${expandedId}/`);
      return res.data;
    },
  });

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const idText = String(o.id);
      const statusText = statusLabel(o.status, o.status_display).toLowerCase();
      const methodText = paymentMethodLabel(o.payment_method).toLowerCase();
      const typeText = orderTypeLabel(o.order_type).toLowerCase();
      return idText.includes(q) || statusText.includes(q) || methodText.includes(q) || typeText.includes(q);
    });
  }, [orders, search]);

  const updateStatus = async (orderId: number, nextStatus: OrderStatusValue) => {
    try {
      setUpdating(true);
      await api.patch(`orders/${orderId}/`, { status: nextStatus });
      qc.invalidateQueries({ queryKey: ["dashboard", "orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "orders-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "order-details", orderId] });
    } catch {
      Alert.alert("فشل تحديث الحالة", "تعذر تحديث حالة الطلب. حاول مرة أخرى.");
    } finally {
      setUpdating(false);
    }
  };

  const openInvoice = async (orderId: number) => {
    try {
      const invoice = await api.get(`invoices/public/by-order/${orderId}/`);
      const url = invoice.data?.pdf_url;
      if (!url) {
        Alert.alert("لا يوجد رابط فاتورة", "تعذر العثور على رابط الفاتورة لهذا الطلب.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("تعذر فتح الفاتورة", "حصل خطأ أثناء جلب الفاتورة.");
    }
  };

  if (!allowed) {
    return <DashboardAccessDenied title="صلاحيات غير كافية" subtitle="أنت بحاجة لصلاحية إدارة/عرض لوحة التحكم لفتح طلبات العملاء." />;
  }

  const chipProps = {
    compact: true,
    contentStyle: styles.chipContent,
    labelStyle: styles.chipLabel,
  } as const;

  const MetaRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.metaValue} numberOfLines={2}>
          {value || "—"}
        </Text>
      ) : value ? (
        value
      ) : (
        <Text style={styles.metaValue}>—</Text>
      )}
    </View>
  );

  return (
    <DashboardShell title="طلبات العملاء" subtitle="عرض ومتابعة جميع الطلبات من لوحة التحكم.">
      <DashboardSection title="ملخص الطلبات" subtitle="إحصائيات سريعة للطلبات الأخيرة.">
        <View style={styles.statsRow}>
          <StatBadge label="إجمالي الطلبات" value={stats?.total_orders ?? "-"} color={theme.palette.accentSoft} />
          <StatBadge label="قيد التأكيد" value={stats?.pending_orders ?? "-"} color={theme.palette.accent} />
          <StatBadge label="قيد التحضير" value={stats?.preparing_orders ?? "-"} color="#3b82f6" />
        </View>
        <View style={styles.statsRow}>
          <StatBadge label="جاهز للتسليم" value={stats?.ready_orders ?? "-"} color="#10b981" />
          <StatBadge label="مكتمل" value={stats?.completed_orders ?? "-"} color={theme.palette.success} />
          <View style={[styles.revenueBadge, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
            <CurrencyAmount value={stats?.revenue ?? "-"} color={theme.palette.text} symbolSize={14} textStyle={styles.revenueValue} />
            <Text style={[styles.revenueLabel, { color: theme.palette.muted }]}>الإيرادات</Text>
          </View>
        </View>
      </DashboardSection>

      <DashboardSection title="الطلبات" subtitle="رشّح حسب الحالة أو ابحث برقم الطلب/الحالة.">
        <Input label="بحث" value={search} onChangeText={setSearch} placeholder="مثال: 123 أو كاش أو سفري" />
        <View style={styles.filtersRow}>
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={String(s.value ?? "all")}
              title={s.label}
              variant={filterStatus === s.value ? "primary" : "ghost"}
              onPress={() => setFilterStatus(s.value)}
              {...chipProps}
            />
          ))}
        </View>
      </DashboardSection>

      <DashboardSection
        title="قائمة الطلبات"
        subtitle={isLoading ? "جارٍ التحميل..." : "اختر طلبًا لعرض التفاصيل وتحديث الحالة."}
      >
        {ordersError ? (
          <Text style={[styles.emptyText, { color: theme.palette.danger }]}>حدث خطأ أثناء جلب الطلبات.</Text>
        ) : filteredOrders.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.palette.muted }]}>لا توجد طلبات مطابقة للبحث أو الفلتر الحالي.</Text>
        ) : (
          <View style={styles.listGap}>
            {filteredOrders.slice(0, 40).map((order) => {
              const isExpanded = expandedId === order.id;
              const subtitleParts = [
                order.user_name ? `العميل: ${order.user_name}` : null,
                statusLabel(order.status, order.status_display) || order.status,
                order.order_type ? orderTypeLabel(order.order_type) : null,
                order.payment_method ? `طريقة الدفع: ${paymentMethodLabel(order.payment_method)}` : null,
                new Date(order.created_at).toLocaleString(),
              ].filter(Boolean) as string[];

              return (
                <View key={order.id} style={styles.orderWrap}>
                  <DashboardListItem
                    title={`طلب #${order.id}`}
                    subtitle={subtitleParts.join(" • ")}
                    icon="receipt-outline"
                    onPress={() => setExpandedId((prev) => (prev === order.id ? null : order.id))}
                    right={<CurrencyAmount value={order.total} color={theme.palette.text} symbolSize={12} textStyle={styles.totalText} />}
                  />

                  {isExpanded
                    ? (() => {
                        const resolvedDetails = (orderDetails as Partial<OrderDetailsRow> | null) || (order as Partial<OrderDetailsRow>);
                        const deliveryFee = safeNumber(resolvedDetails.delivery_fee);
                        const discountAmount = safeNumber(resolvedDetails.discount_amount);
                        const totalAmount = safeNumber((resolvedDetails as any).total ?? order.total);

                        return (
                          <View style={styles.expanded}>
                            <View style={[styles.detailCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
                              <View style={styles.detailTopRow}>
                                <View style={styles.detailLeft}>
                                  <CurrencyAmount value={totalAmount || order.total} color={theme.palette.text} symbolSize={14} textStyle={styles.bigTotal} />
                                  <Text style={[styles.detailMuted, { color: theme.palette.muted }]} numberOfLines={1}>
                                    {statusLabel(resolvedDetails?.status ?? order.status, resolvedDetails?.status_display ?? order.status_display) || order.status}
                                  </Text>
                                </View>
                                <View style={styles.detailRight}>
                                  <Text style={[styles.detailTitle, { color: theme.palette.text }]} numberOfLines={1}>
                                    {order.order_type ? orderTypeLabel(order.order_type) : "غير محدد"}
                                  </Text>
                                  <Text style={[styles.detailMuted, { color: theme.palette.muted }]} numberOfLines={1}>
                                    {order.payment_method ? `وسيلة الدفع: ${paymentMethodLabel(order.payment_method)}` : "غير محدد"}
                                  </Text>
                                </View>
                              </View>

                              <OrderTimeline status={(resolvedDetails?.status || order.status) as any} />

                              <View style={styles.metaList}>
                                <MetaRow
                                  label="العميل"
                                  value={normalizeArabicText(
                                    resolvedDetails?.user_name || resolvedDetails?.customer_name || order.user_name || "غير معروف",
                                  )}
                                />
                                <MetaRow label="حالة الدفع" value={paymentStatusLabel(resolvedDetails?.payment_status)} />
                                <MetaRow
                                  label="نوع الطلب"
                                  value={order.order_type ? orderTypeLabel(order.order_type) : "غير محدد"}
                                />
                                <MetaRow
                                  label="موظف الخدمة"
                                  value={resolvedDetails?.served_by_name ? normalizeArabicText(resolvedDetails.served_by_name) : "—"}
                                />
                                {resolvedDetails?.delivery ? (
                                  <>
                                    <MetaRow
                                      label="عنوان التوصيل"
                                      value={normalizeArabicText(resolvedDetails.delivery_address || "") || "—"}
                                    />
                                    <MetaRow
                                      label="رسوم التوصيل"
                                      value={
                                        <CurrencyAmount
                                          value={deliveryFee}
                                          color={theme.palette.text}
                                          symbolSize={12}
                                          textStyle={styles.totalText}
                                        />
                                      }
                                    />
                                  </>
                                ) : null}
                                {resolvedDetails?.table ? (
                                  <MetaRow
                                    label="الطاولة"
                                    value={`${resolvedDetails.table.label}${
                                      resolvedDetails.table.number != null ? ` (#${resolvedDetails.table.number})` : ""
                                    }`}
                                  />
                                ) : null}
                              </View>

                              {resolvedDetails?.note ? (
                                <Text style={[styles.note, { color: theme.palette.text }]}>
                                  ملاحظة: {normalizeArabicText(resolvedDetails.note)}
                                </Text>
                              ) : null}

                              <View style={styles.chargesRow}>
                                <View style={[styles.chargeBox, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                                  <Text style={[styles.chargeLabel, { color: theme.palette.muted }]}>قيمة الخصم</Text>
                                  <CurrencyAmount value={discountAmount} color={theme.palette.text} symbolSize={12} textStyle={styles.chargeValue} />
                                </View>
                                <View style={[styles.chargeBox, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                                  <Text style={[styles.chargeLabel, { color: theme.palette.muted }]}>الإجمالي بعد الخصم</Text>
                                  <CurrencyAmount value={totalAmount || order.total} color={theme.palette.text} symbolSize={12} textStyle={styles.chargeValue} />
                                </View>
                              </View>

                              {!detailsLoading && Array.isArray(resolvedDetails?.items) && resolvedDetails!.items!.length ? (
                                <View style={styles.itemsList}>
                                  {resolvedDetails!.items!.slice(0, 20).map((it) => {
                                    const itemName = normalizeArabicText(it.product?.name) || `صنف #${it.id}`;
                                    const addons = (it.addons || []).map((a) => normalizeArabicText(a.name)).filter(Boolean);
                                    const addonsText = addons.length ? ` • الإضافات: ${addons.join(" + ")}` : "";
                                    const lineTotal = safeNumber(it.price) * Number(it.quantity || 1);
                                    return (
                                      <DashboardListItem
                                        key={it.id}
                                        title={itemName}
                                        subtitle={`الكمية: ${it.quantity}${addonsText}`}
                                        icon="fast-food-outline"
                                        right={<CurrencyAmount value={lineTotal} color={theme.palette.text} symbolSize={12} textStyle={styles.totalText} />}
                                      />
                                    );
                                  })}
                                </View>
                              ) : detailsLoading ? (
                                <Text style={[styles.detailMuted, { color: theme.palette.muted }]}>جارٍ تحميل تفاصيل الأصناف...</Text>
                              ) : (
                                <Text style={[styles.detailMuted, { color: theme.palette.muted }]}>لا توجد تفاصيل أصناف لهذا الطلب.</Text>
                              )}

                              <View style={styles.actionRow}>
                                <Button title="فتح الفاتورة" variant="secondary" onPress={() => openInvoice(order.id)} {...chipProps} />
                                <Button title="إغلاق" variant="ghost" onPress={() => setExpandedId(null)} {...chipProps} />
                              </View>
                            </View>

                            <View style={[styles.statusCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                              <Text style={[styles.statusTitle, { color: theme.palette.text }]}>تغيير حالة الطلب</Text>
                              <Text style={[styles.statusHint, { color: theme.palette.muted }]}>
                                {canManageOrders ? "اختر الحالة المناسبة لتحديث الطلب." : "لا تملك صلاحية تغيير الحالة."}
                              </Text>
                              <View style={styles.statusWrap}>
                                {STATUS_OPTIONS.filter((s) => s.value != null).map((s) => (
                                  <Button
                                    key={String(s.value)}
                                    title={s.label}
                                    variant={order.status === s.value ? "primary" : "secondary"}
                                    onPress={() => updateStatus(order.id, s.value as OrderStatusValue)}
                                    disabled={!canManageOrders || updating}
                                    {...chipProps}
                                  />
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                      })()
                    : null}

                        {orderDetails?.note ? (
                          <Text style={[styles.note, { color: theme.palette.text }]} numberOfLines={3}>
                            ملاحظة: {normalizeArabicText(orderDetails.note)}
                          </Text>
                        ) : null}

                        {!detailsLoading && Array.isArray(orderDetails?.items) && orderDetails!.items!.length ? (
                          <View style={styles.itemsList}>
                            {orderDetails!.items!.slice(0, 20).map((it) => {
                              const itemName = normalizeArabicText(it.product?.name) || `منتج #${it.id}`;
                              const addons = (it.addons || []).map((a) => normalizeArabicText(a.name)).filter(Boolean);
                              const addonsText = addons.length ? ` • إضافات: ${addons.join(" + ")}` : "";
                              const lineTotal = safeNumber(it.price) * Number(it.quantity || 1);
                              return (
                                <DashboardListItem
                                  key={it.id}
                                  title={itemName}
                                  subtitle={`الكمية: ${it.quantity}${addonsText}`}
                                  icon="fast-food-outline"
                                  right={<CurrencyAmount value={lineTotal} color={theme.palette.text} symbolSize={12} textStyle={styles.totalText} />}
                                />
                              );
                            })}
                          </View>
                        ) : detailsLoading ? (
                          <Text style={[styles.detailMuted, { color: theme.palette.muted }]}>جارٍ تحميل تفاصيل الطلب...</Text>
                        ) : (
                          <Text style={[styles.detailMuted, { color: theme.palette.muted }]}>لا توجد بنود لهذا الطلب.</Text>
                        )}

                        <View style={styles.actionRow}>
                          <Button title="عرض الفاتورة" variant="secondary" onPress={() => openInvoice(order.id)} {...chipProps} />
                          <Button title="إغلاق" variant="ghost" onPress={() => setExpandedId(null)} {...chipProps} />
                        </View>
                      </View>

                      <View style={[styles.statusCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                        <Text style={[styles.statusTitle, { color: theme.palette.text }]}>تغيير حالة الطلب</Text>
                        <Text style={[styles.statusHint, { color: theme.palette.muted }]}>
                          {canManageOrders ? "اختر الحالة المناسبة لتحديث الطلب." : "لا تملك صلاحية تغيير الحالة."}
                        </Text>
                        <View style={styles.statusWrap}>
                          {STATUS_OPTIONS.filter((s) => s.value != null).map((s) => (
                            <Button
                              key={String(s.value)}
                              title={s.label}
                              variant={order.status === s.value ? "primary" : "secondary"}
                              onPress={() => updateStatus(order.id, s.value as OrderStatusValue)}
                              disabled={!canManageOrders || updating}
                              {...chipProps}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    statsRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 10,
    },
    revenueBadge: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      minWidth: 120,
    },
    revenueValue: {
      fontSize: 16,
      fontWeight: "900",
      color: theme.palette.text,
    },
    revenueLabel: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      writingDirection: "rtl",
    },
    filtersRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    chipContent: {
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    chipLabel: {
      fontSize: 12,
      fontWeight: "900",
      writingDirection: "rtl",
    },
    emptyText: {
      textAlign: "right",
      fontSize: 13,
      lineHeight: 18,
      writingDirection: "rtl",
    },
    listGap: {
      gap: 10,
    },
    orderWrap: {
      gap: 8,
    },
    totalText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.text,
    },
    expanded: {
      gap: 10,
      paddingHorizontal: 2,
    },
    detailCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 10,
      gap: 10,
    },
    detailTopRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    detailLeft: {
      alignItems: "flex-end",
      gap: 4,
    },
    detailRight: {
      flex: 1,
      alignItems: "flex-end",
      gap: 4,
    },
    detailTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
    },
    detailMuted: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    bigTotal: {
      fontSize: 18,
      fontWeight: "900",
      color: theme.palette.text,
    },
    note: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    metaList: {
      gap: 6,
    },
    metaRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
    },
    metaLabel: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
      color: theme.palette.muted,
    },
    metaValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
      color: theme.palette.text,
    },
    chargesRow: {
      flexDirection: "row-reverse",
      gap: 8,
      flexWrap: "wrap",
    },
    chargeBox: {
      flex: 1,
      minWidth: 140,
      borderRadius: 14,
      borderWidth: 1,
      padding: 10,
      gap: 4,
    },
    chargeLabel: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: "right",
      writingDirection: "rtl",
    },
    chargeValue: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
    },
    itemsList: {
      gap: 8,
    },
    actionRow: {
      flexDirection: "row-reverse",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    statusCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 10,
      gap: 6,
    },
    statusTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: "right",
      writingDirection: "rtl",
    },
    statusHint: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
      writingDirection: "rtl",
    },
    statusWrap: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
  });

export default DashboardOrders;
