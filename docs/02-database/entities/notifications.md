Document: Entity: Notifications
Version: 1.0
Status: Draft
Owner: Aziz
Last Updated: 2026-08-23
Depth: Full Spec
Dependencies: docs/02-database/entities/stores.md
Related Documents: docs/03-modules/notifications.md
Decisions: Multi-channel notification logging table tracking event types, channels, and delivery statuses.
Open Questions: None

# Database Entity: Notifications (`public.notifications`)

## 1. Purpose & Domain Scope

The `public.notifications` table records transactional communications triggered by platform events (such as order confirmations, fulfillment alerts, and password resets). It manages message delivery across channels (Email, In-App, Webhooks).

---

## 2. Table Schema Definition

```sql
CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'IN_APP', 'WEBHOOK');
CREATE TYPE public.notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'EMAIL',
  event_type VARCHAR(100) NOT NULL, -- e.g., 'ORDER_CONFIRMATION', 'ORDER_FULFILLED'
  status public.notification_status NOT NULL DEFAULT 'PENDING',
  subject VARCHAR(255) NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_store ON public.notifications(store_id, created_at DESC);
CREATE INDEX idx_notifications_status ON public.notifications(status, created_at);
```

---

## 3. Field Semantics & Constraints

* `id`: Unique UUID identifier for the notification log.
* `store_id`: Optional store scoping (null for platform-level auth notifications).
* `recipient`: Email address, user ID, or webhook URL target.
* `channel`: Delivery medium (`EMAIL`, `IN_APP`, `WEBHOOK`).
* `event_type`: Domain event that triggered the message.
* `status`: `PENDING` (queued for sending), `SENT` (successfully dispatched), `FAILED` (provider error).
* `payload`: JSONB snapshot of dynamic event variables used to render the template.
* `error_message`: Diagnostic failure logs from email/messaging providers if dispatch fails.
