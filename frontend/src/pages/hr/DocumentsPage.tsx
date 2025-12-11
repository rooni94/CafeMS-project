// src/pages/My/MyDocumentsPage.tsx
import React, { useEffect, useState, FormEvent } from "react";
import { api } from "../../services/api";

type DocType = "passport" | "residence" | "contract" | "certificate" | "other";

type MyDocumentRow = {
  id: number;
  document_type: DocType;
  document_name: string;
  issue_date: string | null;
  expiry_date: string | null;
  file: string | null;
  is_expired: boolean;
  is_expiring_soon?: boolean;
  days_to_expiry?: number | null;
};

const MyDocumentsPage: React.FC = () => {
  const [rows, setRows] = useState<MyDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState<DocType>("passport");
  const [documentName, setDocumentName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const fetchDocs = async () => {
    setLoading(true);
    setErr(null);
    try {
      // بدون / في البداية عشان يضرب على /api/hr/my/documents/
      const res = await api.get("hr/my/documents/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setRows(data);
    } catch (e) {
      console.error(e);
      setErr("تعذر تحميل مستنداتك.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!documentName) {
      alert("الرجاء كتابة اسم المستند.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("document_type", documentType);
      formData.append("document_name", documentName);
      if (issueDate) formData.append("issue_date", issueDate);
      if (expiryDate) formData.append("expiry_date", expiryDate);

      const fileInput = document.getElementById(
        "my_doc_file_input"
      ) as HTMLInputElement | null;
      if (fileInput?.files && fileInput.files.length > 0) {
        formData.append("file", fileInput.files[0]);
      }

      await api.post("hr/my/documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setDocumentName("");
      setIssueDate("");
      setExpiryDate("");
      setDocumentType("passport");
      if (fileInput) fileInput.value = "";

      fetchDocs();
    } catch (e) {
      console.error(e);
      alert("تعذر رفع المستند.");
    }
  };

  const documentTypeLabel = (t: DocType) => {
    if (t === "passport") return "جواز";
    if (t === "residence") return "إقامة";
    if (t === "contract") return "عقد";
    if (t === "certificate") return "شهادة";
    return "أخرى / تأمين / تقرير طبي";
  };

  const expiryBadge = (d: MyDocumentRow) => {
    if (d.is_expired) {
      return <span className="text-red-600 text-[11px]">منتهي</span>;
    }
    if (d.is_expiring_soon) {
      return (
        <span className="text-amber-600 text-[11px]">
          ينتهي قريباً
          {typeof d.days_to_expiry === "number"
            ? ` (بعد ${d.days_to_expiry} يوم)`
            : ""}
        </span>
      );
    }
    return <span className="text-green-600 text-[11px]">ساري</span>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-1">مستنداتي</h1>
        <p className="text-sm text-gray-500">
          من هنا يمكنك رفع مستنداتك (جواز، إقامة، تأمين، تقارير طبية...) ومتابعة
          حالتها.
        </p>
      </div>

      {/* نموذج رفع مستند */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
      >
        <div>
          <label className="block mb-1 text-xs text-gray-600">نوع المستند</label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocType)}
          >
            <option value="passport">جواز</option>
            <option value="residence">إقامة</option>
            <option value="contract">عقد</option>
            <option value="certificate">شهادة</option>
            <option value="other">أخرى / تأمين / تقرير طبي</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">
            اسم المستند<span className="text-red-500">*</span>
          </label>
          <input
            className="border rounded-lg px-3 py-2 w-full"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="مثال: جواز سفر، تقرير طبي..."
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">تاريخ الإصدار</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 w-full"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-1 text-xs text-gray-600">تاريخ الانتهاء</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 w-full"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block mb-1 text-xs text-gray-600">
            ملف المستند (PDF / صورة)
          </label>
          <input
            id="my_doc_file_input"
            type="file"
            className="border rounded-lg px-3 py-2 w-full"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            رفع المستند
          </button>
        </div>
      </form>

      {/* قائمة المستندات */}
      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-500">
            جاري تحميل مستنداتك...
          </div>
        ) : err ? (
          <div className="p-4 text-center text-xs text-red-500">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            لم تقم برفع أي مستند بعد.
          </div>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-right">نوع المستند</th>
                <th className="px-3 py-2 text-right">الاسم</th>
                <th className="px-3 py-2 text-right">تاريخ الإصدار</th>
                <th className="px-3 py-2 text-right">تاريخ الانتهاء</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">الملف</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2">
                    {documentTypeLabel(d.document_type)}
                  </td>
                  <td className="px-3 py-2">{d.document_name}</td>
                  <td className="px-3 py-2">
                    {d.issue_date
                      ? new Date(d.issue_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {d.expiry_date
                      ? new Date(d.expiry_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2">{expiryBadge(d)}</td>
                  <td className="px-3 py-2">
                    {d.file ? (
                      <a
                        href={d.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        عرض / تحميل
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyDocumentsPage;