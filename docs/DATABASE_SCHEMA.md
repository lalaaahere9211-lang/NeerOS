# NeerOS Database Schema & Invariants
## SQLite Local Persistence Specification

**Database Name:** `neeros.db`  
**Engine:** SQLite via `expo-sqlite` (WAL Mode Enabled)  
**Monetary Representation:** Integer Minor Units (`paise` where ₹1.00 = 100 paise) to eliminate binary floating-point rounding errors.  

---

## 1. Tables & Schema Definitions

```sql
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
  delivery_date TEXT NOT NULL, -- YYYY-MM-DD
  delivery_time TEXT NOT NULL, -- HH:MM:SS
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

-- 7. Delivery Items (Historical Rate Snapshot)
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

-- 8. Stock Movements (Inventory Ledger)
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

-- 9. Jar Movements (Physical Jar Ledger)
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
  payment_date TEXT NOT NULL, -- YYYY-MM-DD
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
```

---

## 2. Calculation Rules & Invariants

1. **Customer Net Balance:**
   `Balance = Opening_Balance + SUM(Debits) - SUM(Credits)`
   Where:
   - Debits: `DELIVERY_CHARGE`, `PAYMENT_REVERSAL`, `DEBIT_ADJUSTMENT`
   - Credits: `PAYMENT`, `CREDIT_ADJUSTMENT`
2. **Customer Held Jars:**
   `Held_Jars = Opening_Jars + SUM(Jars_Delivered) - SUM(Jars_Collected) + SUM(Adjustments)`
3. **Godown Empty Jars:**
   `Warehouse_Empties = Opening_Warehouse_Empties + SUM(Collected_From_All_Customers) - SUM(Filled_From_Plant) - SUM(Damaged_Jars)`
4. **Product Stock Quantity:**
   `Current_Stock = Opening_Stock + SUM(Stock_Movements.delta)`
