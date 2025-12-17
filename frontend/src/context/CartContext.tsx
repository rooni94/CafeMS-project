// src/context/CartContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type CartAddon = {
  id: number;
  name: string;
  price_delta: number;
};

export type CartItem = {
  key: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  addons?: CartAddon[];
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  total: number; // alias للمتوافقية مع الكود القديم
  addItem: (
    item: { id: number; name: string; price: number; image?: string; addons?: CartAddon[] },
    quantity?: number
  ) => void;
  addToCart: (
    item: { id: number; name: string; price: number; image?: string; addons?: CartAddon[] },
    quantity?: number
  ) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "cafe_cart";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const buildCartKey = (id: number, addons?: CartAddon[]) => {
    const addonIds = (addons || [])
      .map((addon) => Number(addon.id))
      .filter((addonId) => Number.isFinite(addonId))
      .sort((a, b) => a - b);
    return `${id}:${addonIds.join(",")}`;
  };

  const normalizeAddons = (value: any): CartAddon[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((addon) => {
        const id = Number(addon?.id);
        if (!Number.isFinite(id)) return null;
        const price =
          typeof addon?.price_delta === "number"
            ? addon.price_delta
            : Number(addon?.price_delta || 0) || 0;
        return {
          id,
          name: addon?.name || "",
          price_delta: price,
        } as CartAddon;
      })
      .filter(Boolean) as CartAddon[];
  };

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const raw = JSON.parse(stored) as any[];

      // ✅ تنظيف/تطبيع البيانات القديمة
      return raw
        .map((r) => {
          const id = Number(r.id || r.productId || r.product?.id);
          if (!id) return null;

          const price =
            typeof r.price === "number"
              ? r.price
              : Number(r.price || 0) || 0;

          const quantity =
            typeof r.quantity === "number"
              ? r.quantity
              : Number(r.quantity || 1) || 1;

          const addons = normalizeAddons(r.addons);
          const key =
            typeof r.key === "string" && r.key
              ? r.key
              : buildCartKey(id, addons);

          return {
            key,
            id,
            name: r.name || r.product?.name || `منتج #${id}`,
            price,
            quantity,
            image: r.image || r.product?.image,
            addons,
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
    item: { id: number; name: string; price: number; image?: string; addons?: CartAddon[] },
    quantity: number = 1
  ) => {
    if (!item || !item.id) return;

    const addons = normalizeAddons(item.addons);
    const key = buildCartKey(item.id, addons);

    setItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) =>
          p.key === key
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [
        ...prev,
        {
          key,
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity,
          addons,
        },
      ];
    });
  };

  const addToCart = (
    item: { id: number; name: string; price: number; image?: string; addons?: CartAddon[] },
    quantity: number = 1
  ) => {
    addItem(item, quantity);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((p) => p.key !== key));
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
