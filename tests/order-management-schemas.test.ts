import { describe, it, expect } from 'vitest';
import {
  OrderStatusEnum,
  OrderFilterSchema,
  UpdateOrderStatusSchema,
  CancelOrderSchema,
  UpdateOrderNotesSchema,
} from '../src/lib/schemas/order-management';

describe('Order Management Schemas (docs/03-modules/orders.md)', () => {
  it('validates all allowed order status enum values', () => {
    const validStatuses = [
      'NEW',
      'CONTACTED',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'DELIVERED',
      'CANCELLED',
    ];

    validStatuses.forEach((status) => {
      expect(OrderStatusEnum.safeParse(status).success).toBe(true);
    });

    expect(OrderStatusEnum.safeParse('INVALID_STATUS').success).toBe(false);
    expect(OrderStatusEnum.safeParse('COMPLETED').success).toBe(false);
  });

  describe('OrderFilterSchema', () => {
    it('accepts valid filter params with defaults', () => {
      const parsed = OrderFilterSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        status: 'NEW',
        searchQuery: '0501234567',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.limit).toBe(20);
      }
    });

    it('rejects invalid storeId', () => {
      const parsed = OrderFilterSchema.safeParse({
        storeId: 'not-a-uuid',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('UpdateOrderStatusSchema', () => {
    it('accepts valid status update input', () => {
      const parsed = UpdateOrderStatusSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        orderId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        newStatus: 'CONFIRMED',
        merchantNotes: 'تم الاتصال بالعميل وأكد تفاصيل المقاس',
      });

      expect(parsed.success).toBe(true);
    });
  });

  describe('CancelOrderSchema', () => {
    it('accepts valid cancellation with mandatory reason and restock flag', () => {
      const parsed = CancelOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        orderId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        reason: 'طلب العميل إلغاء الطلب',
        restockInventory: true,
      });

      expect(parsed.success).toBe(true);
    });

    it('rejects cancellation when reason is missing or empty', () => {
      const parsed = CancelOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        orderId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        reason: '   ',
        restockInventory: true,
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe('UpdateOrderNotesSchema', () => {
    it('accepts valid merchant internal notes', () => {
      const parsed = UpdateOrderNotesSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        orderId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        merchantNotes: 'تم تجهيز الشحنة مع شركة سمسا - بوليصة رقم 987654321',
      });

      expect(parsed.success).toBe(true);
    });
  });
});
