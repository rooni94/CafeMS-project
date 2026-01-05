import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { AccountingInvoice } from "../../types/accounting";

const CustomerLedger: React.FC = () => {
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([]);

  useEffect(() => {
    accountingApi.listInvoices().then(setInvoices);
  }, []);

  const aging = useMemo(() => {
    const buckets = { current: 0, thirty: 0, sixty: 0, ninety: 0 };
    invoices.forEach((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : new Date();
      const diff = (Date.now() - due.getTime()) / (1000 * 60 * 60 * 24);
      const amount = inv.balance_due || 0;
      if (diff <= 0) buckets.current += amount;
      else if (diff <= 30) buckets.thirty += amount;
      else if (diff <= 60) buckets.sixty += amount;
      else buckets.ninety += amount;
    });
    return buckets;
  }, [invoices]);

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">أعمار الذمم (العملاء)</div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="border rounded-lg px-3 py-2">
          <div className="text-gray-500">حالي</div>
          <div className="text-lg font-bold">{aging.current.toFixed(2)}</div>
        </div>
        <div className="border rounded-lg px-3 py-2">
          <div className="text-gray-500">1 - 30</div>
          <div className="text-lg font-bold">{aging.thirty.toFixed(2)}</div>
        </div>
        <div className="border rounded-lg px-3 py-2">
          <div className="text-gray-500">31 - 60</div>
          <div className="text-lg font-bold">{aging.sixty.toFixed(2)}</div>
        </div>
        <div className="border rounded-lg px-3 py-2">
          <div className="text-gray-500">+60</div>
          <div className="text-lg font-bold">{aging.ninety.toFixed(2)}</div>
        </div>
      </div>
    </Card>
  );
};

export default CustomerLedger;
