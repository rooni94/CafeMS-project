// src/pages/hr/LeaveRequestsPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type EmployeeOption = {
  id: number;
  employee_id?: string;
  user_username?: string;
};

type LeaveRequest = {
  id: number;
  employee: number;
  employee_name?: string;
  type?: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | string;
  reason?: string | null;
  decided_at?: string | null;
  decided_by_name?: string | null;
};

const LeaveRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/hr/employees/", {
        params: { ordering: "employee_id" },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEmployees(
        data.map((e: any) => ({
          id: e.id,
          employee_id: e.employee_id,
          user_username: e.user_username || e.user?.username,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hr/leaves/", {
        params: {
          employee: employeeFilter || undefined,
          status: statusFilter || undefined,
          ordering: "-start_date",
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRequests(data);
    } catch (e) {
      console.error(e);
      setError("تعذر تحميل طلبات الإجازة.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter, statusFilter]);

  const getEmployeeLabel = (id: number | undefined) => {
    if (!id) return "-";
    const emp = employees.find((e) => e.id === id);
    if (!emp) return `#${id}`;
    return `${emp.employee_id || ""} - ${emp.user_username || ""}`;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    try {
      await api.patch(`/hr/leaves/${id}/`, { status });
      await fetchRequests();
    } catch (e) {
      console.error(e);
      alert("تعذر تحديث حالة الطلب.");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`سيتم حذف ${selectedIds.length} طلب. هل أنت متأكد؟`))
      return;

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`/hr/leaves/${id}/`))
      );
      setSelectedIds([]);
      await fetchRequests();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ الحذف الجماعي.");
    }
  };

  const filtered = requests; // السيرفر نفسه يفلتِر، نخلي الواجهة بسيطة هنا

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">طلبات الإجازة</h1>
          <p className="text-xs text-gray-500 mt-1">
            مراجعة واعتماد (أو رفض) طلبات الإجازات للموظفين.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={bulkDelete}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            حذف المحدد ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-3 flex flex-wrap gap-3 text-xs items-end">
        <div className="min-w-[200px]">
          <label className="block mb-1 text-gray-600">الموظف</label>
          <select
            className="w-full border rounded-lg px-2 py-1"
            value={employeeFilter === "" ? "" : employeeFilter}
            onChange={(e) =>
              setEmployeeFilter(
                e.target.value ? Number(e.target.value) : ("" as "")
              )
            }
          >
            <option value="">الكل</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.employee_id || emp.id} - {emp.user_username}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="block mb-1 text-gray-600">الحالة</label>
          <select
            className="w-full border rounded-lg px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="pending">بانتظار المراجعة</option>
            <option value="approved">مقبولة</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm">
            جارٍ تحميل الطلبات...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            لا توجد طلبات حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-right">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-2 py-2 border text-center">
                    <input
                      type="checkbox"
                      checked={
                        filtered.length > 0 &&
                        selectedIds.length === filtered.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 border">الموظف</th>
                  <th className="px-3 py-2 border">نوع الإجازة</th>
                  <th className="px-3 py-2 border">من</th>
                  <th className="px-3 py-2 border">إلى</th>
                  <th className="px-3 py-2 border">الحالة</th>
                  <th className="px-3 py-2 border">السبب</th>
                  <th className="px-3 py-2 border">قرار</th>
                  <th className="px-3 py-2 border">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={() => toggleSelectOne(r.id)}
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      {r.employee_name || getEmployeeLabel(r.employee)}
                    </td>
                    <td className="px-3 py-2 border">{r.type || "-"}</td>
                    <td className="px-3 py-2 border">{r.start_date}</td>
                    <td className="px-3 py-2 border">{r.end_date}</td>
                    <td className="px-3 py-2 border">
                      {r.status === "pending"
                        ? "بانتظار المراجعة"
                        : r.status === "approved"
                        ? "مقبولة"
                        : r.status === "rejected"
                        ? "مرفوضة"
                        : r.status}
                    </td>
                    <td className="px-3 py-2 border">
                      {r.reason || "-"}
                    </td>
                    <td className="px-3 py-2 border">
                      {r.decided_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{r.decided_at}</span>
                          <span className="text-[11px] text-gray-500">
                            {r.decided_by_name || ""}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 border">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          disabled={r.status === "approved"}
                          onClick={() => updateStatus(r.id, "approved")}
                          className={`text-[11px] px-2 py-1 rounded-lg border ${
                            r.status === "approved"
                              ? "border-green-200 text-green-400 cursor-default"
                              : "border-green-500 text-green-600 hover:bg-green-50"
                          }`}
                        >
                          موافقة
                        </button>
                        <button
                          disabled={r.status === "rejected"}
                          onClick={() => updateStatus(r.id, "rejected")}
                          className={`text-[11px] px-2 py-1 rounded-lg border ${
                            r.status === "rejected"
                              ? "border-red-200 text-red-400 cursor-default"
                              : "border-red-500 text-red-600 hover:bg-red-50"
                          }`}
                        >
                          رفض
                        </button>
                      </div>
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

export default LeaveRequestsPage;
