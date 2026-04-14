import { Hono } from 'hono';
import { handle } from 'hono/vercel';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, minimal: true }));
app.get('/api/ping', (c) => c.text('pong'));
app.all('*', (c) => c.json({ path: c.req.path, method: c.req.method }));

export default handle(app);
