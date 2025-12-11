// frontend/src/pages/My/MyLeavesPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";

type MyLeave = {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | string;
  reason?: string | null;
  days_requested?: number;
  created_at?: string;
  decided_at?: string | null;
};

type MyRaiseRequest = {
  id: number;
  requested_amount: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  decided_at?: string | null;
};

type MyWorkReport = {
  id: number;
  date: string;
  hours_worked: string;
  overtime_hours: string;
  absence_reason?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
};

type MyAttendance = {
  id: number;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status: string;
  total_hours: string;
};

type MyPayroll = {
  id: number;
  month: string;
  basic_salary: string;
  net_salary: string;
  payment_status: string;
};

type MyNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
};


const MyLeavesPage: React.FC = () => {
  // ====== إجازات ======
  const [leaves, setLeaves] = useState<MyLeave[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState("annual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // ====== حضور ======
  const [attendance, setAttendance] = useState<MyAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState<string | null>(null);

  // ====== تقارير العمل ======
  const [workReports, setWorkReports] = useState<MyWorkReport[]>([]);
  const [workLoading, setWorkLoading] = useState(false);

  const [reportDate, setReportDate] = useState("");
  const [reportHours, setReportHours] = useState("0");
  const [reportOvertime, setReportOvertime] = useState("0");
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  // ====== طلبات زيادة الراتب ======
  const [raises, setRaises] = useState<MyRaiseRequest[]>([]);
  const [raisesLoading, setRaisesLoading] = useState(false);

  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseReason, setRaiseReason] = useState("");

  // ====== الرواتب ======
  const [payrolls, setPayrolls] = useState<MyPayroll[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  const [notifications, setNotifications] = useState<MyNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // ========== جلب البيانات من الـ API ==========

  const fetchLeaves = async () => {
    setLeaveLoading(true);
    setLeaveError(null);
    try {
      const res = await api.get("/hr/my/leaves/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setLeaves(data);
    } catch (e) {
      console.error(e);
      setLeaveError("تعذر تحميل طلبات الإجازة الخاصة بك.");
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      // نجيب آخر 30 يوم مثلاً
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - 30);
      const fromStr = fromDate.toISOString().slice(0, 10);

      const res = await api.get("/hr/my/attendance/", {
        params: { from: fromStr },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setAttendance(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchWorkReports = async () => {
    setWorkLoading(true);
    try {
      const res = await api.get("/hr/my/work-reports/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setWorkReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setWorkLoading(false);
    }
  };

  const fetchRaises = async () => {
    setRaisesLoading(true);
    try {
      const res = await api.get("/hr/my/raises/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRaises(data);
    } catch (e) {
      console.error(e);
    } finally {
      setRaisesLoading(false);
    }
  };

  const fetchPayrolls = async () => {
    setPayrollLoading(true);
    try {
      const res = await api.get("/hr/my/payrolls/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setPayrolls(data);
    } catch (e) {
      console.error(e);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchAttendance();
    fetchWorkReports();
    fetchRaises();
    fetchPayrolls();
    fetchLeaves();
    fetchAttendance();
    fetchWorkReports();
    fetchRaises();
    fetchPayrolls();
    fetchNotifications();
  }, []);

  // ========== إرسال طلب إجازة ==========

  const handleLeaveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      alert("الرجاء اختيار تاريخ البداية والنهاية.");
      return;
    }
    try {
      await api.post("/hr/my/leaves/", {
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: leaveEnd,
        reason: leaveReason || undefined,
      });
      setLeaveType("annual");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      fetchLeaves();
    } catch (e) {
      console.error(e);
      alert("تعذر إرسال طلب الإجازة.");
    }
  };

  // ========== تسجيل حضور / انصراف ==========

  const handleCheckIn = async () => {
    setAttendanceMsg(null);
    try {
      const res = await api.post("/hr/my/attendance/check-in/");
      setAttendanceMsg("تم تسجيل حضورك بنجاح.");
      // نضيف/نحدّث السجل في الواجهة
      fetchAttendance();
    } catch (e: any) {
      console.error(e);
      setAttendanceMsg(
        e?.response?.data?.detail || "تعذر تسجيل الحضور. حاول مرة أخرى."
      );
    }
  };

  const handleCheckOut = async () => {
    setAttendanceMsg(null);
    try {
      await api.post("/hr/my/attendance/check-out/");
      setAttendanceMsg("تم تسجيل انصرافك بنجاح.");
      fetchAttendance();
    } catch (e) {
      console.error(e);
      setAttendanceMsg("تعذر تسجيل الانصراف. حاول مرة أخرى.");
    }
  };

  // ========== إرسال تقرير عمل / سبب غياب ==========

  const handleWorkReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reportDate) {
      alert("الرجاء اختيار التاريخ.");
      return;
    }
    try {
      await api.post("/hr/my/work-reports/", {
        date: reportDate,
        hours_worked: reportHours || "0",
        overtime_hours: reportOvertime || "0",
        absence_reason: reportReason || undefined,
        notes: reportNotes || undefined,
      });
      setReportDate("");
      setReportHours("0");
      setReportOvertime("0");
      setReportReason("");
      setReportNotes("");
      fetchWorkReports();
    } catch (e) {
      console.error(e);
      alert("تعذر إرسال تقرير العمل.");
    }
  };

  // ========== إرسال طلب زيادة راتب ==========

  const handleRaiseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!raiseAmount) {
      alert("الرجاء إدخال المبلغ المطلوب.");
      return;
    }
    try {
      await api.post("/hr/my/raises/", {
        requested_amount: raiseAmount,
        reason: raiseReason || undefined,
      });
      setRaiseAmount("");
      setRaiseReason("");
      fetchRaises();
    } catch (e) {
      console.error(e);
      alert("تعذر إرسال طلب زيادة الراتب.");
    }
  };
  const fetchNotifications = async () => {
  setNotifLoading(true);
  try {
    const res = await api.get("/hr/my/notifications/");
    const data = Array.isArray(res.data) ? res.data : res.data.results || [];
    setNotifications(data);
  } catch (e) {
    console.error(e);
  } finally {
    setNotifLoading(false);
  }
};

const markAllNotificationsRead = async () => {
  try {
    await api.post("/hr/my/notifications/mark-all-read/");
    fetchNotifications();
  } catch (e) {
    console.error(e);
  }
};

  
  // ========== Helpers بسيطة ==========

  const statusBadge = (status: string) => {
    let color = "bg-gray-100 text-gray-700";
    if (status === "pending") color = "bg-yellow-100 text-yellow-700";
    if (status === "approved") color = "bg-green-100 text-green-700";
    if (status === "rejected") color = "bg-red-100 text-red-700";
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] ${color}`}>
        {status === "pending"
          ? "بانتظار المراجعة"
          : status === "approved"
          ? "مقبولة"
          : status === "rejected"
          ? "مرفوضة"
          : status}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* مقدمة */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">طلباتي وحقوقي الوظيفية</h1>
        <p className="text-sm text-gray-500">
          من هنا يمكنك إدارة كل ما يخصك في الموارد البشرية: تسجيل الحضور،
          طلبات الإجازة، تقارير العمل، وطلبات زيادة الراتب.
        </p>
      </div>

      {/* ====== قسم الحضور ====== */}
      <section className="bg-white rounded-2xl shadow p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">الحضور اليومي</h2>
            <p className="text-xs text-gray-500">
              سجّل حضورك وانصرافك بنفسك، وسيظهر مباشرة في لوحة تحكم الموارد
              البشرية.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCheckIn}
              className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs hover:bg-emerald-600"
            >
              تسجيل حضور الآن
            </button>
            <button
              type="button"
              onClick={handleCheckOut}
              className="px-4 py-2 rounded-full bg-rose-500 text-white text-xs hover:bg-rose-600"
            >
              تسجيل انصراف الآن
            </button>
          </div>
        </div>
        {attendanceMsg && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {attendanceMsg}
          </div>
        )}
        <div className="border-t pt-3">
          <h3 className="text-xs font-semibold mb-2 text-gray-600">
            آخر سجلات الحضور:
          </h3>
          {attendanceLoading ? (
            <div className="text-xs text-gray-500">جارٍ تحميل الحضور...</div>
          ) : attendance.length === 0 ? (
            <div className="text-xs text-gray-500">
              لا توجد سجلات حضور لعرضها.
            </div>
          ) : (
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-2 py-1 text-right">التاريخ</th>
                  <th className="px-2 py-1 text-right">الحضور</th>
                  <th className="px-2 py-1 text-right">الانصراف</th>
                  <th className="px-2 py-1 text-right">الحالة</th>
                  <th className="px-2 py-1 text-right">الساعات</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-2 py-1">{a.date}</td>
                    <td className="px-2 py-1">{a.check_in || "-"}</td>
                    <td className="px-2 py-1">{a.check_out || "-"}</td>
                    <td className="px-2 py-1">{a.status}</td>
                    <td className="px-2 py-1">
                      {a.total_hours ? `${a.total_hours} ساعة` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ====== قسم طلب الإجازة ====== */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">طلب إجازة</h2>
          <p className="text-xs text-gray-500">
            أرسل طلب إجازة، وسيقوم مسؤول الموارد البشرية بمراجعته واعتماده أو
            رفضه.
          </p>
        </div>

        {/* نموذج طلب جديد */}
        <form
          onSubmit={handleLeaveSubmit}
          className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm"
        >
          <div>
            <label className="block mb-1 text-gray-600 text-xs">
              نوع الإجازة
            </label>
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="annual">سنوية</option>
              <option value="sick">مرضية</option>
              <option value="emergency">طارئة</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-gray-600 text-xs">من تاريخ</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full"
              value={leaveStart}
              onChange={(e) => setLeaveStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-600 text-xs">إلى تاريخ</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full"
              value={leaveEnd}
              onChange={(e) => setLeaveEnd(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
            >
              إرسال الطلب
            </button>
          </div>
          <div className="md:col-span-4">
            <label className="block mb-1 text-gray-600 text-xs">
              السبب (اختياري)
            </label>
            <textarea
              className="border rounded-lg px-3 py-2 w-full min-h-[70px]"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />
          </div>
        </form>

        {/* جدول الطلبات */}
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          {leaveLoading ? (
            <div className="p-4 text-center text-xs text-gray-500">
              جارٍ تحميل الطلبات...
            </div>
          ) : leaveError ? (
            <div className="p-4 text-center text-xs text-red-500">
              {leaveError}
            </div>
          ) : leaves.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              لا توجد طلبات حالياً.
            </div>
          ) : (
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-right">نوع الإجازة</th>
                  <th className="px-3 py-2 text-right">من</th>
                  <th className="px-3 py-2 text-right">إلى</th>
                  <th className="px-3 py-2 text-right">الأيام</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                  <th className="px-3 py-2 text-right">السبب</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.leave_type}</td>
                    <td className="px-3 py-2">{r.start_date}</td>
                    <td className="px-3 py-2">{r.end_date}</td>
                    <td className="px-3 py-2">
                      {r.days_requested ?? "-"}
                    </td>
                    <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    <td className="px-3 py-2">{r.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ====== قسم تقرير العمل / سبب الغياب ====== */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">تقرير عمل / سبب غياب</h2>
          <p className="text-xs text-gray-500">
            يمكنك هنا شرح ساعات عملك، الساعات الإضافية، أو سبب الغياب ليظهر لمسؤول
            الموارد البشرية.
          </p>
        </div>

        <form
          onSubmit={handleWorkReportSubmit}
          className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm"
        >
          <div>
            <label className="block mb-1 text-gray-600 text-xs">التاريخ</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-600 text-xs">
              ساعات العمل
            </label>
            <input
              type="number"
              min={0}
              step="0.25"
              className="border rounded-lg px-3 py-2 w-full"
              value={reportHours}
              onChange={(e) => setReportHours(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-gray-600 text-xs">
              ساعات إضافية
            </label>
            <input
              type="number"
              min={0}
              step="0.25"
              className="border rounded-lg px-3 py-2 w-full"
              value={reportOvertime}
              onChange={(e) => setReportOvertime(e.target.value)}
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-full bg-sky-500 text-white text-xs hover:bg-sky-600"
            >
              إرسال التقرير
            </button>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-gray-600 text-xs">
              سبب الغياب (إن وجد)
            </label>
            <textarea
              className="border rounded-lg px-3 py-2 w-full min-h-[60px]"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-gray-600 text-xs">
              ملاحظات إضافية
            </label>
            <textarea
              className="border rounded-lg px-3 py-2 w-full min-h-[60px]"
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
            />
          </div>
        </form>

        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          {workLoading ? (
            <div className="p-4 text-center text-xs text-gray-500">
              جارٍ تحميل التقارير...
            </div>
          ) : workReports.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500">
              لا توجد تقارير عمل حالياً.
            </div>
          ) : (
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="px-3 py-2 text-right">التاريخ</th>
                  <th className="px-3 py-2 text-right">ساعات العمل</th>
                  <th className="px-3 py-2 text-right">الساعات الإضافية</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                  <th className="px-3 py-2 text-right">السبب</th>
                </tr>
              </thead>
              <tbody>
                {workReports.map((w) => (
                  <tr key={w.id} className="border-t">
                    <td className="px-3 py-2">{w.date}</td>
                    <td className="px-3 py-2">{w.hours_worked}</td>
                    <td className="px-3 py-2">{w.overtime_hours}</td>
                    <td className="px-3 py-2 text-[10px]">
                      {w.status === "pending" ? "قيد المراجعة" : "تمت المراجعة"}
                    </td>
                    <td className="px-3 py-2">
                      {w.absence_reason || w.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ====== قسم طلب زيادة الراتب + الرواتب ====== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* طلب زيادة راتب */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">طلب زيادة راتب</h2>
            <p className="text-xs text-gray-500">
              يمكنك إرسال طلب زيادة راتب مع توضيح السبب، وسيقوم المدير بمراجعته.
            </p>
          </div>

          <form
            onSubmit={handleRaiseSubmit}
            className="bg-white rounded-2xl shadow p-4 space-y-3 text-sm"
          >
            <div>
              <label className="block mb-1 text-gray-600 text-xs">
                المبلغ المطلوب (بالعملة المحلية)
              </label>
              <input
                type="number"
                min={0}
                step="0.5"
                className="border rounded-lg px-3 py-2 w-full"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-600 text-xs">
                السبب (اختياري لكن يفضّل توضيحه)
              </label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[70px]"
                value={raiseReason}
                onChange={(e) => setRaiseReason(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs hover:bg-emerald-600"
            >
              إرسال طلب زيادة
            </button>
          </form>

          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            {raisesLoading ? (
              <div className="p-4 text-center text-xs text-gray-500">
                جارٍ تحميل طلبات زيادة الراتب...
              </div>
            ) : raises.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                لا توجد طلبات زيادة راتب حتى الآن.
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">المبلغ</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {raises.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        {r.created_at?.slice(0, 10) || "-"}
                      </td>
                      <td className="px-3 py-2">{r.requested_amount}</td>
                      <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* الرواتب الخاصة بالموظف */}
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">سجلات الرواتب الخاصة بي</h2>
            <p className="text-xs text-gray-500">
              هذه قائمة بالرواتب المسجّلة لك في النظام حسب الشهور.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            {payrollLoading ? (
              <div className="p-4 text-center text-xs text-gray-500">
                جارٍ تحميل بيانات الرواتب...
              </div>
            ) : payrolls.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                لا توجد سجلات رواتب حتى الآن.
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-3 py-2 text-right">الشهر</th>
                    <th className="px-3 py-2 text-right">الراتب الأساسي</th>
                    <th className="px-3 py-2 text-right">الصافي</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">
                        {p.month?.slice(0, 7) /* YYYY-MM */}
                      </td>
                      <td className="px-3 py-2">{p.basic_salary}</td>
                      <td className="px-3 py-2">{p.net_salary}</td>
                      <td className="px-3 py-2">
                        {p.payment_status === "paid"
                          ? "مدفوع"
                          : "غير مدفوع"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
      {/* ====== قسم التنبيهات ====== */}
      <section className="bg-white rounded-2xl shadow p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">تنبيهاتي</h2>
            <p className="text-xs text-gray-500">
              هنا تظهر آخر التنبيهات المتعلقة بطلباتك ورواتبك.
            </p>
          </div>
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="px-3 py-1 rounded-full bg-gray-100 text-[11px] hover:bg-gray-200"
          >
            تعليم الكل كمقروء
          </button>
        </div>

        {notifLoading ? (
          <div className="text-xs text-gray-500">جارٍ تحميل التنبيهات...</div>
        ) : notifications.length === 0 ? (
          <div className="text-xs text-gray-500">لا توجد تنبيهات حالياً.</div>
        ) : (
          <ul className="space-y-2 text-xs">
            {notifications.slice(0, 10).map((n) => (
              <li
                key={n.id}
                className={`border rounded-xl px-3 py-2 flex items-start justify-between gap-3 ${
                  n.is_read ? "bg-white" : "bg-amber-50 border-amber-100"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[11px]">
                      {n.title}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {n.created_at?.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700">{n.message}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
};

export default MyLeavesPage;
