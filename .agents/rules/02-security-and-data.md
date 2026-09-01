# SOUQCLOUD — Security & Data Protection

Security is a first-class requirement, not an afterthought. Full grants/RLS specification:
@docs/01-architecture/security-authz.md

## Never Trust the Client
Never treat client-provided prices, totals, ownership identifiers, or inventory results as
authoritative. A `store_id`, `product_id`, `cart_id`, or `order_id` supplied by the browser is
not proof of ownership by itself.

- Order creation, pricing, tax, shipping, and inventory decisions must be computed
  server-side, inside the database transaction — never accepted from the client.
- Prefer allowlists over denylists for any sensitive behavior.

## Storefront Public/Private Boundary
Anonymous storefront visitors may access only: published store data, published
products/variants, active published pages/theme data, and PUBLIC media — via the projections
defined in @docs/01-architecture/security-authz.md. Everything else (merchant/internal
config, billing data, operational metadata, private media, customer private data) is never
exposed to anonymous requests.

Order confirmation endpoints require the documented `confirmation_token` proof — a raw
`order_id` is never sufficient.

## Database
Respect both PostgreSQL Grants and Row Level Security. Never bypass RLS using privileged
credentials merely for convenience.

For `SECURITY DEFINER` functions: explicitly restrict `EXECUTE` privileges, use a hardened
`search_path`, avoid dynamic SQL unless required, validate all inputs, and never expose a
generic privileged query interface.

## Secrets
Never expose Supabase service credentials, Paddle secrets, API keys, or signing/webhook
secrets to client-side code. Never log or commit secrets.

## Privacy
Minimize personal-data exposure. Knowing an identifier is never sufficient authorization to
read the data behind it.
