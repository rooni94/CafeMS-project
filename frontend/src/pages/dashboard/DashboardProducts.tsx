// src/pages/dashboard/DashboardProducts.tsx
import React, { useEffect, useState } from "react";
import { api } from "../../services/api";
import CurrencyAmount from "../../components/common/CurrencyAmount";

type DashboardProduct = {
  id: number;
  name: string;
  price: number;
  stock: number;
  available: boolean;
  description?: string;
  image?: string;
  category?: {
    id: number;
    name: string;
  };
};

type ProductAddonRow = {
  id: number;
  name: string;
  price_delta: number;
  is_active?: boolean;
  sort_order?: number;
};

type Category = {
  id: number;
  name: string;
};

const DashboardProducts: React.FC = () => {
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [available, setAvailable] = useState(true);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addons, setAddons] = useState<ProductAddonRow[]>([]);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState<number>(0);
  const [addonEditingId, setAddonEditingId] = useState<number | null>(null);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsSaving, setAddonsSaving] = useState(false);

  // إدارة الفئات (إضافة تصنيف جديد)
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // تحديد الأطباق
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | "">("");
  const [bulkPriceMode, setBulkPriceMode] = useState<
    "none" | "set" | "increase" | "decrease"
  >("none");
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);

  const resetForm = () => {
    setFormMode("create");
    setEditingId(null);
    setName("");
    setPrice(0);
    setStock(0);
    setAvailable(true);
    setCategoryId("");
    setDescription("");
    setImageFile(null);
    setAddons([]);
    setAddonName("");
    setAddonPrice(0);
    setAddonEditingId(null);
  };

  const fetchData = () => {
    setLoading(true);
    setErr(null);
    Promise.all([api.get("products/items/"), api.get("products/categories/")])
      .then(([productsRes, categoriesRes]: [any, any]) => {
        setProducts(productsRes.data);
        setCategories(categoriesRes.data);
        setSelectedProductIds([]); // تصفير التحديد عند إعادة التحميل
      })
      .catch((error: any) => {
        console.error(error);
        setErr("تعذر تحميل الأطباق أو الفئات.");
      })
      .finally(() => setLoading(false));
  };

  const resetAddonForm = () => {
    setAddonName("");
    setAddonPrice(0);
    setAddonEditingId(null);
  };

  const loadAddons = async (productId: number) => {
    setAddonsLoading(true);
    try {
      let res;
      try {
        res = await api.get(`products/items/${productId}/addons/`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await api.get(`products/addons/?product=${productId}`);
        } else {
          throw err;
        }
      }
      const data = res.data?.results || res.data || [];
      setAddons(data);
    } catch (error: any) {
      console.error(error);
      setAddons([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const handleSaveAddon = async () => {
    if (!editingId) return;
    if (!addonName.trim()) {
      alert("الرجاء إدخال اسم الإضافة.");
      return;
    }
    setAddonsSaving(true);
    try {
      const payload = { name: addonName.trim(), price_delta: addonPrice };
      if (addonEditingId) {
        try {
          await api.patch(`products/items/${editingId}/addons/${addonEditingId}/`, payload);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            await api.patch(`products/addons/${addonEditingId}/`, payload);
          } else {
            throw err;
          }
        }
      } else {
        try {
          await api.post(`products/items/${editingId}/addons/`, payload);
        } catch (err: any) {
          if (err?.response?.status === 404) {
            await api.post("products/addons/", { product_id: editingId, ...payload });
          } else {
            throw err;
          }
        }
      }
      await loadAddons(editingId);
      resetAddonForm();
    } catch (error: any) {
      console.error(error);
      alert("تعذر حفظ الإضافة.");
    } finally {
      setAddonsSaving(false);
    }
  };

  const handleEditAddon = (addon: ProductAddonRow) => {
    setAddonEditingId(addon.id);
    setAddonName(addon.name);
    setAddonPrice(Number(addon.price_delta) || 0);
  };

  const handleDeleteAddon = async (addonId: number) => {
    if (!editingId) return;
    const ok = window.confirm("هل أنت متأكد من حذف هذه الإضافة؟");
    if (!ok) return;
    try {
      try {
        await api.delete(`products/items/${editingId}/addons/${addonId}/`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          await api.delete(`products/addons/${addonId}/`);
        } else {
          throw err;
        }
      }
      await loadAddons(editingId);
    } catch (error: any) {
      console.error(error);
      alert("تعذر حذف الإضافة.");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (p: DashboardProduct) => {
    setFormMode("edit");
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price);
    setStock(p.stock);
    setAvailable(p.available);
    setCategoryId(p.category?.id ?? "");
    setDescription(p.description ?? "");
    setImageFile(null);
    resetAddonForm();
    loadAddons(p.id);
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm("هل أنت متأكد من حذف هذا المنتج؟");
    if (!ok) return;

    try {
      await api.delete(`products/items/${id}/`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر حذف المنتج.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("الرجاء إدخال اسم المنتج.");
      return;
    }
    if (!price || price <= 0) {
      alert("الرجاء إدخال سعر صحيح.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price.toString());
    formData.append("stock", stock.toString());
    formData.append("available", available ? "true" : "false");
    if (categoryId) formData.append("category_id", categoryId.toString());
    if (description) formData.append("description", description);
    if (imageFile) formData.append("image", imageFile);

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await api.post("products/items/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (formMode === "edit" && editingId) {
        await api.patch(`products/items/${editingId}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر حفظ بيانات المنتج.");
    } finally {
      setSubmitting(false);
    }
  };

  // إضافة فئة جديدة
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setCreatingCategory(true);
    try {
      await api.post("products/categories/", { name });
      setNewCategoryName("");
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر إنشاء الفئة الجديدة.");
    } finally {
      setCreatingCategory(false);
    }
  };

  // منطق التحديد / تحديد الكل للأطباق
  const allProductsSelected =
    products.length > 0 && selectedProductIds.length === products.length;

  const toggleSelectAllProducts = () => {
    if (allProductsSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const toggleSelectOneProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // عمليات جماعية على الأطباق
  const handleBulkDeleteProducts = async () => {
    if (!selectedProductIds.length) return;
    const ok = window.confirm(
      `سيتم حذف ${selectedProductIds.length} طبق/أطباق، هل أنت متأكد؟`
    );
    if (!ok) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedProductIds.map((id) => api.delete(`products/items/${id}/`))
      );
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر تنفيذ الحذف الجماعي للأطباق.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkChangeCategory = async () => {
    if (!selectedProductIds.length || !bulkCategoryId) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedProductIds.map((id) =>
          api.patch(`products/items/${id}/`, {
            category_id: bulkCategoryId,
          })
        )
      );
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر تحديث تصنيف الأطباق المحددة.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUpdatePrices = async () => {
    if (!selectedProductIds.length || bulkPriceMode === "none") return;
    if (!bulkPriceValue && bulkPriceMode !== "set") {
      alert("الرجاء إدخال قيمة لتعديل السعر.");
      return;
    }

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedProductIds.map((id) => {
          const product = products.find((p) => p.id === id);
          if (!product) return Promise.resolve();

          let newPrice = product.price;

          if (bulkPriceMode === "set") {
            newPrice = bulkPriceValue;
          } else if (bulkPriceMode === "increase") {
            newPrice = product.price * (1 + bulkPriceValue / 100);
          } else if (bulkPriceMode === "decrease") {
            newPrice = product.price * (1 - bulkPriceValue / 100);
          }

          return api.patch(`products/items/${id}/`, {
            price: newPrice,
          });
        })
      );
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("تعذر تعديل أسعار الأطباق المحددة.");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) return <div>جاري تحميل الأطباق...</div>;
  if (err) return <div className="text-sm text-red-500">{err}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">إدارة الأطباق</h2>

      {/* إدارة الفئات: إضافة تصنيف جديد */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3 text-sm">
        <h3 className="font-semibold text-sm mb-1">إدارة الفئات</h3>
        <form
          onSubmit={handleCreateCategory}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
            placeholder="اسم الفئة الجديدة (مثال: عصائر، قهوة...)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <button
            type="submit"
            disabled={creatingCategory || !newCategoryName.trim()}
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
          >
            {creatingCategory ? "جاري الإضافة..." : "إضافة فئة"}
          </button>
        </form>
        {categories.length > 0 && (
          <p className="text-[11px] text-gray-500">
            عدد الفئات الحالية: {categories.length}
          </p>
        )}
      </div>

      {/* نموذج إضافة/تعديل منتج */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h3 className="font-semibold text-sm mb-1">
          {formMode === "create"
            ? "إضافة منتج جديد"
            : `تعديل المنتج #${editingId}`}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        >
          <div>
            <label className="block mb-1">اسم المنتج</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1">السعر (ريال)</label>
            <input
              type="number"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block mb-1">المخزون</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block mb-1">الفئة</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">بدون فئة</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block mb-1">الوصف</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1">الصورة</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImageFile(e.target.files ? e.target.files[0] : null)
              }
            />
            {formMode === "edit" && !imageFile && (
              <p className="text-xs text-gray-500 mt-1">
                اترك الحقل فارغاً للإبقاء على الصورة الحالية.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">متاح للبيع؟</label>
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
          </div>
          {formMode === "edit" && editingId && (
            <div className="col-span-1 md:col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">إضافات المنتج</h4>
                {addonsLoading && (
                  <span className="text-[11px] text-gray-500">
                    جاري تحميل إضافات...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
                  placeholder="اسم الإضافة"
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className="border rounded-lg px-3 py-2 text-sm w-28"
                  placeholder="السعر"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(Number(e.target.value) || 0)}
                />
                <button
                  type="button"
                  onClick={handleSaveAddon}
                  disabled={addonsSaving}
                  className="px-3 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
                >
                  {addonEditingId ? "تحديث" : "إضافة"}
                </button>
                {addonEditingId && (
                  <button
                    type="button"
                    onClick={resetAddonForm}
                    className="px-3 py-2 rounded-full border text-xs"
                  >
                    إلغاء
                  </button>
                )}
              </div>
              {addons.length === 0 ? (
                <p className="text-[11px] text-gray-500">لا توجد إضافات بعد.</p>
              ) : (
                <div className="space-y-2">
                  {addons.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between bg-white rounded-lg border border-amber-100 px-3 py-2 text-xs"
                    >
                      <div className="text-right">
                        <div className="font-semibold">{addon.name}</div>
                        <div className="text-amber-700">
                          +<CurrencyAmount value={Number(addon.price_delta || 0)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditAddon(addon)}
                          className="px-2 py-1 rounded-full border border-amber-400 text-amber-700"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddon(addon.id)}
                          className="px-2 py-1 rounded-full border border-red-400 text-red-600"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="col-span-1 md:col-span-2 flex gap-2 justify-end mt-2">
            {formMode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-2 rounded-full border text-xs"
              >
                إلغاء التعديل
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600 disabled:opacity-60"
            >
              {submitting
                ? "جاري الحفظ..."
                : formMode === "create"
                ? "إضافة المنتج"
                : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>

      {/* شريط العمليات الجماعية للأطباق المحددة */}
      {selectedProductIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex flex-wrap items-center gap-3">
          <span className="font-semibold">
            تم تحديد {selectedProductIds.length} طبق/أطباق
          </span>

          {/* تغيير التصنيف جماعياً */}
          <div className="flex items-center gap-1">
            <span>تعيين الفئة إلى:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkCategoryId}
              onChange={(e) =>
                setBulkCategoryId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">اختر فئة</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkChangeCategory}
              disabled={bulkLoading || !bulkCategoryId}
              className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              تطبيق
            </button>
          </div>

          {/* تعديل الأسعار جماعياً */}
          <div className="flex items-center gap-1">
            <span>تعديل السعر:</span>
            <select
              className="border rounded px-2 py-1"
              value={bulkPriceMode}
              onChange={(e) =>
                setBulkPriceMode(
                  e.target.value as "none" | "set" | "increase" | "decrease"
                )
              }
            >
              <option value="none">بدون</option>
              <option value="set">تثبيت السعر =</option>
              <option value="increase">زيادة %</option>
              <option value="decrease">تخفيض %</option>
            </select>
            {bulkPriceMode !== "none" && (
              <input
                type="number"
                className="border rounded px-2 py-1 w-20"
                value={bulkPriceValue}
                onChange={(e) =>
                  setBulkPriceValue(Number(e.target.value) || 0)
                }
              />
            )}
            <button
              onClick={handleBulkUpdatePrices}
              disabled={
                bulkLoading ||
                bulkPriceMode === "none" ||
                (bulkPriceMode !== "set" && !bulkPriceValue)
              }
              className="px-3 py-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              تطبيق
            </button>
          </div>

          {/* حذف جماعي */}
          <button
            onClick={handleBulkDeleteProducts}
            disabled={bulkLoading}
            className="px-3 py-1 rounded-full border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-60 ml-auto"
          >
            حذف الأطباق المحددة
          </button>
        </div>
      )}

      {/* جدول الأطباق */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="px-3 py-2 text-right">
                <input
                  type="checkbox"
                  checked={allProductsSelected}
                  onChange={toggleSelectAllProducts}
                />
              </th>
              <th className="px-3 py-2 text-right">#</th>
              <th className="px-3 py-2 text-right">الصورة</th>
              <th className="px-3 py-2 text-right">المنتج</th>
              <th className="px-3 py-2 text-right">الفئة</th>
              <th className="px-3 py-2 text-right">السعر</th>
              <th className="px-3 py-2 text-right">المخزون</th>
              <th className="px-3 py-2 text-right">متاح؟</th>
              <th className="px-3 py-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={() => toggleSelectOneProduct(p.id)}
                  />
                </td>
                <td className="px-3 py-2">#{p.id}</td>
                <td className="px-3 py-2">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">لا يوجد</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-xs">
                  {p.category?.name ?? "-"}
                </td>
                <td className="px-3 py-2">{p.price} ريال</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2">{p.available ? "نعم" : "لا"}</td>
                <td className="px-3 py-2 space-x-2 space-x-reverse">
                  <button
                    onClick={() => handleEditClick(p)}
                    className="px-2 py-1 text-xs rounded-full border border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-2 py-1 text-xs rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardProducts;
