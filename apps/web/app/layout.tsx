import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { QueryProvider } from '../lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fullstack Notes',
  description: 'AI-native bootcamp lesson-10 practice',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased text-slate-900">
        <QueryProvider>
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
