import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createSafeAction } from '../src/lib/validation';
import { NotFoundError } from '../src/lib/errors';

describe('Safe Action Validation & Execution', () => {
  const TestInputSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
  });

  it('validates schema and executes handler on valid payload', async () => {
    const action = (input: unknown) =>
      createSafeAction(TestInputSchema, input, async (data) => {
        return { created: true, name: data.name, total: data.quantity * 100 };
      });

    const result = await action({ name: 'Summer Shirt', quantity: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ created: true, name: 'Summer Shirt', total: 200 });
    }
  });

  it('returns VALIDATION_ERROR with field details on invalid input', async () => {
    const action = (input: unknown) =>
      createSafeAction(TestInputSchema, input, async () => {
        return { created: true };
      });

    const result = await action({ name: 'a', quantity: -5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toHaveLength(2);
      expect(result.error.details?.[0]?.field).toBe('name');
      expect(result.error.details?.[1]?.field).toBe('quantity');
    }
  });

  it('catches thrown AppError and returns sanitized error envelope', async () => {
    const action = (input: unknown) =>
      createSafeAction(TestInputSchema, input, async () => {
        throw new NotFoundError('Inventory record missing');
      });

    const result = await action({ name: 'Valid Product', quantity: 1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NOT_FOUND');
      expect(result.error.message).toBe('Inventory record missing');
    }
  });
});
