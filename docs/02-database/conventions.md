Document: Database Conventions
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/schema-overview.md
Related Documents: docs/01-architecture/architecture-rules.md, docs/02-database/migrations/README.md
Decisions: snake_case identifiers; UUID v4 primary keys; timestamptz UTC; integer cents for money; integer basis points for tax; Composite Foreign Keys for tenant integrity; order lifecycle status conventions; Order Total Invariant check constraint.
Open Questions: None

# Database Conventions & Standards

## 1. Naming Conventions

* **Tables**: Plural nouns in `snake_case` (e.g., `users`, `merchants`, `stores`, `products`, `customers`, `carts`, `cart_lines`, `orders`, `order_line_items`, `billing_subscriptions`).
* **Columns**: Singular nouns in `snake_case` (e.g., `price_cents`, `tax_rate_basis_points`, `order_mode`, `created_at`).
* **Primary Keys**: Always named `id` of type `UUID` default `gen_random_uuid()`.
* **Foreign Keys**: Named as `<singular_referenced_table>_id` (e.g., `store_id`, `merchant_id`, `product_id`).

---

## 2. Order Lifecycle Status Convention

Orders follow a deterministic merchant fulfillment lifecycle:
```sql
CREATE TYPE public.order_status AS ENUM (
  'NEW',
  'CONTACTED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED'
);
```

---

## 3. Store Order Mode Convention

```sql
CREATE TYPE public.store_order_mode AS ENUM (
  'DASHBOARD',
  'WHATSAPP',
  'BOTH'
);
```

---

## 4. Monetary & Tax Representation Standards

| Value Type | Column Data Type | Standard & Calculation Rule |
|---|---|---|
| **Currency Values** | `BIGINT` / `INTEGER` | Stored as integer currency cents (e.g., $19.99 = `1999`). Floating-point money is strictly forbidden. |
| **Tax Rates** | `INTEGER` | Stored as integer basis points ($1 \text{ bp} = 0.01\%$, e.g., $15.00\% = 1500$, $5.00\% = 500$). |
| **Currency Codes** | `VARCHAR(3)` | ISO 4217 standard 3-letter uppercase (e.g. `USD`, `SAR`, `EUR`). |
| **Country Codes** | `VARCHAR(2)` | ISO 3166-1 alpha-2 standard 2-letter uppercase (e.g. `SA`, `AE`, `KW`, `EG`). |

---

## 5. Structural Tenant Referential Integrity (Composite FK Standard)

1. Every tenant-scoped table MUST define a composite unique constraint:
   ```sql
   CONSTRAINT uq_<table_name>_id_store UNIQUE (id, store_id)
   ```
2. Every child table referencing a tenant-scoped parent MUST declare a composite foreign key:
   ```sql
   CONSTRAINT fk_<child>_<parent>_store
   FOREIGN KEY (<parent>_id, store_id)
   REFERENCES public.<parent_table>(id, store_id)
   ON DELETE CASCADE
   ```

---

## 6. Order Total Invariant Standard

All order transaction records enforce exact mathematical balance via a database check constraint:
$$\text{total\_cents} = \text{subtotal\_cents} + \text{shipping\_cents} + \text{tax\_cents} - \text{discount\_cents}$$

```sql
CONSTRAINT chk_order_total_invariant 
  CHECK (total_cents = subtotal_cents + shipping_cents + tax_cents - discount_cents)
```
