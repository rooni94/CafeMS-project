// src/pages/hr/HRSettingsPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";

type LeaveType = { code: string; label: string; color: string; days: number };

type HRSettings = {
  id: number;
  work_days_per_week: string;
  official_hours_per_day: number;
  overtime_threshold_hours: number;
  leave_types: LeaveType[];
};

const HRSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<HRSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("/hr/settings/");
      setSettings(res.data);
    } catch (e) {
      console.error(e);
      setErr("تعذر تحميل إعدادات HR.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await api.patch("/hr/settings/", settings);
      alert("تم حفظ الإعدادات.");
    } catch (e) {
      console.error(e);
      alert("تعذر حفظ الإعدادات.");
    }
  };

  if (loading) return <div>جارٍ تحميل الإعدادات...</div>;
  if (err) return <div className="text-red-500 text-sm">{err}</div>;
  if (!settings) return null;

  const updateLeave = (idx: number, patch: Partial<LeaveType>) => {
    setSettings((prev) =>
      !prev
        ? prev
        : {
            ...prev,
            leave_types: prev.leave_types.map((lt, i) =>
              i === idx ? { ...lt, ...patch } : lt
            ),
          }
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold">إعدادات الموارد البشرية</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block mb-1 text-xs text-gray-600">
              أيام العمل في الأسبوع (قائمة مفصولة بفاصلة)
            </label>
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={settings.work_days_per_week}
              onChange={(e) =>
                setSettings({ ...settings, work_days_per_week: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-gray-600">
              ساعات الدوام الرسمي (في اليوم)
            </label>
            <input
              type="number"
              step="0.5"
              className="border rounded-lg px-3 py-2 w-full"
              value={settings.official_hours_per_day}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  official_hours_per_day: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="block mb-1 text-xs text-gray-600">
              الحد الذي يبدأ بعده احتساب الإضافي
            </label>
            <input
              type="number"
              step="0.5"
              className="border rounded-lg px-3 py-2 w-full"
              value={settings.overtime_threshold_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  overtime_threshold_hours: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* أنواع الإجازات */}
        <div className="bg-white rounded-2xl shadow p-4 text-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-sm">أنواع الإجازات</h2>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full bg-amber-500 text-white"
              onClick={() =>
                setSettings({
                  ...settings,
                  leave_types: [
                    ...settings.leave_types,
                    { code: "custom", label: "إجازة جديدة", color: "#3b82f6", days: 0 },
                  ],
                })
              }
            >
              + إضافة نوع
            </button>
          </div>
          <div className="space-y-2">
            {settings.leave_types.map((lt, idx) => (
              <div
                key={idx}
                className="grid md:grid-cols-4 gap-2 items-center border rounded-lg p-2"
              >
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="الكود"
                  value={lt.code}
                  onChange={(e) => updateLeave(idx, { code: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="الاسم"
                  value={lt.label}
                  onChange={(e) => updateLeave(idx, { label: e.target.value })}
                />
                <input
                  className="border rounded px-2 py-1 text-xs"
                  placeholder="اللون #22c55e"
                  value={lt.color}
                  onChange={(e) => updateLeave(idx, { color: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-xs w-full"
                    placeholder="أيام"
                    value={lt.days}
                    onChange={(e) =>
                      updateLeave(idx, { days: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    className="text-xs text-red-500"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        leave_types: settings.leave_types.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {settings.leave_types.length === 0 && (
              <div className="text-xs text-gray-500">
                لم يتم تعريف أنواع إجازات بعد.
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
        >
          حفظ الإعدادات
        </button>
      </form>
    </div>
  );
};

export default HRSettingsPage;
