-- SOUQCLOUD Database Migration: Theme Engine & Storefront Pages
-- Version: 20260823000006
-- Description: Establishes public.themes, public.pages, page_type enum, indexes, RLS policies, and role grants.

BEGIN;

-- 1. Create Page Type Enum
DO $$ BEGIN
  CREATE TYPE public.page_type AS ENUM ('HOME', 'PRODUCT', 'COLLECTION', 'CART', 'PAGE', 'POLICY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create Themes Table
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  theme_template_id VARCHAR(100) NOT NULL DEFAULT 'default-modern',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  design_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_themes_id_store UNIQUE (id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_themes_store_id ON public.themes(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_active_store ON public.themes(store_id) WHERE (is_active = TRUE);

-- 3. Create Pages Table
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  page_type public.page_type NOT NULL DEFAULT 'PAGE',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pages_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_page_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_store ON public.pages(store_id);
CREATE INDEX IF NOT EXISTS idx_pages_lookup ON public.pages(store_id, slug, is_published);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies on Themes
DROP POLICY IF EXISTS theme_isolation_read ON public.themes;
CREATE POLICY theme_isolation_read ON public.themes
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS public_theme_read ON public.themes;
CREATE POLICY public_theme_read ON public.themes
  FOR SELECT TO anon, authenticated
  USING (
    is_active = TRUE AND
    store_id IN (SELECT public.get_published_store_ids())
  );

DROP POLICY IF EXISTS theme_merchant_insert ON public.themes;
CREATE POLICY theme_merchant_insert ON public.themes
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS theme_merchant_update ON public.themes;
CREATE POLICY theme_merchant_update ON public.themes
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS theme_merchant_delete ON public.themes;
CREATE POLICY theme_merchant_delete ON public.themes
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- 6. Define RLS Policies on Pages
DROP POLICY IF EXISTS page_isolation_read ON public.pages;
CREATE POLICY page_isolation_read ON public.pages
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS public_page_read ON public.pages;
CREATE POLICY public_page_read ON public.pages
  FOR SELECT TO anon, authenticated
  USING (
    is_published = TRUE AND
    store_id IN (SELECT public.get_published_store_ids())
  );

DROP POLICY IF EXISTS page_merchant_insert ON public.pages;
CREATE POLICY page_merchant_insert ON public.pages
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS page_merchant_update ON public.pages;
CREATE POLICY page_merchant_update ON public.pages
  FOR UPDATE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()))
  WITH CHECK (store_id IN (SELECT public.get_authenticated_store_ids()));

DROP POLICY IF EXISTS page_merchant_delete ON public.pages;
CREATE POLICY page_merchant_delete ON public.pages
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- 7. Postgres Role Grants
GRANT ALL ON TABLE public.themes TO authenticated, service_role;
GRANT ALL ON TABLE public.pages TO authenticated, service_role;
GRANT SELECT ON TABLE public.themes TO anon;
GRANT SELECT ON TABLE public.pages TO anon;

COMMIT;
