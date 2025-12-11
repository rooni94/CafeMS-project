import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";

type Category = {
  id: number;
  name: string;
};

type SubCategory = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
  category?: Category;
};

type FormState = {
  id: number | null;
  name: string;
  description: string;
  category_id: number | "";
};

const initialForm: FormState = {
  id: null,
  name: "",
  description: "",
  category_id: "",
};

const DashboardSubCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, subRes] = await Promise.all([
        api.get("products/categories/"),
        api.get("products/subcategories/"),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setSubcategories(Array.isArray(subRes.data) ? subRes.data : []);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل الأصناف الفرعية.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category_id) {
      setError("اسم الصنف الفرعي واختيار الصنف الرئيسي مطلوبان.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("category_id", String(form.category_id));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (form.id) {
        await api.patch(`products/subcategories/${form.id}/`, formData);
        setMessage("تم تحديث الصنف الفرعي.");
      } else {
        await api.post("products/subcategories/", formData);
        setMessage("تم إضافة الصنف الفرعي بنجاح.");
      }
      setForm(initialForm);
      setImageFile(null);
      loadData();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ بيانات الصنف الفرعي.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sub: SubCategory) => {
    setForm({
      id: sub.id,
      name: sub.name,
      description: sub.description || "",
      category_id: sub.category?.id || "",
    });
    setImageFile(null);
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (sub: SubCategory) => {
    if (!window.confirm(`حذف الصنف الفرعي "${sub.name}"؟`)) return;
    try {
      await api.delete(`products/subcategories/${sub.id}/`);
      setMessage("تم حذف الصنف الفرعي.");
      if (form.id === sub.id) {
        setForm(initialForm);
        setImageFile(null);
      }
      loadData();
    } catch (err) {
      console.error(err);
      setError("تعذر حذف الصنف الفرعي.");
    }
  };

  const selectedSub = form.id
    ? subcategories.find((sub) => sub.id === form.id)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">إدارة الأصناف الفرعية</h2>
          <p className="text-sm text-gray-500">
            اربط كل صنف فرعي بالتصنيف الرئيسي وأضف صورة لكل مجموعة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setImageFile(null);
            setMessage(null);
            setError(null);
          }}
          className="text-xs px-4 py-2 rounded-full border border-amber-200 hover:bg-amber-50"
        >
          صنف فرعي جديد
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

      <div className="grid lg:grid-cols-[1fr_0.85fr] gap-4">
        <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold">القائمة الحالية</h3>
          {loading ? (
            <p className="text-xs text-gray-500">جاري تحميل البيانات...</p>
          ) : subcategories.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد أصناف فرعية.</p>
          ) : (
            <div className="space-y-2">
              {subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="border border-amber-100 rounded-2xl p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{sub.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {sub.category?.name || "بدون تصنيف"}
                      </p>
                    </div>
                    {sub.image && (
                      <img
                        src={sub.image}
                        alt={sub.name}
                        className="w-16 h-16 rounded-xl object-cover border border-amber-50"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {sub.description || "وصف مختصر للصنف الفرعي."}
                  </p>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleEdit(sub)}
                      className="px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-50"
                    >
                      تحرير
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub)}
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
            {form.id ? "تحديث صنف فرعي" : "إضافة صنف فرعي"}
          </h3>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">الصنف الرئيسي</label>
            <select
              value={form.category_id}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  category_id: e.target.value ? Number(e.target.value) : "",
                }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              <option value="">اختر الصنف الرئيسي</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">الاسم</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="مثال: ساندوتشات الدجاج"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">صورة الصنف الفرعي</label>
            {selectedSub?.image && !imageFile && (
              <img
                src={selectedSub.image}
                alt={selectedSub.name}
                className="h-24 rounded-xl object-cover border border-amber-50 mb-2"
              />
            )}
            {imageFile && (
              <p className="text-[11px] text-amber-700">
                تم اختيار: {imageFile.name}
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : form.id ? "تحديث" : "إضافة"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DashboardSubCategories;
