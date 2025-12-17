import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import SaudiRiyalSymbol from "../../components/common/SaudiRiyalSymbol";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type HRStats = {
  total_employees: number;
  today_present: number;
  today_absent: number;
  today_on_leave: number;
  pending_leaves: number;
  expired_documents: number;
  soon_expiring_documents: number;

  payroll_paid_count?: number;
  payroll_unpaid_count?: number;
  payroll_paid_total_net?: number;
  payroll_paid_total_deductions?: number;
  payroll_unpaid_total_net?: number;
};

type AttendanceSummaryRow = {
  status: string;
  count: number;
};

const getCurrentMonth = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

const HRDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<HRStats | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<
    AttendanceSummaryRow[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فلتر الشهر لشارت الحضور والرواتب
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, attendanceRes] = await Promise.all([
          api.get("hr/dashboard/stats/"),
          api.get("hr/attendance-summary/", {
            params: { month: selectedMonth },
          }),
        ]);

        setStats(statsRes.data);
        setAttendanceSummary(attendanceRes.data || []);
      } catch (err) {
        console.error(err);
        setError("تعذر تحميل بيانات لوحة الموارد البشرية.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="p-4 text-sm">
        جاري تحميل بيانات الموارد البشرية...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 text-sm text-red-500">
        تعذر تحميل البيانات. تأكد من أن خادم الـ API يعمل بدون أخطاء.
      </div>
    );
  }

  const attendanceChartData = attendanceSummary.map((row) => ({
    status_label:
      row.status === "present"
        ? "حاضر"
        : row.status === "absent"
        ? "غائب"
        : row.status === "on_leave"
        ? "إجازة"
        : row.status,
    count: row.count,
  }));

  const payrollChartData = [
    {
      name: "مدفوع",
      net: stats.payroll_paid_total_net ?? 0,
      deductions: stats.payroll_paid_total_deductions ?? 0,
    },
    {
      name: "غير مدفوع",
      net: stats.payroll_unpaid_total_net ?? 0,
      deductions: 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">لوحة إدارة الموارد البشرية</h1>

        {/* فلتر الشهر */}
        <div className="flex items-center gap-2 text-xs">
          <label className="text-gray-600" htmlFor="hr-month-filter">
            شهر الحضور / الرواتب:
          </label>
          <input
            id="hr-month-filter"
            type="month"
            className="border rounded-lg px-2 py-1 text-xs"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">إجمالي الموظفين</div>
          <div className="text-2xl font-bold">{stats.total_employees}</div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">الحضور اليوم</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.today_present}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">الغائبون اليوم</div>
          <div className="text-2xl font-bold text-red-500">
            {stats.today_absent}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">في إجازة اليوم</div>
          <div className="text-2xl font-bold text-amber-500">
            {stats.today_on_leave}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">
            طلبات إجازة معلّقة
          </div>
          <div className="text-2xl font-bold">
            {stats.pending_leaves}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">مستندات منتهية</div>
          <div className="text-2xl font-bold text-red-500">
            {stats.expired_documents}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">
            مستندات تنتهي قريباً
          </div>
          <div className="text-2xl font-bold text-amber-500">
            {stats.soon_expiring_documents}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-xs text-gray-500 mb-1">
            رواتب هذا الشهر (الحالي من السيرفر)
          </div>
          <div className="text-[11px] text-gray-500">
            مدفوعة:{" "}
            <span className="font-bold text-green-600">
              {stats.payroll_paid_count ?? 0}
            </span>
          </div>
          <div className="text-[11px] text-gray-500">
            غير مدفوعة:{" "}
            <span className="font-bold text-red-600">
              {stats.payroll_unpaid_count ?? 0}
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            إجمالي صافي المدفوع:{" "}
            <span className="font-bold">
              {(stats.payroll_paid_total_net ?? 0).toLocaleString()}
            </span>{" "}
            <SaudiRiyalSymbol className="inline-block w-[1em] h-[1em] align-[-2px] text-gray-500" />
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            إجمالي الخصومات:{" "}
            <span className="font-bold">
              {(stats.payroll_paid_total_deductions ?? 0).toLocaleString()}
            </span>{" "}
            <SaudiRiyalSymbol className="inline-block w-[1em] h-[1em] align-[-2px] text-gray-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance Chart */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold mb-2">
            ملخص الحضور للشهر المحدد ({selectedMonth})
          </h2>
          <div className="h-72">
            {attendanceChartData.length === 0 ? (
              <div className="text-xs text-gray-500">
                لا توجد بيانات حضور للشهر المختار.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChartData}>
                  <XAxis dataKey="status_label" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payroll Chart */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold mb-2">
            مقارنة رواتب الشهر الحالي
          </h2>
          <p className="text-[11px] text-gray-500 mb-2">
            صافي المدفوع مقابل الخصومات، ورواتب الموظفين غير المدفوعة بعد.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payrollChartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="net"
                  name="صافي الراتب"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="deductions"
                  name="الخصومات"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboardPage;

