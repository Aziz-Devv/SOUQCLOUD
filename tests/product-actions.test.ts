import { describe, it, expect } from 'vitest';
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  updateInventoryAction,
} from '../src/app/actions/product';

describe('Product Server Actions Boundary', () => {
  it('returns structured VALIDATION_ERROR envelope on invalid createProduct payload', async () => {
    const result = await createProductAction({
      storeId: 'invalid-id',
      title: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toBeDefined();
    }
  });

  it('returns structured VALIDATION_ERROR envelope on invalid updateProduct payload', async () => {
    const result = await updateProductAction({
      productId: 'invalid-id',
      storeId: 'invalid-id',
      title: 'X', // too short
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on invalid deleteProduct payload', async () => {
    const result = await deleteProductAction({
      productId: 'invalid-id',
      storeId: 'invalid-id',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns structured VALIDATION_ERROR envelope on invalid updateInventory payload', async () => {
    const result = await updateInventoryAction({
      variantId: 'invalid-id',
      storeId: 'invalid-id',
      quantity: 'not-a-number',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
