// src/pages/hr/AttendancePage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";

type EmployeeOption = {
  id: number;
  employee_id?: string;
  user_username?: string;
};

type Attendance = {
  id: number;
  employee: number;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null; // present / absent / late / on_leave
  notes?: string | null;
  worked_hours?: number | string | null;
  late_minutes?: number | string | null;
};

type RowForm = {
  check_in?: string;
  check_out?: string;
  status?: string;
  notes?: string;
  worked_hours?: any;
  late_minutes?: any;
};

const statusLabel = (s?: string | null) => {
  if (!s) return "-";
  if (s === "present") return "حاضر";
  if (s === "absent") return "غائب";
  if (s === "late") return "متأخر";
  if (s === "on_leave") return "إجازة";
  return s;
};

const AttendancePage: React.FC = () => {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فورم لكل موظف
  const [rowForms, setRowForms] = useState<Record<number, RowForm>>({});
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);

  // عمليات جماعية بسيطة
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkNotes, setBulkNotes] = useState<string>("");

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

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hr/attendance/", {
        params: {
          date_from: selectedDate,
          date_to: selectedDate,
          ordering: "-date",
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAttendance(data);
    } catch (e) {
      console.error(e);
      setError("تعذر تحميل بيانات الحضور لهذا اليوم.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // عند تغيير التاريخ → أعد تحميل سجلات هذا اليوم
  useEffect(() => {
    fetchAttendance();
    setSelectedEmpIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // build row forms when employees or attendance changes
  useEffect(() => {
    const forms: Record<number, RowForm> = {};
    employees.forEach((emp) => {
      const rec = attendance.find((r) => r.employee === emp.id);
      forms[emp.id] = {
        check_in: rec?.check_in || "",
        check_out: rec?.check_out || "",
        status: rec?.status || "present",
        notes: rec?.notes || "",
        worked_hours: rec?.worked_hours ?? "",
        late_minutes: rec?.late_minutes ?? "",
      };
    });
    setRowForms(forms);
  }, [employees, attendance]);

  const getEmployeeLabel = (emp: EmployeeOption) =>
    `${emp.employee_id || emp.id} - ${emp.user_username || ""}`;

  const getAttendanceByEmp = (empId: number) =>
    attendance.find((r) => r.employee === empId);

  const handleRowChange = (
    empId: number,
    field: keyof RowForm,
    value: any
  ) => {
    setRowForms((prev) => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [field]: value },
    }));
  };

  const handleSaveRow = async (empId: number) => {
    const form = rowForms[empId];
    if (!form) return;

    try {
      const rec = getAttendanceByEmp(empId);
      const payload = {
        employee: empId,
        date: selectedDate,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        status: form.status || "present",
        notes: form.notes || "",
        worked_hours: form.worked_hours ?? null,
        late_minutes: form.late_minutes ?? null,
      };

      if (rec) {
        await api.put(`/hr/attendance/${rec.id}/`, payload);
      } else {
        await api.post("/hr/attendance/", payload);
      }

      await fetchAttendance();
    } catch (err: any) {
      console.error("ATTENDANCE SAVE ERROR:", err.response?.data || err);
      alert("تعذر حفظ سجل الحضور لهذا الموظف.");
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map((e) => e.id));
    }
  };

  const toggleSelectOne = (empId: number) => {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]
    );
  };

  const handleBulkUpdate = async () => {
    if (!selectedEmpIds.length) return;
    if (!bulkStatus && !bulkNotes) {
      alert("اختر حالة أو ملاحظة للتعديل الجماعي.");
      return;
    }

    try {
      await Promise.all(
        selectedEmpIds.map(async (empId) => {
          const rec = getAttendanceByEmp(empId);
          const f = rowForms[empId] || {};

          const updated: RowForm = {
            ...f,
            status: bulkStatus || f.status || "present",
            notes: bulkNotes || f.notes || "",
          };

          const payload = {
            employee: empId,
            date: selectedDate,
            check_in: updated.check_in || null,
            check_out: updated.check_out || null,
            status: updated.status || "present",
            notes: updated.notes || "",
            worked_hours: updated.worked_hours ?? null,
            late_minutes: updated.late_minutes ?? null,
          };

          if (rec) {
            await api.put(`/hr/attendance/${rec.id}/`, payload);
          } else {
            await api.post("/hr/attendance/", payload);
          }
        })
      );

      setBulkStatus("");
      setBulkNotes("");
      await fetchAttendance();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ التعديل الجماعي لسجلات الحضور.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">سجلات الحضور والغياب</h1>
          <p className="text-xs text-gray-500 mt-1">
            تظهر جميع الموظفين لليوم المحدد، ومن هنا يمكنك تعيين الحضور، الغياب،
            التأخر وساعات العمل لكل موظف.
          </p>
        </div>

        <div className="text-xs">
          <label className="block mb-1 text-gray-600">اليوم</label>
          <input
            type="date"
            className="border rounded-lg px-2 py-1"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk bar */}
      {selectedEmpIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap gap-3 items-center">
          <span className="font-semibold">
            تم تحديد {selectedEmpIds.length} موظف
          </span>

          <div className="flex items-center gap-1">
            <span>الحالة:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">بدون تغيير</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="on_leave">إجازة</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span>ملاحظة:</span>
            <input
              className="border rounded px-2 py-1 min-w-[160px]"
              value={bulkNotes}
              onChange={(e) => setBulkNotes(e.target.value)}
              placeholder="تطبق على المحددين"
            />
          </div>

          <button
            onClick={handleBulkUpdate}
            className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600"
          >
            تطبيق على المحددين
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm">
            جارٍ تحميل سجلات الحضور...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 text-sm">{error}</div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            لا يوجد موظفون مسجلون.
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
                        employees.length > 0 &&
                        selectedEmpIds.length === employees.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 border">الموظف</th>
                  <th className="px-3 py-2 border">الحالة</th>
                  <th className="px-3 py-2 border">وقت الحضور</th>
                  <th className="px-3 py-2 border">وقت الانصراف</th>
                  <th className="px-3 py-2 border">ساعات العمل</th>
                  <th className="px-3 py-2 border">دقائق التأخر</th>
                  <th className="px-3 py-2 border">ملاحظات</th>
                  <th className="px-3 py-2 border">حفظ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const f = rowForms[emp.id] || {};
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 border text-center">
                        <input
                          type="checkbox"
                          checked={selectedEmpIds.includes(emp.id)}
                          onChange={() => toggleSelectOne(emp.id)}
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        {getEmployeeLabel(emp)}
                      </td>
                      <td className="px-3 py-2 border">
                        <select
                          className="w-full border rounded px-1 py-0.5"
                          value={f.status || "present"}
                          onChange={(e) =>
                            handleRowChange(emp.id, "status", e.target.value)
                          }
                        >
                          <option value="present">حاضر</option>
                          <option value="absent">غائب</option>
                          <option value="late">متأخر</option>
                          <option value="on_leave">إجازة</option>
                        </select>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {statusLabel(f.status || "present")}
                        </div>
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="time"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.check_in || ""}
                          onChange={(e) =>
                            handleRowChange(emp.id, "check_in", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="time"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.check_out || ""}
                          onChange={(e) =>
                            handleRowChange(emp.id, "check_out", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          step="0.1"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.worked_hours ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "worked_hours",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.late_minutes ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "late_minutes",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="text"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.notes || ""}
                          onChange={(e) =>
                            handleRowChange(emp.id, "notes", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border text-center">
                        <button
                          onClick={() => handleSaveRow(emp.id)}
                          className="px-3 py-1 rounded bg-amber-500 text-white text-xs hover:bg-amber-600"
                        >
                          حفظ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;

