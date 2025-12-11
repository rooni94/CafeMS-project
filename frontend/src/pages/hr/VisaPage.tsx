// src/pages/hr/VisaPage.tsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../../services/api";

type VisaStatus = "valid" | "expired" | "renewing";

type VisaRow = {
  id: number;
  employee: number;
  employee_name: string;
  visa_number: string | null;
  residence_number: string | null;
  residence_issue_date: string | null;
  residence_expiry_date: string | null;
  residence_duration: number;
  passport_number: string | null;
  passport_expiry: string | null;
  sponsorship: string | null;
  status: VisaStatus;
  is_residence_expired: boolean;
  is_passport_expired: boolean;
};

type HRDocumentRow = {
  id: number;
  employee: number;
  employee_name: string;
  document_name: string;
  issue_date: string | null;
  expiry_date: string | null;
  file: string | null;
  document_type: string;
};

const VisaPage: React.FC = () => {
  const [rows, setRows] = useState<VisaRow[]>([]);
  const [residenceDocs, setResidenceDocs] = useState<HRDocumentRow[]>([]);
  const [insuranceDocs, setInsuranceDocs] = useState<HRDocumentRow[]>([]);
  const [passportDocs, setPassportDocs] = useState<HRDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // فلاتر
  const [statusFilter, setStatusFilter] = useState<"" | VisaStatus>("");
  const [expiryFilter, setExpiryFilter] = useState<
    "" | "residence_expired" | "passport_expired" | "ok"
  >("");

  // تحديد متعدد + تعديل جماعي
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<"" | VisaStatus>("");
  const [bulkSponsorship, setBulkSponsorship] = useState("");

  const extractList = (payload: any) =>
    Array.isArray(payload) ? payload : payload?.results || [];

  const docParams = (documentType: string) => {
    const params: Record<string, string> = { document_type: documentType };
    if (search) {
      params.search = search;
    }
    return params;
  };

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [visaRes, residenceRes, insuranceRes, passportRes] =
        await Promise.all([
          api.get("hr/visa-residence/", {
            params: search ? { search } : undefined,
          }),
          api.get("hr/documents/", { params: docParams("residence") }),
          api.get("hr/documents/", { params: docParams("insurance") }),
          api.get("hr/documents/", { params: docParams("passport") }),
        ]);
      setRows(extractList(visaRes.data));
      setResidenceDocs(extractList(residenceRes.data));
      setInsuranceDocs(extractList(insuranceRes.data));
      setPassportDocs(extractList(passportRes.data));
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      setErr("تعذر تحميل بيانات الإقامات والتأشيرات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = (s: VisaStatus) => {
    if (s === "valid") return "سارية";
    if (s === "expired") return "منتهية";
    if (s === "renewing") return "قيد التجديد";
    return s;
  };

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;

      if (expiryFilter === "residence_expired" && !r.is_residence_expired)
        return false;
      if (expiryFilter === "passport_expired" && !r.is_passport_expired)
        return false;
      if (expiryFilter === "ok") {
        if (r.is_residence_expired || r.is_passport_expired) return false;
      }

      return true;
    });
  }, [rows, statusFilter, expiryFilter]);

  // تحديد
  const allSelected =
    filteredRows.length > 0 &&
    selectedIds.length === filteredRows.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const bulkEdit = async () => {
    if (!selectedIds.length) {
      alert("حدد سجلات أولا.");
      return;
    }

    const payload: any = {};
    if (bulkStatus) payload.status = bulkStatus;
    if (bulkSponsorship) payload.sponsorship = bulkSponsorship;

    if (!Object.keys(payload).length) {
      alert("اختر على الأقل قيمة واحدة للتعديل.");
      return;
    }

    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`hr/visa-residence/${id}/`, payload)
        )
      );
      setBulkStatus("");
      setBulkSponsorship("");
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ التعديل الجماعي.");
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `سيتم حذف ${selectedIds.length} سجل تأشيرة/إقامة، هل أنت متأكد؟`
      )
    )
      return;

    try {
      await Promise.all(
        selectedIds.map((id) => api.delete(`hr/visa-residence/${id}/`))
      );
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("تعذر تنفيذ الحذف الجماعي.");
    }
  };

  const deleteOne = async (id: number) => {
    if (!window.confirm("هل تريد حذف هذا السجل؟")) return;
    try {
      await api.delete(`hr/visa-residence/${id}/`);
      await fetchData();
    } catch (e) {
      console.error(e);
      alert("تعذر حذف السجل.");
    }
  };

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const documentSections = [
    {
      key: "residence",
      title: "إقامات الموظفين المرفوعة من مستندات الموظف",
      accent: "text-amber-600",
      documents: residenceDocs,
      emptyMsg: "لا توجد إقامات مرفوعة حالياً من خلال صفحة مستندات الموظف.",
    },
    {
      key: "insurance",
      title: "وثائق التأمين الخاصة بالموظفين",
      accent: "text-emerald-600",
      documents: insuranceDocs,
      emptyMsg:
        "لا توجد وثائق تأمين مرتبطة بملفات الموظفين تم رفعها حتى الآن.",
    },
    {
      key: "passport",
      title: "جوازات السفر التي حمّلها الموظفون",
      accent: "text-blue-600",
      documents: passportDocs,
      emptyMsg: "لا توجد جوازات سفر مرفوعة من صفحة مستندات الموظف.",
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة الإقامات والتأشيرات والتأمينات</h2>

      {/* فلاتر وبحث */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
        className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 text-sm items-end"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="block mb-1 text-xs text-gray-600">
            بحث بالاسم / رقم الإقامة / رقم الجواز
          </label>
          <input
            className="border rounded-lg px-3 py-2 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اكتب اسم الموظف أو رقم الإقامة..."
          />
        </div>

        <div className="min-w-[160px]">
          <label className="block mb-1 text-xs text-gray-600">
            حالة الإقامة
          </label>
          <select
            className="border rounded-lg px-2 py-2 w-full"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "" | VisaStatus)
            }
          >
            <option value="">الكل</option>
            <option value="valid">سارية</option>
            <option value="renewing">قيد التجديد</option>
            <option value="expired">منتهية</option>
          </select>
        </div>

        <div className="min-w-[180px]">
          <label className="block mb-1 text-xs text-gray-600">
            تنبيه الانتهاء
          </label>
          <select
            className="border rounded-lg px-2 py-2 w-full"
            value={expiryFilter}
            onChange={(e) =>
              setExpiryFilter(
                e.target.value as
                  | ""
                  | "residence_expired"
                  | "passport_expired"
                  | "ok"
              )
            }
          >
            <option value="">الكل</option>
            <option value="residence_expired">الإقامة منتهية</option>
            <option value="passport_expired">الجواز منتهي</option>
            <option value="ok">لا توجد مشاكل</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
        >
          بحث / تحديث
        </button>
      </form>

      {/* شريط عمليات جماعية */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap gap-3 items-center">
          <span className="font-semibold">
            تم تحديد {selectedIds.length} سجل
          </span>

          <div className="flex items-center gap-1">
            <span>تعديل الحالة إلى:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkStatus}
              onChange={(e) =>
                setBulkStatus(e.target.value as "" | VisaStatus)
              }
            >
              <option value="">بدون تغيير</option>
              <option value="valid">سارية</option>
              <option value="renewing">قيد التجديد</option>
              <option value="expired">منتهية</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span>جهة الكفالة:</span>
            <input
              className="border rounded px-2 py-1"
              value={bulkSponsorship}
              onChange={(e) => setBulkSponsorship(e.target.value)}
              placeholder="اتركه فارغاً لعدم التغيير"
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

      {loading && <div className="text-sm">جاري تحميل البيانات...</div>}
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
                <th className="px-3 py-2 text-right">الموظف</th>
                <th className="px-3 py-2 text-right">رقم التأشيرة</th>
                <th className="px-3 py-2 text-right">رقم الإقامة</th>
                <th className="px-3 py-2 text-right">تاريخ إصدار الإقامة</th>
                <th className="px-3 py-2 text-right">انتهاء الإقامة</th>
                <th className="px-3 py-2 text-right">رقم الجواز</th>
                <th className="px-3 py-2 text-right">انتهاء الجواز</th>
                <th className="px-3 py-2 text-right">جهة الكفالة</th>
                <th className="px-3 py-2 text-right">حالة الإقامة</th>
                <th className="px-3 py-2 text-right">ملاحظات الانتهاء</th>
                <th className="px-3 py-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelectOne(r.id)}
                    />
                  </td>
                  <td className="px-3 py-2">{r.employee_name}</td>
                  <td className="px-3 py-2">{r.visa_number || "-"}</td>
                  <td className="px-3 py-2">{r.residence_number || "-"}</td>
                  <td className="px-3 py-2">
                    {r.residence_issue_date
                      ? new Date(r.residence_issue_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {r.residence_expiry_date
                      ? new Date(r.residence_expiry_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{r.passport_number || "-"}</td>
                  <td className="px-3 py-2">
                    {r.passport_expiry
                      ? new Date(r.passport_expiry).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{r.sponsorship || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === "valid"
                          ? "text-green-600"
                          : r.status === "renewing"
                          ? "text-amber-600"
                          : "text-red-600"
                      }
                    >
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {r.is_residence_expired && (
                        <div className="text-[11px] text-red-600">
                          الإقامة منتهية
                        </div>
                      )}
                      {r.is_passport_expired && (
                        <div className="text-[11px] text-red-600">
                          الجواز منتهي
                        </div>
                      )}
                      {!r.is_residence_expired &&
                        !r.is_passport_expired && (
                          <div className="text-[11px] text-gray-500">
                            لا توجد تنبيهات
                          </div>
                        )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteOne(r.id)}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    لا توجد سجلات مطابقة للفلاتر الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !err && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentSections.map((section) => (
            <div
              key={section.key}
              className="bg-white rounded-xl shadow p-4 text-xs flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <span className={`text-[11px] ${section.accent}`}>
                  {section.documents.length} ملف
                </span>
              </div>

              {section.documents.length === 0 ? (
                <p className="text-[11px] text-gray-500">
                  {section.emptyMsg}
                </p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead>
                      <tr className="text-gray-500 text-right">
                        <th className="px-2 py-1">الموظف</th>
                        <th className="px-2 py-1">المستند</th>
                        <th className="px-2 py-1">تاريخ الإصدار</th>
                        <th className="px-2 py-1">تاريخ الانتهاء</th>
                        <th className="px-2 py-1">الملف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.documents.map((doc) => (
                        <tr key={`${section.key}-${doc.id}`} className="border-t">
                          <td className="px-2 py-1">{doc.employee_name}</td>
                          <td className="px-2 py-1">{doc.document_name}</td>
                          <td className="px-2 py-1">{formatDate(doc.issue_date)}</td>
                          <td className="px-2 py-1">{formatDate(doc.expiry_date)}</td>
                          <td className="px-2 py-1">
                            {doc.file ? (
                              <a
                                href={doc.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                تنزيل
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisaPage;
