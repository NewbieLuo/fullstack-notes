import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
});

export const NoteUpdateSchema = NoteCreateSchema.partial();

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
