-- SOUQCLOUD Database Migration: Stores Container & Public Projection
-- Version: 20260823000003
-- Description: Establishes public.stores, public.public_stores view, RLS policies, and grants.

BEGIN;

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.store_status AS ENUM ('DRAFT', 'PUBLISHED', 'MAINTENANCE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.store_order_mode AS ENUM ('DASHBOARD', 'WHATSAPP', 'BOTH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Stores Table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(100) NOT NULL UNIQUE,
  custom_domain VARCHAR(255) NULL UNIQUE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  default_locale VARCHAR(10) NOT NULL DEFAULT 'ar',
  default_country_code VARCHAR(2) NOT NULL,
  status public.store_status NOT NULL DEFAULT 'DRAFT',
  
  -- Store Order Mode & WhatsApp Contact Details
  order_mode public.store_order_mode NOT NULL DEFAULT 'BOTH',
  whatsapp_phone VARCHAR(50) NULL,
  whatsapp_settings JSONB NOT NULL DEFAULT '{
    "auto_redirect": true,
    "custom_message_template": null
  }'::jsonb,
  
  -- Atomic Store-Scoped Order Numbering Counter
  order_sequence_counter INTEGER NOT NULL DEFAULT 1000,
  
  -- Delivery & Tax Calculation Settings
  settings JSONB NOT NULL DEFAULT '{
    "shipping": {
      "flat_rate_cents": 500,
      "free_shipping_threshold_cents": null
    },
    "tax": {
      "tax_rate_basis_points": 0,
      "tax_included_in_price": false
    },
    "branding": {
      "logo_url": null,
      "favicon_url": null,
      "social_links": {}
    }
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stores_id_merchant UNIQUE (id, merchant_id)
);

CREATE INDEX IF NOT EXISTS idx_stores_merchant_id ON public.stores(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stores_handle ON public.stores(handle);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON public.stores(custom_domain);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

-- 3. Helper Function for Authenticated Store Scoping
CREATE OR REPLACE FUNCTION public.get_authenticated_store_ids()
RETURNS SETOF UUID AS $$
  SELECT s.id FROM public.stores s
  WHERE s.merchant_id IN (SELECT public.get_authenticated_merchant_ids());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Public Storefront Projection View (Restricted for anonymous storefront reads)
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

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies on Stores
DROP POLICY IF EXISTS store_isolation_read ON public.stores;
CREATE POLICY store_isolation_read ON public.stores
  FOR SELECT TO authenticated
  USING (merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

DROP POLICY IF EXISTS store_creation_insert ON public.stores;
CREATE POLICY store_creation_insert ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN')
  ));

DROP POLICY IF EXISTS store_isolation_update ON public.stores;
CREATE POLICY store_isolation_update ON public.stores
  FOR UPDATE TO authenticated
  USING (merchant_id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN')
  ))
  WITH CHECK (merchant_id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN')
  ));

-- 7. Postgres Role Grants
GRANT ALL ON TABLE public.stores TO authenticated, service_role;
GRANT SELECT ON public.public_stores TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_authenticated_store_ids() TO authenticated, service_role;

-- Revoke direct SELECT on internal stores table from anon
REVOKE SELECT ON public.stores FROM anon;

COMMIT;
