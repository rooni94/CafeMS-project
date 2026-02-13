import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

type Campaign = {
  id: number;
  title: string;
  message: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  target: "customers" | "all" | "staff";
  scheduled_at?: string | null;
  sent_at?: string | null;
  sent_count?: number;
  created_by_name?: string;
};

const NotificationCampaignsPage: React.FC = () => {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Campaign["target"]>("customers");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  const canSubmit = useMemo(() => {
    if (!title.trim() || !message.trim()) return false;
    if (scheduleMode === "later" && !scheduledAt) return false;
    return true;
  }, [title, message, scheduleMode, scheduledAt]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("auth/notification-campaigns/");
      const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "تعذر تحميل حملات الإشعارات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: title.trim(),
        message: message.trim(),
        target,
      };

      if (scheduleMode === "now") {
        payload.status = "sent";
      } else {
        payload.status = "scheduled";
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }

      await api.post("auth/notification-campaigns/", payload);
      setTitle("");
      setMessage("");
      setScheduledAt("");
      setScheduleMode("now");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "تعذر حفظ الحملة.");
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async (id: number) => {
    try {
      await api.post(`auth/notification-campaigns/${id}/send_now/`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "تعذر إرسال الحملة الآن.");
    }
  };

  const processDue = async () => {
    try {
      await api.post("auth/notification-campaigns/process_due/");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "تعذر معالجة الحملات المجدولة.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl border border-amber-100 p-4 text-right">
        <h2 className="text-lg font-bold text-slate-800">التحكم بالإشعارات</h2>
        <p className="text-sm text-slate-600 mt-1">
          أرسل عروض وتنبيهات فورية أو مجدولة للعملاء من مكان واحد.
        </p>
      </div>

      <form onSubmit={createCampaign} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-right">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-600">عنوان الإشعار</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عرض نهاية الأسبوع"
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">الجمهور</label>
            <select
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value as Campaign["target"])}
            >
              <option value="customers">العملاء فقط</option>
              <option value="all">كل المستخدمين</option>
              <option value="staff">الطاقم فقط</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-600">نص الإشعار</label>
          <textarea
            className="w-full mt-1 border rounded-lg px-3 py-2 text-sm min-h-24"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="اكتب رسالة جذابة للعروض أو التنبيهات..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="text-xs text-slate-600">وقت الإرسال</label>
            <select
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as "now" | "later")}
            >
              <option value="now">إرسال فوري</option>
              <option value="later">جدولة لاحقة</option>
            </select>
          </div>

          {scheduleMode === "later" ? (
            <div>
              <label className="text-xs text-slate-600">تاريخ/وقت الجدولة</label>
              <input
                type="datetime-local"
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          ) : (
            <div className="text-xs text-slate-500">سيتم الإرسال فور الحفظ.</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={processDue}
            className="px-4 py-2 rounded-full text-xs border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            معالجة المجدول الآن
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-5 py-2 rounded-full text-sm bg-amber-500 text-white disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الحملة"}
          </button>
        </div>
      </form>

      {error ? <div className="text-sm text-red-600 text-right">{error}</div> : null}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-right mb-3">سجل الحملات</h3>
        {loading ? (
          <div className="text-sm text-slate-500 text-right">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500 text-right">لا توجد حملات بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="py-2 text-right">العنوان</th>
                  <th className="py-2 text-right">الحالة</th>
                  <th className="py-2 text-right">الاستهداف</th>
                  <th className="py-2 text-right">وقت الجدولة</th>
                  <th className="py-2 text-right">تم الإرسال إلى</th>
                  <th className="py-2 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="py-2 text-right">{row.title}</td>
                    <td className="py-2 text-right">{row.status}</td>
                    <td className="py-2 text-right">{row.target}</td>
                    <td className="py-2 text-right">
                      {row.scheduled_at
                        ? new Date(row.scheduled_at).toLocaleString("ar-SA")
                        : "-"}
                    </td>
                    <td className="py-2 text-right">{row.sent_count || 0}</td>
                    <td className="py-2 text-right">
                      {row.status !== "sent" ? (
                        <button
                          type="button"
                          onClick={() => sendNow(row.id)}
                          className="px-3 py-1 rounded-full text-xs border border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          إرسال الآن
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700">تم الإرسال</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCampaignsPage;
