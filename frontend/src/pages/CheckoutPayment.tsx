import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useStoreSettings } from "../context/StoreSettingsContext";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const CheckoutPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useStoreSettings();

  const storeName = settings?.store_name || "لاڤـا كافيـه";
  const supportEmail = settings?.support_email || settings?.contact_email || "";
  const primaryColor = settings?.primary_color || "#f59e0b";
  const accentColor = settings?.accent_color || "#111827";
  const logo = settings?.logo_url || null;

  const clientSecret = useMemo(() => {
    const fromState = (location.state as any)?.clientSecret as string | undefined;
    if (fromState) return fromState;
    try {
      return sessionStorage.getItem("checkout_embedded_client_secret") || "";
    } catch {
      return "";
    }
  }, [location.state]);

  if (!publishableKey || !stripePromise) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-6 text-right space-y-3">
        <h2 className="text-lg font-semibold text-red-600">الدفع غير مفعّل</h2>
        <p className="text-sm text-gray-700">مفتاح الدفع العام غير موجود في الواجهة.</p>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-6 text-right space-y-3">
        <h2 className="text-lg font-semibold text-amber-700">جلسة الدفع غير متاحة</h2>
        <p className="text-sm text-gray-700">فضلا ارجع لإكمال الطلب وأعد المحاولة.</p>
        <button
          type="button"
          onClick={() => navigate("/checkout")}
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm"
        >
          العودة لإكمال الطلب
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <section
        className="rounded-2xl p-5 md:p-6 border"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(250,246,239,1) 50%, rgba(255,255,255,1) 100%)",
          borderColor: "rgba(245, 158, 11, 0.25)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-right space-y-2">
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: accentColor }}>
              إكمال الدفع الآمن
            </h1>
            <p className="text-sm text-slate-600 leading-7">
              أنت الآن في صفحة دفع داخل {storeName}. أكمل ببطاقتك أو Apple Pay أو Google Pay حسب
              الخيارات المتاحة على جهازك.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <span className="px-3 py-1 rounded-full text-xs border border-emerald-200 bg-emerald-50 text-emerald-700">
                تشفير SSL
              </span>
              <span className="px-3 py-1 rounded-full text-xs border border-blue-200 bg-blue-50 text-blue-700">
                حماية ثلاثية الأبعاد 3D Secure
              </span>
              <span className="px-3 py-1 rounded-full text-xs border border-amber-200 bg-amber-50 text-amber-700">
                بوابة دفع موثوقة
              </span>
            </div>
          </div>

          <div className="self-end md:self-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="px-4 py-2 rounded-full text-sm border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              العودة لإكمال الطلب
            </button>
            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
              {logo ? (
                <img src={logo} alt={storeName} className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs font-bold" style={{ color: primaryColor }}>
                  {storeName.slice(0, 2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <aside className="lg:col-span-1 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right">
            <h3 className="text-sm font-bold text-slate-800 mb-3">خطوات سريعة</h3>
            <ol className="space-y-2 text-xs text-slate-600 leading-6">
              <li>1) اختر وسيلة الدفع المناسبة لك.</li>
              <li>2) أدخل بيانات الدفع وتأكيد الهوية.</li>
              <li>3) بعد الإتمام سيتم إنشاء الطلب تلقائيًا.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right space-y-2">
            <h3 className="text-sm font-bold text-slate-800">الدعم</h3>
            <p className="text-xs text-slate-600">إذا واجهتك أي مشكلة أثناء الدفع تواصل معنا مباشرة.</p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex text-xs text-amber-700 hover:text-amber-800"
              >
                {supportEmail}
              </a>
            ) : null}
          </div>
        </aside>

        <div className="lg:col-span-3 rounded-2xl border border-slate-100 bg-white p-2 md:p-3 min-h-[760px]">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </section>
    </div>
  );
};

export default CheckoutPayment;
