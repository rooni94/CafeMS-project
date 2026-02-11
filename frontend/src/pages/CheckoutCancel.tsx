import React from "react";
import { Link, useSearchParams } from "react-router-dom";

const CheckoutCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") || "";

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white border border-amber-100 rounded-2xl shadow p-6 text-right space-y-4">
      <h1 className="text-xl font-bold text-amber-700">تم إلغاء عملية الدفع</h1>
      <p className="text-sm text-gray-700 leading-7">
        لم يكتمل الدفع عبر Stripe. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع مختلفة.
      </p>
      {orderId ? (
        <p className="text-sm text-gray-700">
          الطلب المرتبط: <span className="font-semibold">#{orderId}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 justify-end">
        <Link
          to="/checkout"
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
        >
          إعادة محاولة الدفع
        </Link>
        <Link
          to={orderId ? `/order-tracking?order=${orderId}` : "/order-tracking"}
          className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:bg-gray-50"
        >
          تتبع الطلب
        </Link>
      </div>
    </div>
  );
};

export default CheckoutCancel;
