import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { handle } from 'hono/vercel';
import { z, ZodError } from 'zod';

// ---------- env ----------
const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

// ---------- supabase client ----------
let cachedClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// ---------- schemas ----------
const NoteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
});
const NoteUpdateSchema = NoteCreateSchema.partial();
const IdParamSchema = z.object({ id: z.string().uuid() });

// ---------- error handler ----------
const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ---------- app ----------
const env = loadEnv();
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());

const app = new Hono();

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

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
});

export default handle(app);
