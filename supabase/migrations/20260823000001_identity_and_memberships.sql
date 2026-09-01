-- SOUQCLOUD Database Migration: Identity & Memberships Foundation
-- Version: 20260823000001
-- Description: Establishes public.users, public.merchants, public.memberships, triggers, and RLS policies.

BEGIN;

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.merchant_status AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_role AS ENUM ('OWNER', 'ADMIN', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.membership_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Application Users Table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. Create Merchant Organizations Table
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status public.merchant_status NOT NULL DEFAULT 'TRIAL',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchants_slug ON public.merchants(slug);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);

-- 4. Create Memberships Association Table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.membership_role NOT NULL DEFAULT 'STAFF',
  status public.membership_status NOT NULL DEFAULT 'ACTIVE',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_merchant_user UNIQUE (merchant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_merchant_id ON public.memberships(merchant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_lookup ON public.memberships(user_id, merchant_id, status);

-- 5. Helper Functions for Tenant Scoping & Security
CREATE OR REPLACE FUNCTION public.get_authenticated_merchant_ids()
RETURNS SETOF UUID AS $$
  SELECT merchant_id FROM public.memberships
  WHERE user_id = auth.uid() AND status = 'ACTIVE';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. PostgreSQL Triggers for Canonical auth.users Synchronization
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.email <> OLD.email THEN
    UPDATE public.users
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_email_update();

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 8. Define RLS Policies
-- Users RLS
DROP POLICY IF EXISTS users_self_manage ON public.users;
CREATE POLICY users_self_manage ON public.users
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Merchants RLS
DROP POLICY IF EXISTS merchant_isolation_read ON public.merchants;
CREATE POLICY merchant_isolation_read ON public.merchants
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_authenticated_merchant_ids()));

DROP POLICY IF EXISTS merchant_onboarding_insert ON public.merchants;
CREATE POLICY merchant_onboarding_insert ON public.merchants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS merchant_isolation_update ON public.merchants;
CREATE POLICY merchant_isolation_update ON public.merchants
  FOR UPDATE TO authenticated
  USING (id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN')
  ))
  WITH CHECK (id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role IN ('OWNER', 'ADMIN')
  ));

-- Memberships RLS
DROP POLICY IF EXISTS membership_read ON public.memberships;
CREATE POLICY membership_read ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR merchant_id IN (SELECT public.get_authenticated_merchant_ids()));

DROP POLICY IF EXISTS membership_onboarding_insert ON public.memberships;
CREATE POLICY membership_onboarding_insert ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS membership_owner_manage ON public.memberships;
CREATE POLICY membership_owner_manage ON public.memberships
  FOR UPDATE TO authenticated
  USING (merchant_id IN (
    SELECT merchant_id FROM public.memberships
    WHERE user_id = auth.uid() AND status = 'ACTIVE' AND role = 'OWNER'
  ));

COMMIT;
