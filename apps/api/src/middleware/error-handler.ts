import { ErrorCodes } from '@fullstack-notes/shared';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  console.error(
    '[api] error',
    err?.name,
    '|',
    err?.message,
    '|',
    err?.stack?.split('\n').slice(0, 3).join(' // '),
  );

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
  return c.json(
    {
      error: ErrorCodes.INTERNAL_ERROR,
      message: err?.message ?? 'Internal server error',
    },
    500,
  );
}
