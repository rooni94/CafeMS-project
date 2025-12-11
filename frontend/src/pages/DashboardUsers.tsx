import React, { useEffect, useState } from "react";
import { api } from "../services/api";

type Role = "customer" | "supervisor" | "staff" | "manager";

type DashboardUser = {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: Role;
  is_active: boolean;
  date_joined: string;
};

const DashboardUsers: React.FC = () => {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<Role>("staff");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ تحديد المستخدمين
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRole, setBulkRole] = useState<Role>("staff");

  const strongPwRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

  const fetchUsers = () => {
    setLoading(true);
    setErr(null);
    api
      .get("auth/users/")
      .then((res) => {
        setUsers(res.data);
        setSelectedIds([]); // تصفير التحديد عند إعادة التحميل
      })
      .catch((e) => {
        console.error(e);
        setErr("تعذر تحميل المستخدمين.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strongPwRegex.test(newPassword)) {
      alert(
        "كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص وألا تقل عن 8 حروف."
      );
      return;
    }

    setCreating(true);
    try {
      await api.post("auth/users/", {
        username: newUsername,
        email: newEmail,
        phone: newPhone || undefined,
        role: newRole,
        password: newPassword,
      });
      setNewUsername("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("staff");
      setNewPassword("");
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("تعذر إنشاء المستخدم، تأكد من البيانات.");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (id: number, role: Role) => {
    try {
      await api.patch(`auth/users/${id}/`, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role } : u))
      );
    } catch (error) {
      console.error(error);
      alert("تعذر تحديث صلاحية المستخدم.");
    }
  };

  const handleToggleActive = async (id: number, is_active: boolean) => {
    try {
      await api.patch(`auth/users/${id}/`, { is_active });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active } : u))
      );
    } catch (error) {
      console.error(error);
      alert("تعذر تحديث حالة المستخدم.");
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("هل أنت متأكد من حذف هذا المستخدم؟");
    if (!ok) return;
    try {
      await api.delete(`auth/users/${id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (error) {
      console.error(error);
      alert("تعذر حذف المستخدم.");
    }
  };

  // ===== منطق التحديد / تحديد الكل =====
  const allSelected =
    users.length > 0 && selectedIds.length === users.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ===== عمليات جماعية =====
  const handleBulkChangeRole = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `هل أنت متأكد من تغيير صلاحية ${selectedIds.length} مستخدم/مستخدمين إلى "${bulkRole}"؟`
      )
    )
      return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`auth/users/${id}/`, { role: bulkRole })
        )
      );
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("تعذر تنفيذ العملية الجماعية لتغيير الصلاحية.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSetActive = async (is_active: boolean) => {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`auth/users/${id}/`, { is_active })
        )
      );
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert("تعذر تنفيذ العملية الجماعية لتحديث الحالة.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const ok = window.confirm(
      `سيتم حذف ${selectedIds.length} مستخدم/مستخدمين بشكل نهائي، هل أنت متأكد؟`
    );
    if (!ok) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`auth/users/${id}/`))
      );
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      alert("تعذر تنفيذ الحذف الجماعي.");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) return <div>جاري تحميل المستخدمين...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة المستخدمين</h2>

      {/* إنشاء مستخدم جديد */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-1">إضافة مستخدم جديد</h3>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        >
          <div>
            <label className="block mb-1">اسم المستخدم</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">رقم الجوال</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">الصلاحية</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
            >
              <option value="staff">موظف</option>
              <option value="supervisor">مشرف</option>
              <option value="manager">مدير</option>
              <option value="customer">عميل</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1">كلمة المرور</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <p className="text-[11px] text-gray-500 mt-1">
              يجب أن تحتوي على حرف كبير وصغير ورقم ورمز خاص وألا تقل عن 8
              حروف.
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
            >
              {creating ? "جاري الإضافة..." : "إضافة المستخدم"}
            </button>
          </div>
        </form>
      </div>

      {/* شريط العمليات الجماعية للمستخدمين المحددين */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            تم تحديد {selectedIds.length} مستخدم/مستخدمين
          </span>

          <div className="flex items-center gap-1">
            <span>تعيين الصلاحية إلى:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as Role)}
            >
              <option value="customer">عميل</option>
              <option value="staff">موظف</option>
              <option value="supervisor">مشرف</option>
              <option value="manager">مدير</option>
            </select>
            <button
              onClick={handleBulkChangeRole}
              disabled={bulkLoading}
              className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              تطبيق
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleBulkSetActive(true)}
              disabled={bulkLoading}
              className="px-3 py-1 rounded-full border border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              تفعيل المحددين
            </button>
            <button
              onClick={() => handleBulkSetActive(false)}
              disabled={bulkLoading}
              className="px-3 py-1 rounded-full border border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              إيقاف المحددين
            </button>
          </div>

          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="px-3 py-1 rounded-full border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-60 ml-auto"
          >
            حذف المحددين
          </button>
        </div>
      )}

      {/* جدول المستخدمين */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-right">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2 text-right">المستخدم</th>
              <th className="px-3 py-2 text-right">البريد</th>
              <th className="px-3 py-2 text-right">الجوال</th>
              <th className="px-3 py-2 text-right">الصلاحية</th>
              <th className="px-3 py-2 text-right">الحالة</th>
              <th className="px-3 py-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleSelectOne(u.id)}
                  />
                </td>
                <td className="px-3 py-2">#{u.id}</td>
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2 text-xs">{u.email || "-"}</td>
                <td className="px-3 py-2 text-xs">{u.phone || "-"}</td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) =>
                      handleRoleChange(u.id, e.target.value as Role)
                    }
                  >
                    <option value="customer">عميل</option>
                    <option value="staff">موظف</option>
                    <option value="manager">مدير</option>
                    <option value="supervisor">مشرف</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-xs">
                  <button
                    onClick={() => handleToggleActive(u.id, !u.is_active)}
                    className={`px-2 py-1 rounded-full text-xs ${
                      u.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {u.is_active ? "نشط" : "موقوف"}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="px-2 py-1 rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardUsers;
