Document: Supabase Setup
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/schema-overview.md, docs/01-architecture/security-authz.md
Related Documents: docs/02-database/migrations/README.md, docs/05-infrastructure/nextjs-structure.md
Decisions: Supabase SSR client factories; PgBouncer connection pooling; modern Publishable vs Secret key terminology; Postgres Grants + RLS dual authorization; direct SQL migrations and Supabase TypeScript client.
Open Questions: None

# Supabase Infrastructure & Client Configuration

## 1. Overview & Components

Supabase provides the managed **PostgreSQL Database**, **Supabase Auth**, and connection pooling. Schema management uses native SQL migrations via the Supabase CLI, and data access uses `@supabase/ssr` with modern key terminology.

---

## 2. Environment Variables & Key Terminology

```bash
# Public Publishable Key (Browser-safe & Edge-safe)
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsIn...

# Server-Only Secret Key (STRICTLY SERVER-ONLY - Restricted to Paddle Webhooks & System Workers)
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsIn...

# Direct Database Connection URL (for Supabase CLI migrations)
DATABASE_URL=postgresql://postgres:[password]@db.<project-id>.supabase.co:5432/postgres
```

---

## 3. Client Factory Initialization (`@supabase/ssr`)

### 3.1 Authenticated Client (Default for Application Code)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Component
          }
        },
      },
    }
  );
}
```

### 3.2 Privileged System Admin Client (`createAdminClient`)
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// RESTRICTED: Used exclusively in backend Paddle billing webhooks and async background workers
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

---

## 4. Key Rules & Constraints

> **CRITICAL SECURITY INVARIANTS**:
> 1. `SUPABASE_SECRET_KEY` must **never** appear in client-side code, public GitHub repositories, or browser bundles.
> 2. Standard merchant and customer operations must **always** use `createClient()` subject to Postgres Grants and RLS policies.
> 3. Direct table mutation grants (`INSERT/UPDATE/DELETE`) on `carts`, `cart_lines`, `orders`, and `order_line_items` are revoked from `anon`. Commerce mutations execute through Server Actions and the `submit_storefront_order` RPC function.
> 4. `createAdminClient()` is permitted strictly for Paddle SaaS subscription webhook processing, background workers, and migration runner scripts.
