-- ============================================================================
-- NeerOS RLS Policies Migration
-- Version: 002 - Row Level Security
-- ============================================================================
-- Enables RLS on every application table and defines policies that enforce
-- business-level data isolation via business_memberships.
-- Follows Supabase RLS performance & security best practices:
-- - Uses (SELECT auth.uid()) caching
-- - Targets 'TO authenticated' role directly
-- - Pairs UPDATE policies with WITH CHECK clauses
-- - Secures search_path on helper functions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: returns the active business_id for the current auth user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT active_business_id
  FROM public.user_profiles
  WHERE id = (SELECT auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Helper: check if user is a member of a given business
CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_memberships
    WHERE business_id = p_business_id
      AND user_id = (SELECT auth.uid())
      AND is_active = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Helper: get user's role in a given business
CREATE OR REPLACE FUNCTION get_user_role_in_business(p_business_id UUID)
RETURNS user_role AS $$
  SELECT role
  FROM public.business_memberships
  WHERE business_id = p_business_id
    AND user_id = (SELECT auth.uid())
    AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Restrict execution to authenticated users
REVOKE EXECUTE ON FUNCTION get_user_business_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_user_business_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION is_business_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_business_member(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_user_role_in_business(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_user_role_in_business(UUID) TO authenticated;

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jar_movements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reversals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue            ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- user_profiles: users can only see/edit their own profile
-- ============================================================================
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================================
-- business_profiles: visible to members or the owner
-- ============================================================================
CREATE POLICY "Members can view their business"
  ON business_profiles FOR SELECT
  TO authenticated
  USING (is_business_member(id) OR owner_user_id = (SELECT auth.uid()));

CREATE POLICY "Owner can create business"
  ON business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "Owner can update business"
  ON business_profiles FOR UPDATE
  TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- ============================================================================
-- business_memberships: members can see their business's memberships
-- ============================================================================
CREATE POLICY "Members can view business memberships"
  ON business_memberships FOR SELECT
  TO authenticated
  USING (is_business_member(business_id) OR user_id = (SELECT auth.uid()));

CREATE POLICY "Owner can manage memberships"
  ON business_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role_in_business(business_id) = 'OWNER'
    OR (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM business_profiles
        WHERE id = business_id
          AND owner_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "Owner can update memberships"
  ON business_memberships FOR UPDATE
  TO authenticated
  USING (get_user_role_in_business(business_id) = 'OWNER')
  WITH CHECK (get_user_role_in_business(business_id) = 'OWNER');

-- ============================================================================
-- Business-scoped tables: standard pattern
-- Members of the business can SELECT; OWNER/OFFICE can INSERT/UPDATE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ROUTES
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view routes"
  ON routes FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner/Office can manage routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

CREATE POLICY "Owner/Office can update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

-- ---------------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner/Office can manage customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

CREATE POLICY "Owner/Office can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view products"
  ON products FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner can manage products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  );

CREATE POLICY "Owner can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  );

-- ---------------------------------------------------------------------------
-- DELIVERIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Members can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(business_id));

CREATE POLICY "Owner/Office can update deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

-- ---------------------------------------------------------------------------
-- DELIVERY ITEMS (scoped via delivery → business_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view delivery items"
  ON delivery_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_items.delivery_id
        AND is_business_member(d.business_id)
    )
  );

CREATE POLICY "Members can create delivery items"
  ON delivery_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_items.delivery_id
        AND is_business_member(d.business_id)
    )
  );

-- ---------------------------------------------------------------------------
-- STOCK MOVEMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner/Office can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- JAR MOVEMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view jar movements"
  ON jar_movements FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Members can create jar movements"
  ON jar_movements FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Members can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE', 'DELIVERY')
  );

CREATE POLICY "Owner can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  );

-- ---------------------------------------------------------------------------
-- PAYMENT REVERSALS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view payment reversals"
  ON payment_reversals FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner can create payment reversals"
  ON payment_reversals FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) = 'OWNER'
  );

-- ---------------------------------------------------------------------------
-- BILLS
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view bills"
  ON bills FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Owner/Office can create bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

CREATE POLICY "Owner/Office can update bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  )
  WITH CHECK (
    is_business_member(business_id)
    AND get_user_role_in_business(business_id) IN ('OWNER', 'OFFICE')
  );

-- ---------------------------------------------------------------------------
-- BILL ITEMS (scoped via bill → business_id)
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view bill items"
  ON bill_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_items.bill_id
        AND is_business_member(b.business_id)
    )
  );

CREATE POLICY "Owner/Office can create bill items"
  ON bill_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_items.bill_id
        AND is_business_member(b.business_id)
        AND get_user_role_in_business(b.business_id) IN ('OWNER', 'OFFICE')
    )
  );

-- ---------------------------------------------------------------------------
-- LEDGER ENTRIES
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view ledger entries"
  ON ledger_entries FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Members can create ledger entries"
  ON ledger_entries FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- AUDIT LOGS (read-only for members, insert for members)
-- ---------------------------------------------------------------------------
CREATE POLICY "Members can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_business_member(business_id));

CREATE POLICY "Members can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(business_id));

-- ---------------------------------------------------------------------------
-- SYNC QUEUE (scoped per user)
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own sync queue"
  ON sync_queue FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own sync queue"
  ON sync_queue FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own sync queue"
  ON sync_queue FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own sync queue"
  ON sync_queue FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
