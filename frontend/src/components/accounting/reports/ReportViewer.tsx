import React from "react";
import { FinancialReport } from "../../../types/accounting";
import { Card } from "../../ui/Card";

type Props = {
  reports: FinancialReport[];
};

const ReportViewer: React.FC<Props> = ({ reports }) => {
  if (!reports.length) {
    return <Card>لم يتم توليد تقارير بعد.</Card>;
  }

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">التقارير المحفوظة</div>
      <div className="space-y-2 max-h-96 overflow-auto text-xs">
        {reports.map((r) => (
          <details
            key={r.id}
            className="border border-gray-100 rounded-lg px-3 py-2"
            open={reports.length === 1}
          >
            <summary className="cursor-pointer flex items-center justify-between">
              <span>
                {r.name} ({r.report_type})
              </span>
              <span className="text-gray-500">{r.period_start} → {r.period_end}</span>
            </summary>
            <pre className="bg-gray-50 rounded-lg p-2 mt-2 overflow-auto">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          </details>
        ))}
      </div>
    </Card>
  );
};

export default ReportViewer;
