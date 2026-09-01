Document: Entity: Themes
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/01-architecture/decisions/ADR-003-schema-driven-theme-engine.md
Related Documents: docs/02-database/entities/pages.md, docs/03-modules/theme-engine.md
Decisions: Schema-driven theme settings stored in JSONB; active theme flagged per store; content pages are preserved on theme activation; composite unique constraints for tenant isolation.
Open Questions: None

# Database Entity: Themes (`public.themes`)

## 1. Purpose & Domain Scope

The `public.themes` table stores installed theme templates and visual design configurations for a Store. It holds design tokens (typography, color palettes, spacing) and global storefront settings. Themes provide layout component schemas while store content pages (`public.pages`) persist independently.

---

## 2. Table Schema Definition

```sql
CREATE TABLE public.themes (
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

-- Indexes
CREATE INDEX idx_themes_store_id ON public.themes(store_id);
CREATE UNIQUE INDEX idx_themes_active_store ON public.themes(store_id) WHERE (is_active = TRUE);
```

---

## 3. Field Semantics & Constraints

* `id`: Unique UUID identifier for the theme instance.
* `store_id`: Store owning this theme configuration.
* `name`: Custom name given by the merchant (e.g., "Aura Studio Theme - Fall 2026").
* `theme_template_id`: Identifier of the baseline code template (e.g. `'default-modern'`).
* `is_active`: Boolean flag. Exactly one theme per store may have `is_active = TRUE`, enforced by the partial unique index `idx_themes_active_store`.
* `design_tokens`: JSONB structure containing CSS custom property definitions.
* `CONSTRAINT uq_themes_id_store`: Enforces composite integrity for child references.
