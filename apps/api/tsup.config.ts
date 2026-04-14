import { defineConfig } from 'tsup';

/**
 * Bundle the Vercel serverless entry into a single self-contained JS file,
 * plus emit a minimal package.json listing the externals so Vercel installs
 * them at deploy time.
 */
export default defineConfig({
  entry: {
    'api/[[...route]]': 'api/[[...route]].ts',
  },
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  splitting: false,
  clean: true,
  sourcemap: false,
  dts: false,
  noExternal: [/^@fullstack-notes\//],
  external: ['hono', '@supabase/supabase-js', 'zod'],
  async onSuccess() {
    const { writeFile } = await import('node:fs/promises');
    const pkg = {
      name: 'fullstack-notes-api',
      version: '0.0.0',
      private: true,
      type: 'module',
      dependencies: {
        hono: '^4.6.0',
        '@supabase/supabase-js': '^2.45.0',
        zod: '^3.23.8',
      },
    };
    const vercelJson = {
      version: 2,
      framework: null,
      functions: {
        'api/[[...route]].js': { runtime: '@vercel/node@5.7.4' },
      },
    };
    await writeFile('dist/package.json', `${JSON.stringify(pkg, null, 2)}\n`);
    await writeFile('dist/vercel.json', `${JSON.stringify(vercelJson, null, 2)}\n`);
    console.log('[build] wrote dist/package.json + dist/vercel.json');
  },
});
