// src/pages/Checkout.tsx
import React, { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { TrashIcon } from "@heroicons/react/16/solid";
import CurrencyAmount from "../components/common/CurrencyAmount";

type SavedAddress = {
  id: number;
  label: string;
  details: string;
  is_default: boolean;
};

type OrderSuccessState = {
  orderId: number;
  createdAt: string;
};

const Checkout: React.FC = () => {
  const { items, total, clearCart, removeItem } = useCart();
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "pickup"
  );
  const [customAddress, setCustomAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<
    number | "custom"
  >("custom");
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesErr, setAddressesErr] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "wallet"
  >("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccessState | null>(
    null
  );
  const nav = useNavigate();

  const handleResetSuccess = () => {
    setOrderSuccess(null);
    try {
      sessionStorage.removeItem("last_order_success");
    } catch {
      /* ignore cached errors */
    }
  };

  useEffect(() => {
    const fetchAddresses = async () => {
      setAddressesLoading(true);
      setAddressesErr(null);
      try {
        const res = await api.get("auth/addresses/");
        const data: SavedAddress[] = Array.isArray(res.data) ? res.data : [];
        setSavedAddresses(data);
        if (data.length) {
          const defaultAddress = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddress.id);
        } else {
          setSelectedAddressId("custom");
        }
      } catch (err: any) {
        console.error(err);
        if (err?.response?.status === 401) {
          setSavedAddresses([]);
          setSelectedAddressId("custom");
        } else {
          setAddressesErr("تعذر تحميل عناوين الملف الشخصي.");
        }
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
  }, []);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("last_order_success");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.orderId) {
          setOrderSuccess(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to parse cached checkout success", err);
    }
  }, []);

  const selectedSavedAddress =
    selectedAddressId === "custom"
      ? null
      : savedAddresses.find((addr) => addr.id === selectedAddressId) || null;

  if (orderSuccess) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-5 space-y-4 mt-4">
        <h2 className="text-xl font-semibold">تم استلام طلبكم بنجاح</h2>
        <p className="text-sm text-gray-700">
          رقم الطلب الخاص بك هو{" "}
          <span className="font-bold text-amber-600">
            #{orderSuccess.orderId}
          </span>
          . سنبقيك على اطلاع بحالة الطلب.
        </p>
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-right">
          شكراً لثقتك بنا! يعمل الفريق الآن على تجهيز وجبتك بكل عناية، وسيتم
          التواصل معك فور الانتهاء أو عند بدء التوصيل.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <button
            onClick={() => {
              handleResetSuccess();
              nav("/order-tracking");
            }}
            className="px-4 py-2 rounded-full bg-amber-500 text-white hover:bg-amber-600"
          >
            تتبع حالة الطلب
          </button>
          <button
            onClick={() => {
              handleResetSuccess();
              nav("/menu");
            }}
            className="px-4 py-2 rounded-full border border-gray-200 hover:bg-gray-50"
          >
            إنشاء طلب جديد
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-md mx-auto py-6">
        السلة فارغة، لا يوجد ما يتم دفعه.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const invalid = items.some(
      (i) => !i || typeof i.id !== "number" || i.quantity <= 0
    );
    if (invalid) {
      setError(
        "هناك مشكلة في بيانات السلة، حاول إزالة العناصر وإضافتها من جديد."
      );
      return;
    }

    const resolvedAddress =
      deliveryType === "delivery"
        ? selectedSavedAddress?.details || customAddress
        : "";

    if (deliveryType === "delivery" && !resolvedAddress.trim()) {
      setError("الرجاء إدخال عنوان التوصيل.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        order_type: deliveryType === "pickup" ? "takeaway" : "delivery",
        delivery_address: resolvedAddress,
        payment_method:
          paymentMethod === "card" ? "card_pos" : paymentMethod, // تتوافق مع الباكند
        items: items.map((i) => ({
          product_id: i.id,
          quantity: i.quantity,
          addon_ids: i.addons?.map((addon) => addon.id) || [],
        })),
      };

      const res = await api.post("orders/", payload);
      const createdOrder = res.data;
      const successPayload: OrderSuccessState = {
        orderId: createdOrder.id,
        createdAt: new Date().toISOString(),
      };
      setOrderSuccess(successPayload);
      try {
        sessionStorage.setItem(
          "last_order_success",
          JSON.stringify(successPayload)
        );
      } catch {
        /* ignore storage failures */
      }

      clearCart();
      nav(`/order-tracking?order=${createdOrder.id}`, {
        state: { fromCheckout: true, orderId: createdOrder.id },
      });
    } catch (err: any) {
      console.error(err);
      const msgFromServer =
        err?.response?.data?.detail || err?.response?.data?.error || null;

      setError(
        msgFromServer ||
          "حدث خطأ أثناء إنشاء الطلب. تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 py-4">
      <h2 className="text-xl font-semibold mb-2 text-right">إكمال الطلب</h2>

      {/* مراجعة السلة مع إمكانية الحذف */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3 text-sm">
        <h3 className="font-semibold text-right mb-1">مراجعة السلة</h3>
        <div className="space-y-2">
          {items.map((item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) || 1;
            const lineTotal = price * qty;

            return (
              <div
                key={item.key}
                className="flex items-center justify_between gap-3 border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-[11px] text-amber-700">
                      لا صورة
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-semibold">{item.name}</div>
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[11px] text-gray-500 line-clamp-1">
                        + {item.addons.map((addon) => addon.name).join("? ")}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      الكمية: {qty} × <CurrencyAmount value={price} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-bold text-amber-700">
                    <CurrencyAmount value={lineTotal} />
                  </div>
                  <TrashIcon
                    onClick={() => removeItem(item.key)}
                    className="h-6 w-6 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition cursor-pointer"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t pt-2 flex items-center justify-between">
          <span className="text-sm font-semibold">الإجمالي</span>
          <span className="text-lg font-bold text-amber-700">
            <CurrencyAmount value={Number(total || 0)} />
          </span>
        </div>
      </div>

      {/* نموذج بيانات الاستلام والدفع */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-4 rounded-xl shadow text-sm"
      >
        <div>
          <label className="block font-medium mb-1">نوع الطلب / طريقة الاستلام</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
              className={`px-3 py-1.5 rounded-full border ${
                deliveryType === "pickup"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-gray-300 text-gray-700 bg-gray-50"
              }`}
            >
              استلام من المحل (Takeaway)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("delivery")}
              className={`px-3 py-1.5 rounded-full border ${
                deliveryType === "delivery"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-gray-300 text-gray-700 bg-gray-50"
              }`}
            >
              توصيل للعنوان (Delivery)
            </button>
          </div>
        </div>

        {deliveryType === "delivery" && (
          <div className="space-y-2">
            <label className="block font-medium">العنوان للتوصيل</label>
            {addressesLoading ? (
              <div className="text-xs text-gray-500">
                جاري تحميل عناوينك المحفوظة...
              </div>
            ) : addressesErr ? (
              <div className="text-xs text-red-500">{addressesErr}</div>
            ) : savedAddresses.length > 0 ? (
              <div className="space-y-2 text-xs">
                <p className="text-gray-500">
                  اختر أحد العناوين المحفوظة أو اختر إدخال عنوان مختلف.
                </p>
                <div className="space-y-2">
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`border rounded-lg px-3 py-2 flex gap-2 cursor-pointer ${
                        selectedAddressId === addr.id
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address-option"
                        className="mt-1"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                      />
                      <div className="flex-1 text-right">
                        <div className="font-semibold">{addr.label}</div>
                        <div className="text-gray-600 whitespace-pre-line">
                          {addr.details}
                        </div>
                        {addr.is_default && (
                          <span className="inline-flex mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            العنوان الافتراضي
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                  <label
                    className={`border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer ${
                      selectedAddressId === "custom"
                        ? "border-amber-400 bg-amber-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address-option"
                      checked={selectedAddressId === "custom"}
                      onChange={() => setSelectedAddressId("custom")}
                    />
                    <span className="text-gray-700 text-xs">
                      إدخال عنوان مختلف
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                لم تقم بإضافة أي عنوان محفوظ بعد. يمكنك كتابة عنوان التوصيل هنا.
              </div>
            )}
            <textarea
              className="w-full border rounded-lg p-2 text-sm"
              rows={3}
              value={
                selectedSavedAddress
                  ? selectedSavedAddress.details
                  : customAddress
              }
              onChange={(e) => setCustomAddress(e.target.value)}
              disabled={!!selectedSavedAddress}
              required={!selectedSavedAddress}
            />
            {selectedSavedAddress && (
              <p className="text-[11px] text-gray-500 text-right">
                لا يمكن تعديل عنوان محفوظ من هنا، اختر "إدخال عنوان مختلف" إذا
                رغبت بتغييره.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block font-medium mb-1">طريقة الدفع</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(
                e.target.value as "cash" | "card" | "wallet"
              )
            }
          >
            <option value="cash">دفع نقدي عند الاستلام</option>
            <option value="card">بطاقة (جهاز POS)</option>
            <option value="wallet">محفظة إلكترونية</option>
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between mb-1">
            <span>إجمالي السلة</span>
            <span>{Number(total || 0).toFixed(2)} ريال</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>المبلغ المستحق</span>
            <span>{Number(total || 0).toFixed(2)} ريال</span>
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
        >
          {submitting ? "جاري إنشاء الطلب..." : "تأكيد الطلب"}
        </button>
      </form>
    </div>
  );
};

export default Checkout;
