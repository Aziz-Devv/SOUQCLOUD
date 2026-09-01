import { z } from 'zod';

export const NotificationChannelEnum = z.enum(['EMAIL', 'IN_APP', 'WEBHOOK']);
export const NotificationStatusEnum = z.enum(['PENDING', 'SENT', 'FAILED']);

export const NotificationEventTypeEnum = z.enum([
  'CUSTOMER_ORDER_CONFIRMATION',
  'MERCHANT_NEW_ORDER_ALERT',
  'CUSTOMER_ORDER_FULFILLED',
  'AUTH_VERIFY_EMAIL',
  'AUTH_PASSWORD_RESET',
]);

export const DispatchNotificationInputSchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  recipient: z.string().min(1, 'المستلم مطلوب'),
  channel: NotificationChannelEnum.default('EMAIL'),
  eventType: z.string().min(1, 'نوع الإشعار مطلوب'),
  subject: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export type DispatchNotificationInput = z.infer<typeof DispatchNotificationInputSchema>;

export const NotificationFilterSchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'ALL']).optional(),
  eventType: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export type NotificationFilterInput = z.input<typeof NotificationFilterSchema>;
export type NotificationFilterOutput = z.infer<typeof NotificationFilterSchema>;
