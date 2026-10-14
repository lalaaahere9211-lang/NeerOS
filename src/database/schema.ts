export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. Business Profile
CREATE TABLE IF NOT EXISTS business_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  address TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  locale TEXT NOT NULL DEFAULT 'hi',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Users & Staff Roles
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('OWNER', 'OFFICE', 'DELIVERY')),
  pin TEXT NOT NULL,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 3. Delivery Routes
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  route_id TEXT REFERENCES routes(id) ON DELETE SET NULL,
  notes TEXT,
  opening_balance_minor INTEGER NOT NULL DEFAULT 0,
  opening_jars INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_route ON customers(route_id);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- 5. Products & Inventory
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Jar',
  current_rate_minor INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  is_returnable INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 6. Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  route_id TEXT REFERENCES routes(id),
  delivered_by_user_id TEXT NOT NULL REFERENCES users(id),
  delivery_date TEXT NOT NULL,
  delivery_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED', 'CANCELLED')),
  total_amount_minor INTEGER NOT NULL DEFAULT 0,
  jars_delivered INTEGER NOT NULL DEFAULT 0,
  jars_collected INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);

-- 7. Delivery Items
CREATE TABLE IF NOT EXISTS delivery_items (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_rate_snapshot_minor INTEGER NOT NULL,
  total_price_minor INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);

-- 8. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN ('DELIVERY', 'RESTOCK', 'DAMAGE', 'AUDIT_CORRECTION')),
  reference_id TEXT,
  user_id TEXT REFERENCES users(id),
  timestamp TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);

-- 9. Jar Movements
CREATE TABLE IF NOT EXISTS jar_movements (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  movement_type TEXT NOT NULL CHECK(movement_type IN ('DELIVERY_DELIVERED', 'DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF', 'AUDIT_ADJUSTMENT')),
  quantity INTEGER NOT NULL,
  reference_id TEXT,
  user_id TEXT REFERENCES users(id),
  timestamp TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_jar_movements_customer ON jar_movements(customer_id);

-- 10. Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
  reference_number TEXT,
  recorded_by_user_id TEXT NOT NULL REFERENCES users(id),
  is_reversed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 11. Payment Reversals
CREATE TABLE IF NOT EXISTS payment_reversals (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount_minor INTEGER NOT NULL,
  reason TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  reversed_at TEXT NOT NULL
);

-- 12. Bills
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  bill_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  previous_balance_minor INTEGER NOT NULL,
  period_charges_minor INTEGER NOT NULL,
  period_payments_minor INTEGER NOT NULL,
  closing_balance_minor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'SETTLED', 'CANCELLED')),
  generated_at TEXT NOT NULL,
  generated_by_user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);

-- 13. Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  delivery_id TEXT REFERENCES deliveries(id),
  item_date TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate_minor INTEGER NOT NULL,
  total_minor INTEGER NOT NULL
);

-- 14. Customer Financial Ledger Entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  entry_type TEXT NOT NULL CHECK(entry_type IN ('OPENING_BALANCE', 'DELIVERY_CHARGE', 'PAYMENT', 'PAYMENT_REVERSAL', 'CREDIT_ADJUSTMENT', 'DEBIT_ADJUSTMENT')),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0),
  direction TEXT NOT NULL CHECK(direction IN ('DEBIT', 'CREDIT')),
  reference_id TEXT,
  timestamp TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id);
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON ledger_entries(timestamp);

-- 15. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL
);
`;

export const SEED_DATA_SQL = `
-- Business Profile (Patil Brothers)
INSERT OR IGNORE INTO business_profiles (id, name, tagline, address, phone, currency, locale, created_at, updated_at)
VALUES (
  'bp_patil_brothers',
  'Patil Brothers (पाटिल ब्रदर्स)',
  'Every Drop. Every Delivery. Every Detail.',
  'Shop No. 4, Market Yard, Pune, Maharashtra 411037',
  '+91 98765 43210',
  'INR',
  'hi',
  datetime('now'),
  datetime('now')
);

-- Default Users
INSERT OR IGNORE INTO users (id, name, role, pin, phone, is_active, created_at)
VALUES 
  ('usr_owner', 'Ganesh Patil (Owner)', 'OWNER', '1234', '+91 98765 43210', 1, datetime('now')),
  ('usr_office', 'Suresh Shinde (Office)', 'OFFICE', '1111', '+91 98220 12345', 1, datetime('now')),
  ('usr_delivery', 'Ramesh Jadhav (Driver)', 'DELIVERY', '0000', '+91 98900 54321', 1, datetime('now'));

-- Default Routes
INSERT OR IGNORE INTO routes (id, name, description, is_active, created_at)
VALUES
  ('rt_kothrud', 'Route A - Kothrud & Karve Nagar', 'Morning route for residential and commercial customers', 1, datetime('now')),
  ('rt_aundh', 'Route B - Aundh & Baner', 'Afternoon route for offices and apartments', 1, datetime('now')),
  ('rt_market', 'Route C - Market Yard & Camp', 'Early morning bulk supply route', 1, datetime('now'));

-- Default Products
INSERT OR IGNORE INTO products (id, name, unit, current_rate_minor, stock_quantity, low_stock_threshold, is_returnable, is_active, created_at, updated_at)
VALUES
  ('prod_20l_jar', '20L RO Water Jar (20 लीटर पानी जार)', 'Jar', 4000, 240, 30, 1, 1, datetime('now'), datetime('now')),
  ('prod_1l_box', '1L Bottled Water Box (12 Bottles)', 'Box', 18000, 45, 10, 0, 1, datetime('now'), datetime('now')),
  ('prod_500ml_box', '500ml Bottled Water Box (24 Bottles)', 'Box', 22000, 32, 10, 0, 1, datetime('now'), datetime('now')),
  ('prod_dispenser', 'Manual Water Dispenser Tap', 'Piece', 25000, 18, 5, 0, 1, datetime('now'), datetime('now'));

-- Initial Sample Customers
INSERT OR IGNORE INTO customers (id, name, phone, address, route_id, notes, opening_balance_minor, opening_jars, is_active, created_at, updated_at)
VALUES
  ('cust_1', 'Sharma Kirana Store (शर्मा किराना स्टोर)', '9822114455', 'Shop 12, Paud Road, Kothrud, Pune', 'rt_kothrud', 'Delivers at 8:00 AM daily', 8000, 4, 1, datetime('now'), datetime('now')),
  ('cust_2', 'Apex Software Technologies (एपेक्स सॉफ्टवेयर)', '9890556677', 'Floor 4, IT Tower, Baner, Pune', 'rt_aundh', 'Requires 5 jars every alternate day', 0, 10, 1, datetime('now'), datetime('now')),
  ('cust_3', 'Pooja Enterprises (पूजा एंटरप्राइजेज)', '9766332211', 'Camp Main Market, Pune', 'rt_market', 'Weekly payment schedule', 16000, 6, 1, datetime('now'), datetime('now'));

-- Customer Opening Balance Ledger Entries
INSERT OR IGNORE INTO ledger_entries (id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description)
VALUES
  ('led_init_1', 'cust_1', 'OPENING_BALANCE', 8000, 'DEBIT', 'cust_1', datetime('now', '-10 days'), 'Initial opening balance receivable'),
  ('led_init_3', 'cust_3', 'OPENING_BALANCE', 16000, 'DEBIT', 'cust_3', datetime('now', '-15 days'), 'Initial opening balance receivable');
`;
