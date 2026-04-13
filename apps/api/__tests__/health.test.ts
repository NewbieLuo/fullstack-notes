import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('GET /api/health', () => {
  it('returns ok: true', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});

describe('CORS', () => {
  it('sets Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    );
  });
});
