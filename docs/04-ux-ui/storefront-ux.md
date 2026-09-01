Document: Storefront UX
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/04-ux-ui/ux-principles.md, docs/03-modules/storefront-rendering.md
Related Documents: docs/03-modules/checkout.md, docs/04-ux-ui/user-flows.md
Decisions: Consumer shopping experience specifications: mobile PDP ergonomics, slide-over cart, streamlined order submission, "إتمام الطلب" CTA, confirmation receipt and WhatsApp redirection.
Open Questions: None

# Storefront UX Specification

## 1. Overview & Experience Goals

The Public Storefront is the consumer-facing shopping application. Its design prioritizes **sub-second page loads, zero visual friction, intuitive navigation, and high order submission conversion**.

---

## 2. Core Storefront Surfaces

### 2.1 Header & Navigation
* **Sticky Brand Bar**: Brand logo/title, navigation menu links, search trigger, cart counter badge.
* **Mobile Drawer**: Slide-out hamburger navigation with large touch targets (48px height) and currency/language pickers.
* **Announcement Bar**: Optional dismissible top banner for promotions or free shipping notices.

### 2.2 Product Detail Page (PDP)
* **Desktop (Two-Column Layout)**:
  * **Left Column**: High-resolution image gallery (main view + thumbnail selector).
  * **Right Column (Sticky)**: Product title, price (with compare-at strike-through if on sale), stock status badge, Option selectors (Size pills, Color swatches), Quantity stepper, "Add to Cart" button.
* **Mobile Layout**:
  * Swipeable image carousel with pagination dots.
  * Sticky bottom action bar with price and "Add to Cart" button.

### 2.3 Slide-Over Cart Drawer
* Triggered immediately upon clicking "Add to Cart" (or clicking header cart icon).
* Shows:
  * Line items with image thumbnails, selected variant labels, unit price, quantity steppers, and remove buttons.
  * Free shipping progress meter (if configured).
  * Subtotal summary.
  * Primary "Proceed to Order Submission" button.

### 2.4 Streamlined Order Submission Flow
* Focused, distraction-free layout (header displays store logo; no distracting links).
* **Customer Contact Details**:
  * Full Name (Required)
  * Phone Number (Required, with country code selector)
  * Email Address (Optional)
* **Delivery Information**:
  * Street Address, City, Country
* **Order Notes**:
  * Special instructions or delivery notes field.
* **Order Summary Card**:
  * Itemized line items, Subtotal, Delivery Fee, Tax, Total amount.
* **Primary Submission CTA**:
  * Arabic: **`إتمام الطلب`**
  * English: **`Confirm Order`**

### 2.5 Order Confirmation & WhatsApp Outcomes
* Protected URL: `/orders/[orderId]/confirmation?token=[confirmationToken]` (Requires matching token; raw order ID alone cannot view details).
1. **DASHBOARD Mode Outcome**: Displays confirmation screen with order number (`#1001`), order details, and notice that the merchant will reach out to confirm delivery.
2. **WHATSAPP Mode Outcome**: Displays confirmation and immediately launches WhatsApp with the pre-compiled order summary to the merchant's number.
3. **BOTH Mode Outcome**: Displays confirmation receipt with a prominent green **"Complete via WhatsApp"** button.
