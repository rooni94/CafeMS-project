import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

type ActivityLog = {
  id: number;
  user_name: string | null;
  order: number | null;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  event_type?: string | null;

  ip_address?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device_type?: string | null;
  country?: string | null;
  city?: string | null;

  created_at: string;
};

// من الباكند لنشاط الدعم
type SupportActivityLog = {
  id: number;
  staff: number | null;
  staff_name: string | null;
  staff_role?: string | null;
  action_type: "reply" | "delete_conversation" | string;
  conversation: number | null;
  target_name?: string | null;
  target_email?: string | null;
  message?: string | null;
  created_at: string;

  ip_address?: string | null;
  user_agent?: string | null;
  browser?: string | null;
  os?: string | null;
  device_type?: string | null;
  country?: string | null;
  city?: string | null;
};

type CombinedLog = {
  uid: string; // source + id
  source: "order" | "support";

  // عام
  raw_id: number;
  user_name: string | null;
  role_name?: string | null;
  action_label: string;
  event_type?: string | null;
  created_at: string;

  // طلب / محادثة
  order?: number | null;
  conversation?: number | null;
  old_status?: string | null;
  new_status?: string | null;
  target_name?: string | null;
  target_email?: string | null;
  message?: string | null;

  // بيانات الجهاز / الشبكة
  ip_address?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  os?: string | null;
  browser?: string | null;
  country?: string | null;
  city?: string | null;
};

const getRoleLabel = (role?: string | null) => {
  if (role === "staff") return "موظف";
  if (role === "supervisor") return "مشرف";
  if (role === "manager") return "مدير";
  return "-";
};

const DashboardActivityLog: React.FC = () => {
  const [orderLogs, setOrderLogs] = useState<ActivityLog[]>([]);
  const [supportLogs, setSupportLogs] = useState<SupportActivityLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // فلاتر
  const [filterName, setFilterName] = useState("");
  const [filterRole, setFilterRole] = useState<string>(""); // staff / supervisor / manager
  const [filterAction, setFilterAction] = useState("");

  // للمودال
  const [selectedLog, setSelectedLog] = useState<CombinedLog | null>(null);

  const fetchAllLogs = () => {
    setLoading(true);
    setErr(null);

    Promise.all([
      api.get<ActivityLog[]>("orders/activity-log/", { params: { limit: 200 } }),
      api.get<SupportActivityLog[]>("support/activities/"),
    ])
      .then(([ordersRes, supportRes]) => {
        setOrderLogs(ordersRes.data);
        setSupportLogs(supportRes.data);
      })
      .catch((error) => {
        console.error(error);
        setErr("تعذر تحميل سجل النشاط.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllLogs();
  }, []);

  // دمج السجلات في مصفوفة واحدة موحدة
  const combinedLogs: CombinedLog[] = useMemo(() => {
    const fromOrders: CombinedLog[] = orderLogs.map((log) => ({
      uid: `order-${log.id}`,
      source: "order",
      raw_id: log.id,
      user_name: log.user_name,
      role_name: null, // ممكن نضيفها لاحقاً من الباكند
      action_label: log.action,
      event_type: log.event_type || "order",

      order: log.order,
      conversation: null,
      old_status: log.old_status,
      new_status: log.new_status,
      target_name: null,
      target_email: null,
      message: null,

      ip_address: log.ip_address,
      user_agent: log.user_agent,
      device_type: log.device_type,
      os: log.os,
      browser: log.browser,
      country: log.country,
      city: log.city,
      created_at: log.created_at,
    }));

    const fromSupport: CombinedLog[] = supportLogs.map((log) => {
      let label = log.action_type;
      if (log.action_type === "reply") {
        label = "رد على محادثة دعم";
      } else if (log.action_type === "delete_conversation") {
        label = "حذف محادثة دعم";
      }

      return {
        uid: `support-${log.id}`,
        source: "support",
        raw_id: log.id,
        user_name: log.staff_name,
        role_name: log.staff_role || null,
        action_label: label,
        event_type: "support",

        order: null,
        conversation: log.conversation,
        old_status: null,
        new_status: null,
        target_name: log.target_name,
        target_email: log.target_email,
        message: log.message,

        ip_address: log.ip_address || null,
        user_agent: log.user_agent || null,
        device_type: log.device_type || null,
        os: log.os || null,
        browser: log.browser || null,
        country: log.country || null,
        city: log.city || null,
        created_at: log.created_at,
      };
    });

    return [...fromOrders, ...fromSupport].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [orderLogs, supportLogs]);

  // إعداد خيارات نوع النشاط من البيانات نفسها
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    combinedLogs.forEach((l) => {
      if (l.action_label) set.add(l.action_label);
    });
    return Array.from(set);
  }, [combinedLogs]);

  // تطبيق الفلاتر
  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((log) => {
      const nameMatch = filterName
        ? (log.user_name || "")
            .toLowerCase()
            .includes(filterName.trim().toLowerCase())
        : true;

      const roleMatch = filterRole
        ? (log.role_name || "") === filterRole
        : true;

      const actionMatch = filterAction
        ? log.action_label === filterAction
        : true;

      return nameMatch && roleMatch && actionMatch;
    });
  }, [combinedLogs, filterName, filterRole, filterAction]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // الفلاتر تطبّق تلقائياً مع تغيير الـ state، هذا فقط لمنع reload
  };

  if (loading) return <div>جاري تحميل سجل النشاط...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;
  if (!combinedLogs.length)
    return <div>لا يوجد نشاط مسجل حالياً.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">سجل نشاط الموظفين</h2>

      {/* فلاتر البحث بنفس نسق صفحة نشاط المستخدمين */}
      <form
        onSubmit={handleFilterSubmit}
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
            <option value="staff">موظف</option>
            <option value="supervisor">مشرف</option>
            <option value="manager">مدير</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">تصفية حسب اسم الموظف</label>
          <input
            className="border rounded-lg px-3 py-2"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="اكتب جزء من الاسم"
          />
        </div>

        <div>
          <label className="block mb-1">تصفية حسب نوع النشاط</label>
          <select
            className="border rounded-lg px-3 py-2 min-w-[200px]"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">كل أنواع النشاط</option>
            {availableActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            تطبيق التصفية
          </button>
          <button
            type="button"
            onClick={fetchAllLogs}
            className="px-4 py-2 rounded-full border border-amber-400 text-amber-700 text-xs hover:bg-amber-50"
          >
            تحديث البيانات
          </button>
        </div>
      </form>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2 text-right">المصدر</th>
              <th className="px-3 py-2 text-right">الموظف</th>
              <th className="px-3 py-2 text-right">الدور</th>
              <th className="px-3 py-2 text-right">نوع النشاط</th>
              <th className="px-3 py-2 text-right">طلب / محادثة</th>
              <th className="px-3 py-2 text-right">تفاصيل مختصرة</th>
              <th className="px-3 py-2 text-right">إجراء</th>
              <th className="px-3 py-2 text-right">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const sourceLabel =
                log.source === "order" ? "طلب" : "محادثة دعم";

              let mainRef = "-";
              if (log.source === "order" && log.order) {
                mainRef = `طلب #${log.order}`;
              } else if (log.source === "support" && log.conversation) {
                mainRef = `محادثة #${log.conversation}`;
              }

              let details = "";
              if (log.source === "order") {
                if (log.old_status || log.new_status) {
                  details = `من: ${log.old_status || "-"} → إلى: ${
                    log.new_status || "-"
                  }`;
                }
              } else if (log.source === "support") {
                if (log.message) {
                  details = log.message;
                } else {
                  details = `مع: ${log.target_name || "-"} (${
                    log.target_email || "-"
                  })`;
                }
              }

              return (
                <tr key={log.uid} className="border-t align-top">
                  <td className="px-3 py-2">#{log.raw_id}</td>
                  <td className="px-3 py-2">{sourceLabel}</td>
                  <td className="px-3 py-2">
                    {log.user_name || "غير محدد"}
                  </td>
                  <td className="px-3 py-2">
                    {getRoleLabel(log.role_name)}
                  </td>
                  <td className="px-3 py-2">{log.action_label}</td>
                  <td className="px-3 py-2">{mainRef}</td>
                  <td className="px-3 py-2 max-w-xs truncate">
                    {details || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="px-3 py-1 rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
                    >
                      تفاصيل
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* مودال التفاصيل */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-4 text-xs space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">
                تفاصيل النشاط #{selectedLog.raw_id}
              </h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p>
                <span className="font-semibold">المصدر:</span>{" "}
                {selectedLog.source === "order" ? "طلب" : "محادثة دعم"}
              </p>
              <p>
                <span className="font-semibold">الموظف:</span>{" "}
                {selectedLog.user_name || "غير محدد"}
              </p>
              <p>
                <span className="font-semibold">الدور:</span>{" "}
                {getRoleLabel(selectedLog.role_name)}
              </p>
              <p>
                <span className="font-semibold">نوع النشاط:</span>{" "}
                {selectedLog.action_label}
              </p>
              <p>
                <span className="font-semibold">الطلب / المحادثة:</span>{" "}
                {selectedLog.source === "order"
                  ? selectedLog.order
                    ? `طلب #${selectedLog.order}`
                    : "-"
                  : selectedLog.conversation
                  ? `محادثة #${selectedLog.conversation}`
                  : "-"}
              </p>

              {selectedLog.source === "order" && (
                <p>
                  <span className="font-semibold">من الحالة → إلى:</span>{" "}
                  {(selectedLog.old_status || "-") +
                    " → " +
                    (selectedLog.new_status || "-")}
                </p>
              )}

              {selectedLog.source === "support" && (
                <>
                  <p>
                    <span className="font-semibold">اسم الطرف الآخر:</span>{" "}
                    {selectedLog.target_name || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">البريد:</span>{" "}
                    {selectedLog.target_email || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">الرسالة:</span>{" "}
                    {selectedLog.message || "-"}
                  </p>
                </>
              )}

              <p>
                <span className="font-semibold">IP:</span>{" "}
                {selectedLog.ip_address || "-"}
              </p>
              <p>
                <span className="font-semibold">الجهاز:</span>{" "}
                {selectedLog.device_type || "-"}
              </p>
              <p>
                <span className="font-semibold">النظام:</span>{" "}
                {selectedLog.os || "-"}
              </p>
              <p>
                <span className="font-semibold">المتصفح:</span>{" "}
                {selectedLog.browser || "-"}
              </p>
              <p>
                <span className="font-semibold">الدولة / المدينة:</span>{" "}
                {(selectedLog.country || "-") +
                  (selectedLog.city ? ` / ${selectedLog.city}` : "")}
              </p>

              <p>
                <span className="font-semibold">User-Agent:</span>
              </p>
              <div className="border rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-[10px] break-all">
                {selectedLog.user_agent || "-"}
              </div>

              <p>
                <span className="font-semibold">التاريخ:</span>{" "}
                {new Date(selectedLog.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setSelectedLog(null)}
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

export default DashboardActivityLog;
