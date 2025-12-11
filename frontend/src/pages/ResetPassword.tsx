// src/pages/ResetPassword.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";

const strongPwRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword: React.FC = () => {
  const query = useQuery();
  const nav = useNavigate();

  const uid = query.get("uid") || "";
  const token = query.get("token") || "";

  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!uid || !token) {
      setErr("رابط إعادة التعيين غير صالح. حاول طلب رابط جديد.");
      return;
    }

    if (!password1 || !password2) {
      setErr("الرجاء إدخال كلمة المرور وتأكيدها.");
      return;
    }

    if (password1 !== password2) {
      setErr("كلمة المرور الجديدة وتأكيدها غير متطابقتين.");
      return;
    }

    if (!strongPwRegex.test(password1)) {
      setErr(
        "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص وألا تقل عن 8 حروف."
      );
      return;
    }

    setLoading(true);
    try {
      // ✅ مطابق للـ backend: PasswordResetConfirmView
      const res = await api.post("auth/password-reset-confirm/", {
        uid,
        token,
        new_password: password1,
      });

      setMsg(res.data.detail || "تم تعيين كلمة المرور الجديدة بنجاح.");
      // بعد ثواني بسيطة نوجّه المستخدم لتسجيل الدخول
      setTimeout(() => nav("/login"), 2000);
    } catch (error: any) {
      console.error(error);
      const detail =
        error?.response?.data?.detail ||
        "تعذر إعادة تعيين كلمة المرور. تأكد من صلاحية الرابط وحاول مرة أخرى.";
      setErr(detail);
    } finally {
      setLoading(false);
    }
  };

  // في حال فتح الصفحة بدون uid/token من الأساس
  if (!uid || !token) {
    return (
      <div className="max-w-sm mx-auto bg-white rounded-xl shadow p-5 space-y-4 mt-4 text-center">
        <h2 className="text-lg font-semibold">إعادة تعيين كلمة المرور</h2>
        <p className="text-sm text-red-500">
          رابط إعادة التعيين غير صالح أو ناقص. الرجاء طلب رابط جديد من صفحة
          &quot;نسيت كلمة المرور&quot;.
        </p>
        <button
          onClick={() => nav("/forgot-password")}
          className="mt-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
        >
          الذهاب إلى صفحة استعادة كلمة المرور
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow p-5 space-y-4 mt-4">
      <h2 className="text-lg font-semibold text-center">
        تعيين كلمة مرور جديدة
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block mb-1">كلمة المرور الجديدة</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
          />
          <p className="text-[11px] text-gray-500 mt-1">
            يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص وألا تقل عن 8 حروف.
          </p>
        </div>
        <div>
          <label className="block mb-1">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
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
          {loading ? "جاري الحفظ..." : "تعيين كلمة المرور"}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;