-- SOUQCLOUD Database Migration: Media Assets Catalog & Cloudflare R2 Integration
-- Version: 20260823000010
-- Description: Establishes public.media_visibility enum, public.media_assets table,
--              composite unique constraints, check constraints, RLS policies, indexes, and grants.

BEGIN;

-- 1. Media Visibility Enum
DO $$ BEGIN
  CREATE TYPE public.media_visibility AS ENUM ('PUBLIC', 'PRIVATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Media Assets Table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  visibility public.media_visibility NOT NULL DEFAULT 'PUBLIC',
  width INTEGER NULL,
  height INTEGER NULL,
  alt_text VARCHAR(255) NULL,
  public_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_media_assets_id_store UNIQUE (id, store_id),
  CONSTRAINT chk_media_visibility_url CHECK (
    (visibility = 'PUBLIC' AND public_url IS NOT NULL) OR
    (visibility = 'PRIVATE' AND public_url IS NULL)
  ),
  CONSTRAINT chk_media_pdf_private CHECK (
    mime_type != 'application/pdf' OR visibility = 'PRIVATE'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_store ON public.media_assets(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_visibility ON public.media_assets(store_id, visibility);

-- 3. Row Level Security (RLS)
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Anonymous & Authenticated: Read public assets metadata belonging to published stores (aligned with public_product_read / public_theme_read)
DROP POLICY IF EXISTS public_media_read ON public.media_assets;
DROP POLICY IF EXISTS public_media_anon_read ON public.media_assets;
CREATE POLICY public_media_read ON public.media_assets
  FOR SELECT TO anon, authenticated
  USING (
    visibility = 'PUBLIC' AND
    store_id IN (SELECT public.get_published_store_ids())
  );

-- Authenticated: Full management on owned store assets
DROP POLICY IF EXISTS media_merchant_isolation ON public.media_assets;
DROP POLICY IF EXISTS merchant_media_isolation ON public.media_assets;
CREATE POLICY media_merchant_isolation ON public.media_assets
  FOR ALL TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));

-- 4. Table-Level Grants
GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;

COMMIT;
