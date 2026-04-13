'use client';

import { NoteCreateSchema, type NoteCreate } from '@fullstack-notes/shared';
import { Button, Input, Textarea } from '@fullstack-notes/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface Props {
  defaultValues?: Partial<NoteCreate>;
  submitLabel: string;
  onSubmit: (values: NoteCreate) => void | Promise<void>;
  isSubmitting?: boolean;
}

export function NoteForm({
  defaultValues,
  submitLabel,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NoteCreate>({
    resolver: zodResolver(NoteCreateSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      content: defaultValues?.content ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title" className="text-sm font-medium">
          标题
        </label>
        <Input
          id="title"
          {...register('title')}
          placeholder="随便写点什么"
          className="mt-1"
        />
        {errors.title ? (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="content" className="text-sm font-medium">
          内容
        </label>
        <Textarea
          id="content"
          {...register('content')}
          placeholder="（可选）"
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '保存中...' : submitLabel}
      </Button>
    </form>
  );
}
