import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type LoyaltySettings = {
  earn_rate: string;
  auto_reward_threshold: number;
  auto_reward_message: string;
  reward_discount_percent: string;
  tier_one_max: number;
  tier_two_max: number;
  qr_prefix: string;
  pass_primary_color: string;
  pass_secondary_color: string;
  pass_label_color: string;
  pass_logo_url?: string;
};

type LoyaltyTransaction = {
  id: number;
  source: string;
  points_delta: number;
  note: string;
  order_id?: number;
  created_at: string;
};

const DashboardLoyaltyPage: React.FC = () => {
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsErr, setSettingsErr] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(true);
  const [txnErr, setTxnErr] = useState<string | null>(null);
  const [txnFilter, setTxnFilter] = useState("");

  const [scanMembershipId, setScanMembershipId] = useState("");
  const [scanPoints, setScanPoints] = useState(10);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [scanErr, setScanErr] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get("loyalty/settings/");
      setSettings(res.data);
    } catch (error) {
      console.error(error);
      setSettingsErr("تعذر تحميل إعدادات الولاء.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadTransactions = async (membershipId?: string) => {
    setTxnLoading(true);
    setTxnErr(null);
    try {
      const res = await api.get("loyalty/transactions/", {
        params: membershipId ? { membership_id: membershipId } : {},
      });
      setTransactions(res.data?.results || res.data || []);
    } catch (error) {
      console.error(error);
      setTxnErr("تعذر تحميل الحركات الأخيرة.");
    } finally {
      setTxnLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadTransactions();
  }, []);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSettingsMsg(null);
    setSettingsErr(null);
    try {
      await api.patch("loyalty/settings/", settings);
      setSettingsMsg("تم تحديث إعدادات الولاء بنجاح.");
    } catch (error) {
      console.error(error);
      setSettingsErr("تعذر حفظ إعدادات الولاء.");
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanErr(null);
    setScanMsg(null);
    if (!scanMembershipId.trim() || !scanPoints) {
      setScanErr("الرجاء إدخال معرف العضوية والنقاط.");
      return;
    }
    setScanLoading(true);
    try {
      const res = await api.post("loyalty/scan/", {
        membership_id: scanMembershipId.trim(),
        points_delta: scanPoints,
      });
      setScanMsg(
        `تم تحديث رصيد ${res.data.profile.user_name} إلى ${res.data.profile.points_balance} نقطة.`
      );
      loadTransactions(scanMembershipId.trim());
    } catch (error: any) {
      console.error(error);
      const detail = error?.response?.data?.detail;
      setScanErr(detail || "تعذر تحديث نقاط العميل.");
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">برنامج الولاء</h1>
        <p className="text-sm text-gray-500">
          اضبط آلية اكتساب النقاط، حد المكافآت، وألوان بطاقات Apple/Google Wallet.
        </p>
      </div>

      <form
        onSubmit={handleSettingsSubmit}
        className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3 text-sm"
      >
        {settingsLoading ? (
          <p className="text-xs text-gray-500">جاري تحميل الإعدادات...</p>
        ) : settings ? (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-gray-500">نقاط لكل ١ ريال</span>
                <input
                  type="number"
                  step="0.1"
                  value={settings.earn_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, earn_rate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">حد المكافأة (نقطة)</span>
                <input
                  type="number"
                  value={settings.auto_reward_threshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auto_reward_threshold: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">نص المكافأة</span>
                <input
                  value={settings.auto_reward_message}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      auto_reward_message: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">خصم المكافأة %</span>
                <input
                  type="number"
                  step="0.5"
                  value={settings.reward_discount_percent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      reward_discount_percent: e.target.value,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">الحد الأقصى للمستوى الأول (نقطة)</span>
                <input
                  type="number"
                  value={settings.tier_one_max}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_one_max: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">الحد الأقصى للمستوى الثاني (نقطة)</span>
                <input
                  type="number"
                  value={settings.tier_two_max}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      tier_two_max: Number(e.target.value),
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">بادئة العضوية / QR</span>
                <input
                  value={settings.qr_prefix}
                  onChange={(e) =>
                    setSettings({ ...settings, qr_prefix: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-500">رابط الشعار</span>
                <input
                  value={settings.pass_logo_url || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, pass_logo_url: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <label className="space-y-1">
                <span className="text-xs">لون البطاقة الأساسي</span>
                <input
                  type="color"
                  value={settings.pass_primary_color}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pass_primary_color: e.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs">لون البطاقة الثانوي</span>
                <input
                  type="color"
                  value={settings.pass_secondary_color}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pass_secondary_color: e.target.value,
                    })
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs">لون النص</span>
                <input
                  type="color"
                  value={settings.pass_label_color}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pass_label_color: e.target.value,
                    })
                  }
                />
              </label>
            </div>

            {settingsMsg && (
              <div className="text-xs text-emerald-600">{settingsMsg}</div>
            )}
            {settingsErr && (
              <div className="text-xs text-red-500">{settingsErr}</div>
            )}

            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
            >
              حفظ إعدادات الولاء
            </button>
          </>
        ) : (
          <p className="text-xs text-red-500">{settingsErr}</p>
        )}
      </form>

      <div className="grid lg:grid-cols-2 gap-4">
        <form
          onSubmit={handleScan}
          className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3 text-sm"
        >
          <h2 className="font-semibold text-sm">قسم الولاء في الكاشير</h2>
          <p className="text-xs text-gray-500">
            امسح QR أو أدخل معرف العضوية لتحديث النقاط فورياً.
          </p>
          <label className="space-y-1 block">
            <span className="text-xs">معرف العضوية أو QR</span>
            <input
              value={scanMembershipId}
              onChange={(e) => setScanMembershipId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="CAFLOY-XXXX"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs">النقاط (+/-)</span>
            <input
              type="number"
              value={scanPoints}
              onChange={(e) => setScanPoints(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </label>
          {scanMsg && <div className="text-xs text-emerald-600">{scanMsg}</div>}
          {scanErr && <div className="text-xs text-red-500">{scanErr}</div>}
          <button
            type="submit"
            disabled={scanLoading}
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
          >
            {scanLoading ? "تحديث الرصيد..." : "تحديث نقاط العميل"}
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm">الحركات الأخيرة</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadTransactions(txnFilter || undefined);
              }}
              className="flex items-center gap-2 text-xs"
            >
              <input
                value={txnFilter}
                onChange={(e) => setTxnFilter(e.target.value)}
                placeholder="معرف عضوية"
                className="border rounded-lg px-2 py-1"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
              >
                بحث
              </button>
            </form>
          </div>

          {txnLoading ? (
            <p className="text-xs text-gray-500">جاري تحميل الحركات...</p>
          ) : txnErr ? (
            <p className="text-xs text-red-500">{txnErr}</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد حركات حالياً.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto text-xs">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-gray-500">
                    <th className="px-2 py-1 text-right">المصدر</th>
                    <th className="px-2 py-1 text-right">النقاط</th>
                    <th className="px-2 py-1 text-right">الوصف</th>
                    <th className="px-2 py-1 text-right">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-t">
                      <td className="px-2 py-1">{txn.source}</td>
                      <td
                        className={`px-2 py-1 ${txn.points_delta >= 0
                            ? "text-emerald-600"
                            : "text-red-500"
                          }`}
                      >
                        {txn.points_delta > 0 ? "+" : ""}
                        {txn.points_delta}
                      </td>
                      <td className="px-2 py-1">{txn.note || "-"}</td>
                      <td className="px-2 py-1 text-gray-500">
                        {new Date(txn.created_at).toLocaleString("ar-SA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLoyaltyPage;
