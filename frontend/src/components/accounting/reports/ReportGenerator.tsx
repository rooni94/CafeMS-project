import React, { useState } from "react";
import { accountingApi } from "../../../services/accounting";
import { FinancialReport } from "../../../types/accounting";

type Props = {
  onGenerated: (report: FinancialReport) => void;
};

const ReportGenerator: React.FC<Props> = ({ onGenerated }) => {
  const [reportType, setReportType] = useState("profit_loss");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const report = await accountingApi.runReport({
        report_type: reportType,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      });
      onGenerated(report);
    } catch (err) {
      console.error(err);
      setError("تعذر توليد التقرير");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid grid-cols-1 md:grid-cols-4 gap-3" onSubmit={handleGenerate}>
      <div>
        <label className="text-xs text-gray-500">نوع التقرير</label>
        <select
          className="w-full border rounded-lg px-2 py-1"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
        >
          <option value="profit_loss">قائمة الدخل</option>
          <option value="balance_sheet">الميزانية</option>
          <option value="cash_flow">التدفقات النقدية</option>
          <option value="inventory_valuation">تقييم المخزون</option>
          <option value="tax">ضريبة / ضريبة القيمة المضافة</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">من</label>
        <input
          type="date"
          className="w-full border rounded-lg px-2 py-1"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">إلى</label>
        <input
          type="date"
          className="w-full border rounded-lg px-2 py-1"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? "جاري التوليد..." : "توليد التقرير"}
        </button>
      </div>
      {error && <div className="md:col-span-4 text-red-500 text-xs">{error}</div>}
    </form>
  );
};

export default ReportGenerator;
