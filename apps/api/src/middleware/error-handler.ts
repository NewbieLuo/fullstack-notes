import { ErrorCodes } from '@fullstack-notes/shared';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: ErrorCodes.VALIDATION_ERROR,
        message: err.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('; '),
      },
      400,
    );
  }
  if (err instanceof HTTPException) {
    if (err.status === 404) {
      return c.json({ error: ErrorCodes.NOT_FOUND, message: err.message }, 404);
    }
    return c.json(
      { error: ErrorCodes.INTERNAL_ERROR, message: err.message },
      err.status,
    );
  }
  console.error('[api] unhandled error:', err);
  return c.json(
    { error: ErrorCodes.INTERNAL_ERROR, message: 'Internal server error' },
    500,
  );
}
