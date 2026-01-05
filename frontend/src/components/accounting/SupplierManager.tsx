import React, { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { accountingApi } from "../../services/accounting";
import { Supplier } from "../../types/accounting";

const SupplierManager: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<Partial<Supplier>>({
    name_ar: "",
    phone: "",
    email: "",
    payment_terms: "Net 30",
  });

  const load = () => {
    accountingApi.listSuppliers().then(setSuppliers);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await accountingApi.createSupplier(form);
    setForm({ name_ar: "", phone: "", email: "", payment_terms: "Net 30" });
    load();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <h4 className="text-sm font-semibold mb-2">إضافة مورد</h4>
        <form className="space-y-2" onSubmit={submit}>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="اسم المورد"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="رقم التواصل"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="البريد"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="شروط الدفع"
            value={form.payment_terms || ""}
            onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
          >
            حفظ المورد
          </button>
        </form>
      </Card>
      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">الموردون</h4>
          <button className="text-xs text-amber-700" onClick={load}>
            تحديث
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {suppliers.map((s) => (
            <div key={s.id} className="border border-gray-100 rounded-lg px-3 py-2">
              <div className="font-semibold">{s.name_ar}</div>
              <div className="text-gray-500">{s.phone || "-"}</div>
              <div className="text-gray-500">{s.email || "-"}</div>
              <div className="text-gray-500">شروط: {s.payment_terms || "-"}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default SupplierManager;
