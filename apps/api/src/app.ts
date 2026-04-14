import { Hono } from 'hono';
import { errorHandler } from './middleware/error-handler.js';
import { notesRoute } from './routes/notes.js';

console.log('[api] module loaded');

export const app = new Hono();

app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') ?? '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  await next();
});

app.get('/api/health', (c) => c.json({ ok: true, t: Date.now() }));
app.route('/api/notes', notesRoute);

app.onError(errorHandler);
