// src/pages/hr/HRAlertsDashboard.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type AlertsData = {
  visa: { soon: number; expired: number };
  passport: { soon: number; expired: number };
  contracts: { soon: number; expired: number };
};

const HRAlertsDashboard: React.FC = () => {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    api
      .get("/hr/alerts/")
      .then((res) => setData(res.data))
      .catch((e) => {
        console.error(e);
        setErr("تعذر تحميل التنبيهات.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>جاري تحميل التنبيهات...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!data) return null;

  const Card = ({
    title,
    soon,
    expired,
  }: {
    title: string;
    soon: number;
    expired: number;
  }) => (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-2">
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <div className="flex gap-3 text-xs">
        <div className="flex-1 rounded-lg bg-amber-50 px-3 py-2">
          <div className="text-[11px] text-gray-600">ستنتهي خلال 30 يوم</div>
          <div className="text-lg font-bold">{soon}</div>
        </div>
        <div className="flex-1 rounded-lg bg-red-50 px-3 py-2">
          <div className="text-[11px] text-gray-600">منتهية فعلياً</div>
          <div className="text-lg font-bold text-red-700">{expired}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">تنبيهات الموارد البشرية</h2>
      <p className="text-xs text-gray-500">
        عرض سريع للعقود/الإقامات/الجوازات التي أوشكت على الانتهاء أو انتهت بالفعل.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="الإقامات/التأشيرات" {...data.visa} />
        <Card title="جوازات السفر" {...data.passport} />
        <Card title="عقود العمل" {...data.contracts} />
      </div>
    </div>
  );
};

export default HRAlertsDashboard;
