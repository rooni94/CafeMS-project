// src/types/index.ts
export type UserRole = "customer" | "staff" | "manager";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: "customer" | "staff" | "manager"| "supervisor";
  phone?: string;
  is_phone_verified?: boolean;
  address?: string;
  avatar?: string | null; 
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ProductAddon {
  id: number;
  name: string;
  price_delta: number;
  is_active?: boolean;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  available: boolean;
  image?: string;
  category?: Category;
  addons?: ProductAddon[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderSummary {
  id: number;
  total: number;
  status: string;
  created_at: string;
}
