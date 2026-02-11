import React from "react";
import { Link, useSearchParams } from "react-router-dom";

const CheckoutSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order") || "";

  return (
    <div className="max-w-xl mx-auto mt-8 bg-white border border-emerald-100 rounded-2xl shadow p-6 text-right space-y-4">
      <h1 className="text-xl font-bold text-emerald-700">تم تحويلك بنجاح من بوابة الدفع</h1>
      <p className="text-sm text-gray-700 leading-7">
        شكرا لك. جاري تأكيد حالة الدفع النهائية تلقائيا خلال ثوان عبر Stripe webhook.
      </p>
      {orderId ? (
        <p className="text-sm text-gray-700">
          رقم الطلب: <span className="font-semibold">#{orderId}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 justify-end">
        <Link
          to={orderId ? `/order-tracking?order=${orderId}` : "/order-tracking"}
          className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm hover:bg-emerald-700"
        >
          متابعة الطلب
        </Link>
        <Link
          to="/menu"
          className="px-4 py-2 rounded-full border border-gray-200 text-sm hover:bg-gray-50"
        >
          العودة للقائمة
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
