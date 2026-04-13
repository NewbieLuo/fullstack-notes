'use client';

import { Alert, AlertDescription, Button, Skeleton } from '@fullstack-notes/ui';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { NoteCard } from '../components/note-card';
import { api } from '../lib/api-client';

export default function HomePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notes'],
    queryFn: api.listNotes,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的笔记</h1>
        <Link href="/new/">
          <Button>新建</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            加载失败：{(error as Error).message}{' '}
            <button
              type="button"
              onClick={() => refetch()}
              className="underline"
            >
              重试
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {data && data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-500">还没有笔记，</p>
          <Link href="/new/" className="text-slate-900 underline">
            创建第一条吧
          </Link>
        </div>
      ) : null}

      {data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
