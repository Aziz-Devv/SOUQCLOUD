import { describe, it, expect } from 'vitest';
import { SubmitOrderSchema } from '../src/lib/schemas/order-submission';
import { AddToCartSchema, UpdateCartLineSchema, RemoveCartLineSchema } from '../src/lib/schemas/cart';

describe('Commerce Schemas: Cart & Order Submission (docs/03-modules/checkout.md)', () => {
  describe('AddToCartSchema', () => {
    it('accepts valid add to cart input', () => {
      const parsed = AddToCartSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        variantId: '74c10c14-5b65-4f2b-8a4e-0050882e70e2',
        quantity: 2,
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects zero or negative quantities', () => {
      const parsedZero = AddToCartSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        variantId: '74c10c14-5b65-4f2b-8a4e-0050882e70e2',
        quantity: 0,
      });
      expect(parsedZero.success).toBe(false);

      const parsedNegative = AddToCartSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        variantId: '74c10c14-5b65-4f2b-8a4e-0050882e70e2',
        quantity: -1,
      });
      expect(parsedNegative.success).toBe(false);
    });
  });

  describe('UpdateCartLineSchema & RemoveCartLineSchema', () => {
    it('accepts valid line updates including quantity 0 (which triggers removal)', () => {
      const parsed = UpdateCartLineSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        lineId: '13f1072c-1e11-482d-9c49-da4debd53aa2',
        quantity: 0,
      });
      expect(parsed.success).toBe(true);
    });

    it('accepts valid line removal input', () => {
      const parsed = RemoveCartLineSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        lineId: '13f1072c-1e11-482d-9c49-da4debd53aa2',
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('SubmitOrderSchema', () => {
    it('accepts valid order submission with required name and phone', () => {
      const parsed = SubmitOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        customerName: 'فهد العتيبي',
        customerPhone: '0551234567',
        shippingAddress: {
          street: 'شارع التحلية',
          city: 'جدة',
          country: 'SA',
        },
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects order submission when required phone or name is missing', () => {
      const parsedNoName = SubmitOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        customerName: '',
        customerPhone: '0551234567',
      });
      expect(parsedNoName.success).toBe(false);

      const parsedNoPhone = SubmitOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        customerName: 'فهد العتيبي',
        customerPhone: '',
      });
      expect(parsedNoPhone.success).toBe(false);
    });

    it('handles optional email gracefully (converting empty string to undefined)', () => {
      const parsedEmptyEmail = SubmitOrderSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        cartId: '632e15b5-bd99-440a-b945-c0a5613e023e',
        customerName: 'فهد العتيبي',
        customerPhone: '0551234567',
        customerEmail: '',
      });
      expect(parsedEmptyEmail.success).toBe(true);
      if (parsedEmptyEmail.success) {
        expect(parsedEmptyEmail.data.customerEmail).toBeUndefined();
      }
    });
  });
});
