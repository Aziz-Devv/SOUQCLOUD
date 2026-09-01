Document: Entity: Memberships
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/users.md, docs/02-database/entities/merchants.md
Related Documents: docs/01-architecture/identity-and-membership-model.md, docs/01-architecture/security-authz.md
Decisions: Relational association connecting Users to Merchant Organizations with explicit roles and statuses.
Open Questions: None

# Database Entity: Memberships (`public.memberships`)

## 1. Purpose & Domain Scope

The `public.memberships` table connects a `User` to a `Merchant / Organization`. It establishes the user's role (`OWNER`, `ADMIN`, `STAFF`) and operational status within that organization.

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.membership_role AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE public.membership_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

CREATE TABLE public.memberships (
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

-- Indexes
CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_merchant_id ON public.memberships(merchant_id);
CREATE INDEX idx_memberships_lookup ON public.memberships(user_id, merchant_id, status);
```

---

## 3. Field Semantics & Constraints

* `id`: Unique UUID identifier for the membership record.
* `merchant_id`: Organization holding the membership.
* `user_id`: Platform user associated with the organization.
* `role`: `OWNER` (full control & billing), `ADMIN` (store and staff admin), `STAFF` (operational duties).
* `status`: `ACTIVE` (normal access), `INVITED` (awaiting acceptance), `SUSPENDED` (revoked access).
* `permissions`: Schema-driven JSONB object for granular permission overrides (e.g. `{"can_edit_theme": false}`).
* `CONSTRAINT uq_merchant_user`: Enforces that a user can only have one membership record per merchant organization.
