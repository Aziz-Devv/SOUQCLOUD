Document: Module: Storefront Rendering
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/multi-tenancy.md, docs/03-modules/theme-engine.md
Related Documents: docs/04-ux-ui/storefront-ux.md, docs/05-infrastructure/nextjs-structure.md
Decisions: Next.js 16 proxy.ts tenant resolution on Node.js runtime; React Server Component page rendering; lightweight client islands for cart and interactivity; Cloudflare Edge CDN caching.
Open Questions: None

# Module Specification: Storefront Rendering

## 1. Purpose
The Storefront Rendering module delivers the public customer-facing web application. It performs tenant resolution in Next.js `proxy.ts` on the Node.js runtime, fetches published catalog and layout data, injects theme CSS design tokens, and streams responsive, SEO-optimized markup to shoppers fronted by Cloudflare Edge CDN caching.

## 2. Data Model References
* `public.public_stores`: Deliberately restricted public storefront projection containing only approved storefront-safe fields (protects internal merchant ownership, billing, and operational data).
* `public.themes`: Active theme and design tokens.
* `public.pages`: Target page and configured sections.
* `public.products`: Catalog items rendered on PDP and collection pages.

## 3. Business Rules
1. Next.js 16 `proxy.ts` on the Node.js runtime inspects incoming hostname and resolves `store_id`.
2. Pages render via Server Components with Incremental Static Regeneration (ISR) or fast SSR for dynamic states.
3. Root HTML includes injected CSS variables generated from `theme.design_tokens`.
4. Client components are used strictly as interactive leaves (Cart Drawer trigger, Variant Selector, Image Zoom, Add to Cart button).
5. All images are rendered using responsive `next/image` components pointing to Cloudflare R2 CDN URLs.

## 4. API Contract & Public Routes
* `GET /` &rarr; Renders Homepage (`page_type = 'HOME'`).
* `GET /products/[handle]` &rarr; Renders Product Detail Page (PDP).
* `GET /collections/[handle]` &rarr; Renders Collection / Catalog Page.
* `GET /pages/[slug]` &rarr; Renders Custom Content / Policy Page.
* `GET /cart` &rarr; Renders Cart Page / Drawer.

## 5. UI/UX Reference
* Polished, mobile-first consumer experience adhering to the active theme's styling.
* Instant visual feedback on interactions, zero cumulative layout shift (CLS), sub-second Largest Contentful Paint (LCP).

## 6. Dependencies & Related Documents
* Dependencies: [multi-tenancy.md](../01-architecture/multi-tenancy.md), [theme-engine.md](../03-modules/theme-engine.md)
* Related Documents: [storefront-ux.md](../04-ux-ui/storefront-ux.md), [nextjs-structure.md](../05-infrastructure/nextjs-structure.md)

## 7. Acceptance Criteria (Given / When / Then)
* **Given** a published store with subdomain `shop.souqcloud.com`, **When** a shopper visits the root URL, **Then** the homepage renders with the merchant's configured sections and theme colors.
* **Given** a visitor browsing on mobile, **When** navigating to a product page, **Then** variant options (size/color) update pricing and image gallery seamlessly without page reloads.

## 8. Open Questions
* None.

## Implementation Status
* **Implementation Status**: Not Started
