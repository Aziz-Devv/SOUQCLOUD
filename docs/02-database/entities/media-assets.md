Document: Entity: Media Assets
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/05-infrastructure/media-storage.md
Related Documents: docs/02-database/entities/products.md, docs/03-modules/media-assets.md
Decisions: Explicit visibility classification (PUBLIC vs PRIVATE); anonymous read access restricted strictly to PUBLIC assets; signed URL access for private media; Cloudflare R2 storage; Composite Unique Key for tenant isolation.
Open Questions: None

# Database Entity: Media Assets (`public.media_assets`)

## 1. Purpose & Domain Scope

The `public.media_assets` table catalogs binary media files uploaded by merchants to Cloudflare R2. It distinguishes between **Public Assets** (product photos, storefront banners) and **Private Assets** (customer receipts, merchant invoices) to guarantee data privacy.

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.media_visibility AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  storage_key VARCHAR(500) NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  visibility public.media_visibility NOT NULL DEFAULT 'PUBLIC',
  width INTEGER NULL,
  height INTEGER NULL,
  alt_text VARCHAR(255) NULL,
  public_url TEXT NULL, -- Populated only when visibility = 'PUBLIC'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_media_assets_id_store UNIQUE (id, store_id)
);

-- Indexes
CREATE INDEX idx_media_assets_store ON public.media_assets(store_id, created_at DESC);
CREATE INDEX idx_media_assets_visibility ON public.media_assets(store_id, visibility);
```

---

## 3. Field Semantics & Access Invariants

* **Visibility**:
  * `PUBLIC`: Standard merchandise images, brand logos, theme banners. Delivered globally via CDN (`https://cdn.souqcloud.com/...`). `public_url` is populated.
  * `PRIVATE`: Sensitive assets (invoices, receipts, export data). `public_url` is `NULL`. Accessible only via short-lived (15-minute) signed download URLs generated server-side.
* **Storage Key Format**:
  * Public: `stores/<store_id>/public/<uuid>-<filename>`
  * Private: `stores/<store_id>/private/<uuid>-<filename>`
* **Composite Constraint**: `CONSTRAINT uq_media_assets_id_store` supports composite foreign keys from product image associations.

---

## 4. Row Level Security & Authorization Policies

```sql
-- Anonymous Role: SELECT on PUBLIC media only
CREATE POLICY public_media_anon_read ON public.media_assets
  FOR SELECT TO anon
  USING (visibility = 'PUBLIC');

-- Authenticated Role: Manage media for authorized stores
CREATE POLICY merchant_media_isolation ON public.media_assets
  FOR ALL TO authenticated
  USING (store_id IN (SELECT public.get_authenticated_store_ids()));
```
