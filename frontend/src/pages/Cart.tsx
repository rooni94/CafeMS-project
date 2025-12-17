// src/pages/Cart.tsx
import React, { useMemo } from "react";
import { useCart } from "../context/CartContext";
import { Card } from "../components/ui/Card";
import { Link } from "react-router-dom";
import CurrencyAmount from "../components/common/CurrencyAmount";

// نعرّف نوع مرن، عشان لو شكل العنصر في الـ Context مختلف ما ننكسر
type CartItemLike = {
  id?: number;
  productId?: number;
  name?: string;
  price?: number;
  image?: string;
  quantity?: number;
  addons?: { name?: string }[];
  key?: string;
  product?: {
    id?: number;
    name?: string;
    price?: number;
    image?: string;
  };
};

const Cart: React.FC = () => {
  const { items } = useCart();

  const normalizedItems = useMemo(() => {
    // نحاول نخلي كل عنصر بنفس الشكل قدر الإمكان
    return (items as CartItemLike[]).map((item, index) => {
      const name = item?.name || item?.product?.name || `U.U+O?O? #${index + 1}`;
      const price = item?.price ?? item?.product?.price ?? 0;
      const image = item?.image || item?.product?.image;
      const quantity = item?.quantity ?? 1;
      const addons = Array.isArray(item?.addons) ? item.addons : [];

      return { name, price, image, quantity, addons, key: item?.key };
    });
  }, [items]);

  const total = normalizedItems.reduce(
    (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
    0
  );

  if (!normalizedItems.length) {
    return (
      <div className="max-w-md mx-auto py-6">
        <Card>
          <p className="text-sm text-gray-600 text-right">
            السلة فارغة حالياً.
          </p>
          <div className="mt-3 flex justify-end">
            <Link
              to="/menu"
              className="text-xs px-3 py-2 rounded-full bg-amber-500 text-white hover:bg-amber-600"
            >
              تصفّح القائمة
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 space-y-4">
      <h2 className="text-xl font-semibold text-right mb-2">السلة</h2>
      <Card>
        <div className="space-y-3">
          {normalizedItems.map((item, idx) => (
            <div
              key={item.key || idx}
              className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center gap-2">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-[11px] text-amber-700">
                    لا صورة
                  </div>
                )}
                <div className="text-right">
                  <div className="text-sm font-semibold">{item.name}</div>
                  {item.addons && item.addons.length > 0 && (
                    <div className="text-[11px] text-gray-500 line-clamp-1">
                      + {item.addons.map((addon) => addon.name || "").join("? ")}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500">
                    الكمية: {item.quantity ?? 1} × <CurrencyAmount value={item.price ?? 0} />
                  </div>
                </div>
              </div>
              <div className="text-sm font-bold text-amber-700">
                <CurrencyAmount value={(item.price || 0) * (item.quantity || 1)} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold">الإجمالي</span>
          <span className="text-lg font-bold text-amber-700">
            <CurrencyAmount value={total} />
          </span>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            to="/checkout"
            className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm hover:bg-amber-600"
          >
            الذهاب إلى الدفع
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Cart;
