import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { FinancialReport } from "../../types/accounting";
import ReportGenerator from "./reports/ReportGenerator";
import ReportViewer from "./reports/ReportViewer";

const FinancialReports: React.FC = () => {
  const [reports, setReports] = useState<FinancialReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    accountingApi
      .listReports()
      .then(setReports)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerated = (report: FinancialReport) => {
    setReports((prev) => [report, ...prev]);
  };

  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    if (!reports.length) return;
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await accountingApi.exportReport({
        report_type: reports[0].report_type,
        format,
      });
      setExportMsg(`تم تجهيز التصدير: ${res.export_url}`);
    } catch (err) {
      setExportMsg("تعذر التصدير.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <ReportGenerator onGenerated={handleGenerated} />
      </Card>
      <Card className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-600">تصدير آخر تقرير:</span>
        <button
          className="px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          onClick={() => handleExport("pdf")}
          disabled={exporting || !reports.length}
        >
          PDF
        </button>
        <button
          className="px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          onClick={() => handleExport("excel")}
          disabled={exporting || !reports.length}
        >
          Excel
        </button>
        <button
          className="px-3 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          onClick={() => handleExport("csv")}
          disabled={exporting || !reports.length}
        >
          CSV
        </button>
        {exportMsg && <span className="text-green-700">{exportMsg}</span>}
      </Card>
      {loading ? <Card>جارٍ تحميل التقارير...</Card> : <ReportViewer reports={reports} />}
    </div>
  );
};

export default FinancialReports;
