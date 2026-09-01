Document: Entity: Merchants
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/identity-and-membership-model.md, docs/02-database/schema-overview.md
Related Documents: docs/02-database/entities/stores.md, docs/02-database/entities/memberships.md
Decisions: public.merchants represents the top-level commercial organization account.
Open Questions: None

# Database Entity: Merchants (`public.merchants`)

## 1. Purpose & Domain Scope

The `public.merchants` table represents the top-level **Merchant / Organization** account. It serves as the primary commercial and legal entity, holding ownership over stores, billing arrangements, and staff memberships.

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.merchant_status AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED');

CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  status public.merchant_status NOT NULL DEFAULT 'TRIAL',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_merchants_slug ON public.merchants(slug);
CREATE INDEX idx_merchants_status ON public.merchants(status);
```

---

## 3. Field Semantics & Constraints

* `id`: Unique UUID identifier for the merchant organization.
* `name`: Commercial business or organization name (e.g., "Apex Retail Group").
* `slug`: URL-safe unique organizational identifier.
* `status`: Commercial account state (`ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`).
* `settings`: Organization-level preferences, billing references, and contact details.

---

## 4. Row Level Security (RLS)

* **Access Rule**: Authenticated users can view and mutate merchant data only if they hold an active membership (`role IN ('OWNER', 'ADMIN')`) for that `merchant_id`.
