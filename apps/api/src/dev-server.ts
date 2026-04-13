import { serve } from '@hono/node-server';
import { app } from './app';
import { loadEnv } from './lib/env';

const env = loadEnv();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  },
);
