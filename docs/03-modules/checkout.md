Document: Module: Order Submission & Checkout
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/00-product/glossary.md, docs/02-database/entities/orders.md, docs/02-database/entities/customers.md, docs/01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md
Related Documents: docs/03-modules/orders.md, docs/01-architecture/api-architecture.md
Decisions: Frictionless Order Submission without online payment; Store Order Modes (DASHBOARD, WHATSAPP, BOTH); Server-side order creation before WhatsApp redirect; Primary CTA "إتمام الطلب"; exact integer tax calculation (tax-included vs tax-added); order confirmation token privacy.
Open Questions: None

# Module Specification: Order Submission & WhatsApp Integration

## 1. Purpose
The Order Submission module transitions a customer's cart into a canonical merchant Order. It captures customer contact details (Name, Phone) and delivery info, calculates deterministic delivery and tax snapshots, executes atomic inventory decrements and order creation in PostgreSQL, and directs the customer to the appropriate outcome based on the Store's configured Order Mode (`DASHBOARD`, `WHATSAPP`, `BOTH`).

---

## 2. Cart Session Security & Ownership Binding

* **Session Token Generation**: Server-generated cryptographically secure opaque UUID/session token, bound to the store and protected by an HttpOnly/Secure cookie (`souqcloud_cart_token`).
* **Cart Binding & Anti-Tampering**: Order Submission strictly verifies `store_id + cart_id + session_token`. A customer cannot submit another user's cart without holding the secret session token.
* **Server-Side Validation**: All cart state queries and modifications execute via Server Actions that validate stock and variant existence server-side. Direct database mutations are revoked from anonymous clients.

---

## 3. Storefront Order Submission Flow

```
 [ 1. Cart Review ]
         │
         ▼ (Proceed to Order Submission)
 [ 2. Enter Customer Details ]
   ├── Full Name & Phone Number (Required)
   ├── Email Address & Shipping Address (Optional / Configurable)
   └── Customer Order Notes
         │
         ▼ (Customer Clicks Primary CTA: "إتمام الطلب")
 [ 3. Server Validation & DB Transaction ]
   ├── Server normalizes phone to E.164 using store.default_country_code
   ├── Invokes public.submit_storefront_order RPC (SECURITY DEFINER)
   │     ├── Verifies store_id + cart_id + session_token
   │     ├── Locks store.order_sequence_counter (atomic order number)
   │     ├── Computes line-item and order tax (inclusive or added)
   │     ├── Decrements variant inventory atomically
   │     ├── Inserts public.orders & public.order_line_items
   │     ├── Generates secret confirmation_token for private confirmation view
   │     └── Upserts public.customers record by (store_id, phone)
   └── Transitions Cart to CONVERTED
         │
         ▼
 [ 4. Multi-Channel Store Order Mode Outcome ]
   ├── DASHBOARD Mode: Displays web Order Confirmation receipt
   ├── WHATSAPP Mode: Generates WhatsApp URL & redirects to merchant phone
   └── BOTH Mode: Displays web Confirmation with direct WhatsApp action button
```

---

## 4. Calculations, Tax Snapshots & Order Total Invariants

### 4.1 Delivery Fee Calculation
* If `subtotal_cents >= store.settings.shipping.free_shipping_threshold_cents`, `shipping_cents = 0`.
* Otherwise, `shipping_cents = store.settings.shipping.flat_rate_cents`.

### 4.2 Basis-Point Tax Calculation & Reconciliation
* **Tax-Added Pricing (`tax_included_in_price = false`)**:
  * Line Tax:
    $$\text{line\_tax\_cents} = \left\lfloor \frac{(\text{unit\_price\_cents} \times \text{quantity}) \times \text{tax\_rate\_basis\_points} + 5000}{10000} \right\rfloor$$
  * Total Formula:
    $$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} + \text{tax\_cents} - \text{discount\_cents}$$
* **Tax-Included Pricing (`tax_included_in_price = true`)**:
  * Line Tax (derived from gross price):
    $$\text{line\_tax\_cents} = (\text{unit\_price\_cents} \times \text{quantity}) - \left\lfloor \frac{(\text{unit\_price\_cents} \times \text{quantity}) \times 10000 + \lfloor (10000 + \text{tax\_rate\_basis\_points})/2 \rfloor}{10000 + \text{tax\_rate\_basis\_points}} \right\rfloor$$
  * Total Formula (tax is already included in subtotal):
    $$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} - \text{discount\_cents}$$
* **Reconciliation Invariant**:
  $$\text{orders.tax\_cents} = \sum (\text{order\_line\_items.tax\_cents})$$

---

## 5. Protected Order Confirmation & WhatsApp Dispatch

* **Order Confirmation Privacy**: `GET /api/storefront/orders/:orderId/confirmation` requires the request to provide either the matching `confirmation_token` (query parameter) or valid session cookie proof. A raw Order ID alone cannot access private customer data.
* **Dynamic WhatsApp Message Compilation**: When `order_mode` is `WHATSAPP` or `BOTH`, the server compiles the message dynamically from the committed Order record:
  `https://wa.me/<normalized_phone>?text=<urlencoded_message>`
* **Fail-Safe Fallback**: If `whatsapp_phone` is unconfigured or invalid, order submission completes safely in the database and falls back to the web confirmation screen.

---

## 6. API Contract & Actions
* `POST /api/storefront/orders` &rarr; Submits order via `submit_storefront_order` RPC and returns `{ order_id, order_number, confirmation_token, order_mode_used, whatsapp_redirect_url }`.
* `GET /api/storefront/orders/:orderId/confirmation?token=<confirmation_token>` &rarr; Retrieves order confirmation details.

---

## 7. Acceptance Criteria (Given / When / Then)
* **Given** an active cart and valid session cookie, **When** submitting an order with phone `0501234567` in a store with `default_country_code = 'SA'`, **Then** the order is created with atomic order number, phone is normalized to `+966501234567`, and `confirmation_token` is returned.
* **Given** a request attempting to submit a `cart_id` with a mismatched `session_token`, **Then** the submission is rejected with `403 FORBIDDEN` / `CART_NOT_FOUND_OR_INVALID_SESSION`.
* **Given** an attempt to view order confirmation with only an `order_id` and an invalid token, **Then** access is denied with `401 UNAUTHORIZED`.

---

## 8. Implementation Status
* **Implementation Status**: Not Started
