-- ============================================================================
-- NeerOS Server-Side Functions Migration
-- Version: 003 - Atomic Business Operations
-- ============================================================================
-- These functions execute atomic multi-table operations on the server,
-- ensuring inventory, jar, ledger, and financial consistency.
-- Follows security best practices:
-- - Specific search_path settings
-- - Principle of least privilege (revoking EXECUTE from anon)
-- - Idempotency and NULL-safe parsing
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Auto-create user profile on auth sign-up
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Revoke direct execution from public roles (trigger only)
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;

-- Ensure utility trigger function also has no public execute
REVOKE EXECUTE ON FUNCTION update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Record Delivery (atomic: delivery + items + stock + jars + ledger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_delivery_atomic(
  p_business_id UUID,
  p_delivery JSONB,
  p_items JSONB,
  p_stock_movements JSONB,
  p_jar_movements JSONB,
  p_ledger_entry JSONB
)
RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
  v_item JSONB;
  v_movement JSONB;
  v_existing UUID;
BEGIN
  -- Verify business membership
  IF NOT is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not a member of business %', p_business_id;
  END IF;

  -- Idempotency check
  IF p_delivery->>'idempotency_key' IS NOT NULL THEN
    SELECT id INTO v_existing
    FROM public.deliveries
    WHERE idempotency_key = p_delivery->>'idempotency_key'
      AND business_id = p_business_id;
    IF v_existing IS NOT NULL THEN
      RETURN v_existing;  -- Already processed
    END IF;
  END IF;

  v_delivery_id := COALESCE(NULLIF(p_delivery->>'id', '')::UUID, gen_random_uuid());

  -- Insert delivery
  INSERT INTO public.deliveries (
    id, business_id, customer_id, route_id, delivered_by_membership_id,
    delivery_date, delivery_time, status, total_amount_minor,
    jars_delivered, jars_collected, notes, idempotency_key
  ) VALUES (
    v_delivery_id,
    p_business_id,
    (p_delivery->>'customer_id')::UUID,
    NULLIF(p_delivery->>'route_id', '')::UUID,
    (p_delivery->>'delivered_by_membership_id')::UUID,
    COALESCE(NULLIF(p_delivery->>'delivery_date', '')::DATE, CURRENT_DATE),
    COALESCE(NULLIF(p_delivery->>'delivery_time', '')::TIME, CURRENT_TIME),
    COALESCE((p_delivery->>'status')::delivery_status, 'COMPLETED'),
    COALESCE((p_delivery->>'total_amount_minor')::BIGINT, 0),
    COALESCE((p_delivery->>'jars_delivered')::INTEGER, 0),
    COALESCE((p_delivery->>'jars_collected')::INTEGER, 0),
    p_delivery->>'notes',
    p_delivery->>'idempotency_key'
  );

  -- Insert delivery items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.delivery_items (
      delivery_id, product_id, quantity,
      unit_rate_snapshot_minor, total_price_minor, product_name_snapshot
    ) VALUES (
      v_delivery_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_rate_snapshot_minor')::BIGINT,
      (v_item->>'total_price_minor')::BIGINT,
      v_item->>'product_name_snapshot'
    );
  END LOOP;

  -- Apply stock movements (deduct inventory)
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_stock_movements) LOOP
    INSERT INTO public.stock_movements (
      business_id, product_id, delta, reason, reference_id, membership_id, notes
    ) VALUES (
      p_business_id,
      (v_movement->>'product_id')::UUID,
      (v_movement->>'delta')::INTEGER,
      (v_movement->>'reason')::stock_movement_reason,
      v_delivery_id,
      (v_movement->>'membership_id')::UUID,
      v_movement->>'notes'
    );

    -- Update product stock
    UPDATE public.products
    SET stock_quantity = stock_quantity + (v_movement->>'delta')::INTEGER
    WHERE id = (v_movement->>'product_id')::UUID
      AND business_id = p_business_id;
  END LOOP;

  -- Record jar movements
  FOR v_movement IN SELECT * FROM jsonb_array_elements(p_jar_movements) LOOP
    INSERT INTO public.jar_movements (
      business_id, customer_id, movement_type, quantity,
      reference_id, membership_id, notes
    ) VALUES (
      p_business_id,
      (v_movement->>'customer_id')::UUID,
      (v_movement->>'movement_type')::jar_movement_type,
      (v_movement->>'quantity')::INTEGER,
      v_delivery_id,
      (v_movement->>'membership_id')::UUID,
      v_movement->>'notes'
    );
  END LOOP;

  -- Post ledger entry (single charging path)
  IF (p_ledger_entry->>'amount_minor')::BIGINT > 0 THEN
    INSERT INTO public.ledger_entries (
      business_id, customer_id, entry_type, amount_minor,
      direction, reference_id, description, membership_id
    ) VALUES (
      p_business_id,
      (p_ledger_entry->>'customer_id')::UUID,
      (p_ledger_entry->>'entry_type')::ledger_entry_type,
      (p_ledger_entry->>'amount_minor')::BIGINT,
      (p_ledger_entry->>'direction')::ledger_direction,
      v_delivery_id,
      p_ledger_entry->>'description',
      (p_ledger_entry->>'membership_id')::UUID
    );
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (
    business_id, membership_id, action, entity, entity_id, details
  ) VALUES (
    p_business_id,
    (p_delivery->>'delivered_by_membership_id')::UUID,
    'RECORD_DELIVERY',
    'DELIVERY',
    v_delivery_id::TEXT,
    format('Delivery amount: %s, Jars: %s/%s',
      p_delivery->>'total_amount_minor',
      p_delivery->>'jars_delivered',
      p_delivery->>'jars_collected')
  );

  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION record_delivery_atomic(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_delivery_atomic(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Record Payment (atomic: payment + ledger credit + audit)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_business_id UUID,
  p_payment JSONB,
  p_ledger_entry JSONB
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
BEGIN
  IF NOT is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not a member of business %', p_business_id;
  END IF;

  IF (p_payment->>'amount_minor')::BIGINT <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  v_payment_id := COALESCE(NULLIF(p_payment->>'id', '')::UUID, gen_random_uuid());

  INSERT INTO public.payments (
    id, business_id, customer_id, amount_minor, payment_date,
    payment_method, reference_number, recorded_by_membership_id, notes
  ) VALUES (
    v_payment_id,
    p_business_id,
    (p_payment->>'customer_id')::UUID,
    (p_payment->>'amount_minor')::BIGINT,
    COALESCE(NULLIF(p_payment->>'payment_date', '')::DATE, CURRENT_DATE),
    (p_payment->>'payment_method')::payment_method,
    p_payment->>'reference_number',
    (p_payment->>'recorded_by_membership_id')::UUID,
    p_payment->>'notes'
  );

  INSERT INTO public.ledger_entries (
    business_id, customer_id, entry_type, amount_minor,
    direction, reference_id, description, membership_id
  ) VALUES (
    p_business_id,
    (p_ledger_entry->>'customer_id')::UUID,
    'PAYMENT',
    (p_ledger_entry->>'amount_minor')::BIGINT,
    'CREDIT',
    v_payment_id,
    p_ledger_entry->>'description',
    (p_ledger_entry->>'membership_id')::UUID
  );

  INSERT INTO public.audit_logs (
    business_id, membership_id, action, entity, entity_id, details
  ) VALUES (
    p_business_id,
    (p_payment->>'recorded_by_membership_id')::UUID,
    'RECORD_PAYMENT',
    'PAYMENT',
    v_payment_id::TEXT,
    format('Payment of %s via %s',
      p_payment->>'amount_minor',
      p_payment->>'payment_method')
  );

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION record_payment_atomic(UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_payment_atomic(UUID, JSONB, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Reverse Payment (atomic: mark reversed + reversal record + ledger debit)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reverse_payment_atomic(
  p_business_id UUID,
  p_payment_id UUID,
  p_reversal JSONB,
  p_ledger_entry JSONB
)
RETURNS UUID AS $$
DECLARE
  v_reversal_id UUID;
  v_payment payments%ROWTYPE;
BEGIN
  IF NOT is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not a member of business %', p_business_id;
  END IF;

  IF get_user_role_in_business(p_business_id) != 'OWNER' THEN
    RAISE EXCEPTION 'Only business owners can reverse payments';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.is_reversed THEN
    RAISE EXCEPTION 'Payment is already reversed';
  END IF;

  v_reversal_id := COALESCE(NULLIF(p_reversal->>'id', '')::UUID, gen_random_uuid());

  UPDATE public.payments SET is_reversed = TRUE WHERE id = p_payment_id;

  INSERT INTO public.payment_reversals (
    id, business_id, payment_id, amount_minor, reason, membership_id
  ) VALUES (
    v_reversal_id,
    p_business_id,
    p_payment_id,
    v_payment.amount_minor,
    p_reversal->>'reason',
    (p_reversal->>'membership_id')::UUID
  );

  INSERT INTO public.ledger_entries (
    business_id, customer_id, entry_type, amount_minor,
    direction, reference_id, description, membership_id
  ) VALUES (
    p_business_id,
    v_payment.customer_id,
    'PAYMENT_REVERSAL',
    v_payment.amount_minor,
    'DEBIT',
    p_payment_id,
    p_ledger_entry->>'description',
    (p_ledger_entry->>'membership_id')::UUID
  );

  INSERT INTO public.audit_logs (
    business_id, membership_id, action, entity, entity_id, details
  ) VALUES (
    p_business_id,
    (p_reversal->>'membership_id')::UUID,
    'REVERSE_PAYMENT',
    'PAYMENT',
    p_payment_id::TEXT,
    format('Reversed payment of %s. Reason: %s',
      v_payment.amount_minor, p_reversal->>'reason')
  );

  RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

REVOKE EXECUTE ON FUNCTION reverse_payment_atomic(UUID, UUID, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reverse_payment_atomic(UUID, UUID, JSONB, JSONB) TO authenticated;
