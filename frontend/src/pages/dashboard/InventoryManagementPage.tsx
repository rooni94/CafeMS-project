import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

type InventoryItem = {
  id: number;
  name: string;
  stock: number;
  minimum_stock: number;
  low_stock: boolean;
};

type InventorySummaryResponse = {
  items: InventoryItem[];
  low_stock: InventoryItem[];
  total_low_stock: number;
};

const REASONS = [
  { value: "manual", label: "تعديل يدوي" },
  { value: "restock", label: "توريد مخزون" },
  { value: "correction", label: "تصحيح جرد" },
  { value: "sale", label: "صرف (مبيعات)" },
];

const InventoryManagementPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowItems, setLowItems] = useState<InventoryItem[]>([]);
  const [totalLow, setTotalLow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<number | "">("");
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("manual");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<InventorySummaryResponse>(
        "orders/pos/inventory/summary/"
      );
      const data = res.data || { items: [], low_stock: [], total_low_stock: 0 };
      setItems(data.items);
      setLowItems(data.low_stock);
      setTotalLow(data.total_low_stock);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل بيانات المخزون.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const updateLocalItem = (updated: InventoryItem) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      const next = exists
        ? prev.map((item) => (item.id === updated.id ? updated : item))
        : [updated, ...prev];
      const lowList = next.filter((item) => item.low_stock);
      setLowItems(lowList.slice(0, 25));
      setTotalLow(lowList.length);
      return next;
    });
  };

  const handleAdjustment = async (
    productId: number,
    adjustBy: number,
    customReason?: string,
    customNote?: string
  ) => {
    try {
      const res = await api.post("orders/pos/inventory/adjust/", {
        product_id: productId,
        delta: adjustBy,
        reason: customReason || reason,
        note: customNote ?? note,
      });
      const updated: InventoryItem = {
        ...res.data,
        low_stock: res.data.stock <= res.data.minimum_stock,
      };
      updateLocalItem(updated);
      setMessage("تم تحديث المخزون.");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("تعذر تعديل المخزون، تحقق من الصلاحيات.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError("اختر المنتج المراد تعديله.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await handleAdjustment(Number(selectedProduct), delta, reason, note);
      setNote("");
      setDelta(1);
    } finally {
      setSubmitting(false);
    }
  };

  const highlightedItems = useMemo(() => items.slice(0, 8), [items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">إدارة المخزون والجرد</h2>
          <p className="text-sm text-gray-500">
            راقب الكميات، أعد التوريد، وسجل أي تعديل على الكميات مباشرة من لوحة التحكم.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSummary}
          className="text-xs px-4 py-2 rounded-full border border-amber-200 hover:bg-amber-50"
        >
          تحديث القائمة
        </button>
      </div>

      {(message || error) && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border ${
            message
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message || error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-amber-100 shadow p-4">
          <p className="text-xs text-gray-500">إجمالي الأصناف المتتبعة</p>
          <p className="text-2xl font-bold text-amber-700">{items.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow p-4">
          <p className="text-xs text-gray-500">عدد الأصناف الحرجة</p>
          <p className="text-2xl font-bold text-red-500">{totalLow}</p>
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow p-4">
          <p className="text-xs text-gray-500">أصناف تمت مراجعتها اليوم</p>
          <p className="text-2xl font-bold text-emerald-600">
            {items.filter((i) => !i.low_stock).length}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">قائمة الأطباق</h3>
            <span className="text-[11px] text-gray-500">
              {loading ? "جاري التحميل..." : `${items.length} عنصر`}
            </span>
          </div>
          {loading ? (
            <p className="text-xs text-gray-500">جاري تحميل بيانات المخزون...</p>
          ) : (
            <div className="space-y-2">
              {highlightedItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-3 flex flex-col gap-2 ${
                    item.low_stock
                      ? "border-red-100 bg-red-50/40"
                      : "border-amber-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-[11px] text-gray-500">
                        الحد الأدنى: {item.minimum_stock}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        item.low_stock ? "text-red-500" : "text-emerald-600"
                      }`}
                    >
                      {item.stock}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-50"
                      onClick={() => handleAdjustment(item.id, 1, "restock", "زيادة من صفحة الجرد")}
                    >
                      +1 توريد
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-50"
                      onClick={() => handleAdjustment(item.id, -1, "sale", "صرف من التدقيق السريع")}
                    >
                      -1 صرف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold">تعديل يدوي للمخزون</h3>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">اختر المنتج</label>
            <select
              value={selectedProduct}
              onChange={(e) =>
                setSelectedProduct(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">اختر</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">القيمة (إضافة أو خصم)</label>
            <input
              type="number"
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-right"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">السبب</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">ملاحظة (اختياري)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
          >
            {submitting ? "جاري الحفظ..." : "حفظ التعديل"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold">الأصناف الحرجة</h3>
        {loading ? (
          <p className="text-xs text-gray-500">جاري التحميل...</p>
        ) : lowItems.length === 0 ? (
          <p className="text-xs text-gray-500">لا توجد أصناف عند الحد الأدنى حالياً.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowItems.map((item) => (
              <div
                key={item.id}
                className="border border-red-200 bg-red-50/60 rounded-2xl p-3 text-right"
              >
                <p className="text-sm font-semibold text-red-600">{item.name}</p>
                <p className="text-xs text-gray-600">
                  المتوفر: {item.stock} | الحد الأدنى: {item.minimum_stock}
                </p>
                <button
                  type="button"
                  className="mt-2 text-[11px] px-3 py-1 rounded-full border border-red-300 hover:bg-white"
                  onClick={() => handleAdjustment(item.id, 5, "restock", "توريد سريع للحد الأدنى")}
                >
                  +5 تعويض سريع
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagementPage;
