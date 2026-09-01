import { describe, it, expect } from 'vitest';
import {
  DispatchNotificationInputSchema,
  NotificationFilterSchema,
  NotificationChannelEnum,
  NotificationStatusEnum,
  NotificationEventTypeEnum,
} from '@/lib/schemas/notifications';

describe('Notification Zod Schemas Validation', () => {
  describe('Notification Enums', () => {
    it('validates notification channel enum variants', () => {
      expect(NotificationChannelEnum.safeParse('EMAIL').success).toBe(true);
      expect(NotificationChannelEnum.safeParse('IN_APP').success).toBe(true);
      expect(NotificationChannelEnum.safeParse('WEBHOOK').success).toBe(true);
      expect(NotificationChannelEnum.safeParse('SMS').success).toBe(false);
    });

    it('validates notification status enum variants', () => {
      expect(NotificationStatusEnum.safeParse('PENDING').success).toBe(true);
      expect(NotificationStatusEnum.safeParse('SENT').success).toBe(true);
      expect(NotificationStatusEnum.safeParse('FAILED').success).toBe(true);
      expect(NotificationStatusEnum.safeParse('CANCELLED').success).toBe(false);
    });

    it('validates core event type enum variants', () => {
      expect(NotificationEventTypeEnum.safeParse('CUSTOMER_ORDER_CONFIRMATION').success).toBe(true);
      expect(NotificationEventTypeEnum.safeParse('MERCHANT_NEW_ORDER_ALERT').success).toBe(true);
      expect(NotificationEventTypeEnum.safeParse('CUSTOMER_ORDER_FULFILLED').success).toBe(true);
      expect(NotificationEventTypeEnum.safeParse('AUTH_VERIFY_EMAIL').success).toBe(true);
      expect(NotificationEventTypeEnum.safeParse('AUTH_PASSWORD_RESET').success).toBe(true);
      expect(NotificationEventTypeEnum.safeParse('INVALID_EVENT').success).toBe(false);
    });
  });

  describe('DispatchNotificationInputSchema', () => {
    it('validates valid customer order confirmation payload', () => {
      const input = {
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        recipient: 'customer@example.com',
        channel: 'EMAIL',
        eventType: 'CUSTOMER_ORDER_CONFIRMATION',
        subject: 'تأكيد الطلب #1001',
        payload: {
          orderNumber: 1001,
          totalFormatted: '250.00',
        },
      };

      const result = DispatchNotificationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recipient).toBe('customer@example.com');
        expect(result.data.channel).toBe('EMAIL');
      }
    });

    it('allows storeId to be null for platform auth events', () => {
      const input = {
        storeId: null,
        recipient: 'merchant@example.com',
        channel: 'EMAIL',
        eventType: 'AUTH_VERIFY_EMAIL',
        payload: {
          verificationUrl: '/verify',
        },
      };

      const result = DispatchNotificationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.storeId).toBeNull();
      }
    });

    it('rejects input with empty recipient', () => {
      const input = {
        recipient: '',
        eventType: 'CUSTOMER_ORDER_CONFIRMATION',
      };

      const result = DispatchNotificationInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('NotificationFilterSchema', () => {
    it('validates valid filter parameters with defaults', () => {
      const result = NotificationFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
      }
    });

    it('validates explicit status and pagination filters', () => {
      const result = NotificationFilterSchema.safeParse({
        status: 'FAILED',
        eventType: 'CUSTOMER_ORDER_CONFIRMATION',
        page: 2,
        limit: 25,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('FAILED');
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });
  });
});
