export type AppRole = "admin" | "cashier" | "stock";
export type ExchangeRateMode = "automatic" | "manual";

export interface Profile {
  id: string;
  store_id: string;
  full_name: string;
  role: AppRole;
  active: boolean;
}

export interface UnitMeasure {
  id: string;
  code: string;
  name: string;
  allows_decimals: boolean;
  active: boolean;
}

export interface Product {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  category: string | null;
  unit: string;
  unit_measure_id?: string | null;
  allows_decimals?: boolean;
  sale_price_usd: number;
  stock_quantity: number;
  minimum_stock: number;
  active: boolean;
  purchase_price_usd?: number | null;
}

export interface InventoryProduct extends Product {
  purchase_price_usd: number;
  last_purchase_at: string | null;
}

export interface ProductInput {
  code?: string;
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

export interface PurchaseItemInput {
  product_id: string;
  quantity: number;
  unit_cost_usd: number;
}

export interface PaymentInput {
  method: "cash" | "mobile_payment" | "transfer" | "card" | "other";
  currency: "USD" | "VES";
  amount: number;
  reference?: string;
}

export interface ExchangeRate {
  rate: number | null;
  source: string;
  reference_at: string | null;
  fetched_at: string | null;
  is_manual: boolean;
  mode?: ExchangeRateMode;
}

export interface StoreSettings {
  exchange_rate_mode: ExchangeRateMode;
  exchange_rate_source: string;
  allow_negative_stock: boolean;
  resend_configured: boolean;
}
