Document: User Flows
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/phase-1-scope.md, docs/00-product/personas-and-use-cases.md
Related Documents: docs/04-ux-ui/information-architecture.md, docs/04-ux-ui/dashboard-ux.md, docs/04-ux-ui/storefront-ux.md
Decisions: Core end-to-end user journeys mapped across merchant and shopper personas; Order Submission with Dashboard/WhatsApp outcomes.
Open Questions: None

# Core User Flows & Journeys

## 1. Overview

This document specifies the step-by-step user interaction flows for the primary tasks executed by Merchants and Storefront Shoppers.

---

## 2. Flow 1: Merchant Onboarding & Store Creation

```
[ Signup Form ]
  ├── Enter Email, Password, Full Name
  ▼
[ Email Verification Screen ]
  ├── Enter 6-digit OTP code or click verification link
  ▼
[ Store Setup Wizard ]
  ├── 1. Enter Brand Name (e.g., "Aura Studio")
  ├── 2. Enter Desired Subdomain Handle (e.g., aura-studio.souqcloud.com)
  ├── 3. Select Operating Country (default_country_code), Currency & Default Locale
  ├── 4. Select Store Order Mode (DASHBOARD, WHATSAPP, BOTH) & WhatsApp Number
  ▼
[ Automated Seeding Progress ]
  ├── Initializes Organization, Owner Membership, Store, Default Theme, Default Pages
  ▼
[ Merchant Dashboard Overview (/app/home) ]
```

---

## 3. Flow 2: Adding a Product with Variants & Media

```
[ /app/products/new ]
  ├── Enter Title & Rich Text Description
  ├── Drag & drop image files to Media Gallery (Auto-upload to R2)
  ├── Enter Base Price in cents
  ├── Toggle "This product has options" (Size, Color)
  ├── Set individual SKU, Price, and Inventory stock per variant
  ▼
[ Click "Save Product" ]
  ├── Inline Zod validation
  ├── Server Action saves Product & Variants atomically
  ▼
[ Redirect to /app/products/[id] ]
```

---

## 4. Flow 3: Theme Customization in Store Builder

```
[ /app/online-store/themes ]
  └── Click "Customize" on Active Theme
  ▼
[ /app/online-store/themes/[id]/editor ]
  ├── Left Sidebar: Page hierarchy (Header, Sections list, Footer)
  ├── Center: Live Iframe Preview
  ├── Action: Add/Reorder Section -> Updates preview via postMessage
  ▼
[ Click "Save" ]
  └── Persists draft_sections using version CAS
```

---

## 5. Flow 4: Storefront Customer Order Submission (End-to-End)

```
[ Shopper visits store.souqcloud.com ]
  ├── Browses homepage sections, clicks featured product
  ▼
[ Product Detail Page (/products/t-shirt) ]
  ├── Selects Variant -> Clicks "Add to Cart"
  ▼
[ Slide-over Cart Drawer ]
  ├── Reviews items, clicks "Proceed to Order"
  ▼
[ Order Submission Page (/checkout) ]
  ├── Enters Full Name & Phone Number (Required)
  ├── Enters Delivery Address & Optional Notes
  ├── Reviews items, delivery fee, and tax snapshot
  ├── Clicks Primary CTA: "إتمام الطلب" ("Confirm Order")
  ▼
[ Server Validation & DB Transaction ]
  ├── Server creates Order in PostgreSQL (Status: NEW)
  ├── Decrements variant stock
  ▼
[ Outcome based on Store Order Mode ]
  ├── DASHBOARD Mode: Web Order Confirmation receipt (/orders/[id]/confirmation?token=...)
  ├── WHATSAPP Mode: Automatic redirection to merchant WhatsApp with order text
  └── BOTH Mode: Web Confirmation screen + prominent "Complete via WhatsApp" button
```

---

## 6. Flow 5: Merchant Order Management & Fulfillment

```
[ Merchant receives New Order Alert ]
  ▼
[ Navigates to /app/orders ]
  ├── Clicks new order #1001 (Status: "NEW")
  ▼
[ Order Detail Page (/app/orders/[id]) ]
  ├── Inspects customer details and ordered line items
  ├── Option: Clicks "Contact via WhatsApp" to open pre-filled customer chat
  ├── Updates Status: NEW -> CONTACTED -> CONFIRMED -> PREPARING -> READY -> DELIVERED
  ▼
[ Success Toast: "Order updated successfully" ]
```
