import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app.js';
import { __setSupabaseClient } from '../src/lib/supabase.js';

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

function makeMockClient(override: Partial<MockChain> = {}) {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn(),
    ...override,
  };
  return { from: vi.fn(() => chain) } as unknown as Parameters<
    typeof __setSupabaseClient
  >[0];
}

const sampleNote = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'hello',
  content: 'world',
  created_at: '2026-04-13T10:00:00.000Z',
  updated_at: '2026-04-13T10:00:00.000Z',
};

beforeEach(() => {
  __setSupabaseClient(null);
});

afterEach(() => {
  __setSupabaseClient(null);
});

describe('GET /api/notes', () => {
  it('returns a list', async () => {
    const client = makeMockClient({
      order: vi.fn().mockResolvedValue({ data: [sampleNote], error: null }),
    });
    __setSupabaseClient(client);
    const res = await app.request('/api/notes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([sampleNote]);
  });

  it('returns empty array when no notes', async () => {
    const client = makeMockClient({
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    __setSupabaseClient(client);
    const res = await app.request('/api/notes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe('GET /api/notes/:id', () => {
  it('returns 200 with the note', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({ data: sampleNote, error: null }),
    });
    __setSupabaseClient(client);
    const res = await app.request(`/api/notes/${sampleNote.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sampleNote);
  });

  it('returns 404 when note not found', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      }),
    });
    __setSupabaseClient(client);
    const res = await app.request(
      '/api/notes/550e8400-e29b-41d4-a716-446655440099',
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });
});

describe('POST /api/notes', () => {
  it('creates and returns 201', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({ data: sampleNote, error: null }),
    });
    __setSupabaseClient(client);
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'hello', content: 'world' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(sampleNote);
  });

  it('returns 400 on invalid body (empty title)', async () => {
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/notes/:id', () => {
  it('updates and returns 200', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({
        data: { ...sampleNote, title: 'updated' },
        error: null,
      }),
    });
    __setSupabaseClient(client);
    const res = await app.request(`/api/notes/${sampleNote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'updated' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string };
    expect(body.title).toBe('updated');
  });
});

describe('DELETE /api/notes/:id', () => {
  it('returns 200 with ok:true', async () => {
    const client = makeMockClient({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    __setSupabaseClient(client);
    const res = await app.request(`/api/notes/${sampleNote.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
