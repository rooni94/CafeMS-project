import React, { useEffect, useMemo, useState } from "react";

import CurrencyAmount from "../common/CurrencyAmount";

export type ProductAddon = {
  id: number;
  name: string;
  price_delta: number;
};

type ProductLike = {
  id: number;
  name: string;
  price: number | string;
  addons?: ProductAddon[];
};

type ProductAddonModalProps = {
  product: ProductLike | null;
  onClose: () => void;
  onConfirm: (addons: ProductAddon[]) => void;
};

const ProductAddonModal: React.FC<ProductAddonModalProps> = ({
  product,
  onClose,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds([]);
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
  const total = basePrice + addonsTotal;

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="button"
        tabIndex={-1}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-amber-100 w-[92%] max-w-md p-4 text-right">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            إغلاق
          </button>
        </div>

        {addons.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-xl p-2">
            {addons.map((addon) => {
              const isSelected = selectedIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`flex items-center justify-between gap-3 px-2 py-2 rounded-lg border text-sm cursor-pointer ${
                    isSelected
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(addon.id)
                            ? prev.filter((id) => id !== addon.id)
                            : [...prev, addon.id]
                        )
                      }
                    />
                    <span>{addon.name}</span>
                  </div>
                  <span className="text-amber-700 font-semibold">
                    +<CurrencyAmount value={Number(addon.price_delta || 0)} />
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            لا توجد إضافات لهذا المنتج.
          </p>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>السعر الأساسي</span>
            <CurrencyAmount value={basePrice} />
          </div>
          <div className="flex items-center justify-between">
            <span>إجمالي إضافات</span>
            <CurrencyAmount value={addonsTotal} />
          </div>
          <div className="flex items-center justify-between font-semibold text-amber-700">
            <span>الإجمالي</span>
            <CurrencyAmount value={total} />
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-full border text-xs"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedAddons)}
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            أضف إلى السلة
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductAddonModal;
