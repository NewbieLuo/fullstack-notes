import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env';
import { errorHandler } from './middleware/error-handler';
import { notesRoute } from './routes/notes';

export const app = new Hono();

app.use('*', async (c, next) => {
  const env = loadEnv();
  const origins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/notes', notesRoute);

app.onError(errorHandler);
