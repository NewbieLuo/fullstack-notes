import { describe, expect, it } from 'vitest';
import {
  NoteCreateSchema,
  NoteSchema,
  NoteUpdateSchema,
} from '../src/schemas/note';

describe('NoteSchema', () => {
  it('accepts a valid note', () => {
    const parsed = NoteSchema.parse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'hello',
      content: 'world',
      created_at: '2026-04-13T10:00:00.000Z',
      updated_at: '2026-04-13T10:00:00.000Z',
    });
    expect(parsed.title).toBe('hello');
  });

  it('rejects an invalid uuid', () => {
    expect(() =>
      NoteSchema.parse({
        id: 'not-a-uuid',
        title: 'x',
        content: '',
        created_at: '2026-04-13T10:00:00.000Z',
        updated_at: '2026-04-13T10:00:00.000Z',
      }),
    ).toThrow();
  });
});

describe('NoteCreateSchema', () => {
  it('accepts title + content', () => {
    const parsed = NoteCreateSchema.parse({ title: 'a', content: 'b' });
    expect(parsed).toEqual({ title: 'a', content: 'b' });
  });

  it('defaults content to empty string', () => {
    const parsed = NoteCreateSchema.parse({ title: 'only-title' });
    expect(parsed.content).toBe('');
  });

  it('rejects empty title', () => {
    expect(() => NoteCreateSchema.parse({ title: '', content: 'b' })).toThrow();
  });

  it('rejects title longer than 200 chars', () => {
    expect(() =>
      NoteCreateSchema.parse({ title: 'a'.repeat(201), content: 'b' }),
    ).toThrow();
  });
});

describe('NoteUpdateSchema', () => {
  it('allows partial update with only title', () => {
    const parsed = NoteUpdateSchema.parse({ title: 'new' });
    expect(parsed.title).toBe('new');
  });

  it('allows empty object', () => {
    expect(() => NoteUpdateSchema.parse({})).not.toThrow();
  });
});
