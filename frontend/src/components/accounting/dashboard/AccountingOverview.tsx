import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card } from "../../ui/Card";
import { accountingApi } from "../../../services/accounting";
import { AccountingKPIs } from "../../../types/accounting";

type Props = {
  title?: string;
};

const AccountingOverview: React.FC<Props> = ({ title = "نظرة عامة مالية" }) => {
  const [stats, setStats] = useState<AccountingKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartData = useMemo(
    () =>
      stats
        ? [
            { label: "إيرادات اليوم", value: stats.revenue_today },
            { label: "إيرادات الشهر", value: stats.revenue_month },
            { label: "مصروفات الشهر", value: stats.expenses_month },
          ]
        : [],
    [stats]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    accountingApi
      .fetchDashboard()
      .then(setStats)
      .catch(() => setError("تعذر تحميل مؤشرات المحاسبة"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card>جاري تحميل مؤشرات المحاسبة...</Card>;
  if (error) return <Card className="text-red-500 text-sm">{error}</Card>;
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-xs text-gray-500">
          تدفق لحظي للسيولة، الفواتير، والمخزون
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <div className="text-xs text-gray-500 mb-1">إيرادات اليوم</div>
          <div className="text-2xl font-bold">{stats.revenue_today?.toFixed?.(2)} ر.س</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 mb-1">إيرادات الشهر</div>
          <div className="text-2xl font-bold">{stats.revenue_month?.toFixed?.(2)} ر.س</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 mb-1">مصروفات الشهر</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.expenses_month?.toFixed?.(2)} ر.س
          </div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 mb-1">رواتب الشهر</div>
          <div className="text-2xl font-bold text-amber-700">
            {stats.payroll_month?.toFixed?.(2)} ر.س
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500 mb-1">الرصيد النقدي</div>
          <div className="text-xl font-semibold">{stats.cash_balance?.toFixed?.(2)} ر.س</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 mb-1">فواتير مستحقة</div>
          <div className="text-xl font-semibold">{stats.unpaid_invoices}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 mb-1">أصناف حرجة</div>
          <div className="text-xl font-semibold">{stats.low_stock_items}</div>
        </Card>
      </div>

      <Card className="min-h-[260px]">
        <h4 className="text-sm font-semibold mb-2" dir="rtl">
          تذبذب التدفق النقدي
        </h4>
        <div className="h-56 min-h-[224px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default AccountingOverview;
