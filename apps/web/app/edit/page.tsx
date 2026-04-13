'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Skeleton,
} from '@fullstack-notes/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { DeleteButton } from '../../components/delete-button';
import { NoteForm } from '../../components/note-form';
import { api } from '../../lib/api-client';

function EditPageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: note,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notes', id],
    queryFn: () => {
      if (!id) throw new Error('Missing id');
      return api.getNote(id);
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (values: { title: string; content: string }) => {
      if (!id) throw new Error('Missing id');
      return api.updateNote(id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['notes', id] });
      router.push('/');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('Missing id');
      return api.deleteNote(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.push('/');
    },
  });

  if (!id) {
    return (
      <Alert variant="destructive">
        <AlertDescription>缺少笔记 id 参数</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>加载失败：{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  if (!note) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">编辑笔记</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">返回</Button>
          </Link>
          <DeleteButton
            onConfirm={async () => {
              await deleteMutation.mutateAsync();
            }}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </div>
      <NoteForm
        defaultValues={{ title: note.title, content: note.content }}
        submitLabel="保存修改"
        onSubmit={async (values) => {
          await updateMutation.mutateAsync(values);
        }}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <EditPageInner />
    </Suspense>
  );
}
