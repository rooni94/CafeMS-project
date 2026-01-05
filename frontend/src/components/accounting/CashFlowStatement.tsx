import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";

const CashFlowStatement: React.FC = () => {
  const [data, setData] = useState<{ incoming: number; outgoing: number; net: number }>({
    incoming: 0,
    outgoing: 0,
    net: 0,
  });
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  const load = async () => {
    const res = await accountingApi.fetchCashflow({
      start_date: range.start,
      end_date: range.end,
    });
    setData(res);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold">بيان التدفق النقدي</div>
          <div className="text-xs text-gray-500">تجميع الإيرادات مقابل المصروفات</div>
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500">من</label>
            <input
              type="date"
              className="border rounded-lg px-2 py-1 text-sm"
              value={range.start || ""}
              onChange={(e) => setRange((prev) => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">إلى</label>
            <input
              type="date"
              className="border rounded-lg px-2 py-1 text-sm"
              value={range.end || ""}
              onChange={(e) => setRange((prev) => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <button className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs" onClick={load}>
            تحديث
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Card>
          <div className="text-xs text-gray-500">تدفقات داخلة</div>
          <div className="text-xl font-bold">{data.incoming?.toFixed?.(2)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">تدفقات خارجة</div>
          <div className="text-xl font-bold text-red-600">{data.outgoing?.toFixed?.(2)}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">صافي</div>
          <div className="text-xl font-bold">{data.net?.toFixed?.(2)}</div>
        </Card>
      </div>
    </Card>
  );
};

export default CashFlowStatement;
