-- SOUQCLOUD Database Migration: Merchant Order Management & Fulfillment RPCs
-- Version: 20260823000008
-- Description: Establishes server-authoritative state machine transitions, atomic cancellation,
--              double-restock protection, and caller store authorization for merchant order fulfillment.

BEGIN;

-- 1. Merchant Order Status Update RPC
CREATE OR REPLACE FUNCTION public.update_merchant_order_status(
  p_store_id UUID,
  p_order_id UUID,
  p_new_status public.order_status,
  p_merchant_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_is_valid_transition BOOLEAN := FALSE;
BEGIN
  -- 1. Authorization: Verify caller is an authenticated staff member of the target store
  IF NOT (p_store_id IN (SELECT public.get_authenticated_store_ids())) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_STORE_ACCESS' USING ERRCODE = '42501';
  END IF;

  -- 2. Row lock the order to prevent concurrent status updates
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Terminal State Immutability Check
  IF v_order.status IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'TERMINAL_STATUS_IMMUTABLE' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Validate State Machine Transition Graph
  -- NEW -> CONTACTED, CANCELLED
  -- CONTACTED -> CONFIRMED, CANCELLED
  -- CONFIRMED -> PREPARING, CANCELLED
  -- PREPARING -> READY, CANCELLED
  -- READY -> DELIVERED
  IF v_order.status = 'NEW' AND p_new_status IN ('CONTACTED', 'CANCELLED') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_order.status = 'CONTACTED' AND p_new_status IN ('CONFIRMED', 'CANCELLED') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_order.status = 'CONFIRMED' AND p_new_status IN ('PREPARING', 'CANCELLED') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_order.status = 'PREPARING' AND p_new_status IN ('READY', 'CANCELLED') THEN
    v_is_valid_transition := TRUE;
  ELSIF v_order.status = 'READY' AND p_new_status = 'DELIVERED' THEN
    v_is_valid_transition := TRUE;
  END IF;

  IF NOT v_is_valid_transition THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: % -> %', v_order.status, p_new_status USING ERRCODE = 'P0003';
  END IF;

  -- 5. Update Order Status
  UPDATE public.orders
  SET status = p_new_status,
      merchant_notes = COALESCE(p_merchant_notes, merchant_notes),
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'store_id', p_store_id,
    'order_number', v_order.order_number,
    'previous_status', v_order.status,
    'status', p_new_status,
    'updated_at', NOW()
  );
END;
$$;

-- 2. Merchant Order Atomic Cancellation & Inventory Restock RPC
CREATE OR REPLACE FUNCTION public.cancel_merchant_order(
  p_store_id UUID,
  p_order_id UUID,
  p_reason TEXT,
  p_restock_inventory BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_line RECORD;
  v_variant RECORD;
  v_restocked_items_count INTEGER := 0;
  v_formatted_notes TEXT;
BEGIN
  -- 1. Authorization: Verify caller is an authenticated staff member of the target store
  IF NOT (p_store_id IN (SELECT public.get_authenticated_store_ids())) THEN
    RAISE EXCEPTION 'UNAUTHORIZED_STORE_ACCESS' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'CANCELLATION_REASON_REQUIRED' USING ERRCODE = '22000';
  END IF;

  -- 2. Row lock the order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND store_id = p_store_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Double-Restock Protection: Cannot cancel an already-cancelled order
  IF v_order.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_CANCELLED' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Terminal State Protection: Cannot cancel a delivered order
  IF v_order.status = 'DELIVERED' THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_DELIVERED_ORDER' USING ERRCODE = 'P0003';
  END IF;

  -- 5. Optional Atomic Inventory Restocking from Immutable Order Line Snapshots
  IF p_restock_inventory THEN
    FOR v_line IN
      SELECT *
      FROM public.order_line_items
      WHERE order_id = p_order_id AND store_id = p_store_id AND variant_id IS NOT NULL
    LOOP
      -- Row lock target variant
      SELECT * INTO v_variant
      FROM public.variants
      WHERE id = v_line.variant_id AND store_id = p_store_id
      FOR UPDATE;

      -- If variant exists, atomically increment inventory
      IF v_variant.id IS NOT NULL THEN
        UPDATE public.variants
        SET inventory_quantity = inventory_quantity + v_line.quantity,
            updated_at = NOW()
        WHERE id = v_variant.id;

        v_restocked_items_count := v_restocked_items_count + 1;
      END IF;
      -- If variant was deleted (FK ON DELETE SET NULL), safely omit without crashing
    END LOOP;
  END IF;

  -- 6. Format updated merchant notes
  IF v_order.merchant_notes IS NULL OR TRIM(v_order.merchant_notes) = '' THEN
    v_formatted_notes := 'سبب الإلغاء: ' || TRIM(p_reason);
  ELSE
    v_formatted_notes := v_order.merchant_notes || E'\nسبب الإلغاء: ' || TRIM(p_reason);
  END IF;

  -- 7. Update Order status to CANCELLED
  UPDATE public.orders
  SET status = 'CANCELLED',
      merchant_notes = v_formatted_notes,
      updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'store_id', p_store_id,
    'order_number', v_order.order_number,
    'status', 'CANCELLED',
    'restocked', p_restock_inventory,
    'restocked_lines_count', v_restocked_items_count,
    'cancellation_reason', TRIM(p_reason),
    'updated_at', NOW()
  );
END;
$$;

-- 3. Grants
GRANT EXECUTE ON FUNCTION public.update_merchant_order_status(UUID, UUID, public.order_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_merchant_order(UUID, UUID, TEXT, BOOLEAN) TO authenticated, service_role;

COMMIT;
