// src/pages/Register.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const strongPwRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

type Method = "email" | "phone";
type PhoneStage = "form" | "otp";

const Register: React.FC = () => {
  const { register, startPhoneRegistration, verifyPhoneOtp, loading } = useAuth();
  const nav = useNavigate();

  const [method, setMethod] = useState<Method>("email");
  const [phoneStage, setPhoneStage] = useState<PhoneStage>("form");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [agree, setAgree] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [backendErrs, setBackendErrs] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState<string>("");
  const [resendLeft, setResendLeft] = useState<number>(0);

  useEffect(() => {
    if (method !== "phone" || phoneStage !== "otp" || resendLeft <= 0) return;
    const id = window.setInterval(() => setResendLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [method, phoneStage, resendLeft]);

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBackendErrs([]);
    setSuccess(null);

    if (!agree) {
      setErr("يجب الموافقة على الشروط والأحكام وسياسة الخصوصية.");
      return;
    }

    if (!email.trim()) {
      setErr("البريد الإلكتروني مطلوب.");
      return;
    }

    if (password1 !== password2) {
      setErr("كلمة المرور وتأكيدها غير متطابقتين.");
      return;
    }

    if (!strongPwRegex.test(password1)) {
      setErr(
        "كلمة المرور لا تحقق جميع الشروط المطلوبة. راجع قائمة الشروط بالأسفل."
      );
      return;
    }

    try {
      await register({
        username,
        email: email || undefined,
        password: password1,
        phone: phone || undefined,
      });

      setSuccess(
        "تم إنشاء الحساب بنجاح, تحقق من بريدك الإلكتروني لتفعيل حسابك. " +
        "  اذا لم يصلك البريد، تحقق من مجلد الرسائل غير المرغوب فيها."
      );

      setUsername("");
      setEmail("");
      setPhone("");
      setPassword1("");
      setPassword2("");
      setAgree(false);
    } catch (error: any) {
      console.error(error);
      setErr("تعذر إنشاء الحساب. تأكد من البيانات أو جرّب لاحقاً.");

      const data = error?.response?.data;
      const collected: string[] = [];

      if (data) {
        if (typeof data === "string") {
          collected.push(data);
        } else if (Array.isArray(data.non_field_errors)) {
          collected.push(...data.non_field_errors);
        } else {
          (["username", "email", "phone", "password"] as const).forEach(
            (field) => {
              if (Array.isArray((data as any)[field])) {
                collected.push(...(data as any)[field]);
              }
            }
          );
          if ((data as any).detail) collected.push((data as any).detail);
        }
      }

      if (collected.length) setBackendErrs(collected);
    }
  };

  const handleSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBackendErrs([]);
    setSuccess(null);

    if (!agree) {
      setErr("يجب الموافقة على الشروط والأحكام وسياسة الخصوصية.");
      return;
    }

    if (!phone.trim()) {
      setErr("رقم الهاتف مطلوب.");
      return;
    }

    if (password1 !== password2) {
      setErr("كلمة المرور وتأكيدها غير متطابقتين.");
      return;
    }

    if (!strongPwRegex.test(password1)) {
      setErr("كلمة المرور لا تحقق جميع الشروط المطلوبة. راجع قائمة الشروط بالأسفل.");
      return;
    }

    try {
      const res = await startPhoneRegistration({
        username,
        phone,
        password: password1,
      });

      setOtp("");
      setOtpPhone(res?.phone || phone);
      setResendLeft(Number(res?.resend_seconds || 60));
      setPhoneStage("otp");
      setSuccess(res?.detail || "تم إرسال رمز التحقق.");
    } catch (error: any) {
      console.error(error);
      setErr("تعذر إرسال رمز التحقق. تأكد من البيانات أو جرّب لاحقاً.");

      const data = error?.response?.data;
      const collected: string[] = [];

      if (data) {
        if (typeof data === "string") {
          collected.push(data);
        } else if (Array.isArray(data.non_field_errors)) {
          collected.push(...data.non_field_errors);
        } else {
          (["username", "phone", "password"] as const).forEach((field) => {
            if (Array.isArray((data as any)[field])) {
              collected.push(...(data as any)[field]);
            }
          });
          if ((data as any).detail) collected.push((data as any).detail);
        }
      }

      if (collected.length) setBackendErrs(collected);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBackendErrs([]);
    setSuccess(null);

    if (!otp.trim()) {
      setErr("أدخل رمز التحقق.");
      return;
    }

    try {
      await verifyPhoneOtp(otpPhone || phone, otp.trim());
      setSuccess("تم تفعيل الحساب بنجاح.");
      nav("/");
    } catch (error: any) {
      console.error(error);
      setErr("رمز التحقق غير صحيح أو منتهي.");

      const data = error?.response?.data;
      const collected: string[] = [];
      if (data) {
        if (typeof data === "string") collected.push(data);
        else if ((data as any).detail) collected.push((data as any).detail);
      }
      if (collected.length) setBackendErrs(collected);
    }
  };

  const handleResendOtp = async () => {
    setErr(null);
    setBackendErrs([]);
    setSuccess(null);

    try {
      const res = await startPhoneRegistration({
        username,
        phone: otpPhone || phone,
        password: password1,
      });
      setResendLeft(Number(res?.resend_seconds || 60));
      setSuccess(res?.detail || "تم إرسال رمز التحقق.");
    } catch (error: any) {
      console.error(error);
      setErr("تعذر إرسال رمز التحقق. جرّب لاحقاً.");
    }
  };

  // حساب تحقق الشروط لعرضها بشكل واضح
  const hasUpper = /[A-Z]/.test(password1);
  const hasLower = /[a-z]/.test(password1);
  const hasNumber = /\d/.test(password1);
  const hasSymbol = /[^\w\s]/.test(password1);
  const hasLength = password1.length >= 8;

  const conditionClass = (ok: boolean) =>
    `flex items-center gap-2 text-[11px] ${
      ok ? "text-emerald-600" : "text-gray-500"
    }`;

  if (method === "phone" && phoneStage === "otp") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 space-y-5 mt-4">
        <h1 className="text-xl font-semibold text-center mb-2">
          إنشاء حساب جديد
        </h1>

        <div className="bg-gray-50 border rounded-full p-1 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMethod("email");
              setPhoneStage("form");
              setErr(null);
              setBackendErrs([]);
              setSuccess(null);
            }}
            className={"flex-1 py-2 rounded-full text-sm text-gray-700 hover:bg-white"}
          >
            بالبريد الإلكتروني
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("phone");
              setErr(null);
              setBackendErrs([]);
              setSuccess(null);
            }}
            className={"flex-1 py-2 rounded-full text-sm bg-amber-500 text-white"}
          >
            برقم الهاتف
          </button>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-3 text-sm">
          <div>
            <label className="block mb-1">رقم الهاتف</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              value={otpPhone || phone}
              disabled
            />
          </div>

          <div>
            <label className="block mb-1">رمز التحقق</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-center tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
            />
          </div>

          {err && <div className="text-xs text-red-500 mt-2">{err}</div>}

          {backendErrs.length > 0 && (
            <ul className="text-xs text-red-500 mt-1 list-disc pr-5 space-y-0.5">
              {backendErrs.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          )}

          {success && <div className="text-xs text-emerald-600 mt-2">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60 mt-2"
          >
            {loading ? "جاري التحقق..." : "تحقق"}
          </button>

          <button
            type="button"
            disabled={loading || resendLeft > 0}
            onClick={handleResendOtp}
            className="w-full py-2 rounded-full bg-gray-100 text-sm hover:bg-gray-200 disabled:opacity-60"
          >
            {resendLeft > 0 ? `إعادة الإرسال بعد ${resendLeft}s` : "إعادة إرسال الرمز"}
          </button>

          <button
            type="button"
            className="w-full py-2 rounded-full bg-white border text-sm hover:bg-gray-50"
            onClick={() => {
              setPhoneStage("form");
              setOtp("");
              setBackendErrs([]);
              setErr(null);
              setSuccess(null);
            }}
          >
            رجوع
          </button>
        </form>

        <div className="text-xs text-center text-gray-500">
          لديك حساب بالفعل؟{" "}
          <Link to="/login" className="text-amber-600">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 space-y-5 mt-4">
      <h1 className="text-xl font-semibold text-center mb-2">
        إنشاء حساب جديد
      </h1>

      <div className="bg-gray-50 border rounded-full p-1 flex gap-1">
        <button
          type="button"
          onClick={() => {
            setMethod("email");
            setPhoneStage("form");
            setErr(null);
            setBackendErrs([]);
            setSuccess(null);
          }}
          className={
            "flex-1 py-2 rounded-full text-sm " +
            (method === "email"
              ? "bg-amber-500 text-white"
              : "text-gray-700 hover:bg-white")
          }
        >
          بالبريد الإلكتروني
        </button>
        <button
          type="button"
          onClick={() => {
            setMethod("phone");
            setErr(null);
            setBackendErrs([]);
            setSuccess(null);
          }}
          className={
            "flex-1 py-2 rounded-full text-sm " +
            (method === "phone"
              ? "bg-amber-500 text-white"
              : "text-gray-700 hover:bg-white")
          }
        >
          برقم الهاتف
        </button>
      </div>

      <p className="text-xs text-center text-gray-500 mb-2">
        يُستخدم حسابك لحفظ طلباتك وعناوينك، ويمكنك استعادة الدخول عبر البريد
        الإلكتروني.
      </p>

      <form
        onSubmit={method === "email" ? handleSubmitEmail : handleSubmitPhone}
        className="space-y-3 text-sm"
      >
        <div>
          <label className="block mb-1">اسم المستخدم</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {method === "email" && (
        <div>
          <label className="block mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="مثال: user@example.com"
            required
          />
          <p className="text-[11px] text-gray-500 mt-1">
            يُفضَّل إدخال البريد لتفعيل الحساب واستعادة كلمة المرور.
          </p>
        </div>
        )}

        <div>
          <label className="block mb-1">
            {method === "phone" ? "رقم الهاتف" : "رقم الجوال (اختياري)"}
          </label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="مثال: +9665xxxxxxxx"
            required={method === "phone"}
          />
        </div>

        <div>
          <label className="block mb-1">كلمة المرور</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1">تأكيد كلمة المرور</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>

        {/* قائمة شروط كلمة المرور بشكل واضح */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-1">
          <p className="text-[11px] font-semibold text-gray-700 mb-1">
            شروط كلمة المرور:
          </p>
          <ul className="space-y-0.5">
            <li className={conditionClass(hasLength)}>
              <span>{hasLength ? "✅" : "•"}</span>
              <span>٨ أحرف على الأقل</span>
            </li>
            <li className={conditionClass(hasUpper)}>
              <span>{hasUpper ? "✅" : "•"}</span>
              <span>حرف إنجليزي كبير واحد على الأقل (A-Z)</span>
            </li>
            <li className={conditionClass(hasLower)}>
              <span>{hasLower ? "✅" : "•"}</span>
              <span>حرف إنجليزي صغير واحد على الأقل (a-z)</span>
            </li>
            <li className={conditionClass(hasNumber)}>
              <span>{hasNumber ? "✅" : "•"}</span>
              <span>رقم واحد على الأقل (0-9)</span>
            </li>
            <li className={conditionClass(hasSymbol)}>
              <span>{hasSymbol ? "✅" : "•"}</span>
              <span>رمز خاص واحد على الأقل (! @ # ...)</span>
            </li>
          </ul>
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-600 mt-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span>
            أوافق على{" "}
            <Link to="/terms" className="text-amber-600 underline">
              الشروط والأحكام
            </Link>{" "}
            و{" "}
            <Link to="/privacy" className="text-amber-600 underline">
              سياسة الخصوصية
            </Link>
            .
          </span>
        </label>

        {err && <div className="text-xs text-red-500 mt-2">{err}</div>}

        {backendErrs.length > 0 && (
          <ul className="text-xs text-red-500 mt-1 list-disc pr-5 space-y-0.5">
            {backendErrs.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        )}

        {success && (
          <div className="text-xs text-emerald-600 mt-2">{success}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60 mt-2"
        >
          {loading
            ? "جاري الإرسال..."
            : method === "email"
            ? "إنشاء الحساب"
            : "إرسال رمز التحقق"}
        </button>
      </form>

      <div className="text-xs text-center text-gray-500">
        لديك حساب بالفعل؟{" "}
        <Link to="/login" className="text-amber-600">
          تسجيل الدخول
        </Link>
      </div>
    </div>
  );
};

export default Register;
