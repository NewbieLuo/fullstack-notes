import { describe, expect, it } from 'vitest';
import { app } from '../src/index.js';

describe('GET /api/health', () => {
  it('returns ok: true', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});

describe('CORS', () => {
  it('echoes request Origin back in Access-Control-Allow-Origin', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'https://newbieluo.github.io' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://newbieluo.github.io',
    );
  });

  it('short-circuits OPTIONS preflight with 204 + CORS headers', async () => {
    const res = await app.request('/api/notes', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://newbieluo.github.io',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://newbieluo.github.io',
    );
  });
});
