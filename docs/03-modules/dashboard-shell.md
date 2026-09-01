Document: Module: Dashboard Shell
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/01-architecture/identity-and-membership-model.md, docs/02-database/entities/stores.md
Related Documents: docs/04-ux-ui/dashboard-ux.md, docs/04-ux-ui/ui-system.md
Decisions: Unified authenticated dashboard layout; persistent sidebar navigation; multi-store context switcher; responsive drawer for mobile.
Open Questions: None

# Module Specification: Dashboard Shell & Navigation

## 1. Purpose
The Dashboard Shell provides the authenticated administrative application layout for merchants and staff. It encapsulates the persistent top bar, primary navigation sidebar, multi-store switcher, global search trigger, and notifications drawer.

## 2. Data Model References
* `public.memberships`: Evaluated to determine permitted navigation routes based on user role.
* `public.stores`: List of stores owned by the merchant organization for store switching.
* `public.merchants`: Active organization profile.

## 3. Business Rules
1. Access requires an authenticated session and verified `Membership`.
2. Navigation items are filtered dynamically according to the user's role (`OWNER`, `ADMIN`, `STAFF`).
3. Switching stores updates the active `store_id` context across all child views and Server Actions.
4. Breadcrumb navigation reflects the current module hierarchy (e.g., `Home > Products > Edit Product`).

## 4. API Contract & Actions
* `getDashboardNavContext()` &rarr; `ActionResult<{ user: UserProfile; merchant: Merchant; stores: StoreSummary[]; activeStoreId: string }>`
* `switchActiveStore(storeId: string)` &rarr; `ActionResult<{ redirectUrl: string }>`

## 5. UI/UX Reference
* Desktop: Left navigation rail (collapsible), Top application bar (store switcher, global search, user profile menu), Main scrollable content canvas.
* Mobile: Top header with hamburger button opening a full-height off-canvas navigation drawer.

## 6. Dependencies & Related Documents
* Dependencies: [identity-and-membership-model.md](../01-architecture/identity-and-membership-model.md), [stores.md](../02-database/entities/stores.md)
* Related Documents: [dashboard-ux.md](../04-ux-ui/dashboard-ux.md), [ui-system.md](../04-ux-ui/ui-system.md)

## 7. Acceptance Criteria (Given / When / Then)
* **Given** an authenticated store owner with multiple stores, **When** they click the store switcher and select another store, **Then** the dashboard refreshes in the context of the selected store.
* **Given** a user with `STAFF` role, **When** viewing the navigation sidebar, **Then** restricted administrative links (Billing, Team Management) are hidden from the menu.

## 8. Open Questions
* None.

## Implementation Status
* **Implementation Status**: Not Started
