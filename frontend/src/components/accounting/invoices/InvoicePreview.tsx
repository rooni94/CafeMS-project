import React from "react";
import { Card } from "../../ui/Card";
import { AccountingInvoice } from "../../../types/accounting";

type Props = {
  invoice: AccountingInvoice | null;
};

const InvoicePreview: React.FC<Props> = ({ invoice }) => {
  if (!invoice) {
    return <Card>اختر فاتورة لعرض تفاصيلها.</Card>;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold">فاتورة #{invoice.invoice}</div>
          <div className="text-xs text-gray-500">
            الحالة: {invoice.status} | إصدار: {invoice.issue_date}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">
            {invoice.total_amount?.toFixed?.(2)} {invoice.currency}
          </div>
          <div className="text-xs text-gray-500">
            متبقي: {invoice.balance_due?.toFixed?.(2)} {invoice.currency}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        تاريخ الاستحقاق: {invoice.due_date || "غير محدد"}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        مدفوع: {invoice.paid_amount?.toFixed?.(2)} | ضريبة: {invoice.tax_amount?.toFixed?.(2)} | خصم:{" "}
        {invoice.discount_amount?.toFixed?.(2)}
      </div>
    </Card>
  );
};

export default InvoicePreview;
