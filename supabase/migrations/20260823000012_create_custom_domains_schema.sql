-- SOUQCLOUD Database Migration: Custom Domains & Hostname Edge Routing
-- Version: 20260823000012
-- Description: Establishes public.custom_domains operational ledger, RLS policies, indexes, and resolve_store_by_custom_domain RPC.

BEGIN;

-- 1. Create Enums for Custom Domain & SSL Lifecycles
DO $$ BEGIN
  CREATE TYPE public.custom_domain_status AS ENUM (
    'PENDING_VERIFICATION',
    'ACTIVE',
    'FAILED',
    'SUSPENDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.custom_domain_ssl_status AS ENUM (
    'INITIALIZING',
    'PENDING_VALIDATION',
    'ACTIVE',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Custom Domains Table (Operational Domain Ledger)
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  hostname VARCHAR(255) NOT NULL UNIQUE,
  status public.custom_domain_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  ssl_status public.custom_domain_ssl_status NOT NULL DEFAULT 'INITIALIZING',
  
  -- Cloudflare for SaaS Integration Metadata
  cloudflare_custom_hostname_id VARCHAR(255) NULL,
  verification_txt_name VARCHAR(255) NULL,
  verification_txt_value VARCHAR(255) NULL,
  cname_target VARCHAR(255) NOT NULL,
  
  -- Operational & Diagnostic Timestamps
  last_checked_at TIMESTAMPTZ NULL,
  verified_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Integrity Constraints
  CONSTRAINT chk_hostname_lowercase CHECK (hostname = lower(hostname))
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_store_id ON public.custom_domains(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON public.custom_domains(status);
CREATE INDEX IF NOT EXISTS idx_custom_domains_active_lookup 
  ON public.custom_domains(hostname) 
  WHERE status = 'ACTIVE';

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies on Custom Domains
-- Policy 1: Merchant Read Policy (All store members can view custom domains)
DROP POLICY IF EXISTS custom_domains_isolation_read ON public.custom_domains;
CREATE POLICY custom_domains_isolation_read ON public.custom_domains
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- Policy 2: Merchant Insert Policy (Strictly OWNER & ADMIN roles)
DROP POLICY IF EXISTS custom_domains_owner_admin_insert ON public.custom_domains;
CREATE POLICY custom_domains_owner_admin_insert ON public.custom_domains
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.merchant_id IN (
        SELECT m.merchant_id FROM public.memberships m
        WHERE m.user_id = auth.uid() 
          AND m.status = 'ACTIVE' 
          AND m.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Policy 3: Merchant Update Policy (Strictly OWNER & ADMIN roles)
DROP POLICY IF EXISTS custom_domains_owner_admin_update ON public.custom_domains;
CREATE POLICY custom_domains_owner_admin_update ON public.custom_domains
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.merchant_id IN (
        SELECT m.merchant_id FROM public.memberships m
        WHERE m.user_id = auth.uid() 
          AND m.status = 'ACTIVE' 
          AND m.role IN ('OWNER', 'ADMIN')
      )
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.merchant_id IN (
        SELECT m.merchant_id FROM public.memberships m
        WHERE m.user_id = auth.uid() 
          AND m.status = 'ACTIVE' 
          AND m.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- Policy 4: Merchant Delete Policy (Strictly OWNER & ADMIN roles)
DROP POLICY IF EXISTS custom_domains_owner_admin_delete ON public.custom_domains;
CREATE POLICY custom_domains_owner_admin_delete ON public.custom_domains
  FOR DELETE TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM public.stores s
      WHERE s.merchant_id IN (
        SELECT m.merchant_id FROM public.memberships m
        WHERE m.user_id = auth.uid() 
          AND m.status = 'ACTIVE' 
          AND m.role IN ('OWNER', 'ADMIN')
      )
    )
  );

-- 6. Hardened Storefront Resolution RPC (SECURITY DEFINER)
-- Used by SSR proxy and Storefront Layout to resolve an active custom domain to its published store
CREATE OR REPLACE FUNCTION public.resolve_store_by_custom_domain(p_hostname VARCHAR)
RETURNS TABLE (
  store_id UUID,
  handle VARCHAR,
  store_name VARCHAR,
  store_status public.store_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    s.id AS store_id,
    s.handle,
    s.name AS store_name,
    s.status AS store_status
  FROM public.custom_domains cd
  JOIN public.stores s ON cd.store_id = s.id
  WHERE cd.hostname = lower(trim(p_hostname))
    AND cd.status = 'ACTIVE'
    AND s.status = 'PUBLISHED'
  LIMIT 1;
$$;

-- 7. Postgres Role Grants
GRANT SELECT ON public.custom_domains TO authenticated, service_role;
GRANT ALL ON TABLE public.custom_domains TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_store_by_custom_domain(VARCHAR) TO anon, authenticated, service_role;

-- Revoke direct access on table from anonymous users
REVOKE ALL ON TABLE public.custom_domains FROM anon;

COMMIT;
