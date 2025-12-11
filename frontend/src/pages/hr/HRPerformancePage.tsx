import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";

type PerformanceEmployee = {
  user_id: number;
  employee_id?: string | null;
  name: string;
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  avg_order: number;
};

type PerformanceSeriesPoint = {
  period: string;
  orders: number;
  revenue: number;
};

type PerformanceResponse = {
  totals: {
    total_orders: number;
    completed_orders: number;
    total_revenue: number;
  };
  employees: PerformanceEmployee[];
  series: PerformanceSeriesPoint[];
};

const HRPerformancePage: React.FC = () => {
  const [filters, setFilters] = useState({
    employee: "",
    date_from: "",
    date_to: "",
    group_by: "day",
  });
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPerformance = () => {
    setLoading(true);
    setError(null);
    api
      .get("hr/performance/", {
        params: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value)
        ),
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error(err);
        setError("تعذر تحميل لوحة أداء الموظفين، تحقّق من الصلاحيات والخادم.");
        setData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topPerformer = useMemo(() => {
    if (!data?.employees?.length) return null;
    return [...data.employees].sort(
      (a, b) => b.total_revenue - a.total_revenue
    )[0];
  }, [data]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">لوحة أداء الموظفين (المبيعات)</h1>
          <p className="text-sm text-gray-500">
            تعرّف على أكثر الموظفين نشاطاً في الكاشير وعدد الطلبات والعوائد التي
            حققوها خلال فترة محددة.
          </p>
        </div>
        <button
          onClick={loadPerformance}
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
        >
          تحديث البيانات
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3">
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">الموظف</label>
            <input
              name="employee"
              value={filters.employee}
              onChange={handleFilterChange}
              placeholder="ID الموظف (اختياري)"
              className="w-full border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">من تاريخ</label>
            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">إلى تاريخ</label>
            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">تجميع حسب</label>
            <select
              name="group_by"
              value={filters.group_by}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-xs"
            >
              <option value="day">أيام</option>
              <option value="month">أشهر</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">جاري تحميل البيانات...</div>}

      {!loading && !error && data && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow border border-amber-50 p-4">
              <p className="text-xs text-gray-500">إجمالي الطلبات</p>
              <p className="text-2xl font-semibold mt-1">
                {data.totals.total_orders}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                المنجزة: {data.totals.completed_orders}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow border border-amber-50 p-4">
              <p className="text-xs text-gray-500">إجمالي العوائد</p>
              <p className="text-2xl font-semibold mt-1">
                {data.totals.total_revenue.toFixed(2)} ر.س
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow border border-amber-50 p-4">
              <p className="text-xs text-gray-500">أفضل موظف</p>
              {topPerformer ? (
                <div>
                  <p className="text-sm font-semibold">{topPerformer.name}</p>
                  <p className="text-xs text-gray-500">
                    {topPerformer.total_orders} طلب •{" "}
                    {topPerformer.total_revenue.toFixed(2)} ر.س
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">لا يوجد بيانات حالياً.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">سجل الأداء الزمني</h2>
              <span className="text-[11px] text-gray-500">
                يعرض الطلبات والعوائد حسب الفترة المختارة
              </span>
            </div>
            {data.series.length === 0 ? (
              <p className="text-xs text-gray-500">لا توجد بيانات للعرض.</p>
            ) : (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#f59e0b" radius={6} />
                    <Bar dataKey="revenue" fill="#4c1d95" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow border border-amber-50 p-4 space-y-3">
            <h2 className="text-sm font-semibold">تفاصيل الموظفين</h2>
            {data.employees.length === 0 ? (
              <p className="text-xs text-gray-500">لم يتم تسجيل أي مبيعات بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 bg-gray-50">
                      <th className="px-3 py-2 text-right">الموظف</th>
                      <th className="px-3 py-2 text-right">المعرف</th>
                      <th className="px-3 py-2 text-right">الطلبات</th>
                      <th className="px-3 py-2 text-right">المنجزة</th>
                      <th className="px-3 py-2 text-right">المبيعات</th>
                      <th className="px-3 py-2 text-right">متوسط الطلب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.employees.map((emp) => (
                      <tr key={emp.user_id} className="border-t">
                        <td className="px-3 py-2">{emp.name}</td>
                        <td className="px-3 py-2">
                          {emp.employee_id || "—"}
                        </td>
                        <td className="px-3 py-2">{emp.total_orders}</td>
                        <td className="px-3 py-2">{emp.completed_orders}</td>
                        <td className="px-3 py-2">
                          {emp.total_revenue.toFixed(2)} ر.س
                        </td>
                        <td className="px-3 py-2">
                          {emp.avg_order.toFixed(2)} ر.س
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HRPerformancePage;
