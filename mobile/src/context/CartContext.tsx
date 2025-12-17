import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CartItem = {
  key: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  addons?: CartAddon[];
};

export type CartAddon = {
  id: number;
  name: string;
  price_delta: number;
};

export type CartItemInput = Omit<CartItem, "key"> & { key?: string };

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addItem: (item: CartItemInput, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const CART_KEY = "@cafe_mobile_cart";
const MAX_QTY = 99;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems(
              parsed
                .map((item: any): CartItem | null => {
                  const id = Number(item.id || item.productId || item.product?.id);
                  if (!id) return null;
                  const addons = normalizeAddons(item.addons);
                  const key =
                    typeof item.key === "string" && item.key
                      ? item.key
                      : buildCartKey(id, addons);
                  return {
                    key,
                    id,
                    name: String(item.name || item.product?.name || "U.U+O?O?"),
                    price: Number(item.price) || 0,
                    quantity: Math.max(1, Math.min(MAX_QTY, Number(item.quantity) || 1)),
                    image: item.image || item.product?.image || null,
                    addons,
                  };
                })
                .filter((item): item is CartItem => item !== null)
            );
          }
        }
      } catch (error) {
        console.warn("cart hydration error", error);
      } finally {
        setHydrated(true);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify(items)).catch((error) => console.warn("cart persist error", error));
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItemInput, quantity: number = 1) => {
    if (!item || !item.id) return;
    const addons = normalizeAddons(item.addons);
    const key = item.key || buildCartKey(item.id, addons);

    setItems((prev) => {
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) =>
          p.key === key
            ? { ...p, quantity: Math.max(1, Math.min(MAX_QTY, p.quantity + quantity)) }
            : p
        );
      }
      return [
        ...prev,
        {
          ...item,
          key,
          addons,
          quantity: Math.max(1, Math.min(MAX_QTY, quantity)),
        },
      ];
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(key);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      totalQuantity,
      totalPrice,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, totalQuantity, totalPrice, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
