import { z } from 'zod';

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
});

export const NoteUpdateSchema = NoteCreateSchema.partial();

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
