'use client';

import { Button } from '@fullstack-notes/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { NoteForm } from '../../components/note-form';
import { api } from '../../lib/api-client';

export default function NewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: api.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      router.push('/');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">新建笔记</h1>
        <Link href="/">
          <Button variant="outline">返回</Button>
        </Link>
      </div>
      <NoteForm
        submitLabel="保存"
        onSubmit={async (values) => {
          await mutateAsync(values);
        }}
        isSubmitting={isPending}
      />
    </div>
  );
}
