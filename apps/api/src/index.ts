import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z, ZodError } from 'zod';

const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
});
const NoteUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});
const IdParamSchema = z.object({ id: z.string().uuid() });

const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

let cached: SupabaseClient | null = null;

export function __setSupabaseClient(client: SupabaseClient | null) {
  cached = client;
}

function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const app = new Hono();

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.get('/api/notes', async (c) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return c.json(data ?? []);
});

app.get('/api/notes/:id', async (c) => {
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

app.post('/api/notes', async (c) => {
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

app.patch('/api/notes/:id', async (c) => {
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

app.delete('/api/notes/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const supabase = getSupabase();
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return c.json({ ok: true });
});

app.onError((err, c) => {
  console.error('[api] error', err?.name, '|', err?.message);
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
      message: err?.message ?? 'Internal error',
    },
    500,
  );
});

export default app;
