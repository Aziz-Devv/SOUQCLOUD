Document: Deployment (Blueprint)
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-09-21
Depth: Blueprint
Dependencies: docs/00-product/roadmap.md, docs/05-infrastructure/nextjs-structure.md
Related Documents: docs/01-architecture/decisions/ADR-006-hosting-and-runtime-architecture.md, docs/05-infrastructure/cloudflare-setup.md, docs/06-process/CHANGE_WORKFLOW.md
Decisions: Next.js 16 application deployment via OpenNext to Cloudflare Workers (workerd); automated CI/CD pipeline with strict quality gates; Wrangler-based deployment and runtime preview (ADR-006).
Open Questions: None

# Deployment & CI/CD Strategy (Blueprint)

## 1. Purpose & Strategic Intent

This blueprint outlines the deployment pipeline, build stages, artifact contracts, and continuous integration/continuous deployment (CI/CD) standards for SOUQCLOUD. The application builds via the OpenNext Cloudflare adapter and deploys to the Cloudflare Workers serverless runtime (`workerd`).

---

## 2. CI/CD Pipeline Stages

```text
[ Git Push to Branch ]
          │
          ▼
[ 1. Automated Test & Quality Gate ]
  - TypeScript type checking (`npm run typecheck` / `tsc --noEmit`)
  - ESLint code quality scan (`npm run lint`)
  - Unit & integration tests (`npm run test` / `vitest run`)
          │
          ▼
[ 2. Next.js 16 & OpenNext Build ]
  - OpenNext Cloudflare adapter build: `npx @opennextjs/cloudflare build`
  - Compiles Next.js App Router into Worker bundle: `.open-next/worker.js`
  - Emits static client assets: `.open-next/assets`
          │
          ▼
[ 3. Local / Ephemeral Preview Verification ]
  - Workers runtime preview via Wrangler: `npx wrangler dev`
  - Validates execution within local `workerd` isolate environment
          │
          ▼
[ 4. Pull Request Review & Approval ]
          │
          ▼
[ 5. Production Release ]
  - Database schema migration execution (forward-only via Supabase)
  - Cloudflare Worker deployment: `npx wrangler deploy`
  - Static assets uploaded to Cloudflare Workers Assets
  - Edge cache tag invalidation
```

---

## 3. Deployment Targets & Environments

* **Production**: Next.js 16 application deployed through OpenNext to the Cloudflare Workers runtime (`workerd`), serving traffic via Cloudflare global edge and the primary intended Worker route (`*/*` covering the SaaS zone, with selective patterns `souqcloud.com/*` and `*.souqcloud.com/*` available if differentiated routing is needed), communicating downstream with Supabase PostgreSQL and Cloudflare R2.
* **Staging / CI**: GitHub Actions runner executing quality gates (`npm run typecheck`, `npm run lint`, `npm run test`), compiling via `npx @opennextjs/cloudflare build`, and testing against the `workerd` runtime (e.g. `npx wrangler dev`).
* **Local Development & Preview**:
  - Fast iterative development: `npm run dev` (Next.js development server).
  - Workers runtime preview: `npx @opennextjs/cloudflare build && npx wrangler dev` (executes within the actual `workerd` environment).

---

## 4. Operational Build & Deployment Artifact Contract

The build and deployment workflow adheres to the following contract defined in `wrangler.jsonc`:

| Component | Path / Configuration | Purpose |
|---|---|---|
| Worker Entry Point | `.open-next/worker.js` | Compiled server-side Next.js bundle executing in `workerd` |
| Static Assets | `.open-next/assets` | Client-side bundles, fonts, and images served via Workers Assets |
| Runtime Compatibility | `nodejs_compat` | Node.js API compatibility layer required for Next.js execution |
| Deployment Tooling | `npx wrangler deploy` | Deploys Worker bundle and uploads static assets to Cloudflare |

> [!NOTE]
> **Worker Routes Infrastructure Scope**: The application Worker artifact (`.open-next/worker.js`) and static assets (`.open-next/assets`) are configured and verified via `wrangler.jsonc`. The primary intended production route (`*/*`) and any selective patterns are infrastructure-level routing configurations that must be applied as part of production Cloudflare zone setup, and are intentionally not declared in `wrangler.jsonc` at this stage.
