# fullstack-notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零搭建一个 pnpm + turborepo monorepo，包含 Next.js 静态前端、Hono 后端、Supabase 数据库、完整 GitHub Actions CI/CD，实现笔记 CRUD 并部署到 GitHub Pages + Vercel。

**Architecture:** 前端 Next.js 15 静态导出到 GitHub Pages；后端 Hono 以 serverless function 形式部署到 Vercel，调 Supabase JS client；前后端通过 HTTPS + JSON + CORS 通信。无登录，默认单用户。

**Tech Stack:** pnpm 9, Turborepo, TypeScript 5 (strict), Next.js 15 (App Router + static export), Hono, @supabase/supabase-js, Tailwind CSS, shadcn-style UI, @tanstack/react-query, react-hook-form, zod, Biome, Vitest, Husky + commitlint

**Spec 来源:** `docs/superpowers/specs/2026-04-13-fullstack-notes-design.md`

**项目根目录:** `C:\Users\hyluo2\Desktop\fullstack-notes`

---

## File Structure

```
fullstack-notes/
├── .github/workflows/ci.yml
├── .husky/commit-msg
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── layout.tsx                 # 根布局，含 React Query Provider
│   │   │   ├── globals.css                # Tailwind 指令
│   │   │   ├── page.tsx                   # / 列表
│   │   │   ├── new/page.tsx               # /new 新建
│   │   │   └── edit/page.tsx              # /edit?id=xxx 编辑+删除
│   │   ├── components/
│   │   │   ├── note-card.tsx              # 列表项
│   │   │   ├── note-form.tsx              # 复用的表单
│   │   │   └── delete-button.tsx          # 带确认弹窗的删除
│   │   ├── lib/
│   │   │   ├── api-client.ts              # fetch 封装
│   │   │   └── query-provider.tsx         # React Query Provider
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── package.json
│   └── api/
│       ├── api/[[...route]].ts            # Vercel serverless 入口
│       ├── src/
│       │   ├── app.ts                     # Hono app 定义（导出 app 实例）
│       │   ├── dev-server.ts              # 本地开发入口（@hono/node-server）
│       │   ├── routes/notes.ts            # CRUD 路由
│       │   ├── middleware/error-handler.ts
│       │   ├── lib/
│       │   │   ├── env.ts                 # 环境变量校验
│       │   │   └── supabase.ts            # Supabase client
│       │   └── __tests__/
│       │       ├── health.test.ts
│       │       └── notes.test.ts
│       ├── vercel.json
│       ├── vitest.config.ts
│       ├── tsconfig.json
│       ├── .env.example
│       └── package.json
├── packages/
│   ├── ui/
│   │   ├── src/
│   │   │   ├── lib/cn.ts                  # clsx + tailwind-merge
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── alert.tsx
│   │   │   │   └── dialog.tsx
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/note.ts
│   │   │   ├── errors.ts                  # 错误码常量
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   │   └── note.test.ts
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/
│       ├── tsconfig/
│       │   ├── base.json
│       │   ├── nextjs.json
│       │   └── node.json
│       ├── biome/
│       │   └── biome.base.json
│       └── package.json
├── .gitignore
├── .nvmrc
├── .env.example
├── biome.json
├── commitlint.config.mjs
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
├── DEPLOYMENT.md
└── README.md
```

**职责划分：**
- `packages/config` 只有配置，没有代码
- `packages/shared` 只有 zod schema 和常量，没有运行时副作用
- `packages/ui` 只有无状态 UI 组件，依赖 React + Tailwind
- `apps/api` 所有业务逻辑
- `apps/web` 只调 API + 渲染

---

## Phase 1: Monorepo Foundation

### Task 1: Init repo + pnpm workspaces + turborepo

**Files:**
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/package.json`
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/pnpm-workspace.yaml`
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/turbo.json`
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/.gitignore`
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/.nvmrc`
- Create: `C:/Users/hyluo2/Desktop/fullstack-notes/README.md`

- [ ] **Step 1: git init 并切到 main 分支**

```bash
cd /c/Users/hyluo2/Desktop/fullstack-notes
git init
git checkout -b main
```

- [ ] **Step 2: 写 root package.json**

```json
{
  "name": "fullstack-notes",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "biome format --write .",
    "prepare": "husky"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: 写 pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: 写 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**", "out/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: 写 .gitignore**

```
node_modules
.pnpm-store
.turbo
dist
.next
out
.vercel

# env
.env
.env.local
.env.*.local

# logs
*.log
npm-debug.log*
pnpm-debug.log*

# editor
.vscode/*
!.vscode/settings.json
.idea
.DS_Store
Thumbs.db
```

- [ ] **Step 6: 写 .nvmrc**

```
20
```

- [ ] **Step 7: 写 README.md（骨架）**

```markdown
# fullstack-notes

AI-native 前端训练营 lesson-10 随堂作业：monorepo + 前后端分离 + Supabase + GitHub CI/CD 全栈笔记应用。

## Stack
- pnpm workspaces + Turborepo
- Next.js 15 (static export → GitHub Pages)
- Hono (→ Vercel Serverless)
- Supabase (Postgres)
- TypeScript + Biome + Vitest

## URLs
- 前端: https://newbieluo.github.io/fullstack-notes/
- 后端: https://fullstack-notes-api.vercel.app

## Local Dev
见 DEPLOYMENT.md
```

- [ ] **Step 8: pnpm install**

```bash
pnpm install
```

Expected: 创建 `pnpm-lock.yaml`，无错误。

- [ ] **Step 9: 初次提交**

```bash
git add .
git commit -m "chore: init monorepo scaffold"
```

---

### Task 2: packages/config（共享 tsconfig + biome preset）

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/nextjs.json`
- Create: `packages/config/tsconfig/node.json`
- Create: `packages/config/biome/biome.base.json`
- Create: `tsconfig.base.json`（repo 根，给 IDE 用）
- Create: `biome.json`（repo 根）

- [ ] **Step 1: 创建 packages/config/package.json**

```json
{
  "name": "@fullstack-notes/config",
  "version": "0.0.0",
  "private": true,
  "files": [
    "tsconfig",
    "biome"
  ],
  "exports": {
    "./tsconfig/base.json": "./tsconfig/base.json",
    "./tsconfig/nextjs.json": "./tsconfig/nextjs.json",
    "./tsconfig/node.json": "./tsconfig/node.json",
    "./biome/biome.base.json": "./biome/biome.base.json"
  }
}
```

- [ ] **Step 2: 写 packages/config/tsconfig/base.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "build", ".next", "out"]
}
```

- [ ] **Step 3: 写 packages/config/tsconfig/nextjs.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 4: 写 packages/config/tsconfig/node.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["node"]
  }
}
```

- [ ] **Step 5: 写 packages/config/biome/biome.base.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      "dist",
      "build",
      ".next",
      "out",
      ".turbo",
      "pnpm-lock.yaml"
    ]
  }
}
```

- [ ] **Step 6: 写 root biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["./packages/config/biome/biome.base.json"]
}
```

- [ ] **Step 7: 写 root tsconfig.base.json（给 IDE 用的 solution file）**

```json
{
  "files": [],
  "references": [
    { "path": "apps/web" },
    { "path": "apps/api" },
    { "path": "packages/ui" },
    { "path": "packages/shared" }
  ]
}
```

- [ ] **Step 8: 安装 Biome + TypeScript 作为 root dev deps**

```bash
pnpm add -Dw @biomejs/biome@^1.9.4
```

- [ ] **Step 9: 验证 Biome 能运行**

```bash
pnpm exec biome --version
```

Expected: 输出 `1.9.x` 版本号。

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: add shared tsconfig and biome config package"
```

---

### Task 3: Husky + commitlint

**Files:**
- Create: `commitlint.config.mjs`
- Create: `.husky/commit-msg`
- Modify: `package.json`（已经有 `prepare: husky` 脚本）

- [ ] **Step 1: 安装依赖**

```bash
pnpm add -Dw husky@^9.1.0 @commitlint/cli@^19.5.0 @commitlint/config-conventional@^19.5.0
```

- [ ] **Step 2: 写 commitlint.config.mjs**

```js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

- [ ] **Step 3: husky init**

```bash
pnpm exec husky init
```

Expected: 创建 `.husky/pre-commit` 和 `.husky/_/` 目录。删掉 `.husky/pre-commit` 不需要。

```bash
rm .husky/pre-commit
```

- [ ] **Step 4: 写 .husky/commit-msg**

```bash
pnpm exec commitlint --edit "$1"
```

- [ ] **Step 5: 验证 commit-msg hook 能拦截不规范 commit**

```bash
git commit --allow-empty -m "bad message without type"
```

Expected: FAIL with commitlint 错误提示，commit 不成功。

- [ ] **Step 6: 验证 conventional commit 能通过**

```bash
git add .
git commit -m "chore: add husky and commitlint"
```

Expected: PASS, commit 成功。

---

## Phase 2: Shared Packages

### Task 4: packages/shared — zod schemas + errors

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/schemas/note.ts`
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/__tests__/note.test.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@fullstack-notes/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@fullstack-notes/config": "workspace:*",
    "@biomejs/biome": "^1.9.4",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 写 packages/shared/tsconfig.json**

```json
{
  "extends": "@fullstack-notes/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "__tests__/**/*"]
}
```

- [ ] **Step 3: 写 packages/shared/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 写失败的测试 packages/shared/__tests__/note.test.ts**

```ts
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
    expect(parsed.content).toBeUndefined();
  });

  it('allows empty object', () => {
    expect(() => NoteUpdateSchema.parse({})).not.toThrow();
  });
});
```

- [ ] **Step 5: Run tests, verify fail**

```bash
pnpm install
cd packages/shared
pnpm test
```

Expected: FAIL with "Cannot find module '../src/schemas/note'"

- [ ] **Step 6: 实现 packages/shared/src/schemas/note.ts**

```ts
import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const NoteCreateSchema = NoteSchema.pick({
  title: true,
  content: true,
}).extend({
  content: z.string().default(''),
});

export const NoteUpdateSchema = NoteCreateSchema.partial();

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
```

- [ ] **Step 7: 写 packages/shared/src/errors.ts**

```ts
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiError {
  error: ErrorCode;
  message: string;
}
```

- [ ] **Step 8: 写 packages/shared/src/index.ts**

```ts
export * from './schemas/note';
export * from './errors';
```

- [ ] **Step 9: Run tests, verify pass**

```bash
pnpm test
```

Expected: PASS (7 passed)

- [ ] **Step 10: Typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 11: Commit**

```bash
cd ../..
git add .
git commit -m "feat(shared): add Note zod schemas and error codes"
```

---

### Task 5: packages/ui — shadcn-style components

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/lib/cn.ts`
- Create: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/card.tsx`
- Create: `packages/ui/src/components/input.tsx`
- Create: `packages/ui/src/components/textarea.tsx`
- Create: `packages/ui/src/components/skeleton.tsx`
- Create: `packages/ui/src/components/alert.tsx`
- Create: `packages/ui/src/components/dialog.tsx`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@fullstack-notes/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "lint": "biome check .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "lucide-react": "^0.446.0"
  },
  "peerDependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@fullstack-notes/config": "workspace:*",
    "@biomejs/biome": "^1.9.4",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "extends": "@fullstack-notes/config/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 写 cn.ts**

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: 写 button.tsx**

```tsx
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-800',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline:
          'border border-slate-300 bg-white hover:bg-slate-100 text-slate-900',
        ghost: 'hover:bg-slate-100 text-slate-900',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
```

- [ ] **Step 5: 写 card.tsx**

```tsx
import * as React from 'react';
import { cn } from '../lib/cn';

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-slate-200 bg-white text-slate-900 shadow-sm',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';
```

- [ ] **Step 6: 写 input.tsx**

```tsx
import * as React from 'react';
import { cn } from '../lib/cn';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';
```

- [ ] **Step 7: 写 textarea.tsx**

```tsx
import * as React from 'react';
import { cn } from '../lib/cn';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[120px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
```

- [ ] **Step 8: 写 skeleton.tsx**

```tsx
import type * as React from 'react';
import { cn } from '../lib/cn';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 9: 写 alert.tsx**

```tsx
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '../lib/cn';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-white border-slate-200 text-slate-900',
        destructive:
          'border-red-300 bg-red-50 text-red-900 [&>svg]:text-red-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
```

- [ ] **Step 10: 写 dialog.tsx**

```tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 bg-white p-6 shadow-lg rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
    {...props}
  />
);

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className,
    )}
    {...props}
  />
);

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-slate-500', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
```

- [ ] **Step 11: 写 index.ts**

```ts
export * from './components/button';
export * from './components/card';
export * from './components/input';
export * from './components/textarea';
export * from './components/skeleton';
export * from './components/alert';
export * from './components/dialog';
export { cn } from './lib/cn';
```

- [ ] **Step 12: 安装依赖并 typecheck**

```bash
cd ../..
pnpm install
pnpm --filter @fullstack-notes/ui typecheck
```

Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "feat(ui): add shadcn-style Button/Card/Input/Textarea/Alert/Dialog/Skeleton"
```

---

## Phase 3: Backend (apps/api)

### Task 6: apps/api — scaffold + env + Supabase client

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/lib/env.ts`
- Create: `apps/api/src/lib/supabase.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@fullstack-notes/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/dev-server.ts",
    "build": "tsc",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@fullstack-notes/shared": "workspace:*",
    "@hono/node-server": "^1.13.0",
    "@supabase/supabase-js": "^2.45.0",
    "hono": "^4.6.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@fullstack-notes/config": "workspace:*",
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^20.16.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "extends": "@fullstack-notes/config/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "api/**/*", "__tests__/**/*"]
}
```

- [ ] **Step 3: 写 vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 写 .env.example**

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
ALLOWED_ORIGINS=http://localhost:3000,https://newbieluo.github.io
PORT=8787
```

- [ ] **Step 5: 写 src/lib/env.ts**

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(8787),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}
```

- [ ] **Step 6: 写 src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
```

- [ ] **Step 7: pnpm install**

```bash
cd ../..
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore(api): scaffold Hono app with env loader and Supabase client"
```

---

### Task 7: apps/api — Hono app + health route (TDD)

**Files:**
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/dev-server.ts`
- Create: `apps/api/__tests__/health.test.ts`

- [ ] **Step 1: 写失败的测试 apps/api/__tests__/health.test.ts**

```ts
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('GET /api/health', () => {
  it('returns ok: true', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run tests, verify fail**

```bash
pnpm --filter @fullstack-notes/api test
```

Expected: FAIL with "Cannot find module '../src/app'"

- [ ] **Step 3: 实现 src/app.ts（最小版本）**

```ts
import { Hono } from 'hono';

export const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true }));
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm --filter @fullstack-notes/api test
```

Expected: PASS (1 passed)

- [ ] **Step 5: 写 src/dev-server.ts（本地启动入口）**

```ts
import { serve } from '@hono/node-server';
import { app } from './app';
import { loadEnv } from './lib/env';

const env = loadEnv();

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`[api] listening on http://localhost:${info.port}`);
  },
);
```

- [ ] **Step 6: Commit**

```bash
cd ../..
git add .
git commit -m "feat(api): add Hono app with health endpoint"
```

---

### Task 8: apps/api — CORS middleware + error handler

**Files:**
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/middleware/error-handler.ts`

- [ ] **Step 1: 写 middleware/error-handler.ts**

```ts
import { ErrorCodes } from '@fullstack-notes/shared';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: ErrorCodes.VALIDATION_ERROR,
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      },
      400,
    );
  }
  if (err instanceof HTTPException) {
    const status = err.status;
    if (status === 404) {
      return c.json({ error: ErrorCodes.NOT_FOUND, message: err.message }, 404);
    }
    return c.json({ error: ErrorCodes.INTERNAL_ERROR, message: err.message }, status);
  }
  console.error('[api] unhandled error:', err);
  return c.json(
    { error: ErrorCodes.INTERNAL_ERROR, message: 'Internal server error' },
    500,
  );
}
```

- [ ] **Step 2: 更新 src/app.ts 加 CORS + error handler**

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env';
import { errorHandler } from './middleware/error-handler';

export const app = new Hono();

// CORS
app.use('*', async (c, next) => {
  const env = loadEnv();
  const origins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true }));

app.onError(errorHandler);
```

- [ ] **Step 3: 写 CORS 行为测试（加到 __tests__/health.test.ts 末尾）**

```ts
describe('CORS', () => {
  it('sets Access-Control-Allow-Origin for allowed origin', async () => {
    const res = await app.request('/api/health', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000',
    );
  });
});
```

- [ ] **Step 4: 设置测试 env 并跑**

在 `apps/api/vitest.config.ts` 里加 env 设置：

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    env: {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      ALLOWED_ORIGINS: 'http://localhost:3000',
      PORT: '8787',
    },
  },
});
```

- [ ] **Step 5: Run tests, verify pass**

```bash
pnpm --filter @fullstack-notes/api test
```

Expected: PASS (2 passed)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(api): add CORS middleware and error handler"
```

---

### Task 9: apps/api — notes routes (TDD, with mocked Supabase)

**Files:**
- Create: `apps/api/src/routes/notes.ts`
- Create: `apps/api/__tests__/notes.test.ts`
- Modify: `apps/api/src/app.ts`（挂载路由）
- Modify: `apps/api/src/lib/supabase.ts`（暴露可覆盖 getter 以便测试）

- [ ] **Step 1: 重构 src/lib/supabase.ts 方便 mock**

```ts
import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const env = loadEnv();
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

// Test only: override client for mocking
export function __setSupabaseClient(client: SupabaseClient | null) {
  cachedClient = client;
}
```

- [ ] **Step 2: 写失败的测试 apps/api/__tests__/notes.test.ts**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';
import { __setSupabaseClient } from '../src/lib/supabase';

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
};

function makeMockClient(override: Partial<MockChain>) {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    ...override,
  };
  // @ts-expect-error partial mock
  return { from: vi.fn(() => chain) };
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
    // @ts-expect-error mock
    __setSupabaseClient(client);
    const res = await app.request('/api/notes');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([sampleNote]);
  });
});

describe('GET /api/notes/:id', () => {
  it('returns 200 with the note', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({ data: sampleNote, error: null }),
    });
    // @ts-expect-error mock
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
    // @ts-expect-error mock
    __setSupabaseClient(client);
    const res = await app.request('/api/notes/550e8400-e29b-41d4-a716-446655440099');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('NOT_FOUND');
  });
});

describe('POST /api/notes', () => {
  it('creates and returns 201', async () => {
    const client = makeMockClient({
      single: vi.fn().mockResolvedValue({ data: sampleNote, error: null }),
    });
    // @ts-expect-error mock
    __setSupabaseClient(client);
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'hello', content: 'world' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(sampleNote);
  });

  it('returns 400 on invalid body', async () => {
    const res = await app.request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
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
    // @ts-expect-error mock
    __setSupabaseClient(client);
    const res = await app.request(`/api/notes/${sampleNote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'updated' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('updated');
  });
});

describe('DELETE /api/notes/:id', () => {
  it('returns 200 with ok:true', async () => {
    const client = makeMockClient({
      eq: vi.fn().mockResolvedValue({ data: null, error: null, count: 1 }),
    });
    // @ts-expect-error mock
    __setSupabaseClient(client);
    const res = await app.request(`/api/notes/${sampleNote.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Run tests, verify fail**

```bash
pnpm --filter @fullstack-notes/api test
```

Expected: FAIL (routes not implemented)

- [ ] **Step 4: 实现 src/routes/notes.ts**

```ts
import { NoteCreateSchema, NoteUpdateSchema } from '@fullstack-notes/shared';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';

const IdParamSchema = z.object({ id: z.string().uuid() });

export const notesRoute = new Hono();

notesRoute.get('/', async (c) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return c.json(data ?? []);
});

notesRoute.get('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  if (error?.code === 'PGRST116' || !data) {
    throw new HTTPException(404, { message: 'Note not found' });
  }
  if (error) throw new Error(error.message);
  return c.json(data);
});

notesRoute.post('/', async (c) => {
  const body = NoteCreateSchema.parse(await c.req.json());
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .insert(body)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return c.json(data, 201);
});

notesRoute.patch('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const body = NoteUpdateSchema.parse(await c.req.json());
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notes')
    .update(body)
    .eq('id', id)
    .select('*')
    .single();
  if (error?.code === 'PGRST116' || !data) {
    throw new HTTPException(404, { message: 'Note not found' });
  }
  if (error) throw new Error(error.message);
  return c.json(data);
});

notesRoute.delete('/:id', async (c) => {
  const { id } = IdParamSchema.parse({ id: c.req.param('id') });
  const supabase = getSupabase();
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return c.json({ ok: true });
});
```

- [ ] **Step 5: 挂载到 app.ts**

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loadEnv } from './lib/env';
import { errorHandler } from './middleware/error-handler';
import { notesRoute } from './routes/notes';

export const app = new Hono();

app.use('*', async (c, next) => {
  const env = loadEnv();
  const origins = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api/notes', notesRoute);

app.onError(errorHandler);
```

- [ ] **Step 6: Run tests, verify all pass**

```bash
pnpm --filter @fullstack-notes/api test
```

Expected: PASS (all tests from health + notes)

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(api): implement notes CRUD routes with tests"
```

---

### Task 10: apps/api — Vercel serverless entry

**Files:**
- Create: `apps/api/api/[[...route]].ts`
- Create: `apps/api/vercel.json`

- [ ] **Step 1: 写 api/[[...route]].ts**

```ts
import { handle } from 'hono/vercel';
import { app } from '../src/app';

export const config = {
  runtime: 'nodejs',
};

export default handle(app);
```

- [ ] **Step 2: 写 vercel.json**

```json
{
  "version": 2,
  "buildCommand": "pnpm turbo run build --filter=@fullstack-notes/api",
  "outputDirectory": ".vercel/output",
  "framework": null,
  "functions": {
    "api/[[...route]].ts": {
      "runtime": "@vercel/node@3.2.0"
    }
  }
}
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @fullstack-notes/api typecheck
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(api): add Vercel serverless entry point"
```

---

## Phase 4: Frontend (apps/web)

### Task 11: apps/web — Next.js 15 scaffold

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.mjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`（占位）
- Create: `apps/web/.env.example`
- Create: `apps/web/next-env.d.ts`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "@fullstack-notes/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "echo \"no tests in web\" && exit 0"
  },
  "dependencies": {
    "@fullstack-notes/shared": "workspace:*",
    "@fullstack-notes/ui": "workspace:*",
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.59.0",
    "lucide-react": "^0.446.0",
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@fullstack-notes/config": "workspace:*",
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^20.16.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 写 tsconfig.json**

```json
{
  "extends": "@fullstack-notes/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 写 next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/fullstack-notes',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@fullstack-notes/ui', '@fullstack-notes/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
```

- [ ] **Step 4: 写 tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: 写 postcss.config.mjs**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: 写 app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  min-height: 100%;
  background-color: #f8fafc;
}
```

- [ ] **Step 7: 写 app/layout.tsx**

```tsx
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
```

- [ ] **Step 8: 写 app/page.tsx（占位）**

```tsx
export default function HomePage() {
  return <div>Hello fullstack-notes</div>;
}
```

- [ ] **Step 9: 写 .env.example**

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

- [ ] **Step 10: 写 next-env.d.ts**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 11: 写 lib/query-provider.tsx**

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 12: pnpm install + typecheck**

```bash
cd ../..
pnpm install
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add .
git commit -m "chore(web): scaffold Next.js 15 with static export and tailwind"
```

---

### Task 12: apps/web — api-client

**Files:**
- Create: `apps/web/lib/api-client.ts`

- [ ] **Step 1: 写 lib/api-client.ts**

```ts
import type {
  Note,
  NoteCreate,
  NoteUpdate,
} from '@fullstack-notes/shared';

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
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(web): add typed api client"
```

---

### Task 13: apps/web — NoteCard, NoteForm, DeleteButton 组件

**Files:**
- Create: `apps/web/components/note-card.tsx`
- Create: `apps/web/components/note-form.tsx`
- Create: `apps/web/components/delete-button.tsx`

- [ ] **Step 1: 写 components/note-card.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@fullstack-notes/ui';
import type { Note } from '@fullstack-notes/shared';
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
```

- [ ] **Step 2: 写 components/note-form.tsx**

```tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Input,
  Textarea,
} from '@fullstack-notes/ui';
import {
  NoteCreateSchema,
  type NoteCreate,
} from '@fullstack-notes/shared';
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
```

- [ ] **Step 3: 写 components/delete-button.tsx**

```tsx
'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@fullstack-notes/ui';
import { useState } from 'react';

interface Props {
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function DeleteButton({ onConfirm, isDeleting = false }: Props) {
  const [open, setOpen] = useState(false);

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">删除</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除？</DialogTitle>
          <DialogDescription>删除后无法恢复。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: typecheck**

```bash
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat(web): add NoteCard, NoteForm, DeleteButton components"
```

---

### Task 14: apps/web — 列表页 /

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: 实现 app/page.tsx**

```tsx
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
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(web): implement notes list page"
```

---

### Task 15: apps/web — 新建页 /new

**Files:**
- Create: `apps/web/app/new/page.tsx`

- [ ] **Step 1: 写 app/new/page.tsx**

```tsx
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
        onSubmit={(values) => mutateAsync(values)}
        isSubmitting={isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(web): implement new note page"
```

---

### Task 16: apps/web — 编辑页 /edit

**Files:**
- Create: `apps/web/app/edit/page.tsx`

- [ ] **Step 1: 写 app/edit/page.tsx**

```tsx
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
            onConfirm={() => deleteMutation.mutateAsync()}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </div>
      <NoteForm
        defaultValues={{ title: note.title, content: note.content }}
        submitLabel="保存修改"
        onSubmit={(values) => updateMutation.mutateAsync(values)}
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
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @fullstack-notes/web typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat(web): implement edit page with delete"
```

---

## Phase 5: CI/CD & Deployment

### Task 17: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 写 .github/workflows/ci.yml**

```yaml
name: CI & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Lint / Typecheck / Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test

  build-web:
    name: Build Web
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build --filter=@fullstack-notes/web
        env:
          NEXT_PUBLIC_API_BASE_URL: https://fullstack-notes-api.vercel.app
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/out

  deploy-web:
    name: Deploy Web → GitHub Pages
    needs: build-web
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4

  deploy-api:
    name: Deploy API → Vercel
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_API }}
          working-directory: ./apps/api
          vercel-args: '--prod'
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "ci: add GitHub Actions workflow for CI & deploy"
```

---

### Task 18: 根 .env.example + DEPLOYMENT.md

**Files:**
- Create: `.env.example`（repo 根）
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: 写 repo 根 .env.example**

```
# apps/api/.env.local
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALLOWED_ORIGINS=http://localhost:3000,https://newbieluo.github.io
PORT=8787

# apps/web/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

- [ ] **Step 2: 写 DEPLOYMENT.md**

````markdown
# Deployment Guide

## 一次性准备

### 1. Supabase 项目

1. 访问 https://supabase.com 注册/登录
2. New project → 填写名字、region、数据库密码
3. 等待项目 ready（约 1 分钟）
4. Settings → API 页面，复制：
   - `Project URL` → 环境变量 `SUPABASE_URL`
   - `service_role` key → 环境变量 `SUPABASE_SERVICE_ROLE_KEY`
5. SQL Editor → New query，执行：

```sql
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 200),
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
```

### 2. Vercel 后端项目

```bash
cd apps/api
pnpm dlx vercel login
pnpm dlx vercel link       # 交互式绑定，项目名填 fullstack-notes-api
pnpm dlx vercel env add SUPABASE_URL production
pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY production
pnpm dlx vercel env add ALLOWED_ORIGINS production
# ALLOWED_ORIGINS 填：http://localhost:3000,https://newbieluo.github.io
```

从 `apps/api/.vercel/project.json` 读出 `orgId` 和 `projectId`，记下来。

### 3. GitHub 仓库

```bash
# 在 github.com 创建 NewbieLuo/fullstack-notes 仓库（空，不要 README）
git remote add origin https://github.com/NewbieLuo/fullstack-notes.git
git push -u origin main
```

### 4. GitHub Secrets

仓库 Settings → Secrets and variables → Actions → New repository secret，添加 3 个：

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `.vercel/project.json` 里的 `orgId` |
| `VERCEL_PROJECT_ID_API` | `.vercel/project.json` 里的 `projectId` |

### 5. GitHub Pages 设置

仓库 Settings → Pages → Source 选 **GitHub Actions**。

## 本地开发

```bash
pnpm install

# 复制 .env.example 到对应位置
cp .env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
# 编辑 apps/api/.env.local 填入 Supabase 真实凭证

pnpm dev
```

- 前端: http://localhost:3000/fullstack-notes/
- 后端: http://localhost:8787/api/health

## 首次部署验证

push 到 main 后去 Actions 页面看 workflow：

1. `Lint / Typecheck / Test` 绿
2. `Build Web` 绿
3. `Deploy Web → GitHub Pages` 绿，查看 https://newbieluo.github.io/fullstack-notes/
4. `Deploy API → Vercel` 绿，查看 https://fullstack-notes-api.vercel.app/api/health

全绿即完成。
````

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "docs: add deployment guide"
```

---

## Phase 6: 本地完整验证 + 推送

### Task 19: 本地端到端验证

- [ ] **Step 1: 确保 Supabase 已建表（见 DEPLOYMENT.md 第 1 步）**

- [ ] **Step 2: 填 apps/api/.env.local**

```bash
cp apps/api/.env.example apps/api/.env.local
# 编辑文件，把 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 换成真实值
```

- [ ] **Step 3: 填 apps/web/.env.local**

```bash
cp apps/web/.env.example apps/web/.env.local
# 默认值 http://localhost:8787 即可
```

- [ ] **Step 4: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 5: 启动所有服务**

```bash
pnpm dev
```

Expected: 两个进程同时启动
- `[api] listening on http://localhost:8787`
- `[web] ▲ Next.js ... Local: http://localhost:3000`

- [ ] **Step 6: 验证后端 health**

```bash
curl http://localhost:8787/api/health
```

Expected: `{"ok":true}`

- [ ] **Step 7: 浏览器打开前端，手动完整跑一遍 CRUD**

访问 http://localhost:3000/fullstack-notes/

- 点"新建" → 填写标题和内容 → 点"保存" → 回到列表页，看到新笔记 ✓
- 点列表项 → 进编辑页 → 修改内容 → 保存 → 回到列表页，内容已变 ✓
- 点列表项 → 进编辑页 → 点"删除" → 确认 → 回到列表页，笔记消失 ✓

- [ ] **Step 8: 跑完整 lint / typecheck / test**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: 三个命令全部 PASS

---

### Task 20: 推送到 GitHub 并验证 CI/CD

- [ ] **Step 1: 用户在 github.com 手动创建空仓库 NewbieLuo/fullstack-notes**

(不要勾选 "Initialize with README / .gitignore")

- [ ] **Step 2: 绑定 remote 并 push**

```bash
git remote add origin https://github.com/NewbieLuo/fullstack-notes.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: 按 DEPLOYMENT.md 完成 Vercel 链接和 GitHub Secrets 配置**

- [ ] **Step 4: GitHub → Settings → Pages → Source 选 "GitHub Actions"**

- [ ] **Step 5: 触发一次空 commit 让 workflow 重跑（因为 secrets 配置是在 push 之后）**

```bash
git commit --allow-empty -m "chore: trigger ci after secrets setup"
git push
```

- [ ] **Step 6: 打开 GitHub → Actions 看 workflow 运行**

Expected: 4 个 job 全绿
- `quality` ✓
- `build-web` ✓
- `deploy-web` ✓
- `deploy-api` ✓

- [ ] **Step 7: 验证生产 URL**

```bash
curl https://fullstack-notes-api.vercel.app/api/health
```
Expected: `{"ok":true}`

浏览器访问 https://newbieluo.github.io/fullstack-notes/
Expected: 列表页能打开，能新建/编辑/删除笔记

- [ ] **Step 8: 最终验收 checklist（对照 spec 第 10 节）**

- [ ] 本地 `pnpm install && pnpm dev` 能同时启动前后端
- [ ] main 分支 push 后 4 个 CI job 全绿
- [ ] `https://newbieluo.github.io/fullstack-notes/` 可访问
- [ ] `https://fullstack-notes-api.vercel.app/api/health` 返回 `{ ok: true }`
- [ ] 生产 URL 上跑完一次新建→编辑→删除闭环
- [ ] `pnpm lint` / `pnpm typecheck` / `pnpm test` 全通过
- [ ] 不规范 commit 被 husky 拦截（可用 `git commit --allow-empty -m "bad"` 测）

全部勾选 = 作业完成。

---

## 自检清单（写完计划后的复核）

**1. Spec 覆盖：**
- ✅ 目标 1（pnpm+turborepo）→ Task 1
- ✅ 目标 2（Next.js 前端）→ Task 11-16
- ✅ 目标 3（Hono 后端）→ Task 6-10
- ✅ 目标 4（Supabase）→ Task 6 (env/client) + DEPLOYMENT.md (建表)
- ✅ 目标 5（CRUD）→ Task 9
- ✅ 目标 6（CI/CD 双端部署）→ Task 17, 20
- ✅ 目标 7（Biome / TS strict / Vitest / Husky + commitlint）→ Task 2, 3, 4, 7

**2. 占位符扫描：** 无 TBD/TODO/"implement later"。每个步骤都有具体代码或具体命令。

**3. 类型一致性：**
- `NoteSchema` / `NoteCreateSchema` / `NoteUpdateSchema` 在 Task 4 定义，Task 9/12/13/15/16 里的导入和使用都对齐
- `api.listNotes / getNote / createNote / updateNote / deleteNote` 在 Task 12 定义，Task 14/15/16 使用时名字一致
- `@fullstack-notes/*` workspace 名称在所有 package.json 里都一致
- `ErrorCodes.VALIDATION_ERROR / NOT_FOUND / INTERNAL_ERROR` 在 Task 4 定义，Task 8 error handler 使用

**4. 环境变量一致性：**
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `ALLOWED_ORIGINS` / `PORT` 在 Task 6 env.ts 定义，和 `.env.example`、vitest.config.ts、DEPLOYMENT.md 都对齐
- `NEXT_PUBLIC_API_BASE_URL` 在 Task 12 使用，Task 11 `.env.example`、Task 17 CI workflow、DEPLOYMENT.md 都对齐
