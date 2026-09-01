Document: Coding Standards
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/architecture-rules.md, docs/05-infrastructure/nextjs-structure.md
Related Documents: docs/06-process/TESTING_STANDARDS.md, docs/06-process/AI_DEVELOPMENT_PROTOCOL.md
Decisions: TypeScript Strict Mode; ESLint/Prettier rules; React Server Components by default; Zod validation at all boundaries.
Open Questions: None

# Platform Coding Standards & Conventions

## 1. Core Principles

* **TypeScript Everywhere**: Full strict mode (`strict: true`, `noImplicitAny: true`). Zero usage of `any`; use `unknown` with runtime type narrowing.
* **Server-First Execution**: Default to React Server Components (RSC). Client Components (`'use client'`) must remain lightweight leaf nodes.
* **Explicit Over Implicit**: Explicit return types for public functions, Server Actions, and API Route Handlers.

---

## 2. Directory & File Naming Conventions

* **Files & Directories**: `kebab-case` for utility files, components, and routes (e.g. `product-card.tsx`, `use-cart-drawer.ts`).
* **Component Names**: `PascalCase` for React components (e.g. `export function ProductCard()`).
* **Types & Interfaces**: `PascalCase` with descriptive nouns (e.g. `CreateProductInput`, `OrderDetail`).
* **Constants**: `SCREAMING_SNAKE_CASE` for global constant values (e.g. `DEFAULT_PAGE_SIZE = 25`).

---

## 3. Server Actions & Mutations Standards

```typescript
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ActionResult } from '@/lib/types';
import { CreateProductSchema } from '@/lib/schemas/product';

export async function createProductAction(
  rawInput: unknown
): Promise<ActionResult<{ productId: string }>> {
  // 1. Validate Input
  const parseResult = CreateProductSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid product details provided.',
        details: parseResult.error.errors.map(e => ({ field: e.path.join('.'), issue: e.message }))
      }
    };
  }

  // 2. Authenticate & Authorize
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };
  }

  // 3. Execute Scoped Mutation
  const { data, error } = await supabase
    .from('products')
    .insert({ ...parseResult.data })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create product.' } };
  }

  return { success: true, data: { productId: data.id } };
}
```

---

## 4. Code Quality & Formatting

* All files formatted with Prettier (2 spaces, single quotes, trailing commas).
* Zero ESLint warnings tolerated in CI build pipelines.
