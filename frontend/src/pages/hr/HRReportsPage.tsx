// src/pages/hr/HRReportsPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../services/api";

type ReportType = "payroll" | "attendance" | "leaves" | "documents";

type ReportRow = {
  id: number;
  title: string;
  report_type: ReportType;
  generated_by: number | null;
  generated_by_name: string | null;
  generated_at: string;
  date_range: string | null;
  file: string | null;
};

const HRReportsPage: React.FC = () => {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // إنشاء تقرير
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState<ReportType>("payroll");
  const [dateRange, setDateRange] = useState("");

  // فلاتر
  const [filterType, setFilterType] = useState<"" | ReportType>("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // تحديد متعدد + تعديل جماعي
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkType, setBulkType] = useState<"" | ReportType>("");
  const [bulkDateRange, setBulkDateRange] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get("hr/reports/", {
        params: { ordering: "-generated_at" },
      });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRows(data);
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      setErr("تعذر تحميل التقارير.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      alert("الرجاء إدخال عنوان التقرير.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("report_type", reportType);
      if (dateRange) formData.append("date_range", dateRange);

      const fileInput = document.getElementById(
        "report_file_input"
      ) as HTMLInputElement | null;
      if (fileInput?.files && fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
      }

      await api.post("hr/reports/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTitle("");
      setDateRange("");
      if (fileInput) fileInput.value = "";

      await loadReports();
    } catch (error) {
      console.error(error);
      alert("تعذر إنشاء التقرير.");
    }
  };

  const reportTypeLabel = (t: ReportType) => {
    if (t === "payroll") return "رواتب";
    if (t === "attendance") return "حضور";
    if (t === "leaves") return "إجازات";
    if (t === "documents") return "مستندات";
    return t;
  };

  // ----- تحديد -----
  const allSelected =
    rows.length > 0 && selectedIds.length === rows.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `سيتم حذف ${selectedIds.length} تقرير/تقارير بشكل نهائي، هل أنت متأكد؟`
      )
    )
      return;

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`hr/reports/${id}/`))
      );
      await loadReports();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ الحذف الجماعي.");
    }
  };

  const bulkEdit = async () => {
    if (!selectedIds.length) {
      alert("حدد تقارير أولا.");
      return;
    }

    const payload: any = {};
    if (bulkType) payload.report_type = bulkType;
    if (bulkDateRange) payload.date_range = bulkDateRange;

    if (!Object.keys(payload).length) {
      alert("اختر على الأقل قيمة واحدة لتطبيقها على التقارير المحددة.");
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) => api.patch(`hr/reports/${id}/`, payload))
      );
      setBulkType("");
      setBulkDateRange("");
      await loadReports();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ التعديل الجماعي.");
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterType && r.report_type !== filterType) return false;

      if (search) {
        const s = search.toLowerCase();
        if (!r.title.toLowerCase().includes(s)) return false;
      }

      if (dateFrom) {
        const d = new Date(r.generated_at);
        if (d < new Date(dateFrom)) return false;
      }

      if (dateTo) {
        const d = new Date(r.generated_at);
        // نضيف يوم لكي يشمل تاريخ اليوم نفسّه
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);
        if (d >= to) return false;
      }

      return true;
    });
  }, [rows, filterType, search, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">تقارير الموارد البشرية</h2>

      {/* فلاتر أعلى القائمة */}
      <div className="bg-white rounded-xl shadow p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-end">
        <div>
          <label className="block mb-1 text-gray-600">نوع التقرير</label>
          <select
            className="border rounded-lg px-2 py-1 w-full"
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "" | ReportType)
            }
          >
            <option value="">الكل</option>
            <option value="payroll">رواتب</option>
            <option value="attendance">حضور</option>
            <option value="leaves">إجازات</option>
            <option value="documents">مستندات</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-gray-600">بحث بالعنوان</label>
          <input
            className="border rounded-lg px-2 py-1 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اكتب جزء من عنوان التقرير..."
          />
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
          <input
            type="date"
            className="border rounded-lg px-2 py-1 w-full"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* نموذج إنشاء تقرير جديد */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
      >
        <div>
          <label className="block mb-1 text-xs text-gray-600">
            عنوان التقرير<span className="text-red-500">*</span>
          </label>
          <input
            className="border rounded-lg px-3 py-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تقرير الرواتب لشهر 11 / 2025"
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">
            نوع التقرير
          </label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
            value={reportType}
            onChange={(e) =>
              setReportType(e.target.value as ReportType)
            }
          >
            <option value="payroll">رواتب</option>
            <option value="attendance">حضور</option>
            <option value="leaves">إجازات</option>
            <option value="documents">مستندات</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">
            الفترة الزمنية (اختياري)
          </label>
          <input
            className="border rounded-lg px-3 py-2 w-full"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            placeholder="مثال: 2025-01-01 إلى 2025-01-31"
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">
            ملف التقرير (PDF / Excel)
          </label>
          <input
            id="report_file_input"
            type="file"
            className="border rounded-lg px-3 py-2 w-full"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            حفظ التقرير
          </button>
        </div>
      </form>

      {/* شريط عمليات جماعية */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap gap-3 items-center">
          <span className="font-semibold">
            تم تحديد {selectedIds.length} تقرير/تقارير
          </span>

          <div className="flex items-center gap-1">
            <span>تعديل النوع إلى:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkType}
              onChange={(e) =>
                setBulkType(e.target.value as "" | ReportType)
              }
            >
              <option value="">بدون تغيير</option>
              <option value="payroll">رواتب</option>
              <option value="attendance">حضور</option>
              <option value="leaves">إجازات</option>
              <option value="documents">مستندات</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span>الفترة:</span>
            <input
              className="border rounded px-2 py-1"
              value={bulkDateRange}
              onChange={(e) => setBulkDateRange(e.target.value)}
              placeholder="اختياري"
            />
          </div>

          <button
            onClick={bulkEdit}
            className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600"
          >
            تطبيق التعديل الجماعي
          </button>

          <button
            onClick={bulkDelete}
            className="ml-auto px-3 py-1 rounded-full border border-red-400 text-red-600 hover:bg-red-50"
          >
            حذف المحدد
          </button>
        </div>
      )}

      {loading && <div className="text-sm">جاري تحميل التقارير...</div>}
      {err && <div className="text-sm text-red-500">{err}</div>}

      {!loading && !err && (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">العنوان</th>
                <th className="px-3 py-2 text-right">النوع</th>
                <th className="px-3 py-2 text-right">الفترة</th>
                <th className="px-3 py-2 text-right">المُنشئ</th>
                <th className="px-3 py-2 text-right">تاريخ الإنشاء</th>
                <th className="px-3 py-2 text-right">الملف</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelectOne(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2">{reportTypeLabel(r.report_type)}</td>
                  <td className="px-3 py-2">{r.date_range || "-"}</td>
                  <td className="px-3 py-2">
                    {r.generated_by_name || r.generated_by || "-"}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(r.generated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    {r.file ? (
                      <a
                        href={r.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        تحميل PDF/Excel
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
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
    </div>
  );
};

export default HRReportsPage;
