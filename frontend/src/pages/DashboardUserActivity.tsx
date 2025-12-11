import React, { useEffect, useState } from "react";
import { api } from "../services/api";

type Role = "customer" | "supervisor" | "staff" | "manager";

type UserActivity = {
  id: number;
  user: number | null;
  user_name: string | null;
  role?: Role | null;

  action: string;
  order_id?: number | null;
  order_status?: string | null;
  table_label?: string | null;
  path?: string | null;
  method?: string | null;
  status_code?: number | null;

  ip_address?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device_type?: string | null;
  country?: string | null;
  city?: string | null;

  created_at: string;
};

const DashboardUserActivity: React.FC = () => {
  const [rows, setRows] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filterRole, setFilterRole] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("");

  // للمودال
  const [selectedRow, setSelectedRow] = useState<UserActivity | null>(null);

  const fetchActivity = () => {
    setLoading(true);
    setErr(null);

    const params: any = { limit: 200 };
    if (filterRole) params.role = filterRole;
    if (filterUserId) params.user_id = filterUserId;

    api
      .get("auth/user-activity/", { params })
      .then((res) => setRows(res.data))
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل نشاط المستخدمين.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchActivity();
  };

  if (loading) return <div>جاري تحميل نشاط المستخدمين...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">نشاط المستخدمين</h2>

      {/* فلاتر البحث */}
      <form
        onSubmit={handleSearch}
        className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 text-sm items-end"
      >
        <div>
          <label className="block mb-1">تصفية حسب الدور</label>
          <select
            className="border rounded-lg px-3 py-2"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="customer">عميل</option>
            <option value="staff">موظف</option>
            <option value="supervisor">مشرف</option>
            <option value="manager">مدير</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">تصفية حسب رقم المستخدم</label>
          <input
            className="border rounded-lg px-3 py-2"
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            placeholder="ID المستخدم (اختياري)"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
        >
          تطبيق التصفية
        </button>
      </form>

      {/* الجدول */}
      {rows.length === 0 ? (
        <div>لا يوجد نشاط مطابق للفلاتر الحالية.</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">المستخدم</th>
                <th className="px-3 py-2 text-right">الدور</th>
                <th className="px-3 py-2 text-right">الحدث</th>
                <th className="px-3 py-2 text-right">المسار</th>
                <th className="px-3 py-2 text-right">الطريقة</th>
                <th className="px-3 py-2 text-right">الكود</th>
                <th className="px-3 py-2 text-right">الطلب / الطاولة</th>
                <th className="px-3 py-2 text-right">IP</th>
                <th className="px-3 py-2 text-right">الجهاز / النظام</th>
                <th className="px-3 py-2 text-right">المتصفح</th>
                <th className="px-3 py-2 text-right">الدولة / المدينة</th>
                <th className="px-3 py-2 text-right">إجراء</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2">#{r.id}</td>
                  <td className="px-3 py-2">
                    {r.user_name || `ID: ${r.user ?? "-"}`}
                  </td>
                  <td className="px-3 py-2">
                    {r.role === "customer"
                      ? "عميل"
                      : r.role === "staff"
                      ? "موظف"
                      : r.role === "supervisor"
                      ? "مشرف"
                      : r.role === "manager"
                      ? "مدير"
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-amber-700 font-semibold">
                    {r.action || "-"}
                  </td>
                  <td className="px-3 py-2 max-w-xs break-all">
                    {r.path || "-"}
                  </td>
                  <td className="px-3 py-2">{r.method || "-"}</td>
                  <td className="px-3 py-2">{r.status_code ?? "-"}</td>
                  <td className="px-3 py-2">
                    {r.order_id ? `طلب #${r.order_id}` : "-"}
                    {(r.table_label || r.order_status) && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {r.table_label && <span>طاولة: {r.table_label}</span>}
                        {r.table_label && r.order_status && <span> • </span>}
                        {r.order_status && <span>الحالة: {r.order_status}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.ip_address || "-"}</td>
                  <td className="px-3 py-2">
                    {(r.device_type || "-") + " / " + (r.os || "-")}
                  </td>
                  <td className="px-3 py-2">{r.browser || "-"}</td>
                  <td className="px-3 py-2">
                    {(r.country || "-") + (r.city ? ` / ${r.city}` : "")}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRow(r)}
                      className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
                    >
                      تفاصيل
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال التفاصيل */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 text-xs space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">
                تفاصيل الطلب #{selectedRow.id}
              </h4>
              <button
                onClick={() => setSelectedRow(null)}
                className="text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p>
                <span className="font-semibold">المستخدم:</span>{" "}
                {selectedRow.user_name || `ID: ${selectedRow.user ?? "-"}`}
              </p>
              <p>
                <span className="font-semibold">الدور:</span>{" "}
                {selectedRow.role || "-"}
              </p>
              <p>
                <span className="font-semibold">الحدث:</span>{" "}
                {selectedRow.action || "-"}
              </p>
              <p>
                <span className="font-semibold">المسار:</span>{" "}
                {selectedRow.path || "-"}
              </p>
              <p>
                <span className="font-semibold">الطريقة / الكود:</span>{" "}
                {selectedRow.method || "-"} /{" "}
                {selectedRow.status_code ?? "-"}
              </p>
              <p>
                <span className="font-semibold">الطلب:</span>{" "}
                {selectedRow.order_id ? `#${selectedRow.order_id}` : "-"}
              </p>
              {(selectedRow.table_label || selectedRow.order_status) && (
                <p>
                  <span className="font-semibold">تفاصيل الطلب:</span>{" "}
                  {selectedRow.table_label && `طاولة: ${selectedRow.table_label}`}
                  {selectedRow.table_label && selectedRow.order_status && " • "}
                  {selectedRow.order_status &&
                    `حالة: ${selectedRow.order_status}`}
                </p>
              )}
              <p>
                <span className="font-semibold">IP:</span>{" "}
                {selectedRow.ip_address || "-"}
              </p>
              <p>
                <span className="font-semibold">الجهاز:</span>{" "}
                {selectedRow.device_type || "-"}
              </p>
              <p>
                <span className="font-semibold">النظام:</span>{" "}
                {selectedRow.os || "-"}
              </p>
              <p>
                <span className="font-semibold">المتصفح:</span>{" "}
                {selectedRow.browser || "-"}
              </p>
              <p>
                <span className="font-semibold">الدولة / المدينة:</span>{" "}
                {(selectedRow.country || "-") +
                  (selectedRow.city ? ` / ${selectedRow.city}` : "")}
              </p>
              <p>
                <span className="font-semibold">User-Agent:</span>
              </p>
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto font-mono text-[10px] break-all">
                {selectedRow.user_agent || "-"}
              </div>
              <p>
                <span className="font-semibold">التاريخ:</span>{" "}
                {new Date(selectedRow.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setSelectedRow(null)}
                className="px-3 py-1 rounded-full border text-xs"
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

export default DashboardUserActivity;
