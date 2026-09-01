import { describe, it, expect } from 'vitest';
import { SwitchActiveStoreSchema } from '@/lib/schemas/dashboard';

describe('Dashboard Validation Schemas', () => {
  describe('SwitchActiveStoreSchema', () => {
    it('validates a valid store UUID', () => {
      const valid = { storeId: '11111111-1111-4111-a111-111111111111' };
      const parsed = SwitchActiveStoreSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid or non-UUID strings', () => {
      const invalid = { storeId: 'invalid-id' };
      const parsed = SwitchActiveStoreSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toContain('معرف المتجر غير صالح');
      }
    });

    it('rejects empty or missing storeId', () => {
      const empty = { storeId: '' };
      const parsed = SwitchActiveStoreSchema.safeParse(empty);
      expect(parsed.success).toBe(false);
    });
  });
});
