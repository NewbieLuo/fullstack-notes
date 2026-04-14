import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notesRoute } from './routes/notes.js';

const env = loadEnv();
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());

export const app = new Hono();

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/notes', notesRoute);

app.onError(errorHandler);
