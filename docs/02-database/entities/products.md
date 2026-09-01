Document: Entity: Products
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/02-database/conventions.md
Related Documents: docs/02-database/entities/media-assets.md, docs/03-modules/products.md
Decisions: Two-table catalog model (products and variants); price stored in integer cents; inventory tracked at variant level with backorder constraints; Composite Foreign Keys for structural tenant referential integrity.
Open Questions: None

# Database Entity: Products & Variants

## 1. Purpose & Domain Scope

The catalog subsystem models merchandise available for sale within a Store. It consists of two tightly coupled tables:
* `products`: High-level commercial item description, category, and options definitions.
* `variants`: Concrete, purchasable SKUs with dedicated pricing, inventory, and variant option values.

---

## 2. Table Schema Definitions

```sql
CREATE TYPE public.product_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status public.product_status NOT NULL DEFAULT 'DRAFT',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_products_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_product_handle UNIQUE (store_id, handle)
);

-- Variants Table
CREATE TABLE public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Default Variant',
  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
  compare_at_price_cents BIGINT NULL CHECK (compare_at_price_cents >= 0),
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  allow_backorder BOOLEAN NOT NULL DEFAULT FALSE,
  option_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_variants_id_store UNIQUE (id, store_id),
  CONSTRAINT fk_variants_product_store FOREIGN KEY (product_id, store_id) REFERENCES public.products(id, store_id) ON DELETE CASCADE,
  CONSTRAINT uq_store_variant_sku UNIQUE (store_id, sku),
  CONSTRAINT chk_inventory_backorder CHECK (inventory_quantity >= 0 OR allow_backorder = TRUE)
);

-- Indexes
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_lookup ON public.products(store_id, status, handle);
CREATE INDEX idx_variants_product ON public.variants(product_id, store_id);
CREATE INDEX idx_variants_store_sku ON public.variants(store_id, sku);
```

---

## 3. Inventory Quantity Invariants & Order Submission Rules

1. **Inventory Constraint**: `CONSTRAINT chk_inventory_backorder` ensures that `inventory_quantity` cannot be negative unless `allow_backorder = TRUE`.
2. **Backorder Disabled (`allow_backorder = FALSE`)**:
   * Purchases are blocked if requested `quantity > inventory_quantity`.
   * When an order is submitted:
     ```sql
     UPDATE public.variants
     SET inventory_quantity = inventory_quantity - $qty, updated_at = NOW()
     WHERE id = $variant_id AND store_id = $store_id AND inventory_quantity >= $qty;
     ```
   * If 0 rows are updated (insufficient stock), the transaction aborts and returns an `INSUFFICIENT_STOCK` error.
3. **Backorder Enabled (`allow_backorder = TRUE`)**:
   * Purchases proceed regardless of current stock level; `inventory_quantity` drops into negative numbers to track the exact quantity needing replenishment.
4. **Order Submission Execution**:
   * Inventory check and decrement execute entirely server-side during the atomic Order creation transaction.
