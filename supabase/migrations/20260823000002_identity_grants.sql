-- SOUQCLOUD Database Migration: Identity & Memberships Postgres Role Grants
-- Version: 20260823000002
-- Description: Explicitly grants schema and table privileges to authenticated and service_role.

BEGIN;

-- 1. Postgres Role Grants on Identity Tables
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.merchants TO authenticated;
GRANT ALL ON TABLE public.memberships TO authenticated;

GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.merchants TO service_role;
GRANT ALL ON TABLE public.memberships TO service_role;

-- 2. Function Execution Grants
GRANT EXECUTE ON FUNCTION public.get_authenticated_merchant_ids() TO authenticated, service_role;

COMMIT;
