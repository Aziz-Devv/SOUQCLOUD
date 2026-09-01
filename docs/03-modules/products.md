Document: Module: Products
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/products.md, docs/02-database/entities/stores.md
Related Documents: docs/03-modules/media-assets.md, docs/03-modules/checkout.md
Decisions: Products support single and multi-variant options; inventory tracked at variant level; prices stored in integer cents.
Open Questions: None

# Module Specification: Product & Catalog Management

## 1. Purpose
The Products module enables merchants to create, update, organize, and manage physical and digital merchandise, variant configurations (e.g. size/color options), inventory levels, pricing, and media attachments.

## 2. Data Model References
* `public.products`: Parent merchandise item listing.
* `public.variants`: Specific purchasable SKUs with pricing and stock.
* `public.media_assets`: Uploaded imagery associated with products.

## 3. Business Rules
1. Every product must have a title, URL slug handle, price (greater than or equal to 0), and at least one variant.
2. If no options are specified by the merchant, a default variant is created automatically.
3. When options are added (e.g., Size: S, M, L), variants are generated for all valid combinations.
4. Product prices and compare-at prices are validated as non-negative integers in cents.
5. Inventory stock can be tracked or set to allow backorders.
6. Product handles must be unique within the store.

## 4. API Contract & Actions
* `getProducts(filters: ProductFilters)` &rarr; `ActionResult<{ products: Product[]; total: number }>`
* `getProductById(id: string)` &rarr; `ActionResult<ProductDetail>`
* `createProduct(input: CreateProductInput)` &rarr; `ActionResult<{ productId: string }>`
* `updateProduct(id: string, input: UpdateProductInput)` &rarr; `ActionResult<{ productId: string }>`
* `deleteProduct(id: string)` &rarr; `ActionResult<void>`
* `updateVariantInventory(variantId: string, quantity: number)` &rarr; `ActionResult<void>`

## 5. UI/UX Reference
* Product List View: Search, status filter tabs (All, Active, Draft, Archived), inventory indicators, bulk actions.
* Product Detail / Edit Form: Two-column layout (Main details on left, Organization/Status/Media on right), interactive Variant Matrix table, drag-and-drop media gallery.

## 6. Dependencies & Related Documents
* Dependencies: [products.md (Entity)](../02-database/entities/products.md), [stores.md](../02-database/entities/stores.md)
* Related Documents: [media-assets.md](../03-modules/media-assets.md), [storefront-rendering.md](../03-modules/storefront-rendering.md)

## 7. Acceptance Criteria (Given / When / Then)
* **Given** valid product details, **When** a merchant creates a product with options (e.g., Small, Medium), **Then** the product and corresponding variant records are created in `DRAFT` or `ACTIVE` status.
* **Given** an existing product, **When** the title is updated, **Then** the record updates, revalidates cache, and past orders remain unaffected.

## 8. Open Questions
* None.

## Implementation Status
* **Implementation Status**: Not Started
