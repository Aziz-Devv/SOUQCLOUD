import { describe, it, expect } from 'vitest';
import {
  CreateProductSchema,
  VariantInputSchema,
  ProductOptionSchema,
} from '../src/lib/schemas/product';

describe('Product & Variant Validation Schemas', () => {
  describe('ProductOptionSchema', () => {
    it('validates a valid product option', () => {
      const result = ProductOptionSchema.safeParse({
        name: 'Size',
        values: ['S', 'M', 'L'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty option values array', () => {
      const result = ProductOptionSchema.safeParse({
        name: 'Size',
        values: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('VariantInputSchema', () => {
    it('validates a valid variant payload with integer cents', () => {
      const result = VariantInputSchema.safeParse({
        title: 'Large / Red',
        sku: 'SHIRT-L-RED',
        priceCents: 15000,
        compareAtPriceCents: 20000,
        inventoryQuantity: 25,
        allowBackorder: false,
        optionValues: { Size: 'L', Color: 'Red' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative price in cents', () => {
      const result = VariantInputSchema.safeParse({
        priceCents: -500,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative inventory if allowBackorder is false', () => {
      const result = VariantInputSchema.safeParse({
        priceCents: 1000,
        inventoryQuantity: -5,
        allowBackorder: false,
      });
      expect(result.success).toBe(false);
    });

    it('allows negative inventory if allowBackorder is true', () => {
      const result = VariantInputSchema.safeParse({
        priceCents: 1000,
        inventoryQuantity: -5,
        allowBackorder: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('CreateProductSchema', () => {
    it('validates a valid single-variant product creation', () => {
      const result = CreateProductSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        title: 'Classic T-Shirt',
        basePriceCents: 9900,
        inventoryQuantity: 50,
      });
      expect(result.success).toBe(true);
    });

    it('validates a multi-variant product creation with options', () => {
      const result = CreateProductSchema.safeParse({
        storeId: '38a0f664-ae7f-4d0b-bd85-cce200541807',
        title: 'Designer Hoodie',
        options: [
          { name: 'Size', values: ['S', 'M', 'L'] },
        ],
        variants: [
          { title: 'S', priceCents: 12000, inventoryQuantity: 10 },
          { title: 'M', priceCents: 12000, inventoryQuantity: 15 },
          { title: 'L', priceCents: 12000, inventoryQuantity: 20 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid storeId', () => {
      const result = CreateProductSchema.safeParse({
        storeId: 'not-a-uuid',
        title: 'Shoes',
        basePriceCents: 5000,
      });
      expect(result.success).toBe(false);
    });
  });
});
