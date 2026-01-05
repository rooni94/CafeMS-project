import React, { useEffect, useState } from "react";
import { Card } from "../../ui/Card";
import { accountingApi } from "../../../services/accounting";
import { InventoryItem, InventoryTransactionInput } from "../../../types/accounting";

const InventoryAdjustment: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState<InventoryTransactionInput>({
    item: 0,
    transaction_type: "adjustment",
    quantity: 0,
    unit_cost: 0,
    note: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    accountingApi.listInventory().then((data) => {
      setItems(data);
      if (data[0]) {
        setForm((prev) => ({ ...prev, item: data[0].id }));
      }
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    await accountingApi.createInventoryTransaction(form);
    setMessage("تم تحديث المخزون");
  };

  return (
    <Card>
      <div className="text-sm font-semibold mb-3">حركة مخزون سريعة</div>
      <form className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end" onSubmit={submit}>
        <div>
          <label className="text-xs text-gray-500">الصنف</label>
          <select
            className="w-full border rounded-lg px-2 py-1"
            value={form.item}
            onChange={(e) => setForm({ ...form, item: Number(e.target.value) })}
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.sku} - {it.name_ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">النوع</label>
          <select
            className="w-full border rounded-lg px-2 py-1"
            value={form.transaction_type}
            onChange={(e) =>
              setForm({ ...form, transaction_type: e.target.value as InventoryTransactionInput["transaction_type"] })
            }
          >
            <option value="in">إضافة</option>
            <option value="out">صرف</option>
            <option value="adjustment">تسوية</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">الكمية</label>
          <input
            type="number"
            className="w-full border rounded-lg px-2 py-1"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">التكلفة للوحدة</label>
          <input
            type="number"
            className="w-full border rounded-lg px-2 py-1"
            value={form.unit_cost || 0}
            onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-4">
          <label className="text-xs text-gray-500">ملاحظة</label>
          <input
            className="w-full border rounded-lg px-2 py-1"
            value={form.note || ""}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
          >
            حفظ الحركة
          </button>
        </div>
        {message && <div className="md:col-span-4 text-green-600 text-xs">{message}</div>}
      </form>
    </Card>
  );
};

export default InventoryAdjustment;
