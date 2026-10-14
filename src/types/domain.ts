export type UserRole = 'OWNER' | 'OFFICE' | 'DELIVERY';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  phone?: string;
  is_active: number;
  created_at: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  tagline?: string;
  address?: string;
  phone?: string;
  currency: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface RouteItem {
  id: string;
  name: string;
  description?: string;
  is_active: number;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  route_id?: string;
  route_name?: string;
  notes?: string;
  opening_balance_minor: number; // in paise
  opening_jars: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  current_balance_minor?: number;
  current_jars?: number;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  current_rate_minor: number; // in paise (e.g. ₹40.00 = 4000)
  stock_quantity: number;
  low_stock_threshold: number;
  is_returnable: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = 'COMPLETED' | 'CANCELLED';

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  product_id: string;
  quantity: number;
  unit_rate_snapshot_minor: number;
  total_price_minor: number;
  product_name_snapshot: string;
}

export interface Delivery {
  id: string;
  customer_id: string;
  customer_name?: string;
  route_id?: string;
  route_name?: string;
  delivered_by_user_id: string;
  delivered_by_user_name?: string;
  delivery_date: string; // YYYY-MM-DD
  delivery_time: string; // HH:MM:SS
  status: DeliveryStatus;
  total_amount_minor: number;
  jars_delivered: number;
  jars_collected: number;
  notes?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
  items?: DeliveryItem[];
}

export type StockMovementReason = 'DELIVERY' | 'RESTOCK' | 'DAMAGE' | 'AUDIT_CORRECTION';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  delta: number;
  reason: StockMovementReason;
  reference_id?: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  notes?: string;
}

export type JarMovementType =
  | 'DELIVERY_DELIVERED'
  | 'DELIVERY_COLLECTED'
  | 'DAMAGE'
  | 'LOST'
  | 'WRITE_OFF'
  | 'AUDIT_ADJUSTMENT';

export interface JarMovement {
  id: string;
  customer_id?: string;
  customer_name?: string;
  movement_type: JarMovementType;
  quantity: number;
  reference_id?: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  notes?: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

export interface Payment {
  id: string;
  customer_id: string;
  customer_name?: string;
  amount_minor: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  reference_number?: string;
  recorded_by_user_id: string;
  recorded_by_user_name?: string;
  is_reversed: number;
  created_at: string;
  notes?: string;
}

export interface PaymentReversal {
  id: string;
  payment_id: string;
  amount_minor: number;
  reason: string;
  user_id: string;
  user_name?: string;
  reversed_at: string;
}

export type BillStatus = 'ISSUED' | 'SETTLED' | 'CANCELLED';

export interface BillItem {
  id: string;
  bill_id: string;
  delivery_id?: string;
  item_date: string;
  description: string;
  quantity: number;
  rate_minor: number;
  total_minor: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  customer_id: string;
  customer_name?: string;
  period_start: string;
  period_end: string;
  previous_balance_minor: number;
  period_charges_minor: number;
  period_payments_minor: number;
  closing_balance_minor: number;
  status: BillStatus;
  generated_at: string;
  generated_by_user_id: string;
  generated_by_user_name?: string;
  items?: BillItem[];
}

export type LedgerEntryType =
  | 'OPENING_BALANCE'
  | 'DELIVERY_CHARGE'
  | 'PAYMENT'
  | 'PAYMENT_REVERSAL'
  | 'CREDIT_ADJUSTMENT'
  | 'DEBIT_ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  customer_id: string;
  entry_type: LedgerEntryType;
  amount_minor: number;
  direction: 'DEBIT' | 'CREDIT';
  reference_id?: string;
  timestamp: string;
  description: string;
  user_id?: string;
  user_name?: string;
  running_balance_minor?: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity: string;
  entity_id: string;
  details?: string;
  timestamp: string;
}

export interface DashboardMetrics {
  today_deliveries_count: number;
  today_sales_minor: number;
  today_collections_minor: number;
  pending_deliveries_count: number;
  total_outstanding_minor: number;
  low_stock_products_count: number;
  warehouse_empty_jars: number;
  customer_held_jars: number;
}

export interface MonthlyDeliveryCardDay {
  date: string; // YYYY-MM-DD
  day_number: number;
  product_summary: string;
  quantity_delivered: number;
  jars_delivered: number;
  jars_collected: number;
  daily_total_minor: number;
}

export interface MonthlyDeliveryCard {
  customer: Customer;
  month: number;
  year: number;
  days: MonthlyDeliveryCardDay[];
  total_quantity: number;
  total_jars_delivered: number;
  total_jars_collected: number;
  total_amount_minor: number;
}
