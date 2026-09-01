Document: Entity: Pages & Sections
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/01-architecture/decisions/ADR-003-schema-driven-theme-engine.md
Related Documents: docs/02-database/entities/themes.md, docs/03-modules/store-builder-editor.md, docs/03-modules/storefront-rendering.md
Decisions: Pages are store-owned and persist across theme switches; dual revision model (sections for live storefront, draft_sections for builder preview); optimistic concurrency via version field.
Open Questions: None

# Database Entity: Pages & Sections (`public.pages`)

## 1. Purpose & Domain Scope

The `public.pages` table represents routable content views within a Storefront. Pages belong directly to a **Store** and persist their section content across theme activations. A dual revision structure isolates draft customizations in the Store Builder from live storefront shoppers.

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.page_type AS ENUM ('HOME', 'PRODUCT', 'COLLECTION', 'CART', 'PAGE', 'POLICY');

CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  page_type public.page_type NOT NULL DEFAULT 'PAGE',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,        -- Live published layout
  draft_sections JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Visual editor working revision
  version INTEGER NOT NULL DEFAULT 1,                 -- Optimistic concurrency tracking
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pages_id_store UNIQUE (id, store_id),
  CONSTRAINT uq_store_page_slug UNIQUE (store_id, slug)
);

-- Indexes
CREATE INDEX idx_pages_store ON public.pages(store_id);
CREATE INDEX idx_pages_lookup ON public.pages(store_id, slug, is_published);
```

---

## 3. Optimistic Concurrency Invariant

* To prevent concurrent editor sessions from silently overwriting newer edits, updating `draft_sections` executes a Compare-And-Swap (CAS):
  ```sql
  UPDATE public.pages
  SET draft_sections = $draft_sections, version = version + 1, updated_at = NOW()
  WHERE id = $id AND store_id = $store_id AND version = $expected_version;
  ```
* If the row count returned is 0, the server rejects the request with a `409 Conflict` error, instructing the client to reload the latest revision.
