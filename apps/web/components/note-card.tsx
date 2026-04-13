import type { Note } from '@fullstack-notes/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@fullstack-notes/ui';
import Link from 'next/link';

export function NoteCard({ note }: { note: Note }) {
  return (
    <Link href={`/edit/?id=${note.id}`} className="block">
      <Card className="hover:border-slate-400 transition-colors">
        <CardHeader>
          <CardTitle>{note.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 line-clamp-2">
            {note.content || '(无内容)'}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {new Date(note.updated_at).toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
