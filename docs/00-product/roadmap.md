Document: Product Roadmap
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Blueprint
Dependencies: docs/00-product/product-vision.md, docs/00-product/phase-1-scope.md
Related Documents: docs/00-product/non-goals.md
Decisions: Strategic phase progression defined; Phase 1 delivers Order Submission, WhatsApp commerce, Dashboard fulfillment, and Paddle SaaS subscriptions; Phase 2 focuses on custom domains, SEO, catalog expansions, and team collaboration; Merchant online payment gateways classified as an uncommitted Phase 3+ future capability.
Open Questions: None

# Strategic Product Roadmap

## 1. Evolution Phases

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Phase 1     │     │     Phase 2     │     │    Phase 3+     │
│   (Foundations) │ ──► │  (Expansion)    │ ──► │  (Scale & Apps) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 2. Capability Delivery by Phase

### Phase 1: Core Order Submission & Platform Foundations
* **Identity & Multi-Tenancy**: Five-tier hierarchy, Supabase Auth + RLS, composite foreign key isolation.
* **Catalog & Media**: Products, variants, Cloudflare R2 direct uploads.
* **Themes & Builder**: Schema-driven themes, responsive store builder with optimistic concurrency.
* **Storefront Commerce**: Cart &rarr; Order Submission (`DASHBOARD`, `WHATSAPP`, `BOTH` modes).
* **Order Management**: Canonical database order persistence, WhatsApp message formatting, Dashboard fulfillment workflow.
* **Platform Monetization**: SaaS subscription billing powered by **Paddle** (`Merchant → Platform`).

### Phase 2: Growth & Expansion
* **Custom Domains**: Automated SSL provisioning and custom hostname routing via Cloudflare for SaaS.
* **SEO & Discovery**: Automated sitemap.xml, structured JSON-LD schema markup, Open Graph tags, canonical URLs.
* **Catalog Expansions & Search**: Product collections, automated category rules, advanced inventory alerts, faceted search.
* **Team Collaboration**: Staff invitations and granular role permissions UI.
* **Platform Billing Tiers**: Usage-based plan limits and automated plan upgrades.

### Phase 3+: Ecosystem, Scale & Future Capabilities
* **Merchant Online Payment Gateways (Future Capability)**: Potential direct online customer payment processing (e.g. Stripe, Tap, Moyasar, PayPal) for storefront shoppers if explicitly activated in future platform stages.
* **Public API & Webhooks**: Headless commerce integrations and developer access tokens.
* **App Marketplace**: Third-party sandboxed app extensions.
* **Mobile Applications**: Dedicated iOS and Android merchant management applications consuming the core API.
