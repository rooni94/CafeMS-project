// src/pages/Login.tsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";

const Login: React.FC = () => {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const nextPath = useMemo(() => {
    const next = new URLSearchParams(location.search).get("next") || "/";
    return next.startsWith("/") ? next : "/";
  }, [location.search]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    try {
      await login(username, password);
      nav(nextPath);
    } catch (error: any) {
      console.error(error);
      let msg = "بيانات الدخول غير صحيحة أو حدث خطأ في الخادم.";

      const data = error?.response?.data;
      if (data) {
        if (typeof data === "string") {
          msg = data;
        } else if (Array.isArray(data.non_field_errors)) {
          msg = data.non_field_errors.join(" ");
        } else if ((data as any).detail) {
          msg = (data as any).detail;
        }
      }

      setErr(msg);
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow p-5 space-y-4 mt-4">
      <h1 className="text-lg font-semibold text-center">تسجيل الدخول</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">اسم المستخدم</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="اسم المستخدم الذي سجّلت به"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">كلمة المرور</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
          />
        </div>

        {err && <div className="text-sm text-red-500">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "جاري تسجيل الدخول..." : "دخول"}
        </button>
      </form>

      <div className="text-xs text-center text-gray-500 mt-2">
  نسيت كلمة المرور؟{" "}
  <Link to="/forgot-password" className="text-amber-600">
    استعادة كلمة المرور
  </Link>
</div>


      <div className="text-xs text-center text-gray-500">
        ليس لديك حساب؟{" "}
        <Link to={`/register?next=${encodeURIComponent(nextPath)}`} className="text-amber-600">
          إنشاء حساب جديد
        </Link>
      </div>
    </div>
  );
};

export default Login;
