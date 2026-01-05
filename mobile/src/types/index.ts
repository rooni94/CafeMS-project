export type UserRole = "customer" | "staff" | "manager" | "supervisor";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: UserRole;
  hr_role?: "none" | "staff" | "supervisor" | "manager";
  phone?: string;
  is_phone_verified?: boolean;
  address?: string;
  avatar?: string | null;
}

export interface RolePermissions {
  role: UserRole;
  can_view_dashboard?: boolean;
  can_manage_orders?: boolean;
  can_manage_products?: boolean;
  can_manage_categories?: boolean;
  can_manage_subcategories?: boolean;
  can_access_cashier?: boolean;
  can_manage_tables?: boolean;
  can_manage_inventory?: boolean;
  can_view_activity_log?: boolean;
  can_manage_support?: boolean;
  can_manage_contact_messages?: boolean;
  can_manage_users?: boolean;
  can_view_user_activity?: boolean;
  can_manage_store_settings?: boolean;
  can_manage_loyalty?: boolean;
  can_view_hr_dashboard?: boolean;
  can_manage_employees?: boolean;
  can_manage_attendance?: boolean;
  can_manage_hr_leaves?: boolean;
  can_manage_hr_payroll?: boolean;
  can_manage_hr_documents?: boolean;
  can_manage_hr_reports?: boolean;
  can_manage_hr_work_reports?: boolean;
  can_view_hr_performance?: boolean;
  can_view_accounting?: boolean;
  can_manage_accounting?: boolean;
  can_manage_financial_reports?: boolean;
  can_manage_payments?: boolean;
  can_manage_suppliers?: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  image?: string | null;
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
  stock?: number;
  available?: boolean;
  image?: string | null;
  category?: Category | number | null;
  addons?: ProductAddon[];
}

export interface OrderSummary {
  id: number;
  total: number;
  status: string;
  created_at: string;
  payment_method?: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

export interface OrderDetails {
  id: number;
  total: number;
  status: OrderStatus;
  status_display?: string;
  created_at: string;
}

export interface Address {
  id: number;
  label: string;
  details: string;
  is_default: boolean;
  created_at?: string;
}

export type DeliveryMode = "pickup" | "delivery";
export type PaymentMethod = "cash" | "card" | "wallet";

export interface StoreSettings {
  store_name?: string;
  tagline?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_button_text?: string;
  about_title?: string;
  about_subtitle?: string;
  about_description?: string;
  about_highlights?: string[];
  hero_image_url?: string;
  about_image_url?: string;
  contact_title?: string;
  contact_subtitle?: string;
  contact_description?: string;
  contact_address?: string;
  contact_phone?: string;
  contact_email?: string;
  support_email?: string;
  contact_hours?: string;
  contact_map_embed?: string;
  contact_whatsapp?: string;
  social_links?: Record<string, string>;
  wallet_pass_base_url?: string;
  hero_cards?: {
    title?: string;
    description?: string;
    image?: string;
    button_text?: string;
    button_link?: string;
  }[];
}

export interface InventoryItem {
  id: number;
  sku: string;
  name_ar?: string;
  quantity_on_hand?: number;
}
