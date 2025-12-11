// frontend/src/pages/hr/HRWorkReportsPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type EmployeeOption = {
  id: number;
  employee_id: string;
  name: string;
};

type WorkReportRow = {
  id: number;
  employee: number;
  employee_name: string;
  date: string;
  hours_worked: number | string;
  overtime_hours: number | string;
  absence_reason?: string | null;
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const statusLabel = (s: WorkReportRow["status"]) => {
  if (s === "pending") return "قيد المراجعة";
  if (s === "approved") return "مقبول";
  return "مرفوض";
};

const statusClass = (s: WorkReportRow["status"]) => {
  if (s === "pending") return "text-amber-600";
  if (s === "approved") return "text-green-600";
  return "text-red-600";
};

// دالة تنسيق الساعات (تتعامل مع string أو number بدون ما تسبب toFixed error)
const formatHours = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(2);
};

const HRWorkReportsPage: React.FC = () => {
  const [reports, setReports] = useState<WorkReportRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [filterEmployee, setFilterEmployee] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<
    "" | WorkReportRow["status"]
  >("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // لعرض الطلب في مودال
  const [viewReport, setViewReport] = useState<WorkReportRow | null>(null);

  const loadEmployees = async () => {
    try {
      const res = await api.get("hr/employees/", {
        params: { ordering: "employee_id" },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEmployees(
        data.map((e: any) => ({
          id: e.id,
          employee_id: e.employee_id,
          name: e.user_username || e.employee_id,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("hr/work-reports/", {
        params: {
          employee: filterEmployee || undefined,
          status: filterStatus || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });
      setReports(res.data || []);
    } catch (e) {
      console.error(e);
      setErr("تعذر تحميل تقارير العمل.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
  };

  const reviewReport = async (id: number, action: "approve" | "reject") => {
    if (
      !window.confirm(
        action === "approve"
          ? "تأكيد اعتماد هذا التقرير؟"
          : "تأكيد رفض هذا التقرير؟"
      )
    ) {
      return;
    }
    try {
      await api.post(`hr/work-reports/${id}/review/`, { action });
      await loadReports();
      setViewReport(null);
    } catch (e: any) {
      console.error(e);
      // ممكن هنا لو أحببت تطبع محتوى e.response?.data لمزيد من التفاصيل
      alert(
        "تعذر تنفيذ الإجراء. تأكد أن حسابك يملك صلاحيات HR Manager وأن خادم الـ API محدث."
      );
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">تقارير العمل / الغياب</h2>
      <p className="text-xs text-gray-500">
        عرض تقارير الحضور، الساعات الإضافية، وأسباب الغياب التي أرسلها
        الموظفون.
      </p>

      {/* فلتر أعلى الصفحة */}
      <form
        onSubmit={applyFilters}
        className="bg-white rounded-xl shadow p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end"
      >
        <div>
          <label className="block mb-1 text-gray-600">الموظف</label>
          <select
            className="border rounded-lg px-2 py-1 w-full"
            value={filterEmployee === "" ? "" : filterEmployee}
            onChange={(e) =>
              setFilterEmployee(
                e.target.value ? Number(e.target.value) : ("" as "")
              )
            }
          >
            <option value="">الكل</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.employee_id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-gray-600">الحالة</label>
          <select
            className="border rounded-lg px-2 py-1 w-full"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="">الكل</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">مقبول</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-gray-600">من تاريخ</label>
          <input
            type="date"
            className="border rounded-lg px-2 py-1 w-full"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-600">إلى تاريخ</label>
          <div className="flex gap-1">
            <input
              type="date"
              className="border rounded-lg px-2 py-1 w-full"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-amber-500 text-white"
            >
              تطبيق الفلتر
            </button>
          </div>
        </div>
      </form>

      {loading && <div className="text-sm">جاري تحميل تقارير العمل...</div>}
      {err && <div className="text-sm text-red-500">{err}</div>}

      {!loading && !err && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-right">الموظف</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
                <th className="px-3 py-2 text-right">ساعات العمل</th>
                <th className="px-3 py-2 text-right">ساعات إضافية</th>
                <th className="px-3 py-2 text-right">سبب الغياب (إن وجد)</th>
                <th className="px-3 py-2 text-right">ملاحظات</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">تاريخ الإرسال</th>
                <th className="px-3 py-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.employee_name}</td>
                  <td className="px-3 py-2">
                    {new Date(r.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {formatHours(r.hours_worked)}
                  </td>
                  <td className="px-3 py-2">
                    {formatHours(r.overtime_hours)}
                  </td>
                  <td className="px-3 py-2">
                    {r.absence_reason && r.absence_reason !== "-"
                      ? r.absence_reason
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{r.notes || "-"}</td>
                  <td className={`px-3 py-2 font-semibold ${statusClass(r.status)}`}>
                    {statusLabel(r.status)}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 space-x-1 space-x-reverse">
                    {/* زر عرض الطلب */}
                    <button
                      onClick={() => setViewReport(r)}
                      className="px-2 py-1 rounded-full border text-xs"
                    >
                      عرض
                    </button>
                    {r.status === "pending" ? (
                      <>
                        <button
                          onClick={() => reviewReport(r.id, "approve")}
                          className="px-2 py-1 rounded-full bg-green-500 text-white text-xs"
                        >
                          اعتماد
                        </button>
                        <button
                          onClick={() => reviewReport(r.id, "reject")}
                          className="px-2 py-1 rounded-full bg-red-500 text-white text-xs"
                        >
                          رفض
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-[11px]">
                        تمت المراجعة
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    لا توجد تقارير مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال عرض الطلب بالتفصيل */}
      {viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">
                تقرير عمل / غياب - {viewReport.employee_name}
              </h3>
              <button
                onClick={() => setViewReport(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full border text-xs hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-gray-500 mb-1">التاريخ</div>
                <div>{new Date(viewReport.date).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">الحالة</div>
                <div className={statusClass(viewReport.status)}>
                  {statusLabel(viewReport.status)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">ساعات العمل</div>
                <div>{formatHours(viewReport.hours_worked)}</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">ساعات إضافية</div>
                <div>{formatHours(viewReport.overtime_hours)}</div>
              </div>
            </div>

            {viewReport.absence_reason && (
              <div className="text-xs">
                <div className="text-gray-500 mb-1">سبب الغياب</div>
                <p className="whitespace-pre-wrap">
                  {viewReport.absence_reason}
                </p>
              </div>
            )}

            {viewReport.notes && (
              <div className="text-xs">
                <div className="text-gray-500 mb-1">ملاحظات إضافية</div>
                <p className="whitespace-pre-wrap">{viewReport.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t mt-2">
              {viewReport.status === "pending" && (
                <>
                  <button
                    onClick={() => reviewReport(viewReport.id, "approve")}
                    className="px-3 py-1.5 rounded-full bg-green-500 text-white text-xs"
                  >
                    اعتماد
                  </button>
                  <button
                    onClick={() => reviewReport(viewReport.id, "reject")}
                    className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs"
                  >
                    رفض
                  </button>
                </>
              )}
              <button
                onClick={() => setViewReport(null)}
                className="px-3 py-1.5 rounded-full border text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRWorkReportsPage;
