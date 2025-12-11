// src/pages/ForgotPassword.tsx
import React, { useState } from "react";
import { api } from "../services/api";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!email.trim()) {
      setErr("الرجاء إدخال البريد الإلكتروني.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("auth/password-reset/", { email });
      setMsg(res.data.detail || "إن كان البريد موجوداً لدينا، ستصلك رسالة قريباً."  +
        "  اذا لم يصلك البريد، تحقق من مجلد الرسائل غير المرغوب فيها.");
    } catch (error) {
      console.error(error);
      setErr("تعذر إرسال طلب إعادة التعيين حالياً. حاول لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-center">استعادة كلمة المرور</h2>
      <p className="text-xs text-gray-600 text-center">
        أدخل بريدك الإلكتروني المسجل لدينا وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {err && <div className="text-xs text-red-500">{err}</div>}
        {msg && <div className="text-xs text-emerald-600">{msg}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
