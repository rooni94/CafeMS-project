// src/pages/hr/EmployeesPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";

type Employee = {
  id: number;
  employee_id: string;
  user: number;
  user_username?: string;
  department?: string | null;
  position?: string | null;
  hire_date?: string | null;
  salary?: number | string | null;
  phone_number?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  nationality?: string | null;
};

type UserOption = {
  id: number;
  username: string;
  email?: string;
};

const formatMoney = (value: any): string => {
  const n = Number(value);
  if (isNaN(n)) return "-";
  return n.toFixed(2);
};

const toNumber = (v: any): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

type BulkSalaryMode = "none" | "set" | "increase" | "decrease";

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // فلاتر
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");

  // تحديد متعدد
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // عمليات جماعية
  const [bulkDepartment, setBulkDepartment] = useState("");
  const [bulkPosition, setBulkPosition] = useState("");
  const [bulkSalary, setBulkSalary] = useState<string>("");
  const [bulkSalaryMode, setBulkSalaryMode] =
    useState<BulkSalaryMode>("none");

  // مودال
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({});

  // ===== API Calls =====

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/hr/employees/", {
        params: {
          search: search || undefined,
          department: departmentFilter || undefined,
          position: positionFilter || undefined,
          ordering: "employee_id",
        },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEmployees(data);
      // بعد كل تحميل نصفر التحديد
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
      setError("تعذر تحميل قائمة الموظفين.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/auth/users/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setUsers(
        data.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
        }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إعادة تحميل مع تغيير الفلاتر
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentFilter, positionFilter]);

  // ===== Helpers =====

  const resetForm = () => {
    setForm({});
    setEditing(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditing(emp);
    setForm({
      ...emp,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!form.user) {
        setError("يجب اختيار مستخدم مرتبط.");
        return;
      }

      if (editing) {
        await api.put(`/hr/employees/${editing.id}/`, form);
      } else {
        await api.post("/hr/employees/", form);
      }

      setModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      console.error("EMPLOYEE SAVE ERROR:", err.response?.data || err);
      setError(
        "تعذر حفظ بيانات الموظف. تأكد من الحقول المطلوبة (مثلاً: تاريخ التعيين والرقم الوظيفي والمستخدم)."
      );
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteOne = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    try {
      await api.delete(`/hr/employees/${id}/`);
      await fetchEmployees();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (e) {
      console.error(e);
      alert("تعذر حذف الموظف.");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `سيتم حذف ${selectedIds.length} موظف/موظفين. هل أنت متأكد؟`
      )
    )
      return;

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`/hr/employees/${id}/`))
      );
      setSelectedIds([]);
      await fetchEmployees();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ الحذف الجماعي.");
    }
  };

  const handleBulkUpdate = async () => {
    if (!selectedIds.length) return;

    if (
      !bulkDepartment &&
      !bulkPosition &&
      (bulkSalaryMode === "none" || !bulkSalary)
    ) {
      alert(
        "اختر على الأقل قيمة واحدة (قسم أو منصب أو تعديل راتب) لتطبيقها على الموظفين المحددين."
      );
      return;
    }

    const salaryValue = toNumber(bulkSalary);

    try {
      await Promise.all(
        selectedIds.map((id) => {
          const emp = employees.find((e) => e.id === id);
          if (!emp) return Promise.resolve();

          const payload: Partial<Employee> = {};

          if (bulkDepartment) payload.department = bulkDepartment;
          if (bulkPosition) payload.position = bulkPosition;

          if (bulkSalaryMode !== "none" && bulkSalary) {
            const currentSalary = toNumber(emp.salary);
            let newSalary = currentSalary;
            if (bulkSalaryMode === "set") newSalary = salaryValue;
            if (bulkSalaryMode === "increase")
              newSalary = currentSalary + salaryValue;
            if (bulkSalaryMode === "decrease")
              newSalary = currentSalary - salaryValue;
            payload.salary = newSalary;
          }

          return api.patch(`/hr/employees/${id}/`, payload);
        })
      );

      setBulkDepartment("");
      setBulkPosition("");
      setBulkSalary("");
      setBulkSalaryMode("none");
      await fetchEmployees();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ التعديل الجماعي.");
    }
  };

  const getUserLabel = (userId?: number) => {
    if (!userId) return "-";
    const u = users.find((u) => u.id === userId);
    if (!u) return `User #${userId}`;
    return `${u.username}${u.email ? ` (${u.email})` : ""}`;
  };

  // فلترة إضافية على الواجهة
  const filtered = employees.filter((emp) => {
    const term = search.trim().toLowerCase();
    if (term) {
      const combined = `${emp.employee_id || ""} ${
        emp.position || ""
      } ${emp.department || ""}`.toLowerCase();
      if (!combined.includes(term)) return false;
    }
    if (departmentFilter && emp.department !== departmentFilter) return false;
    if (positionFilter && emp.position !== positionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">إدارة الموظفين</h1>
          <p className="text-xs text-gray-500 mt-1">
            إضافة وتعديل وحذف الموظفين وربطهم بحسابات المستخدمين.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={bulkDelete}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              حذف المحدد ({selectedIds.length})
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="bg-amber-500 text-white text-sm px-3 py-2 rounded-lg hover:bg-amber-600"
          >
            + إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-3 flex flex-wrap gap-3 items-center text-xs">
        <div className="flex-1 min-w-[180px]">
          <label className="block mb-1 text-gray-600">بحث</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1"
            placeholder="ابحث بالرقم الوظيفي أو القسم أو المسمى..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="min-w-[140px]">
          <label className="block mb-1 text-gray-600">القسم</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1"
            placeholder="مثل: المقهى"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          />
        </div>

        <div className="min-w-[140px]">
          <label className="block mb-1 text-gray-600">المنصب</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1"
            placeholder="مثل: كاشير"
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk bar */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap items-center gap-3">
          <span className="font-semibold">
            تم تحديد {selectedIds.length} موظف/موظفين
          </span>

          <div className="flex items-center gap-1">
            <span>القسم:</span>
            <input
              className="border rounded px-2 py-1"
              value={bulkDepartment}
              onChange={(e) => setBulkDepartment(e.target.value)}
              placeholder="اتركه فارغاً لعدم التغيير"
            />
          </div>

          <div className="flex items-center gap-1">
            <span>المنصب:</span>
            <input
              className="border rounded px-2 py-1"
              value={bulkPosition}
              onChange={(e) => setBulkPosition(e.target.value)}
              placeholder="اتركه فارغاً لعدم التغيير"
            />
          </div>

          <div className="flex items-center gap-1">
            <span>الراتب:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkSalaryMode}
              onChange={(e) =>
                setBulkSalaryMode(e.target.value as BulkSalaryMode)
              }
            >
              <option value="none">بدون تعديل</option>
              <option value="set">تعيين راتب جديد</option>
              <option value="increase">زيادة بمبلغ</option>
              <option value="decrease">خصم بمبلغ</option>
            </select>
            <input
              type="number"
              step="0.01"
              className="border rounded px-2 py-1 w-24"
              value={bulkSalary}
              onChange={(e) => setBulkSalary(e.target.value)}
              placeholder="0"
            />
          </div>

          <button
            onClick={handleBulkUpdate}
            className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600"
          >
            تطبيق التعديل الجماعي
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow p-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm">
            جارٍ تحميل الموظفين...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-500 text-sm">
            لا توجد سجلات موظفين حالياً.
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
                  <th className="px-3 py-2 border">الرقم الوظيفي</th>
                  <th className="px-3 py-2 border">المستخدم / البريد</th>
                  <th className="px-3 py-2 border">القسم</th>
                  <th className="px-3 py-2 border">المنصب</th>
                  <th className="px-3 py-2 border">تاريخ التعيين</th>
                  <th className="px-3 py-2 border">الراتب الأساسي</th>
                  <th className="px-3 py-2 border">الجنسية</th>
                  <th className="px-3 py-2 border">الهاتف</th>
                  <th className="px-3 py-2 border">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => toggleSelectOne(emp.id)}
                      />
                    </td>
                    <td className="px-3 py-2 border">{emp.employee_id}</td>
                    <td className="px-3 py-2 border">
                      {getUserLabel(emp.user)}
                    </td>
                    <td className="px-3 py-2 border">
                      {emp.department || "-"}
                    </td>
                    <td className="px-3 py-2 border">{emp.position || "-"}</td>
                    <td className="px-3 py-2 border">
                      {emp.hire_date || "-"}
                    </td>
                    <td className="px-3 py-2 border">
                      {formatMoney(emp.salary)}
                    </td>
                    <td className="px-3 py-2 border">
                      {emp.nationality || "-"}
                    </td>
                    <td className="px-3 py-2 border">
                      {emp.phone_number || "-"}
                    </td>
                    <td className="px-3 py-2 border">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => deleteOne(emp.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          حذف
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editing ? "تعديل موظف" : "إضافة موظف جديد"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block mb-1 text-gray-600">
                    المستخدم المرتبط
                  </label>
                  <select
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.user ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        user: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    required
                  >
                    <option value="">اختر مستخدماً</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} {u.email ? `(${u.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">
                    الرقم الوظيفي
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.employee_id || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, employee_id: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">القسم</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.department || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, department: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">المنصب</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.position || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, position: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">
                    تاريخ التعيين
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.hire_date || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hire_date: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">
                    الراتب الأساسي
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.salary ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        salary: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">الهاتف</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.phone_number || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone_number: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-600">الجنسية</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.nationality || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nationality: e.target.value }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-gray-600">العنوان</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.address || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-gray-600">
                    جهة الاتصال للطوارئ
                  </label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-2 py-1"
                    value={form.emergency_contact || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        emergency_contact: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-500 mt-1">{error}</div>
              )}

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                >
                  {editing ? "حفظ التعديلات" : "حفظ الموظف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
