import { app } from '../src/app.js';

export default async function handler(req: Request): Promise<Response> {
  console.log('[handler]', req.method, new URL(req.url).pathname);
  try {
    const res = await app.fetch(req);
    console.log('[handler] done', res.status);
    return res;
  } catch (err) {
    const e = err as Error;
    console.error('[handler] threw', e?.name, e?.message, e?.stack);
    return new Response(
      JSON.stringify({ error: 'INTERNAL_ERROR', message: e?.message }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        },
      },
    );
  }
}
