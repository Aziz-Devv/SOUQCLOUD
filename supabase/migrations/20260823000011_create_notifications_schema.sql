-- ============================================================================
-- SOUQCLOUD DATABASE MIGRATION: 000011_create_notifications_schema.sql
-- Module: Transactional Notifications (Phase 1)
-- Specs: docs/03-modules/notifications.md, docs/02-database/entities/notifications.md
-- ============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'IN_APP', 'WEBHOOK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,
  channel public.notification_channel NOT NULL DEFAULT 'EMAIL',
  event_type VARCHAR(100) NOT NULL,
  status public.notification_status NOT NULL DEFAULT 'PENDING',
  subject VARCHAR(255) NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_store 
  ON public.notifications(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_status 
  ON public.notifications(status, created_at);

-- 4. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Authenticated Merchant Isolation: Merchants can only view notifications for their authorized stores
DROP POLICY IF EXISTS notifications_merchant_isolation ON public.notifications;
CREATE POLICY notifications_merchant_isolation ON public.notifications
  FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT public.get_authenticated_store_ids())
  );

-- Service role has full access
DROP POLICY IF EXISTS notifications_service_all ON public.notifications;
CREATE POLICY notifications_service_all ON public.notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Revoke direct anonymous access
REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
