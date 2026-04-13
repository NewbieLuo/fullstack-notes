import { NoteCreateSchema, NoteUpdateSchema } from '@fullstack-notes/shared';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const notesRoute = new Hono();

notesRoute.get('/', async (c) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return c.json(data ?? []);
});

notesRoute.get('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116' || !data) {
    throw new HTTPException(404, { message: 'Note not found' });
  }
  if (error) throw new Error(error.message);
  return c.json(data);
});

notesRoute.post('/', async (c) => {
  const body = NoteCreateSchema.parse(await c.req.json());
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .insert(body)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return c.json(data, 201);
});

notesRoute.patch('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const body = NoteUpdateSchema.parse(await c.req.json());
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .update(body)
    .eq('id', id)
    .select('*')
    .single();
  if (error?.code === 'PGRST116' || !data) {
    throw new HTTPException(404, { message: 'Note not found' });
  }
  if (error) throw new Error(error.message);
  return c.json(data);
});

notesRoute.delete('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const supabase = getSupabase();
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return c.json({ ok: true });
});
