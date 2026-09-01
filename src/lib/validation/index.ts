import { z } from 'zod';
import { ActionResult } from '../types';
import { sanitizeError } from '../errors';
import { logger } from '../logger';

/**
 * Standard Zod Action Helper
 * 
 * Safely parses untrusted input against a Zod schema and returns typed validation errors or executes the handler.
 */
export async function createSafeAction<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  rawInput: unknown,
  handler: (validatedInput: z.infer<TSchema>) => Promise<TResult>
): Promise<ActionResult<TResult>> {
  const requestId = crypto.randomUUID();

  // 1. Validate Input Boundary
  const parseResult = schema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.errors.map((e) => ({
      field: e.path.join('.'),
      issue: e.message,
    }));

    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload provided.',
        details: errorDetails,
        request_id: requestId,
      },
    };
  }

  // 2. Execute Handler with Error Sanitization Boundary
  try {
    const result = await handler(parseResult.data);
    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    logger.error('Safe action execution failed', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });

    const sanitized = sanitizeError(err, requestId);
    return {
      success: false,
      error: sanitized.error,
    };
  }
}
