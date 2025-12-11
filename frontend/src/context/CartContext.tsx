// src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  total: number; // alias للمتوافقية مع الكود القديم
  addItem: (
    item: { id: number; name: string; price: number; image?: string },
    quantity?: number
  ) => void;
  addToCart: (
    item: { id: number; name: string; price: number; image?: string },
    quantity?: number
  ) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "cafe_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const raw = JSON.parse(stored) as any[];

      // ✅ تنظيف/تطبيع البيانات القديمة
      return raw
        .map((r) => {
          const id = Number(r.id);
          if (!id) return null;

          const price =
            typeof r.price === "number"
              ? r.price
              : Number(r.price || 0) || 0;

          const quantity =
            typeof r.quantity === "number"
              ? r.quantity
              : Number(r.quantity || 1) || 1;

          return {
            id,
            name: r.name || r.product?.name || `منتج #${id}`,
            price,
            quantity,
            image: r.image || r.product?.image,
          } as CartItem;
        })
        .filter(Boolean) as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (
    item: { id: number; name: string; price: number; image?: string },
    quantity: number = 1
  ) => {
    if (!item || !item.id) return;

    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity,
        },
      ];
    });
  };

  const addToCart = (
    item: { id: number; name: string; price: number; image?: string },
    quantity: number = 1
  ) => {
    addItem(item, quantity);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCart = () => setItems([]);

  const totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice = items.reduce(
    (acc, i) => acc + i.quantity * i.price,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        totalPrice,
        total: totalPrice,
        addItem,
        addToCart,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
};
