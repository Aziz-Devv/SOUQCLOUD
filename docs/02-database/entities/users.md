Document: Entity: Users
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/identities.md, docs/01-architecture/identity-and-membership-model.md
Related Documents: docs/02-database/entities/memberships.md, docs/03-modules/auth.md
Decisions: public.users mirrors auth.users 1:1; email strictly synchronized via PostgreSQL trigger; id is identical to auth.uid().
Open Questions: None

# Database Entity: Users (`public.users`)

## 1. Purpose & Domain Scope

The `public.users` table represents the platform-wide profile record for an authenticated person. It corresponds 1:1 with a Supabase Auth `auth.users` record and links users to Merchant Organizations via `public.memberships`.

---

## 2. Table Schema Definition

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON public.users(email);
```

---

## 3. Field Semantics & Invariants

* `id`: Primary key, identical to `auth.users.id` (`auth.uid()`).
* `email`: Synced automatically from `auth.users.email` via the `on_auth_user_email_updated` trigger.
* `full_name`: User's display name.
* `avatar_url`: Optional public URL to user's profile avatar.
* `updated_at`: Automatically refreshed on profile or email modifications.
