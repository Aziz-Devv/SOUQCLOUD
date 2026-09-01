Document: Testing Standards
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/06-process/CODING_STANDARDS.md, docs/01-architecture/architecture-rules.md
Related Documents: docs/06-process/CHANGE_WORKFLOW.md, docs/01-architecture/decisions/ADR-005-commerce-state-machine-and-idempotency.md
Decisions: Three-tier testing strategy; exhaustive coverage on order submission, inventory decrements, and WhatsApp URL compilation; Paddle billing webhook testing.
Open Questions: None

# Platform Testing Standards & Strategy

## 1. Testing Philosophy & Risk-Based Standards

Testing requirements are structured based on **system risk and criticality**:

```
          / \
         / E2E \       Playwright (End-to-End Order Submission Flow)
        /───────\
       / Integr. \     Server Actions, Route Handlers, Database RLS
      /───────────\
     /    Unit     \   Zod Schemas, WhatsApp Formatter, Basis Point Math
    /───────────────\
```

---

## 2. Coverage & Rigor Standards by Domain

| Domain / Subsystem | Testing Standard | Focus & Requirements |
|---|---|---|
| **Order Submission Flow** | **Exhaustive State Coverage** | Cart &rarr; Order creation in DB, inventory decrement, customer upsert, and WhatsApp URL generation across all 3 Order Modes. |
| **Monetary & Tax Calculations** | **100% Branch Coverage** | Zero rounding errors. Validate integer cents conversions, free shipping thresholds, and added/included tax math. |
| **Tenant Isolation & RLS** | **Mandatory Multi-Tenant Suites** | Explicit negative tests verifying Tenant A cannot read or mutate Tenant B records. |
| **Platform Billing Webhooks** | **High Standard (>90% Coverage)** | Validate Paddle webhook signature verification, event handling, and merchant entitlement synchronization. |

---

## 3. Testing Tiers & Frameworks

### 3.1 Tier 1: Unit Tests (Vitest)
* **Scope**: Pure functions, Zod validation schemas, WhatsApp message compiler, monetary math, design token injection.

### 3.2 Tier 2: Integration & RLS Isolation Tests
* **Scope**: Server Actions, Route Handlers, Supabase database triggers, and PostgreSQL Row Level Security policies.

### 3.3 Tier 3: End-to-End Tests (Playwright)
* **Scope**: Complete user journeys:
  * Journey 1: Merchant Signup &rarr; Store Creation (Set Order Mode) &rarr; Product Creation &rarr; Publish.
  * Journey 2: Customer visits Storefront &rarr; Adds to Cart &rarr; Submits Order &rarr; Sees Confirmation / Receives WhatsApp URL.
  * Journey 3: Merchant views new Order in Dashboard &rarr; Progresses Status &rarr; Uses WhatsApp Contact action.
