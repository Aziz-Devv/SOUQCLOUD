# SOUQCLOUD — Next.js & Frontend Rules

Structure and routing conventions: @docs/05-infrastructure/nextjs-structure.md
UX/UI conventions: @docs/04-ux-ui/

## Component Defaults
Server Components by default. Client Components only where interactivity genuinely requires
them. Do not convert entire page trees to Client Components unnecessarily.

Client Components must never hold privileged database credentials, perform privileged
database operations, contain authorization decisions, or become a source of truth for
business state (price, totals, order status).

## Data Access
Keep server/database access inside the documented server-side boundaries (Server Actions /
Route Handlers). No direct browser-to-database access.

## `proxy.ts`
Runs on the Node.js runtime (Next.js 16). Use it only for lightweight request-boundary
concerns: hostname inspection, tenant resolution, rewrites, redirects, lightweight
transformations. Never place business logic, heavy database work, authorization logic, or
expensive processing inside it — see
@.agents/rules/01-architecture-integrity.md.

## UI
Follow @docs/04-ux-ui/ exactly. Do not redesign UX while implementing functionality unless
explicitly asked. Preserve documented loading/empty/error states, responsive behavior, and
accessibility behavior.
