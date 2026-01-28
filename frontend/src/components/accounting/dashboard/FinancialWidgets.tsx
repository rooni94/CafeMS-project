import React from "react";
import { Card } from "../../ui/Card";
import { Link } from "react-router-dom";

const shortcuts = [
  { to: "/accounting/journal", title: "قيد يدوي سريع", subtitle: "أضف قيود اليومية" },
  { to: "/accounting/invoices", title: "فاتورة جديدة", subtitle: "إنشاء/مراجعة الفواتير" },
  { to: "/accounting/expenses", title: "تسجيل مصروف", subtitle: "حفظ إيصال أو مصروف تشغيلي" },
  { to: "/accounting/payments", title: "مطابقة بنك", subtitle: "مراجعة الحركات البنكية" },
];

const FinancialWidgets: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {shortcuts.map((item) => (
        <Card key={item.to} className="border border-amber-100">
          <Link to={item.to} className="block space-y-1">
            <div className="text-sm font-semibold text-amber-700">{item.title}</div>
            <div className="text-xs text-gray-500">{item.subtitle}</div>
          </Link>
        </Card>
      ))}
    </div>
  );
};

export default FinancialWidgets;
