// src/pages/Profile.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import LoyaltyQRCode from "../components/LoyaltyQRCode";
import { useStoreSettings } from "../context/StoreSettingsContext";
import SaudiRiyalSymbol from "../components/common/SaudiRiyalSymbol";

// أنواع العناوين
type Address = {
  id: number;
  label: string;
  details: string;
  is_default: boolean;
  created_at: string;
};

// أنواع الطلبات
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

type MyOrderSummary = {
  id: number;
  status: OrderStatus | string;
  total: number;
  created_at: string;
  payment_method: string;
};

type OrderDetails = {
  id: number;
  status: OrderStatus;
  status_display: string;
  total: number;
  created_at: string;
};

type LoyaltyProfileData = {
  membership_id: string;
  qr_token: string;
  points_balance: number;
  tier?: string;
  last_reward_at?: string;
  apple_wallet_pass_id?: string;
  google_wallet_pass_id?: string;
  apple_wallet_pass_url?: string;
  google_wallet_pass_url?: string;
  user_name: string;
};

type LoyaltyResponse = {
  profile: LoyaltyProfileData;
  settings: {
    earn_rate: string;
    auto_reward_threshold: number;
    auto_reward_message: string;
    reward_discount_percent: string;
    tier_one_max?: number;
    tier_two_max?: number;
  };
};

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
];

const statusLabel = (status: OrderStatus | string) => {
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
    case "cancelled":
      return "ملغي";
    default:
      return status;
  }
};

const TIER_LABELS: Record<string, string> = {
  tier_1: "\u0627\u0644\u0645\u0633\u062a\u0648\u0649 1",
  tier_2: "\u0627\u0644\u0645\u0633\u062a\u0648\u0649 2",
  tier_3: "\u0627\u0644\u0645\u0633\u062a\u0648\u0649 3",
};

const strongPwRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useStoreSettings();

  // --------- بيانات المستخدم الأساسية ---------
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mainAddress, setMainAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // --------- تغيير كلمة المرور ---------
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  // --------- إدارة العناوين ---------
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrErr, setAddrErr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newDetails, setNewDetails] = useState("");

  // --------- طلباتي داخل البروفايل ---------
  const [orders, setOrders] = useState<MyOrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [orderDetailsErr, setOrderDetailsErr] = useState<string | null>(null);

  // --------- الولاء ---------
  const [loyalty, setLoyalty] = useState<LoyaltyResponse | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyErr, setLoyaltyErr] = useState<string | null>(null);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);

  // --------- تحميل بيانات المستخدم + العناوين + الطلبات ---------
  useEffect(() => {
    if (!user) return;

    // تعبئة الحقول من user
    setUsername(user.username || "");
    setEmail(user.email || "");
    setMainAddress((user as any).address || "");
    setPhone((user as any).phone || "");

    const loadAddresses = async () => {
      setAddrLoading(true);
      setAddrErr(null);
      try {
        const res = await api.get("auth/addresses/");
        setAddresses(res.data);
      } catch (error) {
        console.error(error);
        setAddrErr("تعذر تحميل العناوين.");
      } finally {
        setAddrLoading(false);
      }
    };

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersErr(null);
      try {
        const res = await api.get("orders/my-orders/");
        setOrders(res.data);
      } catch (error) {
        console.error(error);
        setOrdersErr("تعذر تحميل طلباتك.");
      } finally {
        setOrdersLoading(false);
      }
    };

    const loadLoyalty = async () => {
      setLoyaltyLoading(true);
      setLoyaltyErr(null);
      try {
        const res = await api.get("loyalty/profile/");
        setLoyalty(res.data);
      } catch (error) {
        console.error(error);
        setLoyaltyErr("تعذر تحميل بيانات الولاء.");
      } finally {
        setLoyaltyLoading(false);
      }
    };

    loadAddresses();
    loadOrders();
    loadLoyalty();
  }, [user]);

  // --------- جلب تفاصيل طلب + الفاتورة (مثل OrderTracking) ---------
  const fetchOrderAndInvoice = async (orderId: number) => {
    if (!orderId) return;
    setSelectedOrder(null);
    setInvoiceUrl(null);
    setOrderDetailsErr(null);

    try {
      const res = await api.get(`orders/public/${orderId}/`);
      setSelectedOrder(res.data);

      setInvoiceLoading(true);
      try {
        const invRes = await api.get(
          `invoices/public/by-order/${orderId}/`
        );
        setInvoiceUrl(invRes.data.pdf_url || null);
      } catch (invErr) {
        console.error("invoice error", invErr);
        setInvoiceUrl(null);
      } finally {
        setInvoiceLoading(false);
      }
    } catch (error: any) {
      console.error(error);
      if (error?.response?.status === 404) {
        setOrderDetailsErr("لم يتم العثور على تفاصيل هذا الطلب.");
      } else {
        setOrderDetailsErr("حدث خطأ أثناء جلب تفاصيل الطلب.");
      }
    }
  };

  // --------- حفظ بيانات البروفايل ---------
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    setProfileErr(null);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("address", mainAddress);
      formData.append("phone", phone);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      await api.patch("auth/me/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfileMsg("تم حفظ التغييرات بنجاح.");
    } catch (error) {
      console.error(error);
      setProfileErr("تعذر حفظ التغييرات، حاول مرة أخرى.");
    } finally {
      setSavingProfile(false);
    }
  };

  // --------- تغيير كلمة المرور (مع فحص كلمة مرور قوية) ---------
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);

    if (!oldPassword || !newPassword1 || !newPassword2) {
      setPwErr("الرجاء تعبئة جميع حقول كلمة المرور.");
      return;
    }
    if (newPassword1 !== newPassword2) {
      setPwErr("كلمة المرور الجديدة وتأكيدها غير متطابقتين.");
      return;
    }
    if (!strongPwRegex.test(newPassword1)) {
      setPwErr(
        "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل، وحرف كبير وحرف صغير ورقم ورمز خاص."
      );
      return;
    }

    setPwLoading(true);

    try {
      await api.post("auth/change-password/", {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });

      setPwMsg("تم تغيير كلمة المرور بنجاح.");
      setOldPassword("");
      setNewPassword1("");
      setNewPassword2("");
    } catch (error: any) {
      console.error(error);
      const data = error?.response?.data;
      let msg = "تعذر تغيير كلمة المرور، تأكد من البيانات.";

      if (data) {
        if (typeof data === "string") {
          msg = data;
        } else if (Array.isArray(data.non_field_errors)) {
          msg = data.non_field_errors.join(" ");
        } else if (Array.isArray(data.old_password)) {
          msg = data.old_password.join(" ");
        } else if (Array.isArray(data.new_password1)) {
          msg = data.new_password1.join(" ");
        } else if (data.detail) {
          msg = data.detail;
        }
      }

      setPwErr(msg);
    } finally {
      setPwLoading(false);
    }
  };

  // --------- إدارة العناوين ---------
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newDetails.trim()) return;
    try {
      await api.post("auth/addresses/", {
        label: newLabel,
        details: newDetails,
        is_default: addresses.length === 0,
      });
      setNewLabel("");
      setNewDetails("");

      const res = await api.get("auth/addresses/");
      setAddresses(res.data);
    } catch (error) {
      console.error(error);
      alert("تعذر إضافة العنوان.");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await api.patch(`auth/addresses/${id}/`, { is_default: true });
      const res = await api.get("auth/addresses/");
      setAddresses(res.data);
    } catch (error) {
      console.error(error);
      alert("تعذر تعيين العنوان كافتراضي.");
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const ok = window.confirm("هل أنت متأكد من حذف هذا العنوان؟");
    if (!ok) return;
    try {
      await api.delete(`auth/addresses/${id}/`);
      const res = await api.get("auth/addresses/");
      setAddresses(res.data);
    } catch (error) {
      console.error(error);
      alert("تعذر حذف العنوان.");
    }
  };

  const normalizePassUrl = (
    url: string | undefined,
    platform: "apple" | "google",
    membershipId: string | undefined
  ) => {
    if (!membershipId) return url;
    const base =
      walletBase && walletBase.trim()
        ? walletBase.replace(/\/+$/, "")
        : window.location.origin;
    if (url && url.includes("example.com")) {
      return `${base}/passes/${platform}/${membershipId}.pkpass`;
    }
    if (url) return url;
    return `${base}/passes/${platform}/${membershipId}.pkpass`;
  };

  const handleRequestWalletPass = async (platform: "apple" | "google") => {
    setWalletMsg(null);
    try {
      const res = await api.post(`loyalty/pass/${platform}/`);
      const link = normalizePassUrl(
        res.data?.pass_url,
        platform,
        loyalty?.profile?.membership_id
      );
      setWalletMsg(
        link
          ? `تم إنشاء البطاقة، الرابط: ${link}`
          : res.data?.detail || "تم تحديث البطاقة."
      );
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      }
      const fresh = await api.get("loyalty/profile/");
      setLoyalty(fresh.data);
    } catch (error) {
      console.error(error);
      setWalletMsg("تعذر إنشاء البطاقة حالياً.");
    }
  };

  const walletBase =
    (settings?.wallet_pass_base_url &&
      settings.wallet_pass_base_url.replace(/\/+$/, "")) ||
    window.location.origin;

  // --------- في حالة عدم وجود مستخدم ---------
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-6">
        يجب تسجيل الدخول للوصول إلى صفحة الحساب.
      </div>
    );
  }

  // --------- JSX ---------
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">حسابي</h2>
        <a
          href="#my-orders"
          className="text-sm text-amber-600 hover:underline"
        >
          الانتقال إلى طلباتي
        </a>
      </div>

      {/* بطاقة بيانات الحساب الأساسية */}
      <form
        onSubmit={handleProfileSubmit}
        className="bg-white rounded-xl shadow p-4 space-y-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden">
            {(user as any).avatar ? (
              <img
                src={(user as any).avatar}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-xs text-gray-400">
                بدون صورة
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{user.username}</div>
            <label className="text-xs text-gray-600 cursor-pointer">
              تغيير الصورة
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setAvatarFile(e.target.files ? e.target.files[0] : null)
                }
              />
            </label>
            {avatarFile && (
              <div className="text-[11px] text-gray-500">
                تم اختيار: {avatarFile.name}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block mb-1">اسم المستخدم</label>
            <input
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled
            />
          </div>
          <div>
            <label className="block mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">رقم الجوال</label>
            <input
              type="tel"
              className="w-full border rounded-lg px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">العنوان الافتراضي (سريع)</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
            />
          </div>
        </div>

        {profileMsg && (
          <div className="text-xs text-emerald-600">{profileMsg}</div>
        )}
        {profileErr && (
          <div className="text-xs text-red-500">{profileErr}</div>
        )}

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full md:w-auto px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600 disabled:opacity-60"
        >
          {savingProfile ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>

      {/* تغيير كلمة المرور */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-1">تغيير كلمة المرور</h3>
        <form onSubmit={handleChangePassword} className="space-y-3 text-sm">
          <div>
            <label className="block mb-1">كلمة المرور الحالية</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={newPassword1}
              onChange={(e) => setNewPassword1(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
            />
          </div>

          <div className="text-[11px] text-gray-500">
            يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف كبير وحرف
            صغير ورقم ورمز خاص واحد على الأقل.
          </div>

          {pwMsg && <div className="text-xs text-emerald-600">{pwMsg}</div>}
          {pwErr && <div className="text-xs text-red-500">{pwErr}</div>}

          <button
            type="submit"
            disabled={pwLoading}
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
          >
            {pwLoading ? "جاري التغيير..." : "تغيير كلمة المرور"}
          </button>
        </form>
      </div>

      {/* إدارة العناوين المتعددة */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-1">عناويني</h3>

        {addrLoading ? (
          <div className="text-xs text-gray-500">جاري تحميل العناوين...</div>
        ) : addrErr ? (
          <div className="text-xs text-red-500">{addrErr}</div>
        ) : addresses.length === 0 ? (
          <div className="text-xs text-gray-500">
            لا توجد عناوين مضافة بعد.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {addresses.map((a) => (
              <li
                key={a.id}
                className="border rounded-lg px-3 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-xs mb-1">
                    {a.label}{" "}
                    {a.is_default && (
                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        افتراضي
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-600 whitespace-pre-wrap">
                    {a.details}
                  </div>
                </div>
                <div className="flex gap-2 text-[11px]">
                  {!a.is_default && (
                    <button
                      onClick={() => handleSetDefault(a.id)}
                      className="px-2 py-1 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
                    >
                      تعيين كافتراضي
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAddress(a.id)}
                    className="px-2 py-1 rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

      <form onSubmit={handleAddAddress} className="mt-3 space-y-2 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="block mb-1">اسم العنوان</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="مثال: المنزل / العمل"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1">التفاصيل</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              value={newDetails}
              onChange={(e) => setNewDetails(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
        >
          إضافة عنوان
        </button>
      </form>
    </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">برنامج الولاء</h3>
          {loyalty && (
            <span className="text-xs text-gray-500">
              تكسب {loyalty.settings.earn_rate} نقطة لكل ١{" "}
              <SaudiRiyalSymbol className="inline-block w-3 h-3 align-[-2px]" />
            </span>
          )}
        </div>
        {loyaltyLoading ? (
          <div className="text-xs text-gray-500">جاري تحميل نقاط الولاء...</div>
        ) : loyaltyErr ? (
          <div className="text-xs text-red-500">{loyaltyErr}</div>
        ) : loyalty ? (
          <>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="border rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">رصيد النقاط</p>
                <p className="text-xl font-semibold text-amber-600">
                  {loyalty.profile.points_balance} نقطة
                </p>
                <p className="text-[11px] text-gray-500">
                  المكافأة التالية عند {loyalty.settings.auto_reward_threshold} نقطة
                </p>
              </div>
              <div className="border rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">المستوى</p>
                <p className="text-sm font-semibold text-amber-600">
                  {TIER_LABELS[loyalty.profile.tier || ""] || "-"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {typeof loyalty.settings.tier_one_max === "number" && typeof loyalty.settings.tier_two_max === "number"
                    ? `1- ${loyalty.settings.tier_one_max} أو 2- ${loyalty.settings.tier_two_max}`
                    : "المستوى يعتمد على عدد النقاط."}
                </p>
              </div>
              <div className="border rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">معرف العضوية</p>
                <p className="font-mono text-sm">{loyalty.profile.membership_id}</p>
                <button
                  type="button"
                  className="text-[11px] text-amber-600 hover:underline"
                  onClick={() =>
                    navigator.clipboard.writeText(loyalty.profile.membership_id)
                  }
                >
                  نسخ المعرف
                </button>
              </div>
              <div className="border rounded-lg px-3 py-2 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500">رمز QR</p>
                <LoyaltyQRCode
                  value={loyalty.profile.qr_token}
                  size={140}
                />
                <p className="text-[11px] text-gray-500 text-center">
                  شاركه مع الكاشير لمسح البطاقة في المتجر.
                </p>
              </div>
            </div>
            {(() => {
              const membershipId = loyalty.profile.membership_id;
              const computedAppleLink =
                membershipId && walletBase
                  ? `${walletBase}/passes/apple/${membershipId}.pkpass`
                  : loyalty.profile.apple_wallet_pass_url || "";
              const computedGoogleLink =
                membershipId && walletBase
                  ? `${walletBase}/passes/google/${membershipId}.pkpass`
                  : loyalty.profile.google_wallet_pass_url || "";
              const appleLink =
                computedAppleLink || loyalty.profile.apple_wallet_pass_url || "";
              const googleLink =
                computedGoogleLink || loyalty.profile.google_wallet_pass_url || "";
              return (
                <div className="text-[11px] text-amber-700 space-y-1">
                  <p className="text-gray-500">
                    روابط البطاقات الجاهزة :
                  </p>
                  {appleLink && (
                    <a
                      href={appleLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all hover:underline"
                    >
                      Apple Wallet: {appleLink}
                    </a>
                  )}
                  {googleLink && (
                    <a
                      href={googleLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all hover:underline"
                    >
                      Google Wallet: {googleLink}
                    </a>
                  )}
                </div>
              );
            })()}
            {walletMsg && (
              <div className="text-xs text-emerald-600">{walletMsg}</div>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleRequestWalletPass("apple")}
                className="px-3 py-1.5 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                إضافة إلى Apple Wallet
              </button>
              <button
                type="button"
                onClick={() => handleRequestWalletPass("google")}
                className="px-3 py-1.5 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                إضافة إلى Google Wallet
              </button>
              <span className="text-[11px] text-gray-500">
                تصلك إشعارات فورية عند تحديث النقاط.
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* --------- طلباتي مدمجة في حسابي --------- */}
      <div
        id="my-orders"
        className="bg-white rounded-xl shadow p-4 space-y-3"
      >
        <h3 className="font-semibold text-sm mb-1">طلباتي</h3>

        {ordersLoading ? (
          <div className="text-xs text-gray-500">جاري تحميل الطلبات...</div>
        ) : ordersErr ? (
          <div className="text-xs text-red-500">{ordersErr}</div>
        ) : orders.length === 0 ? (
          <div className="text-xs text-gray-500">
            لا توجد طلبات مرتبطة بحسابك حتى الآن.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* قائمة الطلبات */}
            <div className="max-h-72 overflow-y-auto text-sm border rounded-lg">
              {orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => fetchOrderAndInvoice(o.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-amber-50 text-right"
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-xs">
                      طلب رقم #{o.id}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(o.created_at).toLocaleString("ar-SA")}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-700">
                      {statusLabel(o.status)}
                    </span>
                    <span className="text-xs font-semibold text-amber-700">
                      {o.total} ريال
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* تفاصيل الطلب المختار */}
            <div className="text-sm">
              {!selectedOrder && !orderDetailsErr && (
                <div className="text-xs text-gray-500">
                  اختر أحد الطلبات من القائمة لمشاهدة تفاصيله.
                </div>
              )}

              {orderDetailsErr && (
                <div className="text-xs text-red-500 mb-2">
                  {orderDetailsErr}
                </div>
              )}

              {selectedOrder && (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      تفاصيل الطلب #{selectedOrder.id}
                    </h4>
                    <p className="text-xs text-gray-500">
                      الحالة الحالية:{" "}
                      {statusLabel(selectedOrder.status)} – إجمالي:{" "}
                      {selectedOrder.total} ريال
                    </p>
                    <p className="text-[11px] text-gray-400">
                      تم إنشاء الطلب في:{" "}
                      {new Date(
                        selectedOrder.created_at
                      ).toLocaleString("ar-SA")}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {STATUS_STEPS.map((s) => {
                      const stepIndex = STATUS_STEPS.indexOf(s);
                      const currentIndex = STATUS_STEPS.indexOf(
                        selectedOrder.status === "cancelled"
                          ? "pending"
                          : selectedOrder.status
                      );

                      const isActive =
                        selectedOrder.status === "cancelled"
                          ? false
                          : stepIndex <= currentIndex && currentIndex >= 0;

                      return (
                        <div
                          key={s}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isActive
                                ? "bg-amber-500"
                                : "bg-gray-300"
                            }`}
                          />
                          <span>{statusLabel(s)}</span>
                        </div>
                      );
                    })}

                    {selectedOrder.status === "cancelled" && (
                      <div className="mt-2 text-sm text-red-500">
                        تم إلغاء هذا الطلب.
                      </div>
                    )}
                  </div>

                  <div className="mt-2">
                    {invoiceLoading && (
                      <div className="text-xs text-gray-500">
                        جاري تجهيز الفاتورة...
                      </div>
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
