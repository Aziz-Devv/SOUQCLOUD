Document: Module: Media Assets
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/media-assets.md, docs/05-infrastructure/media-storage.md
Related Documents: docs/03-modules/products.md, docs/03-modules/theme-engine.md
Decisions: Direct-to-R2 presigned upload URLs; Public vs Private media classification; Signed URLs for private assets; Valid CORS origins.
Open Questions: None

# Module Specification: Media Asset Management

## 1. Purpose
The Media Assets module manages the upload, storage, optimization, cataloging, and secure delivery of merchant binary assets. It enforces a strict distinction between **Public Storefront Media** (CDN distributed) and **Private Sensitive Media** (signed URL access).

---

## 2. Media Visibility & Access Tiers

1. **Public Media Assets (`visibility = 'PUBLIC'`)**:
   * Usage: Product photography, collection banners, brand logos, theme background images.
   * Delivery: Delivered globally via public CDN (`https://cdn.souqcloud.com/stores/<store_id>/public/...`).
2. **Private Media Assets (`visibility = 'PRIVATE'`)**:
   * Usage: Merchant tax invoices, customer packing slips, internal data exports.
   * Delivery: `public_url` is `NULL`. Accessible exclusively via short-lived (15-minute) authenticated presigned download URLs generated server-side.

---

## 3. Data Model References
* `public.media_assets`: Metadata, dimensions, visibility, mime type, and storage keys.
* Cloudflare R2 Object Storage: Physical binary storage.

---

## 4. Business Rules
1. Files are uploaded directly from the browser to Cloudflare R2 using short-lived presigned upload URLs generated server-side.
2. Supported MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `image/gif`, `application/pdf` (private docs only).
3. Maximum file size per asset: 15 MB.
4. Assets are scoped strictly to the uploading `store_id` in database records and storage bucket directory prefixes (`stores/<store_id>/...`).
5. Image dimensions (width, height) are recorded upon upload to eliminate Cumulative Layout Shift (CLS) on storefronts.

---

## 5. API Contract & Actions
* `createPresignedUploadUrl(filename: string, mimeType: string, fileSize: number, visibility: MediaVisibility)` &rarr; `ActionResult<{ uploadUrl: string; storageKey: string; publicUrl: string | null }>`
* `registerMediaAsset(input: RegisterMediaInput)` &rarr; `ActionResult<{ mediaAssetId: string; publicUrl: string | null }>`
* `getPrivateAssetDownloadUrl(assetId: string)` &rarr; `ActionResult<{ downloadUrl: string; expiresAt: string }>`
* `getStoreMediaAssets(filters: MediaFilters)` &rarr; `ActionResult<{ assets: MediaAsset[]; total: number }>`
* `deleteMediaAsset(id: string)` &rarr; `ActionResult<void>`

---

## 6. UI/UX Reference
* Media Gallery modal and picker embedded within Product edit forms and Theme Customizer.
* Drag-and-drop file upload target with upload progress bars, thumbnail preview grid, and alt-text editing.

---

## 7. Dependencies & Related Documents
* Dependencies: [media-assets.md (Entity)](../02-database/entities/media-assets.md), [media-storage.md](../05-infrastructure/media-storage.md)
* Related Documents: [products.md](../03-modules/products.md), [store-builder-editor.md](../03-modules/store-builder-editor.md)

---

## 8. Acceptance Criteria (Given / When / Then)
* **Given** a merchant uploading a public product image, **When** upload completes, **Then** `visibility` is set to `PUBLIC` and the public CDN URL is available for the product gallery.
* **Given** a private invoice asset, **When** accessed by an unauthorized user, **Then** direct CDN access is rejected and a presigned URL request requires verified merchant session credentials.

---

## 9. Open Questions
* None.

---

## Implementation Status
* **Implementation Status**: Not Started
