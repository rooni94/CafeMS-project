import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { BankAccount, PaymentRecord } from "../../types/accounting";

const BankReconciliation: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const formatAmount = (value: any) => Number(value || 0).toFixed(2);

  const load = async () => {
    setLoading(true);
    const [acc, pay] = await Promise.all([
      accountingApi.listBankAccounts(),
      accountingApi.listPayments(),
    ]);
    setAccounts(acc);
    setPayments(pay);
    setSelectedAccount(acc[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((e) => console.error(e));
  }, []);

  const filteredPayments = useMemo(
    () =>
      selectedAccount
        ? payments.filter((p) => (p as any).bank_account === selectedAccount)
        : payments,
    [payments, selectedAccount]
  );

  const totals = useMemo(() => {
    const incoming = filteredPayments
      .filter((p) => p.direction === "incoming" && p.status !== "failed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outgoing = filteredPayments
      .filter((p) => p.direction === "outgoing" && p.status !== "failed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const incomingTotal = Number(incoming || 0);
    const outgoingTotal = Number(outgoing || 0);
    return { incoming: incomingTotal, outgoing: outgoingTotal, net: incomingTotal - outgoingTotal };
  }, [filteredPayments]);

  return (
    <Card>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold">تسوية البنك / الصندوق</div>
          <div className="text-xs text-gray-500">
            تأكد من مطابقة الرصيد بين الدفاتر والحساب البنكي وتتبّع الحركات اليومية.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">الحساب</span>
          <select
            className="border rounded-lg px-2 py-1 text-sm"
            value={selectedAccount ?? ""}
            onChange={(e) => setSelectedAccount(Number(e.target.value) || null)}
          >
            <option value="">الكل</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
          <button className="text-xs text-amber-700" onClick={load}>
            تحديث
          </button>
        </div>
      </div>

      {loading ? (
        <div>جار التحميل...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-xs">
            <Card>
              <div className="text-gray-500">إجمالي الوارد</div>
              <div className="text-lg font-bold">{formatAmount(totals.incoming)}</div>
            </Card>
            <Card>
              <div className="text-gray-500">إجمالي الصادر</div>
              <div className="text-lg font-bold text-red-600">{formatAmount(totals.outgoing)}</div>
            </Card>
            <Card>
              <div className="text-gray-500">الصافي</div>
              <div className="text-lg font-bold">{formatAmount(totals.net)}</div>
            </Card>
          </div>

          <div className="overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">الاتجاه</th>
                  <th className="py-2">المبلغ</th>
                  <th className="py-2">الحالة</th>
                  <th className="py-2">المرجع</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2">{p.paid_at?.slice(0, 10)}</td>
                    <td className="py-2">{p.direction}</td>
                    <td className="py-2">{formatAmount(p.amount)}</td>
                    <td className="py-2">{p.status}</td>
                    <td className="py-2">{p.reference || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
};

export default BankReconciliation;
