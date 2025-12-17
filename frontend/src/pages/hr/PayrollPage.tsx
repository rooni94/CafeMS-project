// src/pages/hr/PayrollPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import CurrencyAmount from "../../components/common/CurrencyAmount";

type EmployeeOption = {
  id: number;
  employee_id?: string;
  user_username?: string;
  default_salary?: number | string | null;
};

type Payroll = {
  id: number;
  employee: number;
  month: string; // من الـ API: YYYY-MM-DD
  basic_salary?: number | string | null;
  overtime_pay?: number | string | null;
  bonuses?: number | string | null;
  deductions?: number | string | null;
  absent_deductions?: number | string | null;
  net_salary?: number | string | null;
  payment_status?: string; // unpaid / paid / late
  payment_due_date?: string | null; // تاريخ نزول الراتب (اختياري)
};

type PayrollSummary = {
  month: string;
  total_employees: number;
  total_net: number;
  total_deductions: number;
  total_overtime: number;
};

type RowForm = {
  basic_salary?: any;
  overtime_pay?: any;
  bonuses?: any;
  deductions?: any;
  absent_deductions?: any;
  payment_status?: string;
  payment_due_date?: string;
};

const toNumber = (v: any): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const formatMoney = (v: any): string => {
  const n = toNumber(v);
  return n.toFixed(2);
};

const getCurrentMonth = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`; // YYYY-MM
};

const PayrollPage: React.FC = () => {
  const [month, setMonth] = useState<string>(getCurrentMonth());

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فورم لكل موظف (مفتاحه employee.id)
  const [rowForms, setRowForms] = useState<Record<number, RowForm>>({});
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);

  // عمليات جماعية بسيطة
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkBonus, setBulkBonus] = useState<string>("");
  const [bulkDeduction, setBulkDeduction] = useState<string>("");

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
          default_salary: e.salary ?? null,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hr/payrolls/", {
        params: {
          month: month || undefined, // YYYY-MM
          ordering: "-month",
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setPayrolls(data);
    } catch (e) {
      console.error(e);
      setError("تعذر تحميل بيانات الرواتب.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get("/hr/payroll/summary/", {
        params: { month },
      });
      setSummary(res.data as PayrollSummary);
    } catch (e) {
      console.error(e);
      setSummary(null);
    }
  };

  // أول تحميل
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // عند تغيير الشهر → حمل الرواتب والملخص
  useEffect(() => {
    fetchPayrolls();
    fetchSummary();
    setSelectedEmpIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // عندما تتغير قائمة الموظفين أو الرواتب → ابنِ فورم لكل موظف
  useEffect(() => {
    const forms: Record<number, RowForm> = {};
    employees.forEach((emp) => {
      const payroll = payrolls.find((p) => p.employee === emp.id);
      forms[emp.id] = {
        basic_salary:
          payroll?.basic_salary ?? emp.default_salary ?? "" /* fallback */,
        overtime_pay: payroll?.overtime_pay ?? "",
        bonuses: payroll?.bonuses ?? "",
        deductions: payroll?.deductions ?? "",
        absent_deductions: payroll?.absent_deductions ?? "",
        payment_status: payroll?.payment_status || "unpaid",
        payment_due_date: payroll?.payment_due_date || "",
      };
    });
    setRowForms(forms);
  }, [employees, payrolls]);

  const getEmployeeLabel = (emp: EmployeeOption) =>
    `${emp.employee_id || emp.id} - ${emp.user_username || ""}`;

  const getPayrollByEmp = (empId: number) =>
    payrolls.find((p) => p.employee === empId);

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

  const calculateNetForEmp = (empId: number): number => {
    const f = rowForms[empId] || {};
    const basic = toNumber(f.basic_salary);
    const overtime = toNumber(f.overtime_pay);
    const bonus = toNumber(f.bonuses);
    const ded = toNumber(f.deductions);
    const absentDed = toNumber(f.absent_deductions);
    return basic + overtime + bonus - (ded + absentDed);
  };

  const handleSaveRow = async (empId: number) => {
    const form = rowForms[empId];
    if (!form) return;
    try {
      const payroll = getPayrollByEmp(empId);
      const payload = {
        employee: empId,
        month: `${month}-01`,
        basic_salary: form.basic_salary ?? 0,
        overtime_pay: form.overtime_pay ?? 0,
        bonuses: form.bonuses ?? 0,
        deductions: form.deductions ?? 0,
        absent_deductions: form.absent_deductions ?? 0,
        net_salary: calculateNetForEmp(empId),
        payment_status: form.payment_status || "unpaid",
        payment_due_date: form.payment_due_date || null,
      };

      if (payroll) {
        await api.put(`/hr/payrolls/${payroll.id}/`, payload);
      } else {
        await api.post("/hr/payrolls/", payload);
      }

      await fetchPayrolls();
      await fetchSummary();
    } catch (err: any) {
      console.error("PAYROLL SAVE ERROR:", err.response?.data || err);
      alert("تعذر حفظ بيانات راتب هذا الموظف.");
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
    if (!bulkStatus && !bulkBonus && !bulkDeduction) {
      alert("اختر حالة دفع أو بونص أو خصم للتعديل الجماعي.");
      return;
    }

    try {
      await Promise.all(
        selectedEmpIds.map(async (empId) => {
          const payroll = getPayrollByEmp(empId);
          const f = rowForms[empId] || {};

          const newBonus =
            bulkBonus.trim() === "" ? f.bonuses : bulkBonus;
          const newDeduction =
            bulkDeduction.trim() === "" ? f.deductions : bulkDeduction;
          const newStatus =
            bulkStatus || f.payment_status || "unpaid";

          const updated: RowForm = {
            ...f,
            bonuses: newBonus,
            deductions: newDeduction,
            payment_status: newStatus,
          };

          const payload = {
            employee: empId,
            month: `${month}-01`,
            basic_salary: updated.basic_salary ?? 0,
            overtime_pay: updated.overtime_pay ?? 0,
            bonuses: updated.bonuses ?? 0,
            deductions: updated.deductions ?? 0,
            absent_deductions: updated.absent_deductions ?? 0,
            net_salary: (() => {
              const basic = toNumber(updated.basic_salary);
              const overtime = toNumber(updated.overtime_pay);
              const bonus = toNumber(updated.bonuses);
              const ded = toNumber(updated.deductions);
              const absent = toNumber(updated.absent_deductions);
              return basic + overtime + bonus - (ded + absent);
            })(),
            payment_status: updated.payment_status || "unpaid",
            payment_due_date: updated.payment_due_date || null,
          };

          if (payroll) {
            await api.put(`/hr/payrolls/${payroll.id}/`, payload);
          } else {
            await api.post("/hr/payrolls/", payload);
          }
        })
      );

      setBulkStatus("");
      setBulkBonus("");
      setBulkDeduction("");
      await fetchPayrolls();
      await fetchSummary();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ التعديل الجماعي للرواتب.");
    }
  };

  const paymentStatusLabel = (s?: string) => {
    if (!s || s === "unpaid") return "غير مدفوع";
    if (s === "paid") return "مدفوع";
    if (s === "late") return "متأخر";
    return s;
  };

  const paymentStatusClass = (s?: string) => {
    if (!s || s === "unpaid")
      return "text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]";
    if (s === "paid")
      return "text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-[11px]";
    if (s === "late")
      return "text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[11px]";
    return "text-gray-700 text-[11px]";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">إدارة الرواتب</h1>
          <p className="text-xs text-gray-500 mt-1">
            تظهر جميع الموظفين للشهر المحدد، ومن هنا يمكنك تحديد حالة الدفع،
            الخصومات، والبونص لكل موظف.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs">
            <label className="block mb-1 text-gray-600">الشهر</label>
            <input
              type="month"
              className="border rounded-lg px-2 py-1"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow p-3 text-xs space-y-1">
        <h3 className="text-sm font-semibold mb-1">ملخص الشهر</h3>
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <div className="text-[11px] text-gray-600">
                عدد الموظفين برواتب
              </div>
              <div className="text-sm font-bold">
                {summary.total_employees}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-green-50">
              <div className="text-[11px] text-gray-600">
                إجمالي صافي الرواتب
              </div>
              <div className="text-sm font-bold">
                <CurrencyAmount value={toNumber(summary.total_net)} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <div className="text-[11px] text-gray-600">
                إجمالي البدلات/الإضافي
              </div>
              <div className="text-sm font-bold">
                <CurrencyAmount value={toNumber(summary.total_overtime)} />
              </div>
            </div>
            <div className="p-2 rounded-lg bg-red-50">
              <div className="text-[11px] text-gray-600">
                إجمالي الخصومات
              </div>
              <div className="text-sm font-bold">
                <CurrencyAmount value={toNumber(summary.total_deductions)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            لا يوجد ملخص متوفر لهذا الشهر.
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selectedEmpIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap gap-3 items-center">
          <span className="font-semibold">
            تم تحديد {selectedEmpIds.length} موظف
          </span>

          <div className="flex items-center gap-1">
            <span>حالة الدفع:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              <option value="">بدون تغيير</option>
              <option value="unpaid">غير مدفوع</option>
              <option value="paid">مدفوع</option>
              <option value="late">متأخر</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span>بونص:</span>
            <input
              type="number"
              step="0.01"
              className="border rounded px-2 py-1 w-24"
              value={bulkBonus}
              onChange={(e) => setBulkBonus(e.target.value)}
              placeholder="اتركه فارغاً"
            />
          </div>

          <div className="flex items-center gap-1">
            <span>خصم:</span>
            <input
              type="number"
              step="0.01"
              className="border rounded px-2 py-1 w-24"
              value={bulkDeduction}
              onChange={(e) => setBulkDeduction(e.target.value)}
              placeholder="اتركه فارغاً"
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
            جارٍ تحميل بيانات الرواتب...
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
                  <th className="px-3 py-2 border">الراتب الأساسي</th>
                  <th className="px-3 py-2 border">البدلات/الإضافي</th>
                  <th className="px-3 py-2 border">البونص</th>
                  <th className="px-3 py-2 border">الخصومات</th>
                  <th className="px-3 py-2 border">خصم الغياب</th>
                  <th className="px-3 py-2 border">الصافي</th>
                  <th className="px-3 py-2 border">حالة الدفع</th>
                  <th className="px-3 py-2 border">موعد نزول الراتب</th>
                  <th className="px-3 py-2 border">حفظ</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const f = rowForms[emp.id] || {};
                  const net = calculateNetForEmp(emp.id);
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
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.basic_salary ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "basic_salary",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.overtime_pay ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "overtime_pay",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.bonuses ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "bonuses",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.deductions ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "deductions",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.absent_deductions ?? ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "absent_deductions",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 border font-semibold">
                        {formatMoney(net)}
                      </td>
                      <td className="px-3 py-2 border">
                        <select
                          className="w-full border rounded px-1 py-0.5"
                          value={f.payment_status || "unpaid"}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "payment_status",
                              e.target.value
                            )
                          }
                        >
                          <option value="unpaid">غير مدفوع</option>
                          <option value="paid">مدفوع</option>
                          <option value="late">متأخر</option>
                        </select>
                        <div className="mt-1">
                          <span
                            className={paymentStatusClass(
                              f.payment_status || "unpaid"
                            )}
                          >
                            {paymentStatusLabel(f.payment_status || "unpaid")}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 border">
                        <input
                          type="date"
                          className="w-full border rounded px-1 py-0.5"
                          value={f.payment_due_date || ""}
                          onChange={(e) =>
                            handleRowChange(
                              emp.id,
                              "payment_due_date",
                              e.target.value
                            )
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

export default PayrollPage;

