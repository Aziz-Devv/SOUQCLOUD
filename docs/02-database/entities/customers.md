Document: Entity: Customers
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/02-database/conventions.md
Related Documents: docs/02-database/entities/orders.md, docs/03-modules/checkout.md, docs/00-product/glossary.md
Decisions: First-class store-scoped Customer entity; phone number is required primary identity key; email is optional (supports email = NULL); deterministic phone normalization; atomic upsert on order submission.
Open Questions: None

# Database Entity: Customers (`public.customers`)

## 1. Purpose & Domain Scope

The `public.customers` table represents an end-consumer who visits or submits orders on a specific Storefront. In WhatsApp-first commerce, shoppers identify primarily via their **Phone Number**. Email is optional. A Customer record is strictly scoped to a single `store_id`.

---

## 2. Table Schema Definition

```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone VARCHAR(50) NOT NULL,            -- Required primary customer identity key
  first_name VARCHAR(100) NOT NULL,      -- Customer name (e.g. "Ahmed")
  last_name VARCHAR(100) NULL,
  email VARCHAR(255) NULL,               -- Optional contact email (supports NULL)
  default_shipping_address JSONB NULL,
  orders_count INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  total_spent_cents BIGINT NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customers_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_customer_phone UNIQUE (store_id, phone)
);

-- Indexes
CREATE INDEX idx_customers_store ON public.customers(store_id, created_at DESC);
CREATE INDEX idx_customers_phone ON public.customers(store_id, phone);
CREATE INDEX idx_customers_email ON public.customers(store_id, email) WHERE (email IS NOT NULL);
```

---

## 3. Field Semantics & Phone Normalization Rule

* `phone`: Required primary identifier scoped per store (`CONSTRAINT uq_store_customer_phone`).
  * **Normalization Rule**: All input phone numbers are sanitized before database lookup or insertion:
    1. Strip all non-digit characters except leading `+` (e.g. `(079) 123-4567` &rarr; `0791234567`).
    2. Convert national formatting to standardized international E.164 representation using the store's default country calling code (e.g. `0501234567` in SA &rarr; `+966501234567`).
* `email`: Optional field. Can be `NULL` without violating constraints, supporting pure phone/WhatsApp customer journeys.
* `first_name`: Required customer name provided during order submission.
* `CONSTRAINT uq_customers_id_store`: Enables composite foreign key references from `public.orders`.

---

## 4. Lifecycle & Order Submission Upsert

When an Order is submitted, the server executes an atomic upsert on `public.customers` matched on `(store_id, phone)`:

```sql
INSERT INTO public.customers (
  store_id,
  phone,
  first_name,
  last_name,
  email,
  default_shipping_address,
  orders_count,
  total_spent_cents
)
VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
ON CONFLICT (store_id, phone) DO UPDATE
SET first_name = COALESCE(EXCLUDED.first_name, public.customers.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.customers.last_name),
    email = COALESCE(EXCLUDED.email, public.customers.email),
    default_shipping_address = COALESCE(EXCLUDED.default_shipping_address, public.customers.default_shipping_address),
    orders_count = public.customers.orders_count + 1,
    total_spent_cents = public.customers.total_spent_cents + EXCLUDED.total_spent_cents,
    updated_at = NOW()
RETURNING id;
```

---

## 5. Tenant Isolation & Access Rules

* **Merchant Access**: Authenticated store staff can view and manage customer records for their authorized `store_id`.
* **Anonymous Access**: Direct client queries or inserts to `public.customers` are forbidden. Customer records are managed strictly server-side during the order submission pipeline.
