// src/pages/hr/MyHRPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";

type MyLeave = {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: string;
};

type MyRaise = {
  id: number;
  requested_amount: number;
  reason?: string | null;
  status: string;
  created_at: string;
};

type WorkReport = {
  id: number;
  date: string;
  hours_worked: number;
  overtime_hours: number;
  absence_reason?: string | null;
  notes?: string | null;
  status: string;
};

const MyHRPage: React.FC = () => {
  const [tab, setTab] = useState<"leave" | "raise" | "report">("leave");

  const [leaves, setLeaves] = useState<MyLeave[]>([]);
  const [raises, setRaises] = useState<MyRaise[]>([]);
  const [reports, setReports] = useState<WorkReport[]>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // فورم الإجازة
  const [leaveForm, setLeaveForm] = useState<Partial<MyLeave>>({
    type: "annual",
  });

  // فورم زيادة الراتب
  const [raiseAmount, setRaiseAmount] = useState("");
  const [raiseReason, setRaiseReason] = useState("");

  // فورم تقرير العمل
  const today = new Date().toISOString().slice(0, 10);
  const [reportForm, setReportForm] = useState<Partial<WorkReport>>({
    date: today,
    hours_worked: 0,
    overtime_hours: 0,
  });

  const loadData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [le, ra, wr] = await Promise.all([
        api.get("/hr/my/leaves/"),
        api.get("/hr/my/raises/"),
        api.get("/hr/my/work-reports/"),
      ]);
      setLeaves(le.data);
      setRaises(ra.data);
      setReports(wr.data);
    } catch (e) {
      console.error(e);
      setErr("تعذر تحميل بيانات الموارد البشرية الخاصة بك.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ===== إرسال طلب إجازة =====
  const submitLeave = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.post("/hr/my/leaves/", leaveForm);
      setLeaveForm({ type: "annual" });
      loadData();
    } catch (e: any) {
      console.error(e);
      setErr("تعذر إرسال طلب الإجازة.");
    }
  };

  // ===== إرسال طلب زيادة راتب =====
  const submitRaise = async (e: FormEvent) => {
    e.preventDefault();
    if (!raiseAmount) return;
    setErr(null);
    try {
      await api.post("/hr/my/raises/", {
        requested_amount: raiseAmount,
        reason: raiseReason || undefined,
      });
      setRaiseAmount("");
      setRaiseReason("");
      loadData();
    } catch (e) {
      console.error(e);
      setErr("تعذر إرسال طلب زيادة الراتب.");
    }
  };

  // ===== إرسال تقرير العمل =====
  const submitReport = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api.post("/hr/my/work-reports/", reportForm);
      setReportForm((f) => ({ ...f, hours_worked: 0, overtime_hours: 0, absence_reason: "", notes: "" }));
      loadData();
    } catch (e) {
      console.error(e);
      setErr("تعذر إرسال تقرير العمل.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">خدماتي في الموارد البشرية</h2>

      {/* Tabs */}
      <div className="flex gap-2 text-sm">
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "leave" ? "bg-amber-500 text-white" : "bg-white"}`}
          onClick={() => setTab("leave")}
        >
          طلب إجازة
        </button>
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "raise" ? "bg-amber-500 text-white" : "bg-white"}`}
          onClick={() => setTab("raise")}
        >
          طلب زيادة راتب
        </button>
        <button
          className={`px-3 py-1.5 rounded-full border ${tab === "report" ? "bg-amber-500 text-white" : "bg-white"}`}
          onClick={() => setTab("report")}
        >
          تقرير غياب/دوام إضافي
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">جاري تحميل بياناتك...</div>}
      {err && <div className="text-sm text-red-500">{err}</div>}

      {/* Tab content */}
      {tab === "leave" && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* form */}
          <form onSubmit={submitLeave} className="bg-white rounded-xl shadow p-4 space-y-3 text-sm">
            <h3 className="font-semibold mb-1">إرسال طلب إجازة</h3>
            <div>
              <label className="block mb-1 text-xs text-gray-600">نوع الإجازة</label>
              <select
                className="border rounded-lg px-3 py-2 w-full"
                value={leaveForm.type || "annual"}
                onChange={(e) => setLeaveForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="annual">سنوية</option>
                <option value="sick">مرضية</option>
                <option value="unpaid">بدون راتب</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs text-gray-600">من تاريخ</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={leaveForm.start_date || ""}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-600">إلى تاريخ</label>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={leaveForm.end_date || ""}
                  onChange={(e) => setLeaveForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">السبب (اختياري)</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[60px]"
                value={leaveForm.reason || ""}
                onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600">
                إرسال الطلب
              </button>
            </div>
          </form>

          {/* list */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-sm mb-2">طلباتي السابقة</h3>
            {leaves.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد طلبات حتى الآن.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-right">النوع</th>
                      <th className="px-3 py-2 text-right">من</th>
                      <th className="px-3 py-2 text-right">إلى</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="px-3 py-1.5">{l.type}</td>
                        <td className="px-3 py-1.5">{l.start_date}</td>
                        <td className="px-3 py-1.5">{l.end_date}</td>
                        <td className="px-3 py-1.5">{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "raise" && (
        <div className="grid md:grid-cols-2 gap-4">
          <form onSubmit={submitRaise} className="bg-white rounded-xl shadow p-4 space-y-3 text-sm">
            <h3 className="font-semibold mb-1">طلب زيادة راتب</h3>
            <div>
              <label className="block mb-1 text-xs text-gray-600">المبلغ المطلوب</label>
              <input
                type="number"
                step="0.01"
                className="border rounded-lg px-3 py-2 w-full"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">السبب (اختياري)</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[60px]"
                value={raiseReason}
                onChange={(e) => setRaiseReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600">
                إرسال الطلب
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-sm mb-2">طلبات زيادة الراتب</h3>
            {raises.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد طلبات.</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">المبلغ</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {raises.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-1.5">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-1.5">{r.requested_amount}</td>
                      <td className="px-3 py-1.5">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "report" && (
        <div className="grid md:grid-cols-2 gap-4">
          <form onSubmit={submitReport} className="bg-white rounded-xl shadow p-4 space-y-3 text-sm">
            <h3 className="font-semibold mb-1">تقرير غياب / دوام / ساعات إضافية</h3>
            <div>
              <label className="block mb-1 text-xs text-gray-600">التاريخ</label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 w-full"
                value={reportForm.date || today}
                onChange={(e) => setReportForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs text-gray-600">ساعات العمل الفعلية</label>
                <input
                  type="number"
                  step="0.25"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={reportForm.hours_worked ?? ""}
                  onChange={(e) =>
                    setReportForm((f) => ({ ...f, hours_worked: Number(e.target.value || 0) }))
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-600">ساعات إضافية</label>
                <input
                  type="number"
                  step="0.25"
                  className="border rounded-lg px-3 py-2 w-full"
                  value={reportForm.overtime_hours ?? ""}
                  onChange={(e) =>
                    setReportForm((f) => ({ ...f, overtime_hours: Number(e.target.value || 0) }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">سبب الغياب (إن وجد)</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[50px]"
                value={reportForm.absence_reason || ""}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, absence_reason: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-600">ملاحظات إضافية</label>
              <textarea
                className="border rounded-lg px-3 py-2 w-full min-h-[50px]"
                value={reportForm.notes || ""}
                onChange={(e) =>
                  setReportForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600">
                إرسال التقرير
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-sm mb-2">تقاريرك السابقة</h3>
            {reports.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد تقارير.</div>
            ) : (
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">ساعات</th>
                    <th className="px-3 py-2 text-right">إضافي</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-1.5">{r.date}</td>
                      <td className="px-3 py-1.5">{r.hours_worked}</td>
                      <td className="px-3 py-1.5">{r.overtime_hours}</td>
                      <td className="px-3 py-1.5">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyHRPage;
