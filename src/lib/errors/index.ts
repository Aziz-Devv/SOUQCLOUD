import { ApiError, ApiErrorDetail, PlatformErrorCode } from '../types';

/**
 * Universal Error Taxonomy Base Class
 */
export class AppError extends Error {
  public readonly code: PlatformErrorCode;
  public readonly statusCode: number;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    code: PlatformErrorCode,
    message: string,
    statusCode: number = 500,
    details?: ApiErrorDetail[],
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed.', details?: ApiErrorDetail[]) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action.') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Requested resource not found.') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict detected.') {
    super('CONFLICT', message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super('RATE_LIMITED', message, 429);
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'An unexpected error occurred.') {
    super('INTERNAL_ERROR', message, 500, undefined, false);
  }
}

/**
 * Sanitizes unknown exceptions into a client-safe ApiError envelope.
 * Database internals, SQL syntax errors, and stack traces are masked from production responses.
 */
export function sanitizeError(err: unknown, requestId?: string): { error: ApiError; statusCode: number } {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        request_id: requestId,
      },
    };
  }

  // Generic or unexpected exception
  return {
    statusCode: 500,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
      request_id: requestId,
    },
  };
}
