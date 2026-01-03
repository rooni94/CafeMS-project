import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
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

const statusMeta = (t: ReturnType<typeof useTheme>, s: TableRow["status"]) => {
  const label = s === "available" ? "متاحة" : s === "occupied" ? "مشغولة" : s === "reserved" ? "محجوزة" : "صيانة";
  const color = s === "available" ? "#10b981" : s === "occupied" ? "#f97316" : s === "reserved" ? "#3b82f6" : t.palette.muted;
  return { label, color };
};

const DashboardPOS: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const [membershipId, setMembershipId] = useState("");
  const [pointsDelta, setPointsDelta] = useState("10");

  useEffect(() => {
    if (orderType !== "dine_in") setSelectedTable(null);
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

  const createOrder = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) return;
      if (orderType === "dine_in" && !selectedTable) {
        throw new Error("حدد طاولة قبل التأكيد.");
      }
      await api.post("orders/pos/cashier/orders/", {
        items: cart.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        order_type: orderType,
        table_id: orderType === "dine_in" ? selectedTable : null,
        discount_type: discountType,
        discount_value: discountType === "percent" ? Math.min(100, discountNumeric) : discountNumeric,
        note,
        customer_name: user?.username,
        token: (typeof api.defaults.headers.common["Authorization"] === "string"
          ? (api.defaults.headers.common["Authorization"] as string).replace(/^Bearer\s+/i, "")
          : undefined),
        payment_method: paymentMethod,
        delivery: orderType === "delivery",
      });
    },
    onSuccess: () => {
      setCart([]);
      setDiscountType("amount");
      setDiscountValue("0");
      setNote("");
      if (orderType === "dine_in") setSelectedTable(null);
      qc.invalidateQueries({ queryKey: ["dashboard", "pos", "tables"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "pos", "inventory-summary"] });
      Alert.alert("تم", "تم إنشاء الطلب بنجاح.");
    },
    onError: (err) => Alert.alert("خطأ", parseApiError(err) || "تعذر إنشاء الطلب."),
  });

  const updateTableStatus = useMutation({
    mutationFn: async ({ tableId, status }: { tableId: number; status: TableRow["status"] }) => {
      await api.patch(`orders/pos/tables/${tableId}/`, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard", "pos", "tables"] }),
    onError: (err) => Alert.alert("خطأ", parseApiError(err) || "تعذر تحديث الحالة."),
  });

  const adjustLoyalty = useMutation({
    mutationFn: async () => {
      const mid = membershipId.trim();
      const delta = parseInt(pointsDelta, 10);
      if (!mid || !Number.isFinite(delta) || delta === 0) {
        throw new Error("أدخل رقم العضوية وقيمة نقاط صحيحة.");
      }
      await api.post("loyalty/scan/", { membership_id: mid, points_delta: delta });
    },
    onSuccess: () => {
      setMembershipId("");
      Alert.alert("تم", "تم تحديث نقاط الولاء.");
    },
    onError: (err) => Alert.alert("خطأ", parseApiError(err) || "تعذر تحديث نقاط الولاء."),
  });

  if (!allowed) {
    return <DashboardAccessDenied title="الكاشير (POS)" subtitle="لا تمتلك صلاحية الوصول للكاشير." />;
  }

// ... (الجزء العلوي من الملف بدون تغيير) ...

  return (
    <DashboardShell title="الكاشير (POS)" subtitle="إنشاء طلبات مباشرة من الكاشير.">
      <View style={styles.sectionsGrid}>
        <DashboardSection title="إعدادات الطلب" subtitle="حدد نوع الطلب والطاولة إن لزم."> {/* أزلت style={styles.half} */}
          <View style={styles.chipsRow}>
            <Button title="في الصالة" size="sm" variant={orderType === "dine_in" ? "primary" : "ghost"} onPress={() => setOrderType("dine_in")} />
            <Button title="سفري" size="sm" variant={orderType === "takeaway" ? "primary" : "ghost"} onPress={() => setOrderType("takeaway")} />
            <Button title="توصيل" size="sm" variant={orderType === "delivery" ? "primary" : "ghost"} onPress={() => setOrderType("delivery")} />
          </View>

          {orderType === "dine_in" ? (
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: theme.palette.muted }]}>اختر طاولة</Text>
              {tablesLoading ? (
                <ActivityIndicator />
              ) : tables.length === 0 ? (
                <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد طاولات.</Text>
              ) : (
                <View style={styles.list}>
                  {tables.slice(0, 16).map((tbl) => {
                    const active = selectedTable === tbl.id;
                    const meta = statusMeta(theme, tbl.status);
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
                        <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
                          <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                            {tbl.label}
                          </Text>
                          <Text style={[styles.itemSub, { color: theme.palette.muted }]} numberOfLines={1}>
                            {`#${tbl.number ?? tbl.id} · السعة: ${tbl.capacity ?? "-"}`}
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

        <DashboardSection title="المنتجات" subtitle="اختر من القائمة لإضافته للسلة."> {/* أزلت style={styles.half} */}
          <View style={styles.statsRow}>
            <StatBadge label="النتائج" value={filteredProducts.length} color={theme.palette.success} />
            <StatBadge label="المعروض" value={Math.min(visibleProducts, filteredProducts.length)} color={theme.status.info} />
          </View>

          <Input value={search} onChangeText={setSearch} placeholder="بحث باسم المنتج..." />

          <View style={styles.chipsRow}>
            <Button title="الكل" size="sm" variant={categoryId === "all" ? "primary" : "ghost"} onPress={() => setCategoryId("all")} />
            {categories.slice(0, 8).map((c) => (
              <Button key={c.id} title={c.name} size="sm" variant={categoryId === c.id ? "primary" : "ghost"} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>

          {productsLoading ? (
            <ActivityIndicator />
          ) : filteredProducts.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد نتائج.</Text>
          ) : (
            <>
              <View style={styles.list}>
                {filteredProducts.slice(0, visibleProducts).map((p) => {
                  const stockNumber = parseNumber(p.stock);
                  const hasStock = p.stock == null ? null : stockNumber > 0;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.productCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}
                      onPress={() => addToCart(p)}
                    >
                      <View style={{ flex: 1, alignItems: "flex-end", gap: 6 }}>
                        <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={2}>
                          {p.name}
                        </Text>
                        <CurrencyAmount value={parseNumber(p.price)} color={theme.palette.text} symbolSize={12} textStyle={styles.priceText} />
                        {hasStock == null ? null : (
                          <Text style={[styles.stockText, { color: hasStock ? theme.palette.muted : theme.palette.danger }]} numberOfLines={1}>
                            {`المخزون: ${stockNumber}`}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.plus, { backgroundColor: theme.palette.accent }]}>
                        <Ionicons name="add" size={18} color="#fff" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {filteredProducts.length > visibleProducts ? (
                <Button title="عرض المزيد" variant="secondary" onPress={() => setVisibleProducts((v) => v + 60)} />
              ) : null}
            </>
          )}
        </DashboardSection>

        <DashboardSection title="السلة" subtitle="راجع المحتوى وعدّل الكميات."> {/* أزلت style={styles.half} */}
          {cart.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>السلة فارغة.</Text>
          ) : (
            <View style={styles.list}>
              {cart.map((it) => (
                <View key={it.product_id} style={[styles.cartRow, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.palette.muted }]}>{`الكمية: ${it.quantity}`}</Text>
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

        <DashboardSection title="الدفع" subtitle="حدد الخصم وطريقة الدفع ثم أكد الطلب."> {/* أزلت style={styles.half} */}
          <View style={styles.statsRow}>
            <StatBadge label="في السلة" value={cartCount} color={theme.status.info} />
            <StatBadge label="الإجمالي" value={total.toFixed(2)} color={theme.palette.accent} />
            <StatBadge label="تنبيهات" value={inventory?.total_low_stock ?? inventory?.low_stock?.length ?? 0} color={theme.palette.danger} />
          </View>

          <View style={styles.chipsRow}>
            <Button title="لا خصم" size="sm" variant={discountType === "none" ? "primary" : "ghost"} onPress={() => setDiscountType("none")} />
            <Button title="قيمة" size="sm" variant={discountType === "amount" ? "primary" : "ghost"} onPress={() => setDiscountType("amount")} />
            <Button title="نسبة" size="sm" variant={discountType === "percent" ? "primary" : "ghost"} onPress={() => setDiscountType("percent")} />
          </View>

          {discountType === "none" ? null : (
            <Input
              label="قيمة الخصم"
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
              placeholder={discountType === "percent" ? "10" : "5"}
            />
          )}

          <Select
            label="طريقة الدفع"
            value={paymentMethod}
            onChange={setpaymentMethod}
            options={[
              { value: "cash", label: "نقدًا" },
              { value: "card_pos", label: "بطاقة / POS" },
              { value: "online", label: "أونلاين" },
            ]}
          />

          <Input label="ملاحظة (اختياري)" value={note} onChangeText={setNote} multiline numberOfLines={2} />

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.muted }]}>المجموع</Text>
              <CurrencyAmount value={subtotal} color={theme.palette.text} symbolSize={12} textStyle={styles.totalValue} />
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.muted }]}>الخصم</Text>
              <CurrencyAmount value={discountAmount} color={theme.palette.text} symbolSize={12} textStyle={styles.totalValue} />
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.palette.text }]}>الإجمالي</Text>
              <CurrencyAmount value={total} color={theme.palette.text} symbolSize={14} textStyle={[styles.totalValue, { fontSize: 16 }]} />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Button title="تفريغ السلة" variant="secondary" onPress={() => setCart([])} disabled={cart.length === 0} />
            <Button title="تأكيد الطلب" onPress={() => createOrder.mutate()} loading={createOrder.isPending} disabled={createOrder.isPending || cart.length === 0} />
          </View>
        </DashboardSection>

        <DashboardSection title="تنبيهات المخزون" subtitle="عناصر قليلة الكمية."> {/* أزلت style={styles.half} */}
          {inventory?.low_stock?.length ? (
            <View style={styles.list}>
              {inventory.low_stock.slice(0, 10).map((it) => (
                <View key={it.id} style={[styles.inventoryRow, { borderColor: theme.palette.border, backgroundColor: theme.palette.surface }]}>
                  <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                    <Text style={[styles.itemTitle, { color: theme.palette.text }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.palette.muted }]}>{`المخزون: ${it.stock} · الحد: ${it.minimum_stock}`}</Text>
                  </View>
                  <View style={[styles.pill, { borderColor: `${theme.palette.danger}55`, backgroundColor: `${theme.palette.danger}14` }]}>
                    <Text style={[styles.pillText, { color: theme.palette.danger }]}>منخفض</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>لا توجد تنبيهات.</Text>
          )}
        </DashboardSection>
        <DashboardSection title="نقاط الولاء" subtitle="تعديل نقاط العميل برقم العضوية."> {/* أزلت style={styles.half} */}
          <Input label="رقم العضوية" value={membershipId} onChangeText={setMembershipId} placeholder="123456" />
          <Input label="تغيير النقاط" value={pointsDelta} onChangeText={setPointsDelta} keyboardType="number-pad" placeholder="10" />
          <Button title="تحديث نقاط الولاء" onPress={() => adjustLoyalty.mutate()} loading={adjustLoyalty.isPending} />
        </DashboardSection>
      </View>
    </DashboardShell>
  );
};


const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    sectionsGrid: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
    },
    half: {
      width: "49%",
    },
    chipsRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    list: {
      gap: 8,
    },
    statsRow: {
      flexDirection: "row-reverse",
      flexWrap: "wrap",
      gap: 8,
    },
    tableRow: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    productCard: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 72,
    },
    plus: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      textAlign: "right",
      fontSize: 12,
      fontWeight: "800",
      writingDirection: "rtl",
    },
    itemTitle: {
      textAlign: "right",
      fontSize: 14,
      fontWeight: "900",
      writingDirection: "rtl",
    },
    itemSub: {
      textAlign: "right",
      fontSize: 12,
      fontWeight: "700",
      writingDirection: "rtl",
    },
    stockText: {
      textAlign: "right",
      fontSize: 12,
      fontWeight: "800",
      writingDirection: "rtl",
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
      writingDirection: "rtl",
      textAlign: "center",
    },
    empty: {
      textAlign: "right",
      fontSize: 13,
      writingDirection: "rtl",
    },
    cartRow: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
    qtyRow: {
      flexDirection: "row-reverse",
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
    totalRow: {
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    totalLabel: {
      fontSize: 13,
      fontWeight: "800",
      writingDirection: "rtl",
      textAlign: "right",
    },
    totalValue: {
      fontSize: 14,
      fontWeight: "900",
      color: theme.palette.text,
    },
    actionsRow: {
      flexDirection: "row-reverse",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
    },
    inventoryRow: {
      borderWidth: 1,
      borderRadius: 16,
      padding: 10,
      flexDirection: "row-reverse",
      gap: 10,
      alignItems: "center",
      justifyContent: "space-between",
    },
  });

export default DashboardPOS;

