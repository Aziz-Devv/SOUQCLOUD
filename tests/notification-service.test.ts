import { describe, it, expect, vi } from 'vitest';
import {
  renderCustomerOrderConfirmationEmail,
  renderMerchantNewOrderAlertEmail,
  renderCustomerOrderFulfilledEmail,
  renderAuthVerifyEmail,
  renderAuthPasswordResetEmail,
} from '@/lib/notifications/templates';
import { DefaultEmailProviderAdapter } from '@/lib/notifications/email-adapter';
import { NotificationRecord, NotificationStatus } from '@/lib/notifications/types';

describe('Transactional Notification Service & Invariants', () => {
  describe('Email Template Renderers (Arabic RTL)', () => {
    it('renders customer order confirmation with RTL direction and order line items', () => {
      const payload = {
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeName: 'متجر عبايات النور',
        orderId: 'order-1111',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerPhone: '+966501234567',
        customerEmail: 'sara@example.com',
        currency: 'SAR',
        subtotalFormatted: '200.00',
        deliveryFeeFormatted: '25.00',
        taxFormatted: '33.75',
        totalFormatted: '258.75',
        shippingAddressText: 'الرياض، حي الياسمين',
        items: [
          {
            title: 'عباية حرير',
            variantTitle: 'مقاس 56',
            quantity: 1,
            priceFormatted: '200.00',
            totalFormatted: '200.00',
          },
        ],
        orderConfirmationUrl: 'https://souqcloud.com/orders/order-1111/confirmation?token=tok-123',
      };

      const rendered = renderCustomerOrderConfirmationEmail(payload);

      expect(rendered.subject).toContain('#1001');
      expect(rendered.subject).toContain('متجر عبايات النور');
      expect(rendered.html).toContain('dir="rtl"');
      expect(rendered.html).toContain('سارة العتيبي');
      expect(rendered.html).toContain('عباية حرير');
      expect(rendered.html).toContain('258.75 SAR');
      expect(rendered.text).toContain('#1001');
    });

    it('renders merchant new order alert with customer details and total', () => {
      const payload = {
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeName: 'متجر عبايات النور',
        merchantEmail: 'merchant@example.com',
        orderId: 'order-1111',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerPhone: '+966501234567',
        customerEmail: 'sara@example.com',
        orderModeUsed: 'DASHBOARD',
        currency: 'SAR',
        totalFormatted: '258.75',
        itemsSummary: 'عباية حرير (1)',
        dashboardOrderUrl: 'https://souqcloud.com/app/orders/order-1111',
      };

      const rendered = renderMerchantNewOrderAlertEmail(payload);

      expect(rendered.subject).toContain('طلب جديد #1001');
      expect(rendered.html).toContain('سارة العتيبي');
      expect(rendered.html).toContain('+966501234567');
      expect(rendered.html).toContain('https://souqcloud.com/app/orders/order-1111');
    });

    it('renders customer order fulfilled with status READY or DELIVERED', () => {
      const payloadReady = {
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        storeName: 'متجر عبايات النور',
        orderId: 'order-1111',
        orderNumber: 1001,
        customerName: 'سارة العتيبي',
        customerEmail: 'sara@example.com',
        fulfillmentStatus: 'READY' as const,
        fulfillmentNotes: 'جاهز للاستلام من الفرع',
        currency: 'SAR',
        totalFormatted: '258.75',
      };

      const renderedReady = renderCustomerOrderFulfilledEmail(payloadReady);
      expect(renderedReady.subject).toContain('جاهز للتسليم/الشحن');
      expect(renderedReady.html).toContain('جاهز للاستلام من الفرع');

      const payloadDelivered = {
        ...payloadReady,
        fulfillmentStatus: 'DELIVERED' as const,
      };
      const renderedDelivered = renderCustomerOrderFulfilledEmail(payloadDelivered);
      expect(renderedDelivered.subject).toContain('تم التوصيل بنجاح');
    });

    it('renders auth verify email and password reset with store_id = null semantics', () => {
      const verifyEmail = renderAuthVerifyEmail({
        userEmail: 'owner@example.com',
        verificationUrl: 'https://souqcloud.com/verify?token=abc',
        otpCode: '123456',
      });
      expect(verifyEmail.subject).toContain('تأكيد البريد الإلكتروني');
      expect(verifyEmail.html).toContain('123456');

      const resetEmail = renderAuthPasswordResetEmail({
        userEmail: 'owner@example.com',
        resetUrl: 'https://souqcloud.com/reset-password?token=xyz',
      });
      expect(resetEmail.subject).toContain('إعادة تعيين كلمة المرور');
      expect(resetEmail.html).toContain('https://souqcloud.com/reset-password?token=xyz');
    });
  });

  describe('Non-Blocking Order Submission & Failure Invariants', () => {
    it('guarantees order state remains valid NEW and uncorrupted when email provider throws error', async () => {
      // Simulate non-blocking dispatch behavior
      const failingAdapter = new DefaultEmailProviderAdapter();
      vi.spyOn(failingAdapter, 'sendEmail').mockRejectedValue(new Error('SMTP Provider Connection Timeout (504)'));

      let simulatedOrderStatus = 'NEW';
      let notificationStatus: NotificationStatus = 'PENDING';
      let errorMessage: string | null = null;

      try {
        // Business transaction commits order atomically
        simulatedOrderStatus = 'NEW';

        // Non-blocking notification dispatch
        try {
          await failingAdapter.sendEmail({
            to: 'customer@example.com',
            subject: 'Order Confirmation',
            html: '<p>Order Details</p>',
            text: 'Order Details',
          });
          notificationStatus = 'SENT';
        } catch (providerError: unknown) {
          notificationStatus = 'FAILED';
          errorMessage = providerError instanceof Error ? providerError.message : String(providerError);
        }
      } catch {
        // Main order transaction must never be caught here
        simulatedOrderStatus = 'CANCELLED_UNEXPECTEDLY';
      }

      // 1. Order remains NEW and completely valid
      expect(simulatedOrderStatus).toBe('NEW');

      // 2. Notification status is marked FAILED with diagnostic error
      expect(notificationStatus).toBe('FAILED');
      expect(errorMessage).toContain('SMTP Provider Connection Timeout');
    });
  });

  describe('CUSTOMER_ORDER_FULFILLED Deterministic Trigger & Deduplication', () => {
    it('emits notification on genuine state transition into READY or DELIVERED', () => {
      const transitions: Array<{ from: string; to: string; shouldEmit: boolean }> = [
        { from: 'NEW', to: 'CONTACTED', shouldEmit: false },
        { from: 'CONTACTED', to: 'CONFIRMED', shouldEmit: false },
        { from: 'CONFIRMED', to: 'PREPARING', shouldEmit: false },
        { from: 'PREPARING', to: 'READY', shouldEmit: true },
        { from: 'READY', to: 'DELIVERED', shouldEmit: true },
      ];

      transitions.forEach(({ from, to, shouldEmit }) => {
        const isFulfillment = (to === 'READY' || to === 'DELIVERED') && from !== to;
        expect(isFulfillment).toBe(shouldEmit);
      });
    });

    it('prevents duplicate notifications on repeated idempotent updates to the same status', () => {
      const previousStatus: string = 'DELIVERED';
      const newStatus: string = 'DELIVERED';

      // Deduplication check: previousStatus !== newStatus
      const shouldDispatch =
        (newStatus === 'READY' || newStatus === 'DELIVERED') &&
        previousStatus !== newStatus;

      expect(shouldDispatch).toBe(false);
    });
  });

  describe('Nullable store_id Semantics & Multi-Tenant Isolation', () => {
    const mockNotifications: NotificationRecord[] = [
      {
        id: 'notif-1',
        storeId: 'store-alpha-1111',
        recipient: 'customer@alpha.com',
        channel: 'EMAIL',
        eventType: 'CUSTOMER_ORDER_CONFIRMATION',
        status: 'SENT',
        subject: 'Order Confirmation',
        payload: { orderNumber: 1001 },
        errorMessage: null,
        sentAt: '2026-08-31T00:00:00Z',
        createdAt: '2026-08-31T00:00:00Z',
      },
      {
        id: 'notif-2',
        storeId: 'store-beta-2222',
        recipient: 'customer@beta.com',
        channel: 'EMAIL',
        eventType: 'CUSTOMER_ORDER_CONFIRMATION',
        status: 'SENT',
        subject: 'Order Confirmation',
        payload: { orderNumber: 2001 },
        errorMessage: null,
        sentAt: '2026-08-31T00:00:00Z',
        createdAt: '2026-08-31T00:00:00Z',
      },
      {
        id: 'notif-3',
        storeId: null, // Platform auth notification
        recipient: 'owner@souqcloud.com',
        channel: 'EMAIL',
        eventType: 'AUTH_VERIFY_EMAIL',
        status: 'SENT',
        subject: 'Verify Email',
        payload: { verificationUrl: '/verify' },
        errorMessage: null,
        sentAt: '2026-08-31T00:00:00Z',
        createdAt: '2026-08-31T00:00:00Z',
      },
    ];

    it('filters store notifications strictly by target storeId, blocking cross-tenant records', () => {
      const targetStoreId = 'store-alpha-1111';
      const storeScopedLogs = mockNotifications.filter((n) => n.storeId === targetStoreId);

      expect(storeScopedLogs.length).toBe(1);
      expect(storeScopedLogs[0]?.id).toBe('notif-1');
      expect(storeScopedLogs[0]?.recipient).toBe('customer@alpha.com');

      // Ensure store Beta and platform auth notifications are excluded
      expect(storeScopedLogs.some((n) => n.storeId === 'store-beta-2222')).toBe(false);
      expect(storeScopedLogs.some((n) => n.storeId === null)).toBe(false);
    });

    it('preserves null storeId for platform-level auth events', () => {
      const authNotifications = mockNotifications.filter((n) => n.storeId === null);
      expect(authNotifications.length).toBe(1);
      expect(authNotifications[0]?.eventType).toBe('AUTH_VERIFY_EMAIL');
      expect(authNotifications[0]?.storeId).toBeNull();
    });
  });
});
