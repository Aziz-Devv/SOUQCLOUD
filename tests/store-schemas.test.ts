import { describe, it, expect } from 'vitest';
import { CheckHandleSchema, CreateStoreSchema, RESERVED_HANDLES } from '../src/lib/schemas/store';

describe('Store Validation Schemas', () => {
  describe('CheckHandleSchema', () => {
    it('accepts valid store handles', () => {
      const validHandles = ['aura-studio', 'perfume123', 'luxury-gifts', 'store99'];
      validHandles.forEach((handle) => {
        const result = CheckHandleSchema.safeParse({ handle });
        expect(result.success).toBe(true);
      });
    });

    it('rejects handles shorter than 3 characters or longer than 63', () => {
      expect(CheckHandleSchema.safeParse({ handle: 'ab' }).success).toBe(false);
      expect(CheckHandleSchema.safeParse({ handle: 'a'.repeat(64) }).success).toBe(false);
    });

    it('rejects invalid characters and uppercase letters', () => {
      expect(CheckHandleSchema.safeParse({ handle: 'My-Store' }).success).toBe(true); // coerced to lowercase
      expect(CheckHandleSchema.safeParse({ handle: 'my_store' }).success).toBe(false);
      expect(CheckHandleSchema.safeParse({ handle: '-mystore' }).success).toBe(false);
      expect(CheckHandleSchema.safeParse({ handle: 'mystore-' }).success).toBe(false);
    });

    it('rejects reserved platform slugs', () => {
      RESERVED_HANDLES.forEach((slug) => {
        const result = CheckHandleSchema.safeParse({ handle: slug });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('CreateStoreSchema', () => {
    it('validates a complete valid store creation payload', () => {
      const validPayload = {
        name: 'متجر العطور الفاخرة',
        handle: 'luxury-perfumes',
        defaultCountryCode: 'SA',
        currency: 'SAR',
        defaultLocale: 'ar',
        orderMode: 'BOTH',
        whatsappPhone: '0501234567',
      };

      const result = CreateStoreSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects DASHBOARD/WHATSAPP order mode if WhatsApp phone is missing for WhatsApp mode', () => {
      const payload = {
        name: 'متجر العطور',
        handle: 'my-perfumes',
        defaultCountryCode: 'SA',
        currency: 'SAR',
        defaultLocale: 'ar',
        orderMode: 'WHATSAPP',
        whatsappPhone: '',
      };

      const result = CreateStoreSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain('whatsappPhone');
      }
    });

    it('allows DASHBOARD only mode with null/empty WhatsApp phone', () => {
      const payload = {
        name: 'متجر لوحة التحكم فقط',
        handle: 'dashboard-store',
        defaultCountryCode: 'SA',
        currency: 'SAR',
        defaultLocale: 'ar',
        orderMode: 'DASHBOARD',
        whatsappPhone: null,
      };

      const result = CreateStoreSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects unsupported country code', () => {
      const payload = {
        name: 'متجر دولي',
        handle: 'intl-store',
        defaultCountryCode: 'XX',
        currency: 'USD',
        defaultLocale: 'en',
        orderMode: 'DASHBOARD',
      };

      const result = CreateStoreSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
