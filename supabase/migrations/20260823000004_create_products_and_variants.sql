-- SOUQCLOUD Database Migration: Products & Variants Catalog
-- Version: 20260823000004
-- Description: Establishes public.products, public.variants, constraints, indexes, RLS policies, and grants.

BEGIN;

-- 1. Create Product Status Enum
DO $$ BEGIN
  CREATE TYPE public.product_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
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

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_lookup ON public.products(store_id, status, handle);

-- 3. Create Variants Table
CREATE TABLE IF NOT EXISTS public.variants (
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

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.variants(product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_variants_store_sku ON public.variants(store_id, sku);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies on Products
DROP POLICY IF EXISTS product_isolation_read ON public.products;
CREATE POLICY product_isolation_read ON public.products
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS public_product_read ON public.products;
CREATE POLICY public_product_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'ACTIVE' AND
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED')
  );

DROP POLICY IF EXISTS product_merchant_insert ON public.products;
CREATE POLICY product_merchant_insert ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS product_merchant_update ON public.products;
CREATE POLICY product_merchant_update ON public.products
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS product_merchant_delete ON public.products;
CREATE POLICY product_merchant_delete ON public.products
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- 6. Define RLS Policies on Variants
DROP POLICY IF EXISTS variant_isolation_read ON public.variants;
CREATE POLICY variant_isolation_read ON public.variants
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS public_variant_read ON public.variants;
CREATE POLICY public_variant_read ON public.variants
  FOR SELECT TO anon, authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE status = 'PUBLISHED') AND
    product_id IN (SELECT id FROM public.products WHERE status = 'ACTIVE')
  );

DROP POLICY IF EXISTS variant_merchant_insert ON public.variants;
CREATE POLICY variant_merchant_insert ON public.variants
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS variant_merchant_update ON public.variants;
CREATE POLICY variant_merchant_update ON public.variants
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS variant_merchant_delete ON public.variants;
CREATE POLICY variant_merchant_delete ON public.variants
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- 7. Postgres Role Grants
GRANT ALL ON TABLE public.products TO authenticated, service_role;
GRANT ALL ON TABLE public.variants TO authenticated, service_role;
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT ON TABLE public.variants TO anon;

COMMIT;
