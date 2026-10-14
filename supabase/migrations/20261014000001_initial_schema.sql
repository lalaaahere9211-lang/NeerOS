-- ============================================================================
-- NeerOS PostgreSQL Schema Migration
-- Version: 001 - Initial Schema
-- ============================================================================
-- This migration creates the complete NeerOS database schema for Supabase.
-- It mirrors the local SQLite schema with PostgreSQL-native types, UUID keys,
-- proper enums, and multi-tenant business scoping.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom Enum Types
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('OWNER', 'OFFICE', 'DELIVERY');
CREATE TYPE delivery_status AS ENUM ('COMPLETED', 'CANCELLED');
CREATE TYPE stock_movement_reason AS ENUM ('DELIVERY', 'RESTOCK', 'DAMAGE', 'AUDIT_CORRECTION');
CREATE TYPE jar_movement_type AS ENUM ('DELIVERY_DELIVERED', 'DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF', 'AUDIT_ADJUSTMENT');
CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');
CREATE TYPE bill_status AS ENUM ('ISSUED', 'SETTLED', 'CANCELLED');
CREATE TYPE ledger_entry_type AS ENUM ('OPENING_BALANCE', 'DELIVERY_CHARGE', 'PAYMENT', 'PAYMENT_REVERSAL', 'CREDIT_ADJUSTMENT', 'DEBIT_ADJUSTMENT');
CREATE TYPE ledger_direction AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE sync_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE sync_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- ---------------------------------------------------------------------------
-- 2. Utility: auto-update updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. User Profiles (extends Supabase auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL,
  avatar_url TEXT,
  active_business_id UUID,  -- FK added after business_profiles table
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Business Profiles (Tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE business_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  tagline       TEXT,
  address       TEXT,
  phone         TEXT,
  currency      TEXT NOT NULL DEFAULT 'INR',
  locale        TEXT NOT NULL DEFAULT 'hi',
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_business_profiles_owner ON business_profiles(owner_user_id);

-- Now add the FK from user_profiles to business_profiles
ALTER TABLE user_profiles
  ADD CONSTRAINT fk_user_profiles_active_business
  FOREIGN KEY (active_business_id) REFERENCES business_profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_user_profiles_active_biz ON user_profiles(active_business_id);

-- ---------------------------------------------------------------------------
-- 5. Business Memberships (links users to businesses with roles)
-- ---------------------------------------------------------------------------
CREATE TABLE business_memberships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL,
  display_name TEXT NOT NULL,
  phone        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX idx_memberships_business ON business_memberships(business_id);
CREATE INDEX idx_memberships_user    ON business_memberships(user_id);

-- ---------------------------------------------------------------------------
-- 6. Routes
-- ---------------------------------------------------------------------------
CREATE TABLE routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_business ON routes(business_id);

CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 7. Customers
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  phone                 TEXT,
  address               TEXT,
  route_id              UUID REFERENCES routes(id) ON DELETE SET NULL,
  notes                 TEXT,
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  opening_jars          INTEGER NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_route    ON customers(route_id);
CREATE INDEX idx_customers_active   ON customers(business_id, is_active);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 8. Products
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  unit                TEXT NOT NULL DEFAULT 'Jar',
  current_rate_minor  BIGINT NOT NULL,
  stock_quantity      INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  is_returnable       BOOLEAN NOT NULL DEFAULT TRUE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_business ON products(business_id);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 9. Deliveries
-- ---------------------------------------------------------------------------
CREATE TABLE deliveries (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  customer_id              UUID NOT NULL REFERENCES customers(id),
  route_id                 UUID REFERENCES routes(id),
  delivered_by_membership_id UUID NOT NULL REFERENCES business_memberships(id),
  delivery_date            DATE NOT NULL,
  delivery_time            TIME NOT NULL,
  status                   delivery_status NOT NULL DEFAULT 'COMPLETED',
  total_amount_minor       BIGINT NOT NULL DEFAULT 0,
  jars_delivered           INTEGER NOT NULL DEFAULT 0,
  jars_collected           INTEGER NOT NULL DEFAULT 0,
  notes                    TEXT,
  idempotency_key          TEXT UNIQUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_business     ON deliveries(business_id);
CREATE INDEX idx_deliveries_customer     ON deliveries(customer_id);
CREATE INDEX idx_deliveries_date         ON deliveries(business_id, delivery_date);
CREATE INDEX idx_deliveries_delivered_by ON deliveries(delivered_by_membership_id);
CREATE INDEX idx_deliveries_route        ON deliveries(route_id);

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 10. Delivery Items
-- ---------------------------------------------------------------------------
CREATE TABLE delivery_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id              UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id               UUID NOT NULL REFERENCES products(id),
  quantity                 INTEGER NOT NULL CHECK (quantity > 0),
  unit_rate_snapshot_minor BIGINT NOT NULL,
  total_price_minor        BIGINT NOT NULL,
  product_name_snapshot    TEXT NOT NULL
);

CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_product  ON delivery_items(product_id);

-- ---------------------------------------------------------------------------
-- 11. Stock Movements
-- ---------------------------------------------------------------------------
CREATE TABLE stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id),
  delta         INTEGER NOT NULL,
  reason        stock_movement_reason NOT NULL,
  reference_id  UUID,
  membership_id UUID REFERENCES business_memberships(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product    ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_business   ON stock_movements(business_id);
CREATE INDEX idx_stock_movements_membership ON stock_movements(membership_id);

-- ---------------------------------------------------------------------------
-- 12. Jar Movements
-- ---------------------------------------------------------------------------
CREATE TABLE jar_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id),
  movement_type jar_movement_type NOT NULL,
  quantity      INTEGER NOT NULL,
  reference_id  UUID,
  membership_id UUID REFERENCES business_memberships(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jar_movements_customer   ON jar_movements(customer_id);
CREATE INDEX idx_jar_movements_business   ON jar_movements(business_id);
CREATE INDEX idx_jar_movements_membership ON jar_movements(membership_id);

-- ---------------------------------------------------------------------------
-- 13. Payments
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id              UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  customer_id              UUID NOT NULL REFERENCES customers(id),
  amount_minor             BIGINT NOT NULL CHECK (amount_minor > 0),
  payment_date             DATE NOT NULL,
  payment_method           payment_method NOT NULL,
  reference_number         TEXT,
  recorded_by_membership_id UUID NOT NULL REFERENCES business_memberships(id),
  is_reversed              BOOLEAN NOT NULL DEFAULT FALSE,
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_customer    ON payments(customer_id);
CREATE INDEX idx_payments_business    ON payments(business_id);
CREATE INDEX idx_payments_date        ON payments(business_id, payment_date);
CREATE INDEX idx_payments_recorded_by ON payments(recorded_by_membership_id);

-- ---------------------------------------------------------------------------
-- 14. Payment Reversals
-- ---------------------------------------------------------------------------
CREATE TABLE payment_reversals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  payment_id    UUID NOT NULL REFERENCES payments(id),
  amount_minor  BIGINT NOT NULL,
  reason        TEXT NOT NULL,
  membership_id UUID NOT NULL REFERENCES business_memberships(id),
  reversed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_reversals_business   ON payment_reversals(business_id);
CREATE INDEX idx_payment_reversals_payment    ON payment_reversals(payment_id);
CREATE INDEX idx_payment_reversals_membership ON payment_reversals(membership_id);

-- ---------------------------------------------------------------------------
-- 15. Bills
-- ---------------------------------------------------------------------------
CREATE TABLE bills (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id               UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  bill_number               TEXT NOT NULL,
  customer_id               UUID NOT NULL REFERENCES customers(id),
  period_start              DATE NOT NULL,
  period_end                DATE NOT NULL,
  previous_balance_minor    BIGINT NOT NULL,
  period_charges_minor      BIGINT NOT NULL,
  period_payments_minor     BIGINT NOT NULL,
  closing_balance_minor     BIGINT NOT NULL,
  status                    bill_status NOT NULL DEFAULT 'ISSUED',
  generated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by_membership_id UUID NOT NULL REFERENCES business_memberships(id),
  UNIQUE (business_id, bill_number)
);

CREATE INDEX idx_bills_customer     ON bills(customer_id);
CREATE INDEX idx_bills_business     ON bills(business_id);
CREATE INDEX idx_bills_generated_by ON bills(generated_by_membership_id);

-- ---------------------------------------------------------------------------
-- 16. Bill Items
-- ---------------------------------------------------------------------------
CREATE TABLE bill_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id     UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id),
  item_date   DATE NOT NULL,
  description TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  rate_minor  BIGINT NOT NULL,
  total_minor BIGINT NOT NULL
);

CREATE INDEX idx_bill_items_bill     ON bill_items(bill_id);
CREATE INDEX idx_bill_items_delivery ON bill_items(delivery_id);

-- ---------------------------------------------------------------------------
-- 17. Ledger Entries
-- ---------------------------------------------------------------------------
CREATE TABLE ledger_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES customers(id),
  entry_type    ledger_entry_type NOT NULL,
  amount_minor  BIGINT NOT NULL CHECK (amount_minor > 0),
  direction     ledger_direction NOT NULL,
  reference_id  UUID,
  description   TEXT NOT NULL,
  membership_id UUID REFERENCES business_memberships(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_customer   ON ledger_entries(customer_id);
CREATE INDEX idx_ledger_business   ON ledger_entries(business_id);
CREATE INDEX idx_ledger_timestamp  ON ledger_entries(business_id, created_at);
CREATE INDEX idx_ledger_membership ON ledger_entries(membership_id);

-- ---------------------------------------------------------------------------
-- 18. Audit Logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES business_memberships(id),
  action        TEXT NOT NULL,
  entity        TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  details       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_business   ON audit_logs(business_id);
CREATE INDEX idx_audit_membership ON audit_logs(membership_id);

-- ---------------------------------------------------------------------------
-- 19. Sync Queue (local tracking, also stored in cloud for visibility)
-- ---------------------------------------------------------------------------
CREATE TABLE sync_queue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id  TEXT NOT NULL,
  operation  sync_operation NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  status     sync_status NOT NULL DEFAULT 'PENDING',
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_user   ON sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);

CREATE TRIGGER trg_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
