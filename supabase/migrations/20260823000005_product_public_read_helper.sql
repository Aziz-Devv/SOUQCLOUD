-- SOUQCLOUD Database Migration: Public Storefront Catalog Read Helper & RLS Alignment
-- Version: 20260823000005
-- Description: Establishes get_published_store_ids helper function and updates public storefront read policies.

BEGIN;

-- 1. Helper Function for Published Store IDs (Security Definer for public storefront access)
CREATE OR REPLACE FUNCTION public.get_published_store_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM public.stores WHERE status = 'PUBLISHED';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Update Public Product & Variant Read Policies
DROP POLICY IF EXISTS public_product_read ON public.products;
CREATE POLICY public_product_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'ACTIVE' AND
    store_id IN (SELECT public.get_published_store_ids())
  );

DROP POLICY IF EXISTS public_variant_read ON public.variants;
CREATE POLICY public_variant_read ON public.variants
  FOR SELECT TO anon, authenticated
  USING (
    store_id IN (SELECT public.get_published_store_ids()) AND
    product_id IN (SELECT id FROM public.products WHERE status = 'ACTIVE')
  );

-- 3. Grants
GRANT EXECUTE ON FUNCTION public.get_published_store_ids() TO anon, authenticated, service_role;

COMMIT;
