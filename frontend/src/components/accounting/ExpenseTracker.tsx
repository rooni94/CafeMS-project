import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { ExpenseRecord } from "../../types/accounting";

const ExpenseTracker: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [form, setForm] = useState<Partial<ExpenseRecord>>({
    title: "",
    category: "operational",
    amount: 0,
    tax_rate: 15,
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const load = () => {
    setLoading(true);
    accountingApi
      .listExpenses()
      .then(setExpenses)
      .catch(() => setError("تعذر تحميل المصروفات"))
      .finally(() => setLoading(false));
  };

  const handleOcr = async () => {
    if (!receiptFile) return;
    setError(null);
    setOcrText(null);
    try {
      const res = await accountingApi.receiptOcr(receiptFile);
      setOcrText(res.text);
      if (res.amount) {
        setForm((prev) => ({ ...prev, amount: res.amount }));
      }
    } catch {
      setError("تعذر قراءة الإيصال.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await accountingApi.createExpense(form);
      setForm({
        title: "",
        category: "operational",
        amount: 0,
        tax_rate: 15,
        expense_date: new Date().toISOString().slice(0, 10),
      });
      load();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ المصروف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <h4 className="text-sm font-semibold mb-3">تسجيل مصروف</h4>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs text-gray-500">العنوان</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
        <div>
          <label className="text-xs text-gray-500">الفئة</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as any })}
            >
              <option value="operational">تشغيلي</option>
              <option value="payroll">رواتب</option>
              <option value="utilities">مرافق</option>
              <option value="marketing">تسويق</option>
              <option value="tax">ضرائب</option>
              <option value="other">أخرى</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">المبلغ</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={form.amount || 0}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">نسبة الضريبة %</label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={form.tax_rate || 0}
                onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-500">رفع إيصال (OCR)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="text-xs text-amber-700"
              onClick={handleOcr}
              disabled={!receiptFile}
            >
              استخراج بيانات الإيصال
            </button>
            {ocrText && <div className="text-xs text-green-600">{ocrText}</div>}
          </div>
          {error && <div className="text-red-500 text-xs">{error}</div>}
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ المصروف"}
          </button>
        </form>
      </Card>

      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">المصروفات</h4>
          <button onClick={load} className="text-xs text-amber-700">
            تحديث
          </button>
        </div>
        {loading ? (
          <div>جارٍ التحميل...</div>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">العنوان</th>
                  <th className="py-2">الفئة</th>
                  <th className="py-2">المبلغ</th>
                  <th className="py-2">التاريخ</th>
                  <th className="py-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => (
                  <tr key={ex.id} className="border-t border-gray-100">
                    <td className="py-2">{ex.title}</td>
                    <td className="py-2">{ex.category}</td>
                    <td className="py-2">{ex.total_amount?.toFixed?.(2)}</td>
                    <td className="py-2">{ex.expense_date}</td>
                    <td className="py-2">{ex.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExpenseTracker;
