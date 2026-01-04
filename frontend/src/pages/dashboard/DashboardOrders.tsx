import React, { useEffect, useMemo, useState } from "react";
import CurrencyAmount from "../../components/common/CurrencyAmount";
import { api } from "../../services/api";

type DashboardOrder = {
  id: number;
  status: string;
  status_display?: string;
  total: number;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  user_name?: string | null;
  customer_name?: string | null;
  order_type?: string;
  delivery?: boolean;
};

type OrderItemAddon = {
  id: number;
  name: string;
  price_delta: number | string;
};

type OrderItem = {
  id: number;
  quantity: number;
  price: number | string;
  product?: { id: number; name: string; image?: string | null } | null;
  addons?: OrderItemAddon[];
};

type OrderDetails = DashboardOrder & {
  status_display?: string;
  payment_status?: string;
  delivery_address?: string | null;
  delivery_fee?: number | string | null;
  discount_type?: "none" | "amount" | "percent";
  discount_value?: number | string | null;
  discount_amount?: number | string | null;
  note?: string | null;
  table?: { id: number; label: string; number?: number | null } | null;
  served_by_name?: string | null;
  items?: OrderItem[];
};

const STATUS_OPTIONS = [
  { value: "pending", label: "قيد المراجعة" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "preparing", label: "قيد التحضير" },
  { value: "ready", label: "جاهز للتسليم" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const statusLabel = (value?: string | null, display?: string | null) =>
  display || value || "";

const orderTypeLabel = (value?: string | null) => {
  if (value === "dine_in") return "طلبات داخلية";
  if (value === "takeaway") return "سفري";
  if (value === "delivery") return "توصيل";
  return value || "غير محدد";
};

const paymentMethodLabel = (value?: string | null) => {
  if (value === "cash") return "نقدي";
  if (value === "card" || value === "card_pos") return "بطاقة / نقاط بيع";
  if (value === "online") return "دفع إلكتروني";
  if (value === "wallet") return "محفظة";
  return value || "غير محدد";
};

const paymentStatusLabel = (value?: string | null) => {
  if (value === "pending") return "بانتظار الدفع";
  if (value === "paid") return "مدفوع";
  if (value === "failed") return "فشل الدفع";
  if (value === "refunded") return "تم الاسترجاع";
  return value || "غير محدد";
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("ar-SA") : "—";

const safeNumber = (val: unknown): number => {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val === "string") {
    const n = Number(val.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (val && typeof val === "object") {
    const obj = val as any;
    if (obj.$numberDecimal != null) return safeNumber(obj.$numberDecimal);
  }
  return 0;
};

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold text-gray-800 text-right flex-1">
      {value || "—"}
    </span>
  </div>
);

const DashboardOrders: React.FC = () => {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsErr, setDetailsErr] = useState<string | null>(null);

  const fetchOrderDetails = async (id: number) => {
    setSelectedId(id);
    setDetailsLoading(true);
    setDetailsErr(null);
    try {
      const res = await api.get(`orders/${id}/`);
      setDetails(res.data);
    } catch (error) {
      console.error(error);
      setDetails(null);
      setDetailsErr("تعذر جلب تفاصيل الطلب.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchOrders = () => {
    setLoading(true);
    api
      .get("orders/")
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setOrders(data);
        setErr(null);
        if (!data.length) {
          setSelectedId(null);
          setDetails(null);
          return;
        }
        const firstId = data[0]?.id;
        const targetId =
          selectedId && data.some((o: DashboardOrder) => o.id === selectedId)
            ? selectedId
            : firstId;
        if (targetId) {
          fetchOrderDetails(targetId);
        }
      })
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل الطلبات.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    try {
      await api.patch(`orders/${id}/`, { status: newStatus });
      fetchOrders();
      if (selectedId === id) {
        fetchOrderDetails(id);
      }
    } catch (error) {
      console.error(error);
      alert("تعذر تحديث حالة الطلب. حاول مرة أخرى.");
    } finally {
      setUpdatingId(null);
    }
  };

  const detailsHeader = useMemo(() => {
    if (!details) return null;
    return [
      {
        label: "العميل",
        value: details.user_name || details.customer_name || "غير مسجل",
      },
      { label: "نوع الطلب", value: orderTypeLabel(details.order_type) },
      { label: "طريقة الدفع", value: paymentMethodLabel(details.payment_method) },
      { label: "حالة الدفع", value: paymentStatusLabel(details.payment_status) },
      {
        label: "طاولة الخدمة",
        value: details.table
          ? `${details.table.label}${
              details.table.number ? ` (#${details.table.number})` : ""
            }`
          : "—",
      },
      {
        label: "الموظف المسؤول",
        value: details.served_by_name || "—",
      },
    ];
  }, [details]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة الطلبات</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-xl shadow border border-amber-50 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <p className="font-semibold">قائمة الطلبات</p>
              <p className="text-xs text-gray-500">
                اختر أي طلب لعرض تفاصيله وتحديث الحالة.
              </p>
            </div>
            {loading ? (
              <span className="text-xs text-gray-500">جارٍ التحميل...</span>
            ) : null}
          </div>
          {err ? (
            <div className="p-4 text-sm text-red-600">{err}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 text-right">#</th>
                    <th className="px-3 py-2 text-right">العميل</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                    <th className="px-3 py-2 text-right">الإجمالي</th>
                    <th className="px-3 py-2 text-right">الدفع</th>
                    <th className="px-3 py-2 text-right">النوع</th>
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">تحديث الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isSelected = selectedId === o.id;
                    return (
                      <tr
                        key={o.id}
                        className={`border-t cursor-pointer ${
                          isSelected ? "bg-amber-50/60" : "hover:bg-gray-50"
                        }`}
                        onClick={() => fetchOrderDetails(o.id)}
                      >
                        <td className="px-3 py-2 font-semibold">#{o.id}</td>
                        <td className="px-3 py-2">
                          {o.user_name || o.customer_name || "غير مسجل"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs">
                            {statusLabel(o.status_display, o.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <CurrencyAmount value={o.total} />
                        </td>
                        <td className="px-3 py-2 text-xs space-y-1">
                          <div>{paymentMethodLabel(o.payment_method)}</div>
                          <div className="text-[11px] text-gray-500">
                            {paymentStatusLabel(o.payment_status)}
                          </div>
                        </td>
                        <td className="px-3 py-2">{orderTypeLabel(o.order_type)}</td>
                        <td className="px-3 py-2 text-xs">
                          {formatDateTime(o.created_at)}
                        </td>
                        <td
                          className="px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={o.status}
                            onChange={(e) => handleStatusChange(o.id, e.target.value)}
                            disabled={updatingId === o.id}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {!orders.length && !loading ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-center text-sm text-gray-500"
                        colSpan={8}
                      >
                        لا توجد طلبات لعرضها حالياً.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow border border-amber-50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">تفاصيل الطلب</p>
              <p className="text-xs text-gray-500">
                عرض أصناف الطلب، بيانات العميل، والدفع.
              </p>
            </div>
            {selectedId ? (
              <span className="text-sm font-semibold text-amber-700">
                طلب #{selectedId}
              </span>
            ) : null}
          </div>

          {detailsLoading ? (
            <div className="text-sm text-gray-500">جارٍ جلب تفاصيل الطلب...</div>
          ) : detailsErr ? (
            <div className="text-sm text-red-600">{detailsErr}</div>
          ) : details ? (
            <>
              <div className="flex items-start justify-between gap-4 border rounded-lg p-3 bg-amber-50/50">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    {formatDateTime(details.created_at)}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {statusLabel(details.status_display, details.status)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {orderTypeLabel(details.order_type)}
                  </p>
                </div>
                <CurrencyAmount
                  value={details.total}
                  className="text-lg font-bold text-gray-900"
                  amountClassName="text-lg font-bold"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3 border rounded-lg p-3">
                {detailsHeader?.map((row) => (
                  <InfoRow key={row.label} label={row.label} value={row.value} />
                ))}
                {details.delivery ? (
                  <InfoRow
                    label="عنوان التوصيل"
                    value={details.delivery_address || "—"}
                  />
                ) : null}
              </div>

              {details.note ? (
                <div className="border rounded-lg p-3 bg-gray-50 text-sm">
                  <p className="font-semibold mb-1">ملاحظات</p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {details.note}
                  </p>
                </div>
              ) : null}

              <div className="grid sm:grid-cols-3 gap-2 border rounded-lg p-3 bg-gray-50">
                <InfoRow
                  label="رسوم التوصيل"
                  value={<CurrencyAmount value={details.delivery_fee} />}
                />
                <InfoRow
                  label="قيمة الخصم"
                  value={<CurrencyAmount value={details.discount_amount} />}
                />
                <InfoRow
                  label="طريقة الخصم"
                  value={
                    details.discount_type === "amount"
                      ? "مبلغ ثابت"
                      : details.discount_type === "percent"
                      ? "نسبة مئوية"
                      : "لا يوجد"
                  }
                />
              </div>

              <div className="border rounded-lg">
                <div className="px-3 py-2 border-b flex items-center justify-between">
                  <p className="font-semibold text-sm">الأصناف</p>
                  <p className="text-xs text-gray-500">
                    {details.items?.length || 0} عنصر
                  </p>
                </div>
                {details.items && details.items.length ? (
                  <ul className="divide-y">
                    {details.items.slice(0, 50).map((item) => {
                      const addons =
                        item.addons
                          ?.map((a) => a.name)
                          .filter(Boolean)
                          .join(" + ") || "";
                      const lineTotal =
                        safeNumber(item.price) * Number(item.quantity || 1);
                      return (
                        <li key={item.id} className="px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.product?.name || `صنف #${item.id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                الكمية: {item.quantity}
                              </p>
                            </div>
                            <CurrencyAmount value={lineTotal} />
                          </div>
                          {addons ? (
                            <p className="text-xs text-gray-600">
                              الإضافات: {addons}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-3 py-4 text-sm text-gray-500">
                    لا توجد أصناف لهذا الطلب.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">
              اختر أي طلب من الجدول لعرض تفاصيله.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOrders;
