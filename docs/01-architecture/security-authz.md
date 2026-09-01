Document: Security and Authorization
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/product-principles.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/multi-tenancy.md, docs/02-database/conventions.md, docs/05-infrastructure/supabase-setup.md
Decisions: Cookie-based HTTP-only JWT sessions via Supabase SSR; Postgres Grants + Row Level Security (RLS) defense-in-depth; public storefront view projection (public_stores); controlled Cart and Order SECURITY DEFINER RPCs executable by anon without direct table mutation access.
Open Questions: None

# Security, Authorization & Postgres Grants

## 1. Security Architecture & Dual-Layer Authorization

Database security operates on a **dual-layer model**:
1. **Postgres Role Grants**: Coarse-grained table and view permissions assigned to database roles (`anon`, `authenticated`, `service_role`).
2. **Row Level Security (RLS) Policies**: Fine-grained row-level filtering and tenant isolation evaluated on top of role grants.

---

## 2. Postgres Grants Matrix & Public Projection

```sql
-- Revoke default public access on application schema
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;

-- 1. Anonymous Role (Public Storefront Visitors)
-- Storefront Catalog Read Access (Strictly filtered by RLS and Views)
GRANT SELECT ON public.public_stores TO anon; -- Public projection view only
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.variants TO anon;
GRANT SELECT ON public.themes TO anon;
GRANT SELECT ON public.pages TO anon;
GRANT SELECT ON public.media_assets TO anon;

-- Direct SELECT on internal public.stores table is REVOKED from anon to protect internal merchant data.
REVOKE SELECT ON public.stores FROM anon;

-- NOTE ON COMMERCE MUTATIONS:
-- Direct INSERT, UPDATE, DELETE on carts, cart_lines, orders, and order_line_items are REVOKED from anon.
-- Commerce mutations execute strictly through controlled SECURITY DEFINER functions with session token verification.

-- 2. Authenticated Role (Logged-In Merchants & Staff)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE ALL ON public.platform_admin FROM authenticated;

-- 3. Service Role (Server-Only Webhook Receivers & System Workers)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

---

## 3. Public Storefront Projection View (`public.public_stores`)

To prevent exposing internal merchant ownership, internal billing metadata, and operational audit fields to anonymous clients, public storefront reads target a secured projection view:

```sql
CREATE OR REPLACE VIEW public.public_stores AS
SELECT 
  id,
  name,
  handle,
  custom_domain,
  currency,
  default_locale,
  default_country_code,
  order_mode,
  whatsapp_phone,
  whatsapp_settings,
  settings->'branding' AS branding,
  settings->'shipping' AS shipping_settings,
  (settings->'tax'->>'tax_included_in_price')::BOOLEAN AS tax_included_in_price,
  (settings->'tax'->>'tax_rate_basis_points')::INTEGER AS tax_rate_basis_points,
  created_at
FROM public.stores
WHERE status = 'PUBLISHED';

-- Security Invariant:
-- public.public_stores is a deliberately restricted public projection containing only approved storefront-safe fields.
-- Internal/sensitive store fields must never be exposed through this projection without an explicit security review and documentation update.
-- It strictly excludes merchant_id, internal billing metadata, operational audit fields, and private configuration.
```

---

## 4. Complete Public Storefront RLS Policies (`anon`)

```sql
-- 1. Products: Active products belonging to published stores
CREATE POLICY public_product_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'ACTIVE' AND
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
  );

-- 2. Variants: Variants belonging to active products in published stores
CREATE POLICY public_variant_read ON public.variants
  FOR SELECT TO anon, authenticated
  USING (
    product_id IN (
      SELECT id FROM public.products
      WHERE status = 'ACTIVE' AND store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
    )
  );

-- 3. Themes: Active themes belonging to published stores
CREATE POLICY public_theme_read ON public.themes
  FOR SELECT TO anon, authenticated
  USING (
    status = 'ACTIVE' AND
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
  );

-- 4. Pages: Published pages belonging to published stores
CREATE POLICY public_page_read ON public.pages
  FOR SELECT TO anon, authenticated
  USING (
    status = 'PUBLISHED' AND
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
  );

-- 5. Media Assets: PUBLIC visibility assets belonging to published stores
CREATE POLICY public_media_read ON public.media_assets
  FOR SELECT TO anon
  USING (
    visibility = 'PUBLIC' AND
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
  );
```

---

## 5. Authenticated Merchant Isolation Policies (`authenticated`)

```sql
CREATE OR REPLACE FUNCTION public.get_authenticated_merchant_ids()
RETURNS SETOF UUID AS $$
  SELECT merchant_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_authenticated_store_ids()
RETURNS SETOF UUID AS $$
  SELECT s.id FROM public.stores s
  WHERE s.merchant_id IN (SELECT public.get_authenticated_merchant_ids());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE POLICY merchant_isolation ON public.merchants
  FOR ALL TO authenticated
  USING (id IN (SELECT public.get_authenticated_merchant_ids()));

CREATE POLICY store_isolation ON public.stores
  FOR ALL TO authenticated
  USING (id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY product_isolation ON public.products
  FOR ALL TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY media_merchant_isolation ON public.media_assets
  FOR ALL TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

CREATE POLICY order_isolation ON public.orders
  FOR ALL TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));
```

---

## 6. Controlled Anonymous Cart RPC Functions

Anonymous clients mutate cart state exclusively through hardened `SECURITY DEFINER` RPC functions that validate `store_id + session_token + cart_id`:

```sql
-- 1. Get or Create Cart
CREATE OR REPLACE FUNCTION public.get_or_create_storefront_cart(
  p_store_id UUID,
  p_session_token VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart RECORD;
  v_currency VARCHAR(3);
BEGIN
  -- Verify published store
  SELECT currency INTO v_currency FROM public.stores WHERE id = p_store_id AND status = 'PUBLISHED';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Find or insert active cart
  SELECT id, status, currency INTO v_cart FROM public.carts 
  WHERE store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    INSERT INTO public.carts (store_id, session_token, status, currency)
    VALUES (p_store_id, p_session_token, 'ACTIVE', v_currency)
    RETURNING id, status, currency INTO v_cart;
  END IF;

  RETURN jsonb_build_object('id', v_cart.id, 'currency', v_cart.currency, 'status', v_cart.status);
END;
$$;

-- 2. Add Cart Item (Loads Authoritative Catalog Data & Enforces Stock)
CREATE OR REPLACE FUNCTION public.add_storefront_cart_item(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR(255),
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id UUID;
  v_stock INTEGER;
  v_backorder BOOLEAN;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = 'P0001';
  END IF;

  -- Verify active cart ownership
  PERFORM 1 FROM public.carts 
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  -- Verify variant and product belong to published store
  SELECT v.product_id, v.inventory_quantity, v.allow_backorder 
  INTO v_product_id, v_stock, v_backorder
  FROM public.variants v
  JOIN public.products p ON p.id = v.product_id AND p.store_id = p_store_id
  WHERE v.id = p_variant_id AND v.store_id = p_store_id AND p.status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VARIANT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_backorder AND v_stock < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK' USING ERRCODE = 'P0001';
  END IF;

  -- Upsert cart line
  INSERT INTO public.cart_lines (cart_id, store_id, product_id, variant_id, quantity)
  VALUES (p_cart_id, p_store_id, v_product_id, p_variant_id, p_quantity)
  ON CONFLICT (cart_id, variant_id) DO UPDATE
  SET quantity = public.cart_lines.quantity + EXCLUDED.quantity, updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Update / Remove Cart Items
CREATE OR REPLACE FUNCTION public.update_storefront_cart_item(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR(255),
  p_line_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM 1 FROM public.carts 
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  IF p_quantity <= 0 THEN
    DELETE FROM public.cart_lines WHERE id = p_line_id AND cart_id = p_cart_id AND store_id = p_store_id;
  ELSE
    UPDATE public.cart_lines SET quantity = p_quantity, updated_at = NOW() 
    WHERE id = p_line_id AND cart_id = p_cart_id AND store_id = p_store_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Cart RPC Execution Privileges
REVOKE EXECUTE ON FUNCTION public.get_or_create_storefront_cart FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_storefront_cart_item FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_storefront_cart_item FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_storefront_cart TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_storefront_cart_item TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_storefront_cart_item TO anon, authenticated, service_role;
```

---

## 7. Server-Authoritative Anonymous Order Submission (`SECURITY DEFINER`)

Anonymous storefront clients submit orders through the server endpoint `POST /api/storefront/orders`, which validates the input, extracts the session token from the HttpOnly cookie, and invokes the hardened database function `public.submit_storefront_order(...)`:

```sql
CREATE OR REPLACE FUNCTION public.submit_storefront_order(
  p_store_id UUID,
  p_cart_id UUID,
  p_session_token VARCHAR(255),
  p_customer_name VARCHAR(255),
  p_customer_phone VARCHAR(50),
  p_customer_email VARCHAR(255) DEFAULT NULL,
  p_shipping_address JSONB DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
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
  v_order_id UUID;
  v_order_number INTEGER;
  v_confirmation_token VARCHAR(64);
  v_subtotal BIGINT := 0;
  v_tax BIGINT := 0;
  v_line_tax BIGINT := 0;
  v_shipping BIGINT := 0;
  v_total BIGINT := 0;
  v_tax_rate INTEGER := 0;
  v_tax_included BOOLEAN := FALSE;
  v_customer_id UUID;
  v_wa_url TEXT := NULL;
  v_wa_text TEXT;
  v_items_summary TEXT := '';
BEGIN
  -- 1. Validate Store Status & Atomic Sequence Counter Lock
  SELECT id, name, default_country_code, order_mode, whatsapp_phone, whatsapp_settings, settings, order_sequence_counter
  INTO v_store
  FROM public.stores
  WHERE id = p_store_id AND status = 'PUBLISHED'
  FOR UPDATE; -- Row-level lock guarantees atomic order number assignment
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND_OR_UNPUBLISHED' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Validate Cart & Cryptographic Session Token Binding
  SELECT id, status, currency
  INTO v_cart
  FROM public.carts
  WHERE id = p_cart_id AND store_id = p_store_id AND session_token = p_session_token AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CART_NOT_FOUND_OR_INVALID_SESSION' USING ERRCODE = 'P0002';
  END IF;

  -- Tax Configuration
  v_tax_rate := COALESCE((v_store.settings->'tax'->>'tax_rate_basis_points')::INTEGER, 0);
  v_tax_included := COALESCE((v_store.settings->'tax'->>'tax_included_in_price')::BOOLEAN, FALSE);

  -- 3. Atomic Order Number Increment
  v_order_number := v_store.order_sequence_counter + 1;
  UPDATE public.stores SET order_sequence_counter = v_order_number, updated_at = NOW() WHERE id = p_store_id;

  -- Generate Short-Lived Secure Confirmation Token
  v_confirmation_token := encode(gen_random_bytes(32), 'hex');

  -- 4. Calculate Authoritative Totals, Tax Snapshots & Decrement Stock
  FOR v_line IN (
    SELECT cl.quantity, v.id AS variant_id, v.title AS variant_title, v.sku, v.price_cents,
           v.inventory_quantity, v.allow_backorder, p.id AS product_id, p.title AS product_title
    FROM public.cart_lines cl
    JOIN public.variants v ON v.id = cl.variant_id AND v.store_id = p_store_id
    JOIN public.products p ON p.id = cl.product_id AND p.store_id = p_store_id
    WHERE cl.cart_id = p_cart_id
  ) LOOP
    -- Atomic inventory check & decrement
    UPDATE public.variants
    SET inventory_quantity = inventory_quantity - v_line.quantity, updated_at = NOW()
    WHERE id = v_line.variant_id AND store_id = p_store_id
      AND (inventory_quantity >= v_line.quantity OR allow_backorder = TRUE);
      
    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: variant %', v_line.variant_id USING ERRCODE = 'P0001';
    END IF;

    -- Line Item Tax Calculation (Basis Points)
    IF v_tax_rate > 0 THEN
      IF v_tax_included THEN
        -- Tax included in unit price (derived gross component)
        v_line_tax := (v_line.price_cents * v_line.quantity) - 
          ((v_line.price_cents * v_line.quantity * 10000 + ((10000 + v_tax_rate) / 2)) / (10000 + v_tax_rate));
      ELSE
        -- Tax added to unit price
        v_line_tax := ((v_line.price_cents * v_line.quantity * v_tax_rate) + 5000) / 10000;
      END IF;
    ELSE
      v_line_tax := 0;
    END IF;

    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + (v_line.price_cents * v_line.quantity);
    
    v_items_summary := v_items_summary || format('- %sx %s (%s) - %s %s%s', 
      v_line.quantity, v_line.product_title, v_line.variant_title, (v_line.price_cents / 100.0), v_cart.currency, E'\n');
  END LOOP;

  IF v_subtotal = 0 THEN
    RAISE EXCEPTION 'CART_IS_EMPTY' USING ERRCODE = 'P0001';
  END IF;

  -- 5. Calculate Shipping & Final Total
  IF v_subtotal >= COALESCE((v_store.settings->'shipping'->>'free_shipping_threshold_cents')::BIGINT, 999999999) THEN
    v_shipping := 0;
  ELSE
    v_shipping := COALESCE((v_store.settings->'shipping'->>'flat_rate_cents')::BIGINT, 0);
  END IF;

  IF v_tax_included THEN
    v_total := v_subtotal + v_shipping; -- Tax already in subtotal
  ELSE
    v_total := v_subtotal + v_shipping + v_tax; -- Tax added
  END IF;

  -- 6. Upsert Customer Record by (store_id, phone)
  INSERT INTO public.customers (
    store_id, phone, first_name, email, default_shipping_address, orders_count, total_spent_cents
  )
  VALUES (
    p_store_id, p_customer_phone, p_customer_name, p_customer_email, p_shipping_address, 1, v_total
  )
  ON CONFLICT (store_id, phone) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      email = COALESCE(EXCLUDED.email, public.customers.email),
      default_shipping_address = COALESCE(EXCLUDED.default_shipping_address, public.customers.default_shipping_address),
      orders_count = public.customers.orders_count + 1,
      total_spent_cents = public.customers.total_spent_cents + EXCLUDED.total_spent_cents,
      updated_at = NOW()
  RETURNING id INTO v_customer_id;

  -- 7. Insert Order
  INSERT INTO public.orders (
    store_id, order_number, confirmation_token, customer_id, status, order_mode_used,
    customer_name, customer_phone, customer_email, shipping_address,
    customer_notes, currency, subtotal_cents, tax_cents, shipping_cents, discount_cents, total_cents
  )
  VALUES (
    p_store_id, v_order_number, v_confirmation_token, v_customer_id, 'NEW', v_store.order_mode,
    p_customer_name, p_customer_phone, p_customer_email, p_shipping_address,
    p_customer_notes, v_cart.currency, v_subtotal, v_tax, v_shipping, 0, v_total
  )
  RETURNING id INTO v_order_id;

  -- 8. Insert Immutable Order Line Item Snapshots with Reconciled Tax
  INSERT INTO public.order_line_items (
    order_id, store_id, product_id, variant_id, title, variant_title, sku,
    unit_price_cents, tax_cents, quantity, total_price_cents
  )
  SELECT 
    v_order_id, p_store_id, cl.product_id, cl.variant_id, p.title, v.title, v.sku,
    v.price_cents,
    CASE 
      WHEN v_tax_rate > 0 AND v_tax_included THEN
        (v.price_cents * cl.quantity) - ((v.price_cents * cl.quantity * 10000 + ((10000 + v_tax_rate) / 2)) / (10000 + v_tax_rate))
      WHEN v_tax_rate > 0 AND NOT v_tax_included THEN
        ((v.price_cents * cl.quantity * v_tax_rate) + 5000) / 10000
      ELSE 0
    END,
    cl.quantity, (v.price_cents * cl.quantity)
  FROM public.cart_lines cl
  JOIN public.variants v ON v.id = cl.variant_id AND v.store_id = p_store_id
  JOIN public.products p ON p.id = cl.product_id AND p.store_id = p_store_id
  WHERE cl.cart_id = p_cart_id;

  -- 9. Mark Cart Converted
  UPDATE public.carts SET status = 'CONVERTED', updated_at = NOW() WHERE id = p_cart_id;

  -- 10. Construct Dynamic WhatsApp Redirection URL if configured
  IF v_store.order_mode IN ('WHATSAPP', 'BOTH') AND v_store.whatsapp_phone IS NOT NULL THEN
    v_wa_text := format('طلب جديد من متجر: %s%sرقم الطلب: #%s%sالاسم: %s%sالهاتف: %s%s%sالإجمالي: %s %s',
      v_store.name, E'\n', v_order_number, E'\n', p_customer_name, E'\n', p_customer_phone, E'\n\n',
      v_items_summary, (v_total / 100.0), v_cart.currency);
    v_wa_url := 'https://wa.me/' || replace(v_store.whatsapp_phone, '+', '') || '?text=' || urlencode(v_wa_text);
  END IF;

  -- Return Result Object
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'confirmation_token', v_confirmation_token,
    'order_mode_used', v_store.order_mode,
    'whatsapp_redirect_url', v_wa_url
  );
END;
$$;

-- EXECUTE Privileges Hardening (Scoped specifically to this function)
REVOKE EXECUTE ON FUNCTION public.submit_storefront_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_storefront_order TO anon, authenticated, service_role;
```
