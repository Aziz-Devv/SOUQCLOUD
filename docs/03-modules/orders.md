Document: Module: Orders
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/orders.md, docs/03-modules/checkout.md, docs/02-database/entities/customers.md
Related Documents: docs/03-modules/notifications.md, docs/04-ux-ui/dashboard-ux.md
Decisions: Merchant order lifecycle management (NEW -> CONTACTED -> CONFIRMED -> PREPARING -> READY -> DELIVERED); WhatsApp customer contact actions from Dashboard; historical snapshot immutability; Order Total Invariant enforcement.
Open Questions: None

# Module Specification: Order Management & Fulfillment

## 1. Purpose
The Orders module provides merchants and staff with operational control, fulfillment tracking, customer contact workflows, and lifecycle state management over placed orders while strictly preserving the immutability of historical commercial transaction data.

---

## 2. Merchant Order Lifecycle

```
[ NEW ] ──► [ CONTACTED ] ──► [ CONFIRMED ] ──► [ PREPARING ] ──► [ READY ] ──► [ DELIVERED ]
   │               │                 │                 │
   └───────────────┴─────────────────┴─────────────────┴──► [ CANCELLED ]
```

* **`NEW`**: Order submitted by customer, awaiting merchant review.
* **`CONTACTED`**: Merchant has contacted customer via WhatsApp/phone to verify details.
* **`CONFIRMED`**: Merchant has confirmed order details with the customer and intends to fulfill it according to the merchant's workflow.
* **`PREPARING`**: Merchandise is being packed and prepared for dispatch.
* **`READY`**: Order is packaged and ready for pickup or dispatch.
* **`DELIVERED`**: Order has been successfully delivered to customer.
* **`CANCELLED`**: Order was cancelled by merchant or customer (with optional inventory restocking).

---

## 3. Data Model References & Mathematical Invariants
* `public.orders`: Parent order record holding status, customer contact info, totals, and delivery details.
  * **Order Total Invariant**: Enforced via `CONSTRAINT chk_order_total_invariant`:
    $$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} + \text{tax\_cents} - \text{discount\_cents}$$
* `public.order_line_items`: Purchased line item historical snapshots (`total_price_cents = unit_price_cents * quantity`).
* `public.customers`: Store-scoped customer profile.

---

## 4. API Contract & Actions
* `getOrders(filters: OrderFilters)` &rarr; `ActionResult<{ orders: OrderSummary[]; total: number }>`
* `getOrderById(orderId: string)` &rarr; `ActionResult<OrderDetail>`
* `updateOrderStatus(orderId: string, status: OrderStatus, merchantNotes?: string)` &rarr; `ActionResult<void>`
* `cancelOrder(orderId: string, reason: string, restockInventory: boolean)` &rarr; `ActionResult<void>`

---

## 5. UI/UX & WhatsApp Integration in Dashboard
* **Order List**: Filter tabs (`All`, `New`, `Contacted`, `Confirmed`, `Preparing`, `Ready`, `Delivered`, `Cancelled`), customer phone search.
* **Order Detail View**:
  * Direct **"Contact via WhatsApp"** button: Opens WhatsApp chat with pre-filled message (`https://wa.me/<customer_phone>`).
  * Customer contact details card, delivery address, ordered items snapshot, and status progression dropdown.

---

## 6. Implementation Status
* **Implementation Status**: Not Started
