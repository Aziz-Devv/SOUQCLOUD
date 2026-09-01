Document: Entity: Marketplace Apps (Blueprint)
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Blueprint
Dependencies: docs/02-database/entities/stores.md
Related Documents: docs/03-modules/marketplace-apps.md
Decisions: App installation models follow schema-driven permissions and webhook subscriptions in Phase 3+.
Open Questions: None

# Database Entity: Marketplace Apps & Extensions (Blueprint)

## 1. Purpose & Strategic Intent

This blueprint outlines the future data structures supporting third-party developer applications, extension points, and app installations planned for Phase 3+.

---

## 2. Intended Future Entities

* **`marketplace_apps`**: Registered third-party applications, developer metadata, OAuth client credentials, and declared permission scopes.
* **`store_installed_apps`**: Join entity recording an active installation of an app within a specific `store_id`, holding merchant authorization tokens and installation status.
* **`app_webhook_subscriptions`**: Event subscriptions registered by an installed app to receive real-time domain event payloads (e.g. `orders/created`).
* **`app_extension_configs`**: JSONB declarations defining merchant dashboard extension cards or storefront section extensions.

---

## 3. Sandboxing & Security Rules

* Third-party apps interact strictly via authenticated REST/GraphQL APIs and webhooks.
* App installations cannot directly alter core database schemas or bypass RLS policies.
