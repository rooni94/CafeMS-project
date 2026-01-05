import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { accountingApi } from "../../../services/accounting";
import { AccountingInvoice } from "../../../types/accounting";
import InvoicePreview from "./InvoicePreview";

const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([]);
  const [selected, setSelected] = useState<AccountingInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    accountingApi
      .listInvoices()
      .then((data) => {
        setInvoices(data);
        setSelected(data[0] || null);
      })
      .catch(() => setError("تعذر تحميل الفواتير"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <Card>جارٍ تحميل الفواتير...</Card>;
  if (error) return <Card className="text-red-500 text-sm">{error}</Card>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">الفواتير</h4>
          <button
            onClick={load}
            className="text-xs text-amber-700 hover:underline"
          >
            تحديث
          </button>
        </div>
        <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => setSelected(inv)}
              className={`w-full text-right py-2 px-2 rounded-lg ${
                selected?.id === inv.id ? "bg-amber-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span>#{inv.invoice}</span>
                <span className="text-xs text-gray-500">{inv.status}</span>
              </div>
              <div className="text-xs text-gray-500">
                المستحق: {inv.balance_due?.toFixed?.(2)} {inv.currency}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <div className="md:col-span-2">
        <InvoicePreview invoice={selected} />
      </div>
    </div>
  );
};

export default InvoiceManager;
