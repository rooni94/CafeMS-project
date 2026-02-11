import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions, FlatList, DimensionValue } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";

import { Button, Input, Select } from "../../components/ui";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useAuth } from "../../context/AuthContext";
import { api, parseApiError } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import StatBadge from "./components/StatBadge";
import { has } from "./components/permissions";
import { useI18n } from "../../i18n";

type ProductRow = {
  id: number;
  name: string;
  price: number | string | null;
  stock?: number | string | null;
  image?: string | null;
  category?: number | { id: number; name: string } | null;
};

type CategoryRow = { id: number; name: string };

type TableRow = {
  id: number;
  label: string;
  number?: number | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
};

type InventoryItem = {
  id: number;
  name: string;
  stock: number;
  minimum_stock: number;
  low_stock: boolean;
};

type InventorySummary = {
  low_stock?: InventoryItem[];
  total_low_stock?: number;
};

type CartItem = { product_id: number; name: string; price: number; quantity: number };

const cashQuickAmounts = [5, 10, 20, 50, 100, 200];

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("amount" in obj) return parseNumber(obj.amount);
    if ("value" in obj) return parseNumber(obj.value);
    if ("price" in obj) return parseNumber(obj.price);
    if ("$numberDecimal" in obj) return parseNumber(obj["$numberDecimal"]);
  }
  return 0;
};

const nextTableStatus = (s: TableRow["status"]): TableRow["status"] => {
  if (s === "available") return "occupied";
  if (s === "occupied") return "reserved";
  if (s === "reserved") return "available";
  return "available";
};

const statusMeta = (
  theme: ReturnType<typeof useTheme>,
  status: TableRow["status"],
  t: (key: string, fallback?: string) => string,
) => {
  const label =
    status === "available"
      ? t("dashboard.posTableStatusAvailable", "متاحة")
      : status === "occupied"
        ? t("dashboard.posTableStatusOccupied", "مشغولة")
        : status === "reserved"
          ? t("dashboard.posTableStatusReserved", "محجوزة")
          : t("dashboard.posTableStatusMaintenance", "صيانة");
  const color =
    status === "available"
      ? "#10b981"
      : status === "occupied"
        ? "#f97316"
        : status === "reserved"
          ? "#3b82f6"
          : theme.palette.muted;
  return { label, color };
};

const DashboardPOS: React.FC = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const productColumns = width >= 1200 ? 3 : width >= 720 ? 2 : 1;
  const productCardWidth: DimensionValue =
    productColumns === 1 ? "100%" : (`${Math.max(100 / productColumns - 2, 22)}%` as const);
  const useProductGrid = productColumns > 1;
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_access_cashier");
  const canEditTables = has(user, permissions, "can_manage_tables");

  const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [visibleProducts, setVisibleProducts] = useState(60);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<"none" | "amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState("0");
  const [note, setNote] = useState("");
  const [paymentMethod, setpaymentMethod] = useState<"cash" | "card_pos" | "online">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");

  const [membershipId, setMembershipId] = useState("");
  const [pointsDelta, setPointsDelta] = useState("10");

  useEffect(() => {
    if (orderType !== "dine_in") setSelectedTable(null);
    if (orderType !== "delivery") {
      setDeliveryAddress("");
      setDeliveryFee("0");
    }
  }, [orderType]);

  useEffect(() => {
    setVisibleProducts(60);
  }, [search, categoryId]);

  const { data: products = [], isLoading: productsLoading } = useQuery<ProductRow[]>({
    queryKey: ["dashboard", "pos", "products"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/items/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: categories = [] } = useQuery<CategoryRow[]>({
    queryKey: ["dashboard", "pos", "categories"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("products/categories/");
      const rows = res.data?.results || res.data || [];
      return Array.isArray(rows) ? rows : [];
    },
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery<TableRow[]>({
    queryKey: ["dashboard", "pos", "tables"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/pos/tables/");
      return res.data?.results || res.data || [];
    },
  });

  const { data: inventory } = useQuery<InventorySummary>({
    queryKey: ["dashboard", "pos", "inventory-summary"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("orders/pos/inventory/summary/");
      return res.data || {};
    },
  });

  const categoryLookup = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const cartLookup = useMemo(() => new Map(cart.map((it) => [it.product_id, it.quantity])), [cart]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (categoryId !== "all") {
      list = list.filter((p) => {
        const pid = typeof p.category === "object" ? p.category?.id : p.category;
        return pid === categoryId;
      });
    }
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [categoryId, products, search]);
  const productData = useMemo(() => filteredProducts.slice(0, visibleProducts), [filteredProducts, visibleProducts]);

  const addToCart = (p: ProductRow) => {
    const price = parseNumber(p.price);
    setCart((prev) => {
      const existing = prev.find((x) => x.product_id === p.id);
      if (existing) {
        return prev.map((x) => (x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...prev, { product_id: p.id, name: p.name, price, quantity: 1 }];
    });
  };

  const setQty = (productId: number, next: number) => {
    setCart((prev) => {
      if (next <= 0) return prev.filter((x) => x.product_id !== productId);
      return prev.map((x) => (x.product_id === productId ? { ...x, quantity: next } : x));
    });
  };

  const subtotal = useMemo(() => cart.reduce((sum, it) => sum + it.price * it.quantity, 0), [cart]);
  const discountNumeric = useMemo(() => Math.max(0, parseNumber(discountValue)), [discountValue]);
  const discountAmount = useMemo(() => {
    if (discountType === "none") return 0;
    if (discountType === "percent") return Math.min(100, discountNumeric) * (subtotal / 100);
    return Math.min(subtotal, discountNumeric);
  }, [discountNumeric, discountType, subtotal]);
  const total = useMemo(() => Math.max(subtotal - discountAmount, 0), [subtotal, discountAmount]);
  const cartCount = useMemo(() => cart.reduce((sum, it) => sum + it.quantity, 0), [cart]);
  const deliveryFeeValue = useMemo(() => {
    if (orderType !== "delivery") return 0;
    return Math.max(0, parseNumber(deliveryFee));
  }, [deliveryFee, orderType]);
  const grandTotal = useMemo(() => Math.max(total + deliveryFeeValue, 0), [total, deliveryFeeValue]);
  const cashReceivedValue = useMemo(() => parseNumber(cashReceived), [cashReceived]);
  const cashDelta = cashReceivedValue - grandTotal;
  const cashChange = Math.max(cashDelta, 0);
  const cashRemaining = Math.max(-cashDelta, 0);
  const isCashPayment = paymentMethod === "cash";
  const isCashInsufficient = isCashPayment && cashReceivedValue < grandTotal;

  const createOrder = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) return;
      if (orderType === "dine_in" && !selectedTable) {
        throw new Error(t("dashboard.posTableRequired", "حدد طاولة قبل التأكيد."));
      }
      if (orderType === "delivery" && !deliveryAddress.trim()) {
        throw new Error(t("dashboard.posDeliveryAddressRequired", "أدخل عنوان التوصيل."));
      }
      if (isCashInsufficient) {
        throw new Error(t("dashboard.posCashInsufficient", "المبلغ المستلم أقل من الإجمالي."));
      }
      await api.post("orders/pos/cashier/orders/", {
        items: cart.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        order_type: orderType,
        table_id: orderType === "dine_in" ? selectedTable : null,
        discount_type: discountType,
        discount_value: discountType === "percent" ? Math.min(100, discountNumeric) : discountNumeric,
        note,
        customer_name: customerName.trim() || user?.username || undefined,
        token: (typeof api.defaults.headers.common["Authorization"] === "string"
          ? (api.defaults.headers.common["Authorization"] as string).replace(/^Bearer\s+/i, "")
          : undefined),
        payment_method: paymentMethod,
        delivery_address: orderType === "delivery" ? deliveryAddress.trim() : null,
        delivery_fee: orderType === "delivery" ? deliveryFeeValue : 0,
        delivery: orderType === "delivery",
      });
    },
    onSuccess: () => {
      setCart([]);
      setDiscountType("amount");
      setDiscountValue("0");
      setNote("");
      setCashReceived("");
      setCustomerName("");
      setDeliveryAddress("");
      setDeliveryFee("0");
      if (orderType === "dine_in") setSelectedTable(null);
      qc.invalidateQueries({ queryKey: ["dashboard", "pos", "tables"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "pos", "inventory-summary"] });
      Alert.alert(t("dashboard.posSuccessTitle", "تم"), t("dashboard.posOrderCreatedBody", "تم إنشاء الطلب بنجاح."));
    },
    onError: (err) =>
      Alert.alert(t("common.errorTitle", "خطأ"), parseApiError(err) || t("dashboard.posOrderCreateError", "تعذر إنشاء الطلب.")),
  });

  const updateTableStatus = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: number; status: TableRow["status"] }) => {
      await api.patch(`orders/pos/tables/${tableId}/`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", "pos", "tables"] }),
    onError: (err) =>
      Alert.alert(t("common.errorTitle", "خطأ"), parseApiError(err) || t("dashboard.posUpdateStatusError", "تعذر تحديث الحالة.")),
  });

  const adjustLoyalty = useMutation({
    mutationFn: async () => {
      const mid = membershipId.trim();
      const delta = parseInt(pointsDelta, 10);
      if (!mid || !Number.isFinite(delta) || delta === 0) {
        throw new Error(t("dashboard.posLoyaltyInvalid", "أدخل رقم العضوية وقيمة نقاط صحيحة."));
      }
      await api.post("loyalty/scan/", { membership_id: mid, points_delta: delta });
    },
    onSuccess: () => {
      setMembershipId("");
      Alert.alert(t("dashboard.posSuccessTitle", "تم"), t("dashboard.posLoyaltyUpdatedBody", "تم تحديث نقاط الولاء."));
    },
    onError: (err) =>
      Alert.alert(
        t("common.errorTitle", "خطأ"),
        parseApiError(err) || t("dashboard.posLoyaltyUpdateError", "تعذر تحديث نقاط الولاء."),
      ),
  });

  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.posTitle", "الكاشير (POS)")}
        subtitle={t("dashboard.posDeniedSubtitle", "لا تمتلك صلاحية الوصول للكاشير.")}
      />
    );
  }

// ... (الجزء العلوي من الملف بدون تغيير) ...

  return (
    <DashboardShell
      title={t("dashboard.posTitle", "الكاشير (POS)")}
      subtitle={t("dashboard.posSubtitle", "إنشاء طلبات مباشرة من الكاشير.")}
    >
      <View style={styles.sectionsGrid}>
        <DashboardSection
          title={t("dashboard.overviewTitle", "نظرة سريعة")}
          subtitle={t("dashboard.overviewSubtitle", "أرقام مختصرة لمتابعة الحالة الحالية.")}
          style={styles.sectionFull}
        >
          <View style={styles.statsRow}>
            <StatBadge label={t("dashboard.posResultsLabel", "النتائج")} value={products.length} color={theme.status.info} />
            <StatBadge label={t("dashboard.posCartCountLabel", "في السلة")} value={cartCount} color={theme.palette.accentSoft} />
            <StatBadge label={t("dashboard.posGrandTotalLabel", "الإجمالي")} value={grandTotal.toFixed(2)} color={theme.palette.accent} />
            <StatBadge
              label={t("dashboard.posAlertsLabel", "تنبيهات")}
              value={inventory?.total_low_stock ?? inventory?.low_stock?.length ?? 0}
              color={theme.palette.danger}
            />
          </View>
        </DashboardSection>
        <DashboardSection
          title={t("dashboard.posOrderSettingsTitle", "إعدادات الطلب")}
          subtitle={t("dashboard.posOrderSettingsSubtitle", "حدد نوع الطلب والطاولة إن لزم.")}
          style={isWide ? styles.sectionHalf : styles.sectionFull}
        >
          <View style={styles.chipsRow}>
            <Button
              title={t("dashboard.posOrderTypeDineIn", "في الصالة")}
              size="sm"
              variant={orderType === "dine_in" ? "primary" : "ghost"}
              onPress={() => setOrderType("dine_in")}
            />
            <Button
              title={t("dashboard.posOrderTypeTakeaway", "سفري")}
              size="sm"
              variant={orderType === "takeaway" ? "primary" : "ghost"}
              onPress={() => setOrderType("takeaway")}
            />
            <Button
              title={t("dashboard.posOrderTypeDelivery", "توصيل")}
              size="sm"
              variant={orderType === "delivery" ? "primary" : "ghost"}
              onPress={() => setOrderType("delivery")}
            />
          </View>

          {orderType === "dine_in" ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: theme.palette.muted }]}>
                {t("dashboard.posSelectTableLabel", "اختر طاولة")}
              </Text>
              {tablesLoading ? (
                <ActivityIndicator />
              ) : tables.length === 0 ? (
                <Text style={[styles.empty, { color: theme.palette.muted }]}>
                  {t("dashboard.posTablesEmpty", "لا توجد طاولات.")}
                </Text>
              ) : (
                <View style={styles.list}>
                  {tables.slice(0, 16).map((tbl) => {
                    const active = selectedTable === tbl.id;
                    const meta = statusMeta(theme, tbl.status, t);
                    return (
                      <Pressable
                        key={tbl.id}
                        style={[
                          styles.tableRow,
                          {
                            borderColor: active ? theme.palette.accent : theme.palette.border,
                            backgroundColor: theme.palette.surface,
                          },
                        ]}
                        onPress={() => setSelectedTable(tbl.id)}
                        onLongPress={() => {
                          if (!canEditTables) return;
                          updateTableStatus.mutate({ tableId: tbl.id, status: nextTableStatus(tbl.status) });
                        }}
                      >
                        <View style={{ flex: 1, alignItems: "flex-start", gap: 4 }}>
                          <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                            {tbl.label}
                          </Text>
                          <Text style={[styles.itemSub, { color: theme.palette.muted }]} numberOfLines={1}>
                            {`#${tbl.number ?? tbl.id} · ${t("dashboard.posTableCapacityLabel", "السعة")}: ${tbl.capacity ?? "-"}`}
                          </Text>
                        </View>
                        <View style={[styles.pill, { borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }]}>
                          <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </DashboardSection>

        <DashboardSection
          title={t("dashboard.posProductsTitle", "المنتجات")}
          subtitle={t("dashboard.posProductsSubtitle", "اختر من القائمة لإضافته للسلة.")}
          style={styles.sectionFull}
        >
          <View style={styles.statsRow}>
            <StatBadge label={t("dashboard.posResultsLabel", "النتائج")} value={filteredProducts.length} color={theme.palette.success} />
            <StatBadge
              label={t("dashboard.posDisplayedLabel", "المعروض")}
              value={Math.min(visibleProducts, filteredProducts.length)}
              color={theme.status.info}
            />
          </View>

          <Input value={search} onChangeText={setSearch} placeholder={t("dashboard.posSearchPlaceholder", "بحث باسم المنتج...")} />

          <View style={styles.chipsRow}>
            <Button
              title={t("dashboard.posCategoryAll", "الكل")}
              size="sm"
              variant={categoryId === "all" ? "primary" : "ghost"}
              onPress={() => setCategoryId("all")}
            />
            {categories.slice(0, 8).map((c) => (
              <Button key={c.id} title={c.name} size="sm" variant={categoryId === c.id ? "primary" : "ghost"} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>

          {productsLoading ? (
            <ActivityIndicator />
          ) : filteredProducts.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>
              {t("dashboard.posNoResults", "لا توجد نتائج.")}
            </Text>
          ) : (
            <>
                <View style={[styles.list, useProductGrid ? styles.listGrid : null]}>
                  {filteredProducts.slice(0, visibleProducts).map((p) => {
                  const stockNumber = parseNumber(p.stock);
                  const hasStock = p.stock == null ? null : stockNumber > 0;
                  const categoryName =
                    typeof p.category === "object"
                      ? p.category?.name
                      : p.category
                        ? categoryLookup.get(Number(p.category))
                        : undefined;
                  const inCartQty = cartLookup.get(p.id);
                  return (
                      <Pressable
                        key={p.id}
                        style={[
                          styles.productCard,
                          { width: productCardWidth, borderColor: theme.palette.border, backgroundColor: theme.palette.surface },
                        ]}
                        onPress={() => addToCart(p)}
                      >
                      <View style={styles.productInfo}>
                        <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={2}>
                          {p.name}
                        </Text>
                        {categoryName ? (
                          <Text style={[styles.itemSub, { color: theme.palette.muted }]} numberOfLines={1}>
                            {categoryName}
                          </Text>
                        ) : null}
                        <View style={styles.productMeta}>
                          <CurrencyAmount value={parseNumber(p.price)} color={theme.palette.text} symbolSize={12} textStyle={styles.priceText} />
                          {hasStock == null ? null : (
                            <Text style={[styles.stockText, { color: hasStock ? theme.palette.muted : theme.palette.danger }]} numberOfLines={1}>
                              {`${t("dashboard.posStockLabel", "المخزون")}: ${stockNumber}`}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.productActions}>
                        {inCartQty ? (
                          <View style={[styles.inCartPill, { backgroundColor: `${theme.palette.accent}22`, borderColor: `${theme.palette.accent}55` }]}>
                            <Text style={[styles.inCartText, { color: theme.palette.accent }]}>{inCartQty}</Text>
                          </View>
                        ) : null}
                        <View style={[styles.plus, { backgroundColor: theme.palette.accent }]}>
                          <Ionicons name="add" size={18} color="#fff" />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {filteredProducts.length > visibleProducts ? (
                <Button title={t("dashboard.posLoadMore", "عرض المزيد")} variant="secondary" onPress={() => setVisibleProducts((v) => v + 60)} />
              ) : null}
            </>
          )}
        </DashboardSection>

        <DashboardSection
          title={t("dashboard.posCartTitle", "السلة")}
          subtitle={t("dashboard.posCartSubtitle", "راجع المحتوى وعدّل الكميات.")}
          style={isWide ? styles.sectionHalf : styles.sectionFull}
        >
          {cart.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>
              {t("dashboard.posCartEmpty", "السلة فارغة.")}
            </Text>
          ) : (
            <View style={styles.list}>
              {cart.map((it) => (
                <View key={it.product_id} style={[styles.cartRow, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                  <View style={{ flex: 1, alignItems: "flex-start", gap: 4 }}>
                    <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.palette.muted }]}>
                      {`${t("dashboard.posQuantityLabel", "الكمية")}: ${it.quantity}`}
                    </Text>
                  </View>

                  <View style={{ alignItems: "center", gap: 6 }}>
                    <CurrencyAmount value={it.price * it.quantity} color={theme.palette.text} symbolSize={12} textStyle={styles.priceText} />
                    <View style={styles.qtyRow}>
                      <Pressable onPress={() => setQty(it.product_id, it.quantity + 1)} style={[styles.qtyBtn, { borderColor: theme.palette.border }]}>
                        <Ionicons name="add" size={16} color={theme.palette.accent} />
                      </Pressable>
                      <Pressable onPress={() => setQty(it.product_id, it.quantity - 1)} style={[styles.qtyBtn, { borderColor: theme.palette.border }]}>
                        <Ionicons name="remove" size={16} color={theme.palette.accent} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </DashboardSection>

        <DashboardSection
          title={t("dashboard.posPaymentTitle", "الدفع")}
          subtitle={t("dashboard.posPaymentSubtitle", "حدد الخصم وطريقة الدفع ثم أكد الطلب.")}
          style={isWide ? styles.sectionHalf : styles.sectionFull}
        >
          <View style={styles.statsRow}>
            <StatBadge label={t("dashboard.posCartCountLabel", "في السلة")} value={cartCount} color={theme.status.info} />
            <StatBadge label={t("dashboard.posGrandTotalLabel", "الإجمالي")} value={grandTotal.toFixed(2)} color={theme.palette.accent} />
            <StatBadge label={t("dashboard.posAlertsLabel", "تنبيهات")} value={inventory?.total_low_stock ?? inventory?.low_stock?.length ?? 0} color={theme.palette.danger} />
          </View>

          <View style={styles.chipsRow}>
            <Button
              title={t("dashboard.posDiscountNone", "لا خصم")}
              size="sm"
              variant={discountType === "none" ? "primary" : "ghost"}
              onPress={() => setDiscountType("none")}
            />
            <Button
              title={t("dashboard.posDiscountAmount", "قيمة")}
              size="sm"
              variant={discountType === "amount" ? "primary" : "ghost"}
              onPress={() => setDiscountType("amount")}
            />
            <Button
              title={t("dashboard.posDiscountPercent", "نسبة")}
              size="sm"
              variant={discountType === "percent" ? "primary" : "ghost"}
              onPress={() => setDiscountType("percent")}
            />
          </View>

          {discountType === "none" ? null : (
            <Input
              label={t("dashboard.posDiscountValueLabel", "قيمة الخصم")}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
              placeholder={discountType === "percent" ? "10" : "5"}
            />
          )}

          <Input
            label={t("dashboard.posCustomerNameLabel", "اسم العميل (اختياري)")}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder={t("dashboard.posCustomerNamePlaceholder", "اسم العميل")}
          />

          {orderType === "delivery" ? (
            <>
              <Input
                label={t("dashboard.posDeliveryAddressLabel", "عنوان التوصيل")}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
                numberOfLines={2}
                placeholder={t("dashboard.posDeliveryAddressPlaceholder", "اكتب عنوان التوصيل بالكامل")}
              />
              <Input
                label={t("dashboard.posDeliveryFeeLabel", "رسوم التوصيل")}
                value={deliveryFee}
                onChangeText={setDeliveryFee}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </>
          ) : null}

          <Select
            label={t("dashboard.posPaymentMethodLabel", "طريقة الدفع")}
            value={paymentMethod}
            onChange={setpaymentMethod}
            options={[
              { value: "cash", label: t("dashboard.posPaymentCash", "نقدًا") },
              { value: "card_pos", label: t("dashboard.posPaymentCard", "بطاقة / POS") },
              { value: "online", label: t("dashboard.posPaymentOnline", "أونلاين") },
            ]}
          />

          {paymentMethod === "cash" ? (
            <View style={{ gap: 8 }}>
              <Input
                label={t("dashboard.posCashReceivedLabel", "المبلغ المستلم")}
                value={cashReceived}
                onChangeText={setCashReceived}
                keyboardType="decimal-pad"
                placeholder="0"
              />
              <View style={styles.chipsRow}>
                {cashQuickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    title={`${amount}`}
                    size="sm"
                    variant="secondary"
                    onPress={() => setCashReceived(String(amount))}
                  />
                ))}
              </View>
              <View style={styles.chipsRow}>
                <Button
                  title={t("dashboard.posCashFullAmount", "المبلغ كامل")}
                  size="sm"
                  variant="ghost"
                  onPress={() => setCashReceived(grandTotal ? grandTotal.toFixed(2) : "")}
                />
                <Button
                  title={t("dashboard.posCashClear", "مسح")}
                  size="sm"
                  variant="ghost"
                  onPress={() => setCashReceived("")}
                />
              </View>
              <View style={styles.cashSummary}>
                <View style={[styles.cashCard, { borderColor: theme.palette.border }]}>
                  <Text style={[styles.cashLabel, { color: theme.palette.muted }]}>
                    {t("dashboard.posCashRemainingLabel", "المتبقي على العميل")}
                  </Text>
                  <CurrencyAmount value={cashRemaining} color={theme.palette.text} symbolSize={12} textStyle={styles.cashValue} />
                </View>
                <View style={[styles.cashCard, { borderColor: theme.palette.border }]}>
                  <Text style={[styles.cashLabel, { color: theme.palette.muted }]}>
                    {t("dashboard.posCashChangeLabel", "الباقي للعميل")}
                  </Text>
                  <CurrencyAmount value={cashChange} color={theme.palette.text} symbolSize={12} textStyle={styles.cashValue} />
                </View>
              </View>
              {isCashInsufficient ? (
                <Text style={[styles.itemSub, { color: theme.palette.danger }]}>
                  {t("dashboard.posCashInsufficient", "المبلغ المستلم أقل من الإجمالي.")}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Input
            label={t("dashboard.posNoteLabel", "ملاحظة (اختياري)")}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
          />

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.muted }]}>
                {t("dashboard.posSubtotalLabel", "المجموع")}
              </Text>
              <CurrencyAmount value={subtotal} color={theme.palette.text} symbolSize={12} textStyle={styles.totalValue} />
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.muted }]}>
                {t("dashboard.posDiscountTotalLabel", "الخصم")}
              </Text>
              <CurrencyAmount value={discountAmount} color={theme.palette.text} symbolSize={12} textStyle={styles.totalValue} />
            </View>
            {orderType === "delivery" ? (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.palette.muted }]}>
                  {t("dashboard.posDeliveryFeeLabel", "رسوم التوصيل")}
                </Text>
                <CurrencyAmount value={deliveryFeeValue} color={theme.palette.text} symbolSize={12} textStyle={styles.totalValue} />
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.text }]}>
                {t("dashboard.posGrandTotalLabel", "الإجمالي")}
              </Text>
              <CurrencyAmount value={grandTotal} color={theme.palette.text} symbolSize={14} textStyle={[styles.totalValue, { fontSize: 16 }]} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={t("dashboard.posClearCart", "تفريغ السلة")}
              variant="secondary"
              onPress={() => setCart([])}
              disabled={cart.length === 0}
            />
            <Button
              title={t("dashboard.posConfirmOrder", "تأكيد الطلب")}
              onPress={() => createOrder.mutate()}
              loading={createOrder.isPending}
              disabled={
                createOrder.isPending ||
                cart.length === 0 ||
                isCashInsufficient ||
                (orderType === "delivery" && !deliveryAddress.trim())
              }
            />
          </View>
        </DashboardSection>

        <DashboardSection
          title={t("dashboard.posInventoryAlertsTitle", "تنبيهات المخزون")}
          subtitle={t("dashboard.posInventoryAlertsSubtitle", "عناصر قليلة الكمية.")}
          style={isWide ? styles.sectionHalf : styles.sectionFull}
        >
          {inventory?.low_stock?.length ? (
            <View style={styles.list}>
              {inventory.low_stock.slice(0, 10).map((it) => (
                <View key={it.id} style={[styles.inventoryRow, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                  <View style={{ flex: 1, alignItems: "flex-start", gap: 2 }}>
                    <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.palette.muted }]}>
                      {`${t("dashboard.posStockLabel", "المخزون")}: ${it.stock} · ${t("dashboard.posInventoryMinimumLabel", "الحد")}: ${
                        it.minimum_stock
                      }`}
                    </Text>
                  </View>
                  <View style={[styles.pill, { borderColor: `${theme.palette.danger}55`, backgroundColor: `${theme.palette.danger}14` }]}>
                    <Text style={[styles.pillText, { color: theme.palette.danger }]}>
                      {t("dashboard.posLowStockLabel", "منخفض")}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>
              {t("dashboard.posNoAlerts", "لا توجد تنبيهات.")}
            </Text>
          )}
        </DashboardSection>
        <DashboardSection
          title={t("dashboard.posLoyaltyTitle", "نقاط الولاء")}
          subtitle={t("dashboard.posLoyaltySubtitle", "تعديل نقاط العميل برقم العضوية.")}
          style={isWide ? styles.sectionHalf : styles.sectionFull}
        >
          <Input
            label={t("dashboard.posMembershipIdLabel", "رقم العضوية")}
            value={membershipId}
            onChangeText={setMembershipId}
            placeholder="123456"
          />
          <Input
            label={t("dashboard.posPointsChangeLabel", "تغيير النقاط")}
            value={pointsDelta}
            onChangeText={setPointsDelta}
            keyboardType="number-pad"
            placeholder="10"
          />
          <Button
            title={t("dashboard.posUpdateLoyaltyButton", "تحديث نقاط الولاء")}
            onPress={() => adjustLoyalty.mutate()}
            loading={adjustLoyalty.isPending}
          />
        </DashboardSection>
      </View>
    </DashboardShell>
  );
};


const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    sectionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionFull: {
      width: "100%",
    },
    sectionHalf: {
      width: "49%",
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    list: {
      gap: 8,
    },
    listGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tableRow: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    productCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      justifyContent: "space-between",
      minHeight: 72,
      marginBottom: 8,
    },
    productInfo: {
      flex: 1,
      alignItems: "flex-start",
      gap: 4,
    },
    productMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    productActions: {
      alignItems: "center",
      gap: 6,
    },
    plus: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    inCartPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      minWidth: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    inCartText: {
      fontSize: 12,
      fontWeight: "900",
    },
    label: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 12,
      fontWeight: "800",
    },
    itemTitle: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 14,
      fontWeight: "900",
    },
    itemSub: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 12,
      fontWeight: "700",
    },
    stockText: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 12,
      fontWeight: "800",
    },
    pill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    pillText: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },
    empty: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
    },
    cartRow: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    qtyRow: {
      flexDirection: "row",
      gap: 6,
    },
    qtyBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },
    priceText: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.palette.text,
    },
    totals: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.palette.border,
      backgroundColor: theme.palette.surface,
      padding: 10,
      gap: 6,
    },
    cashSummary: {
      flexDirection: "row",
      gap: 8,
    },
    cashCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      padding: 10,
      backgroundColor: theme.palette.surface,
    },
    cashLabel: {
      fontSize: 11,
      fontWeight: "700",
      textAlign: isRTL ? "right" : "left",
    },
    cashValue: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: "800",
      textAlign: isRTL ? "right" : "left",
    },
    totalValue: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.palette.text,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
    },
    inventoryRow: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
  });

export default DashboardPOS;
