import React, { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { api } from "../../services/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import AccountingOverview from "../../components/accounting/dashboard/AccountingOverview";

type StatsPoint = {
  period: string;
  revenue: number;
  orders: number;
};

type DashboardStats = {
  total_orders: number;
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  revenue_today: number;
  revenue_all: number;
  series?: StatsPoint[];
};

const DashboardHome: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "custom">("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchStats = () => {
    setLoading(true);
    setErr(null);

    const params: any = { group_by: groupBy };

    if (range === "custom" && startDate && endDate) {
      params.start_date = startDate;
      params.end_date = endDate;
    }

    api
      .get("orders/dashboard-stats/", { params })
      .then((res) => setStats(res.data))
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل إحصائيات اللوحة.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [groupBy, range, startDate, endDate]);

  if (loading) return <div>جاري تحميل البيانات...</div>;
  if (err) return <div className="text-red-500 text-sm">{err}</div>;
  if (!stats) return null;

  const chartData = stats.series ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">نظرة عامة</h2>

      {/* كروت سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-500 mb-1">إجمالي الطلبات</div>
          <div className="text-2xl font-bold">{stats.total_orders}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">مبيعات اليوم المكتملة</div>
          <div className="text-2xl font-bold">{stats.revenue_today} ريال</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">إجمالي المبيعات</div>
          <div className="text-2xl font-bold">{stats.revenue_all} ريال</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-500 mb-1">معلّقة</div>
          <div className="text-xl font-bold">{stats.pending_orders}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">قيد التحضير</div>
          <div className="text-xl font-bold">{stats.preparing_orders}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">جاهزة</div>
          <div className="text-xl font-bold">{stats.ready_orders}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500 mb-1">ملغية</div>
          <div className="text-xl font-bold">{stats.cancelled_orders}</div>
        </Card>
      </div>

      {/* فلاتر الشارت */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">فترة:</span>
            <select
              className="border rounded-lg px-2 py-1"
              value={range}
              onChange={(e) =>
                setRange(e.target.value as "7d" | "30d" | "90d" | "custom")
              }
            >
              <option value="7d">آخر 7 أيام</option>
              <option value="30d">آخر 30 يوم</option>
              <option value="90d">آخر 90 يوم</option>
              <option value="custom">فترة مخصصة</option>
            </select>
          </div>

          {range === "custom" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">من:</span>
                <input
                  type="date"
                  className="border rounded-lg px-2 py-1"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">إلى:</span>
                <input
                  type="date"
                  className="border rounded-lg px-2 py-1"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gray-600">تجميع بحسب:</span>
            <select
              className="border rounded-lg px-2 py-1"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as "day" | "week" | "month")
              }
            >
              <option value="day">اليوم</option>
              <option value="week">الأسبوع</option>
              <option value="month">الشهر</option>
            </select>
          </div>

          <button
            onClick={fetchStats}
            className="ml-auto px-4 py-1.5 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            تحديث الإحصائيات
          </button>
        </div>

        {chartData.length === 0 ? (
          <div className="text-xs text-gray-500">
            لا توجد بيانات كافية للفترة المحددة.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="ltr">
            <div className="h-64">
              <h4 className="text-sm font-semibold mb-2" dir="rtl">
                مبيعات حسب الفترة
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="الإيراد (ريال)"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <h4 className="text-sm font-semibold mb-2" dir="rtl">
                عدد الطلبات المكتملة
              </h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="orders"
                    name="الطلبات المكتملة"
                    fill="#ef4444"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>
      <AccountingOverview title="مؤشرات مالية فورية" />
    </div>
  );
};

export default DashboardHome;
