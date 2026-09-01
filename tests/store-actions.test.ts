import { describe, it, expect } from 'vitest';
import { checkHandleAction, createStoreAction } from '../src/app/actions/store';

describe('Store Server Actions Boundary', () => {
  it('returns structured VALIDATION_ERROR envelope on invalid handle format', async () => {
    const result = await checkHandleAction({ handle: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details?.[0]?.field).toBe('handle');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on reserved handle check', async () => {
    const result = await checkHandleAction({ handle: 'admin' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on invalid createStore payload', async () => {
    const result = await createStoreAction({
      name: '',
      handle: 'invalid_handle',
      defaultCountryCode: 'UNKNOWN',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toBeDefined();
      expect(result.error.details!.length).toBeGreaterThanOrEqual(2);
    }
  });
});
