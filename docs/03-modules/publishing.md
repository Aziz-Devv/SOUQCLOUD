Document: Module: Publishing
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md, docs/03-modules/store-builder-editor.md
Related Documents: docs/03-modules/storefront-rendering.md, docs/05-infrastructure/cloudflare-setup.md
Decisions: Multi-tier cache invalidation; origin Cache-Tag headers; Cloudflare Edge Purge API; distinct Next.js revalidateTag vs updateTag vs revalidatePath roles.
Open Questions: None

# Module Specification: Store Publishing & Status Lifecycle

## 1. Purpose
The Publishing module manages the lifecycle state of a Store and its public accessibility. It coordinates multi-tier cache invalidation across Next.js application caches and Cloudflare edge CDN caches when content changes are published.

---

## 2. Multi-Tier Cache Invalidation & Cache-Tag Semantics

```
[ Storefront Origin Response ]
  └── Injects Header: Cache-Tag: store_<storeId>, page_<pageId>, theme_<themeId>
        │
        ▼
[ Cloudflare Edge CDN ]
  └── Indexes cached page responses by Cache-Tags
        │
        ▼ (Merchant Clicks "Publish" in Dashboard)
[ Next.js Server Action ]
  ├── 1. Updates public.pages.sections from draft_sections
  ├── 2. Calls revalidateTag(`store_${storeId}`) for Next.js RSC data cache
  └── 3. Issues API POST to Cloudflare Purge API: {"tags": ["store_<storeId>"]}
        │
        ▼
[ Cloudflare Edge Immediately Evicts Tagged Entries ]
```

### Next.js Caching Roles:
* `revalidateTag(tag)`: Invalidates Server Component data caches across cluster nodes for subsequent fetches.
* `updateTag(tag)`: Forces immediate read-your-writes cache refresh within the active request context.
* `revalidatePath(path)`: Clears Next.js client-side router cache for specific route paths.
* **Edge Invariant**: Next.js cache revalidation does **not** automatically purge Cloudflare edge CDN cache; the server explicitly dispatches an API request to Cloudflare's Purge Cache endpoint.

---

## 3. Data Model References
* `public.stores.status`: Store lifecycle state (`DRAFT`, `PUBLISHED`, `MAINTENANCE`, `ARCHIVED`).
* `public.pages.is_published`: Per-page publication flag.

---

## 4. API Contract & Actions
* `publishStore(storeId: string)` &rarr; `ActionResult<{ status: StoreStatus; liveUrl: string }>`
* `unpublishStore(storeId: string)` &rarr; `ActionResult<{ status: StoreStatus }>`

---

## 5. Implementation Status
* **Implementation Status**: Not Started
