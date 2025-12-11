import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

type Product = {
  id: number;
  name: string;
  price: number | string | null;
  image?: string;
  stock?: number | string | null;
  category?: { id: number; name: string } | number | null;
};

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

type Table = {
  id: number;
  label: string;
  status: "available" | "occupied" | "reserved" | "maintenance";
  capacity: number;
  number?: number | null;
  notes?: string | null;
};

type InventoryAlert = {
  id: number;
  name: string;
  stock: number;
  minimum_stock: number;
  low_stock: boolean;
};

type DiscountType = "amount" | "percent";

const parseNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
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

const formatCurrency = (value: unknown) => {
  const numeric = parseNumber(value);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
};

const orderTypes = [
  { value: "dine_in", label: "محلي" },
  { value: "takeaway", label: "سفري" },
  { value: "delivery", label: "توصيل" },
];

const CashierPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [orderType, setOrderType] = useState(orderTypes[0].value);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>("amount");
  const [note, setNote] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tableUpdating, setTableUpdating] = useState<number | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<InventoryAlert[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loyaltyMembershipId, setLoyaltyMembershipId] = useState("");
  const [loyaltyPointsDelta, setLoyaltyPointsDelta] = useState(10);
  const [loyaltyFeedback, setLoyaltyFeedback] = useState<string | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const res = await api.get("orders/pos/tables/");
      setTables(res.data || []);
    } catch (err) {
      console.error("Failed to load tables", err);
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const res = await api.get("orders/pos/inventory/summary/");
      setLowStockProducts(res.data?.low_stock || []);
    } catch (err) {
      console.error("Failed to load inventory summary", err);
      setLowStockProducts([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoadingProducts(true);
    api
      .get("products/items/")
      .then((res) => {
        const normalized =
          (res.data || []).map((product: Product) => ({
            ...product,
            price: parseNumber(product.price),
            stock: parseNumber(product.stock),
          })) ?? [];
        setProducts(normalized);
      })
      .catch((err) => {
        console.error("Failed to load products for cashier", err);
        setProducts([]);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    loadTables();
    loadInventory();
  }, [loadTables, loadInventory]);

  useEffect(() => {
    if (orderType !== "dine_in") {
      setSelectedTable(null);
    }
  }, [orderType]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    return products.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const addItemToOrder = (product: Product) => {
    const price = parseNumber(product.price);
    setOrderItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const subtotal = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount =
    discountType === "percent" ? (subtotal * discount) / 100 : discount;
  const total = Math.max(subtotal - discountAmount, 0);

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) return;
    if (orderType === "dine_in" && !selectedTable) {
      setStatusMessage("اختر طاولة لخدمة الطلب المحلي.");
      return;
    }
    const normalizedDiscount =
      discountType === "percent"
        ? Math.min(100, Math.max(0, discount))
        : Math.max(0, discount);

    setSubmitting(true);
    setStatusMessage(null);
    try {
      await api.post("orders/pos/cashier/orders/", {
        items: orderItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        order_type: orderType,
        table_id: orderType === "dine_in" ? selectedTable : null,
        discount_type: discountType,
        discount_value: normalizedDiscount,
        note,
        payment_method: "cash",
        delivery: orderType === "delivery",
      });
      setOrderItems([]);
      setDiscount(0);
      setNote("");
      if (orderType === "dine_in") {
        setSelectedTable(null);
      }
      setStatusMessage("تم تسجيل الطلب بنجاح.");
      loadTables();
      loadInventory();
    } catch (err) {
      console.error("Failed to create POS order", err);
      setStatusMessage("تعذر تسجيل الطلب، حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  const getNextStatus = (status: Table["status"]): Table["status"] => {
    if (status === "available") return "occupied";
    if (status === "occupied") return "reserved";
    if (status === "reserved") return "available";
    return "available";
  };

  const handleLoyaltySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoyaltyFeedback(null);
    setLoyaltyError(null);
    if (!loyaltyMembershipId.trim() || loyaltyPointsDelta === 0) {
      setLoyaltyError("أدخل معرف العضوية وعدد النقاط.");
      return;
    }
    setLoyaltyLoading(true);
    try {
      const res = await api.post("loyalty/scan/", {
        membership_id: loyaltyMembershipId.trim(),
        points_delta: loyaltyPointsDelta,
      });
      setLoyaltyFeedback(
        `تم تحديث ${res.data.profile.user_name || res.data.profile.membership_id} إلى ${res.data.profile.points_balance} نقطة.`
      );
    } catch (error: any) {
      console.error(error);
      const detail = error?.response?.data?.detail;
      setLoyaltyError(detail || "تعذر تحديث نقاط العضو.");
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const toggleTableStatus = async (tableId: number) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    const nextStatus = getNextStatus(table.status);
    setTableUpdating(tableId);
    try {
      const res = await api.patch(`orders/pos/tables/${tableId}/`, {
        status: nextStatus,
      });
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? res.data : t))
      );
      if (orderType === "dine_in") {
        setSelectedTable(tableId);
      }
    } catch (err) {
      console.error("Failed to update table status", err);
    } finally {
      setTableUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl shadow border border-amber-100 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">شاشة الكاشير</h1>
          <p className="text-xs text-gray-500">
            إدارة الطلبات السريعة، ربط الطاولات، وتحديث المخزون أولاً بأول.
          </p>
        </div>
        <div className="flex gap-2">
          {orderTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setOrderType(type.value)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                orderType === type.value
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input
              className="w-full md:w-1/2 border rounded-full px-4 py-2 text-sm bg-amber-50/40"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                منتجات متاحة: {products.length}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
                أصناف منخفضة المخزون: {lowStockProducts.length}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loadingProducts && (
              <div className="col-span-full text-center text-sm text-gray-500">
                جاري تحميل المنتجات...
              </div>
            )}
            {!loadingProducts && filteredProducts.length === 0 && (
              <div className="col-span-full text-center text-sm text-gray-500">
                لا توجد منتجات مطابقة لبحثك حالياً.
              </div>
            )}
            {filteredProducts.map((product) => {
            const priceValue =
              typeof product.price === "number"
                ? product.price
                : parseNumber(product.price);
            const stockValue = parseNumber(product.stock);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addItemToOrder(product)}
                className="border border-amber-100 rounded-2xl p-3 text-right hover:border-amber-300 transition bg-white flex flex-col gap-2"
              >
                <div className="text-sm font-semibold">{product.name}</div>
                <div className="text-xs text-gray-500">
                  السعر: {formatCurrency(priceValue)} ر.س
                </div>
                {Number.isFinite(stockValue) && (
                  <div
                    className={`text-[11px] ${
                      stockValue < 5 ? "text-red-500" : "text-gray-400"
                    }`}
                  >
                    المخزون: {stockValue}
                  </div>
                )}
              </button>
            );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold">قسم الولاء</h2>
            <p className="text-xs text-gray-500">
              امسح QR أو أدخل معرف العضوية لإضافة/خصم نقاط العميل فوراً.
            </p>
            <form onSubmit={handleLoyaltySubmit} className="space-y-2 text-sm">
              <input
                className="w-full border rounded-lg px-3 py-2 text-xs"
                placeholder="CAFLOY-XXXXXXX"
                value={loyaltyMembershipId}
                onChange={(e) => setLoyaltyMembershipId(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 border rounded-lg px-2 py-1 text-xs text-right"
                  value={loyaltyPointsDelta}
                  onChange={(e) => setLoyaltyPointsDelta(Number(e.target.value))}
                />
                <span className="text-[11px] text-gray-500">
                  أدخل قيمة موجبة للإضافة أو سالبة للخصم.
                </span>
              </div>
              {loyaltyFeedback && (
                <div className="text-[11px] text-emerald-600">{loyaltyFeedback}</div>
              )}
              {loyaltyError && (
                <div className="text-[11px] text-red-500">{loyaltyError}</div>
              )}
              <button
                type="submit"
                disabled={loyaltyLoading}
                className="w-full py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold disabled:opacity-60"
              >
                {loyaltyLoading ? "جاري التحديث..." : "تحديث نقاط الولاء"}
              </button>
            </form>
          </div>
          <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">اختيار الطاولة</h2>
              <span className="text-[11px] text-gray-500">
                اضغط للتبديل بين مشغولة / متاحة
              </span>
            </div>
            {tablesLoading ? (
              <p className="text-xs text-gray-500">جاري تحميل الطاولات...</p>
            ) : tables.length === 0 ? (
              <p className="text-xs text-gray-500">
                لم يتم إضافة أي طاولة بعد.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => toggleTableStatus(table.id)}
                    disabled={tableUpdating === table.id}
                    className={`rounded-2xl border px-3 py-2 text-xs text-right transition ${
                      selectedTable === table.id && orderType === "dine_in"
                        ? "border-amber-500 bg-amber-50"
                        : "border-amber-100 bg-white"
                    } ${tableUpdating === table.id ? "opacity-50" : ""}`}
                  >
                    <p className="font-semibold">
                      {table.label}{" "}
                      {table.number ? `#${table.number}` : ""}
                    </p>
                    <p
                      className={`text-[11px] ${
                        table.status === "occupied"
                          ? "text-red-500"
                          : table.status === "reserved"
                          ? "text-amber-600"
                          : table.status === "maintenance"
                          ? "text-gray-500"
                          : "text-emerald-600"
                      }`}
                    >
                      {table.status === "occupied"
                        ? "مشغولة"
                        : table.status === "reserved"
                        ? "محجوزة"
                        : table.status === "maintenance"
                        ? "صيانة"
                        : "متاحة"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
            <h2 className="text-sm font-semibold">تفاصيل الطلب</h2>
            {orderItems.length === 0 ? (
              <p className="text-xs text-gray-500">
                لم يتم اختيار أي منتجات بعد.
              </p>
            ) : (
              <div className="space-y-2">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 border rounded-2xl px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {item.price.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="w-6 h-6 rounded-full border text-xs"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="text-sm w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="w-6 h-6 rounded-full border text-xs"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>المجموع</span>
                <span className="font-semibold">{subtotal.toFixed(2)} ر.س</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>الخصم</span>
                  <div className="flex items-center gap-1 rounded-full border border-amber-200 text-[11px] overflow-hidden">
                    {(["amount", "percent"] as DiscountType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDiscountType(type)}
                        className={`px-2 py-0.5 ${
                          discountType === type
                            ? "bg-amber-500 text-white"
                            : "bg-white text-gray-600"
                        }`}
                      >
                        {type === "amount" ? "مبلغ" : "٪ نسبة"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    step={discountType === "percent" ? "0.5" : "1"}
                    className="w-24 border rounded-lg px-2 py-1 text-xs text-right"
                    value={discount}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      if (discountType === "percent") {
                        setDiscount(Math.min(100, Math.max(0, value)));
                      } else {
                        setDiscount(Math.max(0, value));
                      }
                    }}
                  />
                  <span className="text-[11px] text-gray-500">
                    {discountType === "percent" ? "% من الإجمالي" : "ريال سعودي"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between font-bold text-amber-700">
                <span>الإجمالي</span>
                <span>{total.toFixed(2)} ر.س</span>
              </div>
              <textarea
                className="w-full border rounded-2xl px-3 py-2 text-xs bg-amber-50/40"
                placeholder="ملاحظات خاصة بالطلب..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
              {statusMessage && (
                <p
                  className={`text-xs ${
                    statusMessage.includes("تعذر")
                      ? "text-red-500"
                      : "text-emerald-600"
                  }`}
                >
                  {statusMessage}
                </p>
              )}
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={orderItems.length === 0 || submitting}
                className="w-full py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
              >
                {submitting ? "جاري حفظ الطلب..." : "تأكيد الطلب"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">مراقبة المخزون</h2>
              <span className="text-[11px] text-gray-400">
                سيتم ربطها بالحركة الفعلية لاحقاً
              </span>
            </div>
            {inventoryLoading ? (
              <p className="text-xs text-gray-500">جاري تحميل البيانات...</p>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-xs text-gray-500">
                لا توجد تنبيهات مخزون حالياً.
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-amber-100 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold">{product.name}</span>
                    <span
                      className={`${
                        product.low_stock ? "text-red-500" : "text-amber-600"
                      }`}
                    >
                      {`المتوفر: ${product.stock}`}{" "}
                      <span className="text-gray-400">
                        / الحد الأدنى {product.minimum_stock}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierPage;
