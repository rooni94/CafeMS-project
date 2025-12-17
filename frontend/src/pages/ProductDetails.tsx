import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useCart } from "../context/CartContext";
import { Product, ProductAddon } from "../types";
import CurrencyAmount from "../components/common/CurrencyAmount";

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("معرف المنتج غير صالح.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get(`products/items/${id}/`)
      .then((res) => {
        setProduct(res.data || null);
      })
      .catch((err) => {
        console.error(err);
        setError("تعذر تحميل تفاصيل المنتج.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setSelectedIds([]);
    setQuantity(1);
  }, [product?.id]);

  const addons = product?.addons || [];
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedIds.includes(addon.id)),
    [addons, selectedIds]
  );

  const basePrice = Number(product?.price || 0) || 0;
  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + (Number(addon.price_delta) || 0),
    0
  );
  const unitTotal = basePrice + addonsTotal;
  const total = unitTotal * quantity;

  const toggleAddon = (addon: ProductAddon) => {
    setSelectedIds((prev) =>
      prev.includes(addon.id)
        ? prev.filter((id) => id !== addon.id)
        : [...prev, addon.id]
    );
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: unitTotal,
        image: product.image || undefined,
        addons: selectedAddons,
      },
      quantity
    );
  };

  if (loading) {
    return <div className="p-6 text-center text-sm text-gray-500">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        لم يتم العثور على المنتج.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 text-right">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs px-3 py-2 rounded-full border border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          رجوع
        </button>
        <Link
          to="/menu"
          className="text-xs px-3 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          القائمة
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-amber-100 rounded-2xl overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-72 object-cover"
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-sm text-amber-700 bg-amber-50">
              صورة المنتج
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            {product.category?.name && (
              <p className="text-xs text-gray-500 mt-1">
                الفئة: {product.category.name}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-3">
              {product.description || "لا يوجد وصف لهذا المنتج."}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2 py-1 rounded-full ${
                product.available
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {product.available ? "متاح" : "غير متاح"}
            </span>
            <span className="text-amber-700 font-semibold">
              السعر الأساسي: <CurrencyAmount value={basePrice} />
            </span>
          </div>

          <div className="bg-white border border-amber-100 rounded-2xl p-4 space-y-3">
            {addons.length > 0 ? (
              <>
                <h3 className="text-sm font-semibold">إضافات</h3>
                <div className="space-y-2">
                  {addons.map((addon) => {
                    const checked = selectedIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between gap-3 border rounded-xl px-3 py-2 text-xs cursor-pointer ${
                          checked ? "border-amber-400 bg-amber-50" : "border-gray-200"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAddon(addon)}
                          />
                          {addon.name}
                        </span>
                      <span className="text-amber-700 font-semibold">
                          +<CurrencyAmount value={Number(addon.price_delta || 0)} />
                      </span>
                    </label>
                  );
                })}
              </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">لا توجد إضافات لهذا المنتج.</p>
            )}
          </div>

          <div className="flex items-center justify-between bg-white border border-amber-100 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-gray-200 text-sm"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                -
              </button>
              <span className="text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-gray-200 text-sm"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">الإجمالي</p>
              <p className="text-lg font-bold text-amber-700">
                <CurrencyAmount value={total} />
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.available}
            className="w-full py-3 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
          >
            أضف إلى السلة
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
