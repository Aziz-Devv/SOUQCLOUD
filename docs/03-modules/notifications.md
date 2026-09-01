Document: Module: Notifications
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/notifications.md
Related Documents: docs/03-modules/checkout.md, docs/03-modules/orders.md
Decisions: Multi-channel notification engine abstraction (Email, In-App, Webhooks); Phase 1 focuses on transactional email delivery via standard provider.
Open Questions: None

# Module Specification: Transactional Notifications

## 1. Purpose
The Notifications module provides a unified transactional messaging abstraction. It manages message templates, asynchronous dispatch queues, and delivery logging across channels (Email first in Phase 1, expanding to In-App and Webhooks).

## 2. Data Model References
* `public.notifications`: Transactional message logs and delivery statuses.

## 3. Business Rules
1. Core transactional events supported in Phase 1:
   * `CUSTOMER_ORDER_CONFIRMATION`: Sent to customer upon successful order creation.
   * `MERCHANT_NEW_ORDER_ALERT`: Sent to store owner/admin when an order is placed.
   * `CUSTOMER_ORDER_FULFILLED`: Sent to customer when fulfillment status updates with tracking details.
   * `AUTH_VERIFY_EMAIL`: Sent to user upon account registration.
   * `AUTH_PASSWORD_RESET`: Sent when password reset is requested.
2. Notifications are non-blocking: failure of an email notification dispatch must never roll back a successful financial transaction or order creation.
3. All dispatched messages record an entry in `public.notifications` for merchant auditability and troubleshooting.

## 4. API Contract & Service Interface
* `dispatchNotification(event: NotificationEventPayload)` &rarr; `Promise<{ notificationId: string; status: NotificationStatus }>`
* `getStoreNotifications(storeId: string, filters: NotificationFilters)` &rarr; `ActionResult<NotificationLog[]>`

## 5. UI/UX Reference
* Settings &rarr; Notifications section in Merchant Dashboard to view email templates and preview sample customer emails.

## 6. Dependencies & Related Documents
* Dependencies: [notifications.md (Entity)](../02-database/entities/notifications.md)
* Related Documents: [checkout.md](../03-modules/checkout.md), [orders.md](../03-modules/orders.md)

## 7. Acceptance Criteria (Given / When / Then)
* **Given** a submitted order, **When** the `CUSTOMER_ORDER_CONFIRMATION` event fires, **Then** a notification is logged in `public.notifications` and an email is dispatched to the customer's email address (if provided).
* **Given** an email provider outage, **When** dispatch fails, **Then** the notification status is marked `FAILED` with diagnostic logs, while the order remains `NEW` and valid.

## 8. Open Questions
* None.

## Implementation Status
* **Implementation Status**: Not Started
