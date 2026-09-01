import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { InternalError } from '@/lib/errors';
import {
  DispatchNotificationInputSchema,
  DispatchNotificationInput,
  NotificationFilterInput,
} from '@/lib/schemas/notifications';
import {
  NotificationRecord,
  NotificationStatus,
  CustomerOrderConfirmationPayload,
  MerchantNewOrderAlertPayload,
  CustomerOrderFulfilledPayload,
  AuthVerifyEmailPayload,
  AuthPasswordResetPayload,
} from '@/lib/notifications/types';
import { defaultEmailProvider } from '@/lib/notifications/email-adapter';
import {
  renderCustomerOrderConfirmationEmail,
  renderMerchantNewOrderAlertEmail,
  renderCustomerOrderFulfilledEmail,
  renderAuthVerifyEmail,
  renderAuthPasswordResetEmail,
} from '@/lib/notifications/templates';
import { getMerchantStores } from './store-service';

/**
 * Renders email subject, HTML, and plaintext for a specific event type.
 */
function renderEmailForEvent(
  eventType: string,
  payload: Record<string, unknown>,
  fallbackSubject?: string | null
): { subject: string; html: string; text: string } {
  switch (eventType) {
    case 'CUSTOMER_ORDER_CONFIRMATION':
      return renderCustomerOrderConfirmationEmail(payload as unknown as CustomerOrderConfirmationPayload);

    case 'MERCHANT_NEW_ORDER_ALERT':
      return renderMerchantNewOrderAlertEmail(payload as unknown as MerchantNewOrderAlertPayload);

    case 'CUSTOMER_ORDER_FULFILLED':
      return renderCustomerOrderFulfilledEmail(payload as unknown as CustomerOrderFulfilledPayload);

    case 'AUTH_VERIFY_EMAIL':
      return renderAuthVerifyEmail(payload as unknown as AuthVerifyEmailPayload);

    case 'AUTH_PASSWORD_RESET':
      return renderAuthPasswordResetEmail(payload as unknown as AuthPasswordResetPayload);

    default:
      return {
        subject: fallbackSubject || 'إشعار من سوق كلاود',
        html: `<p>${JSON.stringify(payload)}</p>`,
        text: JSON.stringify(payload),
      };
  }
}

/**
 * Dispatches a transactional notification in a non-blocking safe boundary.
 * Uses privileged createAdminClient() for server-side audit logging matching service_role grants.
 *
 * CRITICAL INVARIANT:
 * Provider failure or network timeout updates notification state to 'FAILED' in DB,
 * and NEVER throws to the caller, preventing rollback of the originating business transaction.
 */
export async function dispatchNotification(
  rawInput: DispatchNotificationInput
): Promise<{ notificationId: string; status: NotificationStatus }> {
  const validated = DispatchNotificationInputSchema.parse(rawInput);
  const supabase = createAdminClient();

  const { subject, html, text } = renderEmailForEvent(
    validated.eventType,
    validated.payload,
    validated.subject
  );

  let notificationId = crypto.randomUUID();

  // 1. Persist initial PENDING record in public.notifications
  try {
    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert({
        id: notificationId,
        store_id: validated.storeId || null,
        recipient: validated.recipient,
        channel: validated.channel,
        event_type: validated.eventType,
        status: 'PENDING',
        subject,
        payload: validated.payload,
        error_message: null,
      })
      .select('id')
      .single();

    if (insertError) {
      logger.warn('Failed to insert initial PENDING notification log', {
        error: insertError.message,
        eventType: validated.eventType,
        recipient: validated.recipient,
      });
    } else if (inserted) {
      notificationId = inserted.id;
    }
  } catch (err: unknown) {
    logger.warn('Exception during initial notification record creation', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Dispatch via EmailProviderAdapter (Non-blocking execution)
  try {
    const providerResult = await defaultEmailProvider.sendEmail({
      to: validated.recipient,
      subject,
      html,
      text,
    });

    if (providerResult.success) {
      await supabase
        .from('notifications')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', notificationId);

      return { notificationId, status: 'SENT' };
    } else {
      await supabase
        .from('notifications')
        .update({
          status: 'FAILED',
          error_message: providerResult.error || 'Unknown email provider failure',
        })
        .eq('id', notificationId);

      logger.warn('Notification marked as FAILED after provider error', {
        notificationId,
        eventType: validated.eventType,
        error: providerResult.error,
      });

      return { notificationId, status: 'FAILED' };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unexpected dispatch error';
    await supabase
      .from('notifications')
      .update({
        status: 'FAILED',
        error_message: errorMsg,
      })
      .eq('id', notificationId);

    logger.error('Unexpected exception during notification dispatch', {
      notificationId,
      eventType: validated.eventType,
      error: errorMsg,
    });

    return { notificationId, status: 'FAILED' };
  }
}

/**
 * Retrieves store-scoped notification audit logs for the merchant dashboard.
 */
export async function getStoreNotifications(
  storeId: string,
  filters?: NotificationFilterInput
): Promise<{
  notifications: NotificationRecord[];
  total: number;
  page: number;
  limit: number;
}> {
  const stores = await getMerchantStores();
  const authorizedStore = stores.find((s) => s.id === storeId);

  if (!authorizedStore) {
    throw new InternalError('المتجر غير مصرح للوصول أو غير موجود.');
  }

  const supabase = await createClient();
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status);
  }

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    logger.error('Failed to fetch store notifications', {
      storeId,
      error: error.message,
    });
    throw new InternalError('فشل استرجاع سجل الإشعارات.');
  }

  const notifications: NotificationRecord[] = (data || []).map((row) => ({
    id: row.id,
    storeId: row.store_id,
    recipient: row.recipient,
    channel: row.channel,
    eventType: row.event_type,
    status: row.status,
    subject: row.subject,
    payload: (row.payload as Record<string, unknown>) || {},
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }));

  return {
    notifications,
    total: count || 0,
    page,
    limit,
  };
}
