import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  sanitizeError,
} from '../src/lib/errors';

describe('Error Taxonomy & Sanitization', () => {
  it('instantiates ValidationError with status 400 and details', () => {
    const error = new ValidationError('Bad request payload', [
      { field: 'email', issue: 'Invalid email address' },
    ]);

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request payload');
    expect(error.details).toHaveLength(1);
    expect(error.details?.[0]?.field).toBe('email');
  });

  it('instantiates UnauthorizedError with status 401', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('instantiates ForbiddenError with status 403', () => {
    const error = new ForbiddenError();
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });

  it('instantiates NotFoundError with status 404', () => {
    const error = new NotFoundError('Store not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('instantiates ConflictError with status 409', () => {
    const error = new ConflictError('Subdomain already exists');
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
  });

  it('instantiates RateLimitError with status 429', () => {
    const error = new RateLimitError();
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.statusCode).toBe(429);
  });

  it('instantiates InternalError with status 500', () => {
    const error = new InternalError();
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('sanitizes known AppError with request ID', () => {
    const error = new NotFoundError('Product variant not found');
    const result = sanitizeError(error, 'req_12345');

    expect(result.statusCode).toBe(404);
    expect(result.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Product variant not found',
      details: undefined,
      request_id: 'req_12345',
    });
  });

  it('masks unknown / raw database errors to INTERNAL_ERROR', () => {
    const rawDbError = new Error('FATAL: connection terminated unexpectedly. SELECT * FROM public.users');
    const result = sanitizeError(rawDbError, 'req_99999');

    expect(result.statusCode).toBe(500);
    expect(result.error.code).toBe('INTERNAL_ERROR');
    expect(result.error.message).not.toContain('users');
    expect(result.error.message).not.toContain('FATAL');
    expect(result.error.request_id).toBe('req_99999');
  });
});
