import type { Note, NoteCreate, NoteUpdate } from '@fullstack-notes/shared';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listNotes: () => request<Note[]>('/api/notes'),
  getNote: (id: string) => request<Note>(`/api/notes/${id}`),
  createNote: (body: NoteCreate) =>
    request<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateNote: (id: string, body: NoteUpdate) =>
    request<Note>(`/api/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteNote: (id: string) =>
    request<{ ok: true }>(`/api/notes/${id}`, {
      method: 'DELETE',
    }),
};
