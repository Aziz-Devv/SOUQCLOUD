Document: Module: Payment Providers (Future Capability)
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Blueprint
Dependencies: docs/00-product/roadmap.md, docs/01-architecture/api-architecture.md
Related Documents: docs/03-modules/checkout.md, docs/03-modules/orders.md
Decisions: Merchant online customer payment processing is an uncommitted Future Capability (Phase 3+); current platform scope relies exclusively on Order Submission, WhatsApp commerce, and merchant offline payment collection.
Open Questions: None

# Module Specification: Merchant Online Payments (Future Capability)

## 1. Purpose & Strategic Vision (Phase 3+ Future Capability)
In future platform phases (Phase 3+), if explicitly activated, merchants may have the option to enable direct online payment gateways (e.g. Stripe, Tap, Moyasar, PayPal) to accept credit cards and digital wallets directly from storefront shoppers (`Customer → Merchant`).

> **CURRENT PLATFORM SCOPE CLARIFICATION**: This module is an architectural **Blueprint for Future Capabilities**. In the current platform scope, storefront customers do not pay online through the platform. Order submission facilitates customer order collection, WhatsApp redirection, and merchant fulfillment.

---

## 2. Future Gateway Integration Architecture

```
[ Storefront Customer ] ──(Online Card Checkout)──► [ Merchant Payment Gateway ]
                                                             (Stripe / Tap / Moyasar)
                                                             │
                                                             ▼ (Funds direct to Merchant)
                                                   [ Merchant Bank Account ]
```

* **Multi-Gateway Adapter Model**: Future integrations will implement the `PaymentGatewayAdapter` interface allowing regional payment gateways to be plugged in dynamically.
* **Direct Merchant Settlement**: Funds from customer purchases settle directly into merchant gateway accounts (not platform merchant accounts).

---

## 3. Implementation Status
* **Implementation Status**: Blueprint / Not Started (Uncommitted Future Capability for Phase 3+)
