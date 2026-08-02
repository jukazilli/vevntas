export type AppRole = "admin" | "cashier" | "stock";

export interface Profile {
  id: string;
  store_id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
}

export interface Product {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  sale_price_usd: number;
  stock_quantity: number;
  minimum_stock: number;
  active: boolean;
  purchase_price_usd?: number | null;
}

export interface ProductInput {
  code: string;
  name: string;
  barcode?: string | null;
  category?: string | null;
  unit?: string;
  sale_price_usd: number;
  purchase_price_usd: number;
  stock_quantity?: number | null;
  minimum_stock?: number;
}

export interface SaleItemInput {
  product_id: string;
  quantity: number;
}

export interface PaymentInput {
  method: "cash" | "mobile_payment" | "transfer" | "card" | "other";
  currency: "USD" | "VES";
  amount: number;
  reference?: string;
}
