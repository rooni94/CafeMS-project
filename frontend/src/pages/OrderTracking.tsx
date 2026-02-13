// src/pages/OrderTracking.tsx
import React, { useEffect, useState, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Link, useSearchParams, useLocation } from "react-router-dom";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

interface OrderDetails {
  id: number;
  status: OrderStatus;
  status_display: string;
  total: number;
  created_at: string;
}

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

const statusLabel = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return "معلق";
    case "confirmed":
      return "مؤكد";
    case "preparing":
      return "قيد التحضير";
    case "ready":
      return "جاهز للاستلام";
    case "completed":
      return "مكتمل";
    case "paid":
      return "مدفوع";
    case "failed":
      return "فشل في الدفع";
    case "refunded":
      return "تم رد المبلغ";
    case "cancelled":
      return "ملغي";
    default:
      return status;
  }
};

const OrderTracking: React.FC = () => {
  const { user } = useAuth();
  const { addItem, clearCart } = useCart();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkoutSuccessInfo, setCheckoutSuccessInfo] = useState<{
    orderId: number;
  } | null>(() => {
    if (
      location.state &&
      (location.state as any).fromCheckout &&
      (location.state as any).orderId
    ) {
      return { orderId: Number((location.state as any).orderId) };
    }
    try {
      const cached = sessionStorage.getItem("last_order_success");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.orderId) {
          return { orderId: Number(parsed.orderId) };
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // طلبات المستخدم الحالي (بعد تسجيل الدخول)
  const [myOrders, setMyOrders] = useState<OrderDetails[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersErr, setMyOrdersErr] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (checkoutSuccessInfo) {
      try {
        sessionStorage.removeItem("last_order_success");
      } catch {
        /* ignore */
      }
      if (location.state && (location.state as any).fromCheckout) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }
    }
  }, [checkoutSuccessInfo, location.state]);

  // دالة مشتركة لجلب تفاصيل طلب + الفاتورة
  const fetchOrderAndInvoice = useCallback(async (id: string) => {
    setErr(null);
    setOrder(null);
    setInvoiceUrl(null);

    setLoading(true);
    try {
      const res = await api.get(`orders/public/${id}/`);
      setOrder(res.data);

      // محاولة جلب الفاتورة
      setInvoiceLoading(true);
      try {
        const invRes = await api.get(`invoices/public/by-order/${id}/`);
        setInvoiceUrl(invRes.data.pdf_url || null);
      } catch (invoiceError) {
        console.error("invoice error", invoiceError);
        setInvoiceUrl(null);
      } finally {
        setInvoiceLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      if (error?.response?.status === 404) {
        setErr("لم يتم العثور على طلب بهذا الرقم.");
      } else {
        setErr("حدث خطأ أثناء جلب بيانات الطلب.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = orderId.trim();
    if (!trimmedId) {
      setErr("الرجاء إدخال رقم الطلب.");
      return;
    }
    setExpandedOrderId(null);
    await fetchOrderAndInvoice(trimmedId);
  };

  const handleReorder = async (targetOrderId: number) => {
    try {
      const res = await api.get(`orders/${targetOrderId}/`);
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      if (!items.length) {
        setErr("لا توجد عناصر متاحة لإعادة الطلب.");
        return;
      }

      clearCart();
      for (const item of items) {
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
            name: String(product?.name || "منتج"),
            price: unitPrice,
            image: product?.image || undefined,
            addons,
          },
          quantity
        );
      }

      window.location.href = "/cart";
    } catch (error: any) {
      const msg = error?.response?.data?.detail || "تعذر إعادة نفس الطلب.";
      setErr(msg);
    }
  };

  const renderOrderDetailsCard = () => {
    if (!order) return null;

    return (
      <Card>
        <h3 className="font-semibold mb-2">حالة الطلب #{order.id}</h3>
        <p className="text-xs text-gray-500 mb-3">
          الحالة الحالية: {statusLabel(order.status)} - إجمالي: {order.total} ريال
        </p>

        <div className="flex flex-col gap-2">
          {STATUS_STEPS.map((s) => {
            const stepIndex = STATUS_STEPS.indexOf(s);
            const isActive =
              normalizedStatus !== null &&
              currentIndex >= 0 &&
              stepIndex <= currentIndex;

            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isActive ? "bg-amber-500" : "bg-gray-300"
                  }`}
                />
                <span>{statusLabel(s)}</span>
              </div>
            );
          })}

          {currentStatus === "cancelled" && (
            <div className="mt-2 text-sm text-red-500">تم إلغاء هذا الطلب.</div>
          )}

          {currentStatus === "failed" && (
            <div className="mt-2 text-sm text-red-500">
              فشل الدفع لهذا الطلب، الرجاء المحاولة مجددًا أو اختيار طريقة دفع أخرى.
            </div>
          )}

          {currentStatus === "refunded" && (
            <div className="mt-2 text-sm text-amber-700">
              تم رد المبلغ الخاص بهذا الطلب. في حال وجود استفسار تواصل مع الدعم.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleReorder(order.id)}
            className="inline-block px-4 py-2 rounded-full border border-amber-300 text-amber-700 text-xs hover:bg-amber-50"
          >
            إعادة الطلب
          </button>
          {invoiceLoading && (
            <div className="text-xs text-gray-500 self-center">جاري تجهيز الفاتورة...</div>
          )}
          {!invoiceLoading && invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
            >
              تحميل الفاتورة PDF
            </a>
          )}
        </div>
      </Card>
    );
  };

  // تحميل طلبات المستخدم الحالي
  useEffect(() => {
    if (!user) {
      setMyOrders([]);
      return;
    }

    const loadMyOrders = async () => {
      setMyOrdersLoading(true);
      setMyOrdersErr(null);
      try {
        const res = await api.get("orders/my-orders/");
        setMyOrders(res.data);
      } catch (error) {
        console.error("my orders error", error);
        setMyOrdersErr("تعذر تحميل طلباتك الحالية.");
      } finally {
        setMyOrdersLoading(false);
      }
    };

    loadMyOrders();
  }, [user]);

  useEffect(() => {
    const directOrder =
      searchParams.get("order") ||
      searchParams.get("orderId") ||
      searchParams.get("id");
    if (directOrder) {
      setOrderId(directOrder);
      fetchOrderAndInvoice(directOrder);
    }
  }, [searchParams, fetchOrderAndInvoice]);

  const currentStatus = order?.status ?? null;

  // نطبّع حالة الطلب لتحديد المرحلة في الـ timeline
  const getNormalizedStatusForSteps = (status: OrderStatus | null): OrderStatus | null => {
    if (!status) return null;

    switch (status) {
      case "cancelled":
      case "failed":
      case "refunded":
        // لا نفعّل أي خطوة (طلب ملغي أو فشل دفع أو مسترد)
        return null;
      case "paid":
        // نعتبره مكتمل في مسار التقدم
        return "completed";
      default:
        return status;
    }
  };

  const normalizedStatus = getNormalizedStatusForSteps(currentStatus);

  let currentIndex = -1;
  if (normalizedStatus) {
    currentIndex = STATUS_STEPS.indexOf(normalizedStatus);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {checkoutSuccessInfo && (
        <Card className="space-y-2 bg-emerald-50 border border-emerald-100 text-right">
          <h3 className="text-lg font-semibold text-emerald-700">
            تم استلام طلبك بنجاح
          </h3>
          <p className="text-sm text-emerald-800 leading-6">
            رقم طلبك{" "}
            <span className="font-bold">#{checkoutSuccessInfo.orderId}</span>. يمكنك
            متابعة طلبك من هنا مباشرة أو إدخال الرقم في المربع بالأسفل، كما يمكنك
            تنزيل الفاتورة الإلكترونية من القسم الموجود أسفل الصفحة.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setCheckoutSuccessInfo(null)}
              className="px-4 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
            >
              إخفاء الرسالة
            </button>
          </div>
        </Card>
      )}
      {/* عنوان الصفحة + اختصار لملف المستخدم */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">تتبع الطلب</h2>

        {user && (
          <Link
            to="/profile"
            className="flex items-center gap-2 text-xs text-amber-700 hover:underline"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden">
              <span className="font-semibold">
                {user.username?.charAt(0)?.toUpperCase() || "م"}
              </span>
            </div>
            <span>ملفي الشخصي</span>
          </Link>
        )}
      </div>

      {/* فورم التتبع برقم الطلب */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="رقم الطلب"
          className="flex-1 border rounded-full px-3 py-2 text-sm"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm"
          disabled={loading}
        >
          {loading ? "جاري البحث..." : "تتبع"}
        </button>
      </form>

      {err && <div className="text-sm text-red-500">{err}</div>}

      {/* لو المستخدم مسجّل دخول: عرض قائمة طلباته */}
      {user && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">طلباتي</h3>
            {myOrdersLoading && (
              <span className="text-[11px] text-gray-500">
                جاري تحميل الطلبات...
              </span>
            )}
          </div>

          {myOrdersErr && (
            <div className="text-xs text-red-500">{myOrdersErr}</div>
          )}

          {!myOrdersLoading && !myOrdersErr && myOrders.length === 0 && (
            <div className="text-xs text-gray-500">
              لا توجد طلبات مرتبطة بحسابك حتى الآن.
            </div>
          )}

          {!myOrdersLoading && myOrders.length > 0 && (
            <div className="max-h-64 overflow-y-auto text-sm">
              {myOrders.map((o) => (
                <div key={o.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderId(String(o.id));
                      setExpandedOrderId(o.id);
                      fetchOrderAndInvoice(String(o.id));
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-amber-50 text-right"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-xs">طلب رقم #{o.id}</span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(o.created_at).toLocaleString("ar-SA")}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-700">{statusLabel(o.status)}</span>
                      <span className="text-xs font-semibold text-amber-700">{o.total} ريال</span>
                    </div>
                  </button>
                  {expandedOrderId === o.id && order?.id === o.id ? renderOrderDetailsCard() : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {order && !(expandedOrderId && expandedOrderId === order.id) ? renderOrderDetailsCard() : null}
    </div>
  );
};

export default OrderTracking;
