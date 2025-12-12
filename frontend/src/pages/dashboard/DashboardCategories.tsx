import React, { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";

type Category = {
  id: number;
  name: string;
  description?: string;
  image?: string | null;
};

type FormState = {
  id: number | null;
  name: string;
  description: string;
};

const initialForm: FormState = {
  id: null,
  name: "",
  description: "",
};

const DashboardCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("products/categories/");
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("تعذر تحميل الأصناف، تأكد من الخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("اسم الصنف مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (form.id) {
        await api.patch(`products/categories/${form.id}/`, formData);
        setMessage("تم تحديث الصنف بنجاح.");
      } else {
        await api.post("products/categories/", formData);
        setMessage("تم إضافة الصنف بنجاح.");
      }
      setForm(initialForm);
      setImageFile(null);
      loadCategories();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ بيانات الصنف.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setForm({
      id: cat.id,
      name: cat.name,
      description: cat.description || "",
    });
    setImageFile(null);
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`حذف الصنف "${cat.name}"؟`)) return;
    try {
      await api.delete(`products/categories/${cat.id}/`);
      setMessage("تم حذف الصنف.");
      if (form.id === cat.id) {
        setForm(initialForm);
        setImageFile(null);
      }
      loadCategories();
    } catch (err) {
      console.error(err);
      setError("تعذر حذف الصنف، قد يكون مرتبطاً بأطباق.");
    }
  };

  const selectedCategory = form.id
    ? categories.find((cat) => cat.id === form.id)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">إدارة الأصناف الرئيسية</h2>
          <p className="text-sm text-gray-500">
            أنشئ صنفاً جديداً، حدّث الاسم والوصف، وأضف صورة للقائمة بسهولة.
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
          بدء إضافة جديدة
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

      <div className="grid lg:grid-cols-[1fr_0.8fr] gap-4">
        <div className="bg-white rounded-3xl shadow border border-amber-100 p-4 space-y-3">
          <h3 className="text-sm font-semibold">الأصناف الحالية</h3>
          {loading ? (
            <p className="text-xs text-gray-500">جاري تحميل البيانات...</p>
          ) : categories.length === 0 ? (
            <p className="text-xs text-gray-500">لا توجد أصناف حالياً.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="border border-amber-100 rounded-2xl p-3 flex flex-col gap-2 bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="text-[11px] text-gray-500 line-clamp-2">
                        {cat.description || "وصف مختصر للصنف."}
                      </p>
                    </div>
                    {cat.image && (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-16 h-16 rounded-xl object-cover border border-amber-50"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleEdit(cat)}
                      className="px-3 py-1 rounded-full border border-amber-200 hover:bg-amber-50"
                    >
                      تحرير
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
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
            {form.id ? "تحديث بيانات الصنف" : "إضافة صنف جديد"}
          </h3>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">اسم الصنف</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="مثال: الساندوتشات"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">وصف مختصر</label>
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
            <label className="text-xs text-gray-500">صورة الصنف (اختياري)</label>
            {selectedCategory?.image && !imageFile && (
              <img
                src={selectedCategory.image}
                alt={selectedCategory.name}
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
            {saving ? "جاري الحفظ..." : form.id ? "تحديث الصنف" : "إضافة الصنف"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DashboardCategories;
