-- SOUQCLOUD Database Migration: Customers, Carts, Orders, and Order Submission RPC
-- Version: 20260823000007
-- Description: Establishes commerce transaction tables (customers, carts, cart_lines, orders, order_line_items),
--              composite foreign key tenant constraints, RLS security policies, and SECURITY DEFINER RPCs.

BEGIN;

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.cart_status AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'NEW',
    'CONTACTED',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Customers Table (Store-Scoped)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NULL,
  email VARCHAR(255) NULL,
  default_shipping_address JSONB NULL,
  orders_count INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  total_spent_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customers_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_customer_phone UNIQUE (store_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(store_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(store_id, email) WHERE (email IS NOT NULL);

-- 3. Create Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL,
  status public.cart_status NOT NULL DEFAULT 'ACTIVE',
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT uq_carts_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_carts_session UNIQUE (store_id, session_token)
);

CREATE INDEX IF NOT EXISTS idx_carts_store_session ON public.carts(store_id, session_token);
CREATE INDEX IF NOT EXISTS idx_carts_status ON public.carts(store_id, status);

-- 4. Create Cart Lines Table
CREATE TABLE IF NOT EXISTS public.cart_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cart_lines_id_store UNIQUE (id, store_id),
  CONSTRAINT fk_cart_lines_cart FOREIGN KEY (cart_id, store_id) REFERENCES public.carts(id, store_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_lines_product FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_lines_variant FOREIGN KEY (variant_id, store_id) REFERENCES public.variants(id, store_id) ON DELETE CASCADE,
  CONSTRAINT uq_cart_variant UNIQUE (cart_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_lines_cart ON public.cart_lines(cart_id, store_id);
CREATE INDEX IF NOT EXISTS idx_cart_lines_variant ON public.cart_lines(variant_id, store_id);

-- 5. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  confirmation_token VARCHAR(64) NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  customer_id UUID NULL,
  status public.order_status NOT NULL DEFAULT 'NEW',
  order_mode_used public.store_order_mode NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255) NULL,
  shipping_address JSONB NULL,
  customer_notes TEXT NULL,
  merchant_notes TEXT NULL,
  whatsapp_redirect_url TEXT NULL,
  currency VARCHAR(3) NOT NULL,
  subtotal_cents BIGINT NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_orders_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_order_number UNIQUE (store_id, order_number),
  CONSTRAINT uq_orders_confirmation_token UNIQUE (confirmation_token),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id, store_id) REFERENCES public.customers(id, store_id) ON DELETE SET NULL,
  CONSTRAINT chk_order_total_invariant CHECK (
    total_cents = subtotal_cents + shipping_cents + tax_cents - discount_cents OR
    total_cents = subtotal_cents + shipping_cents - discount_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(store_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_token ON public.orders(confirmation_token);

-- 6. Create Order Line Items Table (Immutable Snapshot)
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID NULL,
  variant_id UUID NULL,
  title VARCHAR(255) NOT NULL,
  variant_title VARCHAR(255) NOT NULL,
  sku VARCHAR(100) NULL,
  unit_price_cents BIGINT NOT NULL CHECK (unit_price_cents >= 0),
  tax_cents BIGINT NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price_cents BIGINT NOT NULL CHECK (total_price_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_order_line_items_id_store UNIQUE (id, store_id),
  CONSTRAINT fk_order_line_items_order FOREIGN KEY (order_id, store_id) REFERENCES public.orders(id, store_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_line_items_product FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id) ON DELETE SET NULL,
  CONSTRAINT fk_order_line_items_variant FOREIGN KEY (variant_id, store_id) REFERENCES public.variants(id, store_id) ON DELETE SET NULL,
  CONSTRAINT chk_line_item_total CHECK (total_price_cents = unit_price_cents * quantity)
);

CREATE INDEX IF NOT EXISTS idx_order_line_items_order ON public.order_line_items(order_id, store_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for Merchant Staff
CREATE POLICY "Merchant staff view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff manage customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff manage orders"
  ON public.orders FOR ALL
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff view order line items"
  ON public.order_line_items FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff view carts"
  ON public.carts FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY "Merchant staff view cart lines"
  ON public.cart_lines FOR SELECT
  TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- Revoke direct anonymous mutations from all commerce tables
REVOKE INSERT, UPDATE, DELETE ON public.customers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.carts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cart_lines FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.order_line_items FROM anon;

-- 9. SECURITY DEFINER Cart RPCs

-- 9.1 Get or Create Storefront Cart
CREATE OR REPLACE FUNCTION public.get_or_create_storefront_cart(
  p_store_id UUID,
  p_session_token VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart RECORD;
  v_store_currency VARCHAR(3);
  v_cart_lines JSONB;
BEGIN
  -- Validate store exists and is published
  SELECT currency INTO v_store_currency
  FROM public.stores
  WHERE id = p_store_id AND status = 'PUBLISHED';

  IF v_store_currency IS NULL THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND_OR_UNPUBLISHED' USING ERRCODE = 'P0002';
  END IF;

  -- Find active, unexpired cart
  SELECT * INTO v_cart
  FROM public.carts
  WHERE store_id = p_store_id
    AND session_token = p_session_token
    AND status = 'ACTIVE'
    AND expires_at > NOW();

  -- Create if not exists
  IF v_cart.id IS NULL THEN
    INSERT INTO public.carts (store_id, session_token, status, currency, expires_at)
    VALUES (p_store_id, p_session_token, 'ACTIVE', v_store_currency, NOW() + INTERVAL '30 days')
    RETURNING * INTO v_cart;
  END IF;

  -- Aggregate lines with live product & variant data
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', cl.id,
        'cart_id', cl.cart_id,
        'store_id', cl.store_id,
        'product_id', cl.product_id,
        'variant_id', cl.variant_id,
        'quantity', cl.quantity,
        'product_title', p.title,
        'product_handle', p.handle,
        'variant_title', v.title,
        'sku', v.sku,
        'price_cents', v.price_cents,
        'compare_at_price_cents', v.compare_at_price_cents,
        'inventory_quantity', v.inventory_quantity,
        'allow_backorder', v.allow_backorder,
        'option_values', v.option_values,
        'images', COALESCE(p.metadata->'images', '[]'::jsonb)
      ) ORDER BY cl.created_at ASC
    ),
    '[]'::jsonb
  ) INTO v_cart_lines
  FROM public.cart_lines cl
  JOIN public.products p ON p.id = cl.product_id AND p.store_id = cl.store_id
  JOIN public.variants v ON v.id = cl.variant_id AND v.store_id = cl.store_id
  WHERE cl.cart_id = v_cart.id AND cl.store_id = p_store_id;

  RETURN jsonb_build_object(
    'id', v_cart.id,
    'store_id', v_cart.store_id,
    'session_token', v_cart.session_token,
    'status', v_cart.status,
    'currency', v_cart.currency,
    'expires_at', v_cart.expires_at,
    'lines', v_cart_lines
  );
END;
$$;

-- 9.2 Add Storefront Cart Item
CREATE OR REPLACE FUNCTION public.add_storefront_cart_item(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR,
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart RECORD;
  v_variant RECORD;
  v_existing_quantity INTEGER := 0;
  v_new_quantity INTEGER;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22003';
  END IF;

  -- Validate cart ownership and active status
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE' AND expires_at > NOW();

  IF v_cart.id IS NULL THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  -- Validate variant belongs to store
  SELECT id, product_id, store_id, inventory_quantity, allow_backorder, price_cents
  INTO v_variant
  FROM public.variants
  WHERE id = p_variant_id AND store_id = p_store_id;

  IF v_variant.id IS NULL THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Check existing line quantity
  SELECT quantity INTO v_existing_quantity
  FROM public.cart_lines
  WHERE cart_id = p_cart_id AND variant_id = p_variant_id;

  v_new_quantity := COALESCE(v_existing_quantity, 0) + p_quantity;

  -- Check inventory availability
  IF NOT v_variant.allow_backorder AND v_variant.inventory_quantity < v_new_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_INVENTORY' USING ERRCODE = 'P0004';
  END IF;

  -- Upsert cart line
  INSERT INTO public.cart_lines (cart_id, store_id, product_id, variant_id, quantity, updated_at)
  VALUES (p_cart_id, p_store_id, v_variant.product_id, p_variant_id, p_quantity, NOW())
  ON CONFLICT (cart_id, variant_id) DO UPDATE
  SET quantity = public.cart_lines.quantity + EXCLUDED.quantity,
      updated_at = NOW();

  UPDATE public.carts SET updated_at = NOW() WHERE id = p_cart_id;

  RETURN public.get_or_create_storefront_cart(p_store_id, p_session_token);
END;
$$;

-- 9.3 Update Storefront Cart Item
CREATE OR REPLACE FUNCTION public.update_storefront_cart_item(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR,
  p_line_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart RECORD;
  v_line RECORD;
  v_variant RECORD;
BEGIN
  -- Validate cart ownership and active status
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE' AND expires_at > NOW();

  IF v_cart.id IS NULL THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  -- Validate line item belongs to this cart
  SELECT * INTO v_line
  FROM public.cart_lines
  WHERE id = p_line_id AND cart_id = p_cart_id AND store_id = p_store_id;

  IF v_line.id IS NULL THEN
    RAISE EXCEPTION 'LINE_ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_quantity <= 0 THEN
    DELETE FROM public.cart_lines WHERE id = p_line_id;
  ELSE
    -- Check variant inventory
    SELECT inventory_quantity, allow_backorder INTO v_variant
    FROM public.variants
    WHERE id = v_line.variant_id AND store_id = p_store_id;

    IF NOT v_variant.allow_backorder AND v_variant.inventory_quantity < p_quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY' USING ERRCODE = 'P0004';
    END IF;

    UPDATE public.cart_lines
    SET quantity = p_quantity, updated_at = NOW()
    WHERE id = p_line_id;
  END IF;

  UPDATE public.carts SET updated_at = NOW() WHERE id = p_cart_id;

  RETURN public.get_or_create_storefront_cart(p_store_id, p_session_token);
END;
$$;

-- 9.4 Remove Storefront Cart Item
CREATE OR REPLACE FUNCTION public.remove_storefront_cart_item(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR,
  p_line_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart RECORD;
BEGIN
  -- Validate cart ownership and active status
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE' AND expires_at > NOW();

  IF v_cart.id IS NULL THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.cart_lines
  WHERE id = p_line_id AND cart_id = p_cart_id AND store_id = p_store_id;

  UPDATE public.carts SET updated_at = NOW() WHERE id = p_cart_id;

  RETURN public.get_or_create_storefront_cart(p_store_id, p_session_token);
END;
$$;

-- 10. SECURITY DEFINER Order Submission RPC
CREATE OR REPLACE FUNCTION public.submit_storefront_order(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_customer_email VARCHAR,
  p_shipping_address JSONB,
  p_customer_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store RECORD;
  v_cart RECORD;
  v_line RECORD;
  v_variant RECORD;
  v_product RECORD;
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number INTEGER;
  v_confirmation_token VARCHAR(64);
  v_subtotal_cents BIGINT := 0;
  v_tax_cents BIGINT := 0;
  v_shipping_cents BIGINT := 0;
  v_discount_cents BIGINT := 0;
  v_total_cents BIGINT := 0;
  v_line_tax_cents BIGINT;
  v_line_total_cents BIGINT;
  v_tax_basis_points INTEGER;
  v_tax_included BOOLEAN;
  v_flat_shipping_cents BIGINT;
  v_free_shipping_threshold BIGINT;
  v_order_items JSONB := '[]'::jsonb;
  v_line_count INTEGER := 0;
BEGIN
  -- 1. Row lock the cart to prevent concurrent/double-click submissions
  SELECT * INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token
  FOR UPDATE;

  IF v_cart.id IS NULL THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  IF v_cart.status = 'CONVERTED' THEN
    RAISE EXCEPTION 'CART_ALREADY_CONVERTED' USING ERRCODE = 'P0003';
  END IF;

  IF v_cart.status != 'ACTIVE' OR v_cart.expires_at <= NOW() THEN
    RAISE EXCEPTION 'CART_EXPIRED_OR_INACTIVE' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Row lock store and get authoritative configuration
  SELECT * INTO v_store
  FROM public.stores
  WHERE id = p_store_id AND status = 'PUBLISHED'
  FOR UPDATE;

  IF v_store.id IS NULL THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND_OR_UNPUBLISHED' USING ERRCODE = 'P0002';
  END IF;

  v_tax_basis_points := COALESCE((v_store.settings->'tax'->>'tax_rate_basis_points')::integer, 0);
  v_tax_included := COALESCE((v_store.settings->'tax'->>'tax_included_in_price')::boolean, false);
  v_flat_shipping_cents := COALESCE((v_store.settings->'shipping'->>'flat_rate_cents')::bigint, 0);
  v_free_shipping_threshold := (v_store.settings->'shipping'->>'free_shipping_threshold_cents')::bigint;

  -- 3. Verify cart has lines
  SELECT COUNT(*) INTO v_line_count FROM public.cart_lines WHERE cart_id = p_cart_id;
  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'CART_IS_EMPTY' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Allocate atomic store order number
  v_order_number := v_store.order_sequence_counter + 1;
  UPDATE public.stores
  SET order_sequence_counter = v_order_number, updated_at = NOW()
  WHERE id = p_store_id;

  -- 5. Generate secure confirmation token (64 hex characters)
  v_confirmation_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  -- 6. Upsert Customer Record by (store_id, phone)
  INSERT INTO public.customers (
    store_id,
    phone,
    first_name,
    last_name,
    email,
    default_shipping_address,
    orders_count,
    total_spent_cents,
    created_at,
    updated_at
  )
  VALUES (
    p_store_id,
    p_customer_phone,
    p_customer_name,
    NULL,
    p_customer_email,
    p_shipping_address,
    1,
    0, -- Will increment after calculating total
    NOW(),
    NOW()
  )
  ON CONFLICT (store_id, phone) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      email = COALESCE(EXCLUDED.email, public.customers.email),
      default_shipping_address = COALESCE(EXCLUDED.default_shipping_address, public.customers.default_shipping_address),
      orders_count = public.customers.orders_count + 1,
      updated_at = NOW()
  RETURNING id INTO v_customer_id;

  -- 7. Process each cart line: check & decrement inventory, calculate tax snapshots
  FOR v_line IN
    SELECT cl.*
    FROM public.cart_lines cl
    WHERE cl.cart_id = p_cart_id AND cl.store_id = p_store_id
    ORDER BY cl.created_at ASC
  LOOP
    -- Row lock variant to ensure atomic inventory check & decrement
    SELECT * INTO v_variant
    FROM public.variants
    WHERE id = v_line.variant_id AND store_id = p_store_id
    FOR UPDATE;

    IF v_variant.id IS NULL THEN
      RAISE EXCEPTION 'VARIANT_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_line.product_id AND store_id = p_store_id;

    IF NOT v_variant.allow_backorder AND v_variant.inventory_quantity < v_line.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY' USING ERRCODE = 'P0004';
    END IF;

    -- Decrement inventory
    UPDATE public.variants
    SET inventory_quantity = inventory_quantity - v_line.quantity,
        updated_at = NOW()
    WHERE id = v_variant.id;

    -- Line total
    v_line_total_cents := v_variant.price_cents * v_line.quantity;
    v_subtotal_cents := v_subtotal_cents + v_line_total_cents;

    -- Line tax calculation according to documented dual-pricing model
    IF v_tax_basis_points > 0 THEN
      IF v_tax_included THEN
        -- Derived tax extracted from gross price:
        -- line_tax = line_total - (line_total * 10000 + floor((10000 + rate)/2)) / (10000 + rate)
        v_line_tax_cents := v_line_total_cents - (
          (v_line_total_cents * 10000 + ((10000 + v_tax_basis_points) / 2)) / (10000 + v_tax_basis_points)
        );
      ELSE
        -- Tax-added model:
        -- line_tax = floor((line_total * rate + 5000) / 10000)
        v_line_tax_cents := ((v_line_total_cents * v_tax_basis_points) + 5000) / 10000;
      END IF;
    ELSE
      v_line_tax_cents := 0;
    END IF;

    v_tax_cents := v_tax_cents + v_line_tax_cents;

    -- Collect line item for batch insert
    v_order_items := v_order_items || jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant.id,
      'title', v_product.title,
      'variant_title', v_variant.title,
      'sku', v_variant.sku,
      'unit_price_cents', v_variant.price_cents,
      'tax_cents', v_line_tax_cents,
      'quantity', v_line.quantity,
      'total_price_cents', v_line_total_cents
    );
  END LOOP;

  -- 8. Shipping Fee Calculation
  IF v_free_shipping_threshold IS NOT NULL AND v_subtotal_cents >= v_free_shipping_threshold THEN
    v_shipping_cents := 0;
  ELSE
    v_shipping_cents := v_flat_shipping_cents;
  END IF;

  -- 9. Total Calculation
  IF v_tax_included THEN
    v_total_cents := v_subtotal_cents + v_shipping_cents - v_discount_cents;
  ELSE
    v_total_cents := v_subtotal_cents + v_shipping_cents + v_tax_cents - v_discount_cents;
  END IF;

  -- 10. Update Customer total_spent_cents
  UPDATE public.customers
  SET total_spent_cents = total_spent_cents + v_total_cents, updated_at = NOW()
  WHERE id = v_customer_id;

  -- 11. Insert Canonical Order
  INSERT INTO public.orders (
    store_id,
    order_number,
    confirmation_token,
    customer_id,
    status,
    order_mode_used,
    customer_name,
    customer_phone,
    customer_email,
    shipping_address,
    customer_notes,
    currency,
    subtotal_cents,
    tax_cents,
    shipping_cents,
    discount_cents,
    total_cents,
    created_at,
    updated_at
  )
  VALUES (
    p_store_id,
    v_order_number,
    v_confirmation_token,
    v_customer_id,
    'NEW',
    v_store.order_mode,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_shipping_address,
    p_customer_notes,
    v_store.currency,
    v_subtotal_cents,
    v_tax_cents,
    v_shipping_cents,
    v_discount_cents,
    v_total_cents,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- 12. Insert Immutable Order Line Items
  INSERT INTO public.order_line_items (
    order_id,
    store_id,
    product_id,
    variant_id,
    title,
    variant_title,
    sku,
    unit_price_cents,
    tax_cents,
    quantity,
    total_price_cents,
    created_at
  )
  SELECT
    v_order_id,
    p_store_id,
    (item->>'product_id')::uuid,
    (item->>'variant_id')::uuid,
    item->>'title',
    item->>'variant_title',
    item->>'sku',
    (item->>'unit_price_cents')::bigint,
    (item->>'tax_cents')::bigint,
    (item->>'quantity')::integer,
    (item->>'total_price_cents')::bigint,
    NOW()
  FROM jsonb_array_elements(v_order_items) AS item;

  -- 13. Transition Cart status to CONVERTED
  UPDATE public.carts
  SET status = 'CONVERTED', updated_at = NOW()
  WHERE id = p_cart_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'confirmation_token', v_confirmation_token,
    'order_mode_used', v_store.order_mode,
    'currency', v_store.currency,
    'subtotal_cents', v_subtotal_cents,
    'tax_cents', v_tax_cents,
    'shipping_cents', v_shipping_cents,
    'discount_cents', v_discount_cents,
    'total_cents', v_total_cents,
    'customer_name', p_customer_name,
    'customer_phone', p_customer_phone,
    'whatsapp_phone', v_store.whatsapp_phone,
    'whatsapp_settings', v_store.whatsapp_settings,
    'line_items', v_order_items
  );
END;
$$;

-- 11. Grant Execute on RPCs
GRANT EXECUTE ON FUNCTION public.get_or_create_storefront_cart(UUID, VARCHAR) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_storefront_cart_item(UUID, UUID, VARCHAR, UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_storefront_cart_item(UUID, UUID, VARCHAR, UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_storefront_cart_item(UUID, UUID, VARCHAR, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_storefront_order(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, TEXT) TO anon, authenticated, service_role;

COMMIT;
