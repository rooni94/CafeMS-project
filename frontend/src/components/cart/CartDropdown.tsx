// src/components/cart/CartDropdown.tsx
import React, { useMemo } from "react";
import { useCart } from "../../context/CartContext";
import { Link } from "react-router-dom";

type CartItemLike = {
  id?: number;
  productId?: number;
  name?: string;
  price?: number;
  image?: string;
  quantity?: number;
  product?: {
    id?: number;
    name?: string;
    price?: number;
    image?: string;
  };
};

interface CartDropdownProps {
  onClose?: () => void;
}

export const CartDropdown: React.FC<CartDropdownProps> = ({ onClose }) => {
  const { items } = useCart();

  const normalizedItems = useMemo(() => {
    return (items as CartItemLike[]).map((item, index) => {
      const name = item?.name || item?.product?.name || `منتج #${index + 1}`;
      const price = item?.price ?? item?.product?.price ?? 0;
      const image = item?.image || item?.product?.image;
      const quantity = item?.quantity ?? 1;

      return { name, price, image, quantity };
    });
  }, [items]);

  const total = normalizedItems.reduce(
    (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
    0
  );

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-amber-100 z-50 text-right">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-semibold">سلة المشتريات</span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-2">
        {normalizedItems.length === 0 ? (
          <p className="text-xs text-gray-500">السلة فارغة حالياً.</p>
        ) : (
          normalizedItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-[10px] text-amber-700">
                    لا صورة
                  </div>
                )}
                <div className="text-right">
                  <div className="text-xs font-semibold line-clamp-1">
                    {item.name}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    الكمية: {item.quantity ?? 1}
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-bold text-amber-700">
                {((item.price || 0) * (item.quantity || 1)).toFixed(2)} ر.س
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t px-3 py-2 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">الإجمالي</span>
          <span className="font-bold text-amber-700">
            {total.toFixed(2)} ر.س
          </span>
        </div>
        <div className="flex justify-end">
          <Link
            to="/checkout"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs hover:bg-amber-600"
          >
            الذهاب إلى الدفع
          </Link>
        </div>
      </div>
    </div>
  );
};
