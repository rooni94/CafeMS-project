import React, { useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { JournalEntryInput, JournalLineInput } from "../../types/accounting";

const emptyLine: JournalLineInput = { account: 0, debit: 0, credit: 0, description: "" };

const JournalEntryForm: React.FC = () => {
  const [entry, setEntry] = useState<JournalEntryInput>({
    date: new Date().toISOString().slice(0, 10),
    reference: "",
    memo: "",
    lines: [{ ...emptyLine }],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLine = (idx: number, patch: Partial<JournalLineInput>) => {
    setEntry((prev) => {
      const lines = [...prev.lines];
      lines[idx] = { ...lines[idx], ...patch };
      return { ...prev, lines };
    });
  };

  const addLine = () => setEntry((prev) => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));

  const removeLine = (idx: number) =>
    setEntry((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await accountingApi.createJournalEntry(entry);
      setMessage("تم تسجيل القيد بنجاح");
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ القيد. تأكد من توازن المدين والدائن.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">المرجع</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2"
              value={entry.reference}
              onChange={(e) => setEntry((prev) => ({ ...prev, reference: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">التاريخ</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={entry.date}
              onChange={(e) => setEntry((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">الوصف</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            value={entry.memo}
            onChange={(e) => setEntry((prev) => ({ ...prev, memo: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">بنود القيد</div>
          {entry.lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-3 border rounded-lg px-2 py-1"
                placeholder="رقم الحساب"
                value={line.account || ""}
                onChange={(e) => updateLine(idx, { account: Number(e.target.value) })}
              />
              <input
                className="col-span-3 border rounded-lg px-2 py-1"
                placeholder="وصف"
                value={line.description || ""}
                onChange={(e) => updateLine(idx, { description: e.target.value })}
              />
              <input
                className="col-span-2 border rounded-lg px-2 py-1"
                placeholder="مدين"
                type="number"
                value={line.debit || ""}
                onChange={(e) => updateLine(idx, { debit: Number(e.target.value), credit: 0 })}
              />
              <input
                className="col-span-2 border rounded-lg px-2 py-1"
                placeholder="دائن"
                type="number"
                value={line.credit || ""}
                onChange={(e) => updateLine(idx, { credit: Number(e.target.value), debit: 0 })}
              />
              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="col-span-2 text-red-500 text-xs"
              >
                حذف
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-amber-700"
            onClick={addLine}
          >
            + سطر جديد
          </button>
        </div>

        {message && <div className="text-green-600 text-sm">{message}</div>}
        {error && <div className="text-red-500 text-sm">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ القيد"}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default JournalEntryForm;
