import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";

type TableRecord = {
  id: number;
  label: string;
  number?: number | null;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  notes?: string;
};

type FormState = {
  id: number | null;
  label: string;
  number: string;
  capacity: string;
  status: TableRecord["status"];
  notes: string;
};

const initialForm: FormState = {
  id: null,
  label: "",
  number: "",
  capacity: "2",
  status: "available",
  notes: "",
};

const STATUS_LABELS: Record<TableRecord["status"], string> = {
  available: "متاحة",
  occupied: "مشغولة",
  reserved: "محجوزة",
  maintenance: "صيانة",
};

const TablesManagementPage: React.FC = () => {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("orders/pos/tables/");
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل الطاولات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setError("اسم الطاولة مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      label: form.label,
      number: form.number ? Number(form.number) : null,
      capacity: form.capacity ? Number(form.capacity) : 2,
      status: form.status,
      notes: form.notes,
    };
    try {
      if (form.id) {
        await api.patch(`orders/pos/tables/${form.id}/`, payload);
        setMessage("تم تحديث بيانات الطاولة.");
      } else {
        await api.post("orders/pos/tables/", payload);
        setMessage("تم إضافة طاولة جديدة.");
      }
      setForm(initialForm);
      loadTables();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ بيانات الطاولة.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (table: TableRecord) => {
    setForm({
      id: table.id,
      label: table.label,
      number: table.number ? String(table.number) : "",
      capacity: table.capacity ? String(table.capacity) : "2",
      status: table.status,
      notes: table.notes || "",
    });
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (table: TableRecord) => {
    if (!window.confirm(`حذف الطاولة "${table.label}"؟`)) return;
    try {
      await api.delete(`orders/pos/tables/${table.id}/`);
      setMessage("تم حذف الطاولة.");
      if (form.id === table.id) {
        setForm(initialForm);
      }
      loadTables();
    } catch (err) {
      console.error(err);
      setError("تعذر حذف الطاولة، تحقق من الصلاحيات.");
    }
  };

  const handleStatusChange = async (
    table: TableRecord,
    status: TableRecord["status"]
  ) => {
    try {
      await api.patch(`orders/pos/tables/${table.id}/`, { status });
      setTables((prev) =>
        prev.map((t) => (t.id === table.id ? { ...t, status } : t))
      );
      setMessage("تم تحديث حالة الطاولة.");
    } catch (err) {
      console.error(err);
      setError("تعذر تحديث حالة الطاولة.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">إدارة الطاولات</h2>
          <p className="text-sm text-gray-500">
            أضف طاولات جديدة، حدّث السعة والحالة، وراقب الطاولات المتاحة للمحل.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setMessage(null);
            setError(null);
          }}
          className="text-xs px-4 py-2 rounded-full border border-amber-200 hover:bg-amber-50"
        >
          إضافة طاولة
        </button>
      </div>

      {(message || error) && (
        <div
          className={`text-xs px-3 py-2 rounded-lg border ${
            message
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {message || error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">الطاولات الحالية</h3>
            <span className="text-[11px] text-gray-500">
              {loading ? "جاري التحميل..." : `${tables.length} طاولة`}
            </span>
          </div>
          {loading ? (
            <p className="text-xs text-gray-500">جاري تحميل القائمة...</p>
          ) : tables.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد طاولات مسجلة.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className="border border-amber-100 rounded-2xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{table.label}</p>
                      <p className="text-[11px] text-gray-500">
                        رقم: {table.number ?? "-"} • السعة: {table.capacity} ضيوف
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        table.status === "available"
                          ? "bg-emerald-50 text-emerald-700"
                          : table.status === "occupied"
                          ? "bg-red-50 text-red-600"
                          : table.status === "reserved"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {STATUS_LABELS[table.status]}
                    </span>
                  </div>
                  {table.notes && (
                    <p className="text-[11px] text-gray-500">{table.notes}</p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2 text-[11px]">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          handleStatusChange(table, value as TableRecord["status"])
                        }
                        className={`px-3 py-1 rounded-full border ${
                          table.status === value
                            ? "border-amber-400 text-amber-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleEdit(table)}
                      className="px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-50"
                    >
                      تحرير
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(table)}
                      className="px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold">
            {form.id ? "تحديث الطاولة" : "إضافة طاولة جديدة"}
          </h3>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">اسم الطاولة</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="مثال: طاولة العائلة"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">رقم الطاولة</label>
              <input
                type="number"
                value={form.number}
                onChange={(e) => setForm((prev) => ({ ...prev, number: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">السعة</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, capacity: e.target.value }))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
                min={1}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">الحالة</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, status: e.target.value as TableRecord["status"] }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : form.id ? "تحديث الطاولة" : "إضافة الطاولة"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TablesManagementPage;
