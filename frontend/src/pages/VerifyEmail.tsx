import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../services/api";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string>("جاري التحقق من رابط التفعيل...");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
      setStatus("error");
      setMessage("رابط التفعيل غير صالح.");
      return;
    }

    api
      .get("auth/verify-email/", {
        params: { uid, token },
      })
      .then((res) => {
        setStatus("success");
        setMessage(res.data.detail || "تم تفعيل حسابك بنجاح.");
      })
      .catch((error: any) => {
        console.error(error);
        const msg =
          error?.response?.data?.detail || "رابط التفعيل غير صالح أو منتهي.";
        setStatus("error");
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow p-6 mt-6 text-center space-y-3">
      <h1 className="text-lg font-semibold">تفعيل الحساب</h1>
      <p
        className={
          status === "success"
            ? "text-sm text-emerald-600"
            : status === "error"
            ? "text-sm text-red-500"
            : "text-sm text-gray-600"
        }
      >
        {message}
      </p>

      {status === "success" && (
        <Link
          to="/login"
          className="inline-block mt-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
        >
          الانتقال لتسجيل الدخول
        </Link>
      )}

      {status === "error" && (
        <Link
          to="/register"
          className="inline-block mt-2 px-4 py-2 rounded-full bg-gray-100 text-sm hover:bg-gray-200"
        >
          العودة لصفحة التسجيل
        </Link>
      )}
    </div>
  );
};

export default VerifyEmail;
