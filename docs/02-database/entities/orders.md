Document: Entity: Orders & Carts
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/02-database/entities/products.md, docs/02-database/entities/customers.md
Related Documents: docs/03-modules/checkout.md, docs/03-modules/orders.md, docs/01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md
Decisions: Streamlined Phase 1 commerce schema (Carts, Cart Lines, Orders, Order Line Items); Cart session security via cryptographically random opaque tokens; atomic store-scoped order numbering; confirmation token access protection; exact line-item tax reconciliation; Composite Foreign Keys for tenant isolation.
Open Questions: None

# Database Entity: Orders & Carts (`public.orders`, `public.carts`)

## 1. Purpose & Domain Scope

This document specifies the core commerce transaction entities:
1. `carts` & `cart_lines` (Transient shopping basket protected by cryptographically secure session tokens)
2. `orders` & `order_line_items` (Canonical merchant order records capturing immutable commercial snapshots, protecting customer confirmation privacy, and enforcing mathematical balance invariants)

---

## 2. Table Schema Definitions

```sql
-- Enums
CREATE TYPE public.cart_status AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED');
CREATE TYPE public.order_status AS ENUM (
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED'
);

-- 1. Carts Table
CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL, -- Cryptographically secure opaque session token
  status public.cart_status NOT NULL DEFAULT 'ACTIVE',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT uq_carts_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_carts_session UNIQUE (store_id, session_token)
);

-- Cart Lines Table
CREATE TABLE public.cart_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_cart_lines_cart FOREIGN KEY (cart_id, store_id) REFERENCES public.carts(id, store_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_lines_product FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_lines_variant FOREIGN KEY (variant_id, store_id) REFERENCES public.variants(id, store_id) ON DELETE CASCADE,
  CONSTRAINT uq_cart_variant UNIQUE (cart_id, variant_id)
);

-- 2. Orders Table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  confirmation_token VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'), -- Secure token required to view confirmation data
  customer_id UUID NULL,
  
  -- Order Status & Completion Mode
  status public.order_status NOT NULL DEFAULT 'NEW',
  order_mode_used public.store_order_mode NOT NULL,
  
  -- Customer & Delivery Details
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255) NULL,
  shipping_address JSONB NULL,
  customer_notes TEXT NULL,
  merchant_notes TEXT NULL,
  whatsapp_redirect_url TEXT NULL,
  
  -- Immutable Commercial Financial Snapshot
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
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
  -- Deterministic Order Total Invariant
  CONSTRAINT chk_order_total_invariant CHECK (
    total_cents = subtotal_cents + shipping_cents + tax_cents - discount_cents OR
    total_cents = subtotal_cents + shipping_cents - discount_cents -- Supported when tax is included in subtotal
  )
);

-- 3. Order Line Items Table (Immutable Snapshot)
CREATE TABLE public.order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  store_id UUID NOT NULL,
  product_id UUID NULL,
  variant_id UUID NULL,
  
  -- Immutable Historical Line Snapshot
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

-- Indexes
CREATE INDEX idx_orders_store ON public.orders(store_id, created_at DESC);
CREATE INDEX idx_orders_status ON public.orders(store_id, status);
CREATE INDEX idx_orders_customer_phone ON public.orders(store_id, customer_phone);
CREATE INDEX idx_orders_confirmation_token ON public.orders(confirmation_token);
CREATE INDEX idx_order_line_items_order ON public.order_line_items(order_id, store_id);
```

---

## 3. Cart Session Security & Order Submission Invariant

* **Session Token**: Server-generated cryptographically secure opaque UUID/session token, bound to the store and protected by an HttpOnly/Secure cookie (`souqcloud_cart_token`).
* **Cart Binding**: Cart lookup, mutations, and order submissions require proving ownership via `store_id + cart_id + session_token`. A client knowing another customer's `cart_id` cannot submit or view that cart without the secret session token.
* **Confirmation Data Privacy**: The confirmation view requires presenting `order_id` along with the matching `confirmation_token` (returned upon order submission or stored in session). Raw Order IDs alone cannot be used to scrape customer contact details or addresses.

---

## 4. Tax Snapshots Reconciliation & Order Total Invariant

1. **Exact Line Tax Snapshot**:
   * Each `public.order_line_items` record stores its exact calculated `tax_cents`.
   * **Reconciliation Formula**:
     $$\text{orders.tax\_cents} = \sum (\text{order\_line\_items.tax\_cents})$$
2. **Order Total Mathematical Formula**:
   * **Tax-Added (`tax_included_in_price = false`)**:
     $$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} + \text{tax\_cents} - \text{discount\_cents}$$
   * **Tax-Included (`tax_included_in_price = true`)**:
     $$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} - \text{discount\_cents}$$
     *(where $\text{tax\_cents}$ represents the extracted tax component already present inside subtotal).*
3. **Atomic Sequence Concurrency**:
   * Order numbers are assigned atomically by updating `store.order_sequence_counter` under row lock (`FOR UPDATE`), eliminating race conditions under concurrent submissions.
