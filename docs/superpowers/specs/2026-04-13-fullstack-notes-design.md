# fullstack-notes 设计稿

- **项目名**：`fullstack-notes`
- **GitHub 账号**：`NewbieLuo`
- **仓库 URL**：`https://github.com/NewbieLuo/fullstack-notes`
- **前端访问 URL**：`https://newbieluo.github.io/fullstack-notes/`
- **后端 API URL**：`https://fullstack-notes-api.vercel.app/`
- **定位**：AI-native 随堂作业，目标是完整走通"monorepo + 前后端分离 + 云数据库 + GitHub CI/CD"的工程链路
- **日期**：2026-04-13

---

## 1. 目标与非目标

### 目标

- 搭建一个 pnpm + turborepo 管理的 monorepo
- 包含一个 Next.js 15 前端 (`apps/web`) 和一个 Hono 后端 (`apps/api`)
- 后端通过 Supabase JS client 访问 Supabase Postgres 数据库
- 实现一个最小可用的"笔记 CRUD"：列表 / 新建 / 详情 / 编辑 / 删除
- GitHub Actions 驱动的 CI/CD 双端部署：前端 → GitHub Pages，后端 → Vercel
- 代码规范基础设施完整：Biome、TypeScript strict、Vitest、Husky + commitlint

### 非目标（明确砍掉）

- ❌ 用户注册 / 登录 / 权限 / RLS —— 单用户心智模型，后端不校验身份
- ❌ AI 相关功能、Vercel AI SDK
- ❌ CodeRabbit / AI code review
- ❌ Playwright E2E 测试
- ❌ Turborepo smart test selection（按变更分析跑测试）
- ❌ 国际化、暗色模式、PWA 等前端锦上添花
- ❌ 实时订阅（Supabase Realtime）、Storage、Edge Functions

---

## 2. 整体架构

```
                         用户浏览器
                             │
                             │ 1. 打开页面（纯静态 HTML/CSS/JS）
                             ↓
            ┌───────────────────────────────┐
            │       GitHub Pages (CDN)       │
            │  newbieluo.github.io/          │
            │       fullstack-notes/         │
            │                                │
            │  Next.js 静态导出产物：         │
            │   - index.html (笔记列表)       │
            │   - notes/[id]/index.html      │
            │   - new/index.html             │
            │   - _next/static/* (JS/CSS)    │
            └───────────────────────────────┘
                             │
                             │ 2. 浏览器 JS 发起 fetch()
                             │    跨域请求（CORS）
                             ↓
            ┌───────────────────────────────┐
            │      Vercel Serverless         │
            │  fullstack-notes-api           │
            │       .vercel.app               │
            │                                │
            │  Hono 后端：                    │
            │   - GET    /api/notes          │
            │   - GET    /api/notes/:id      │
            │   - POST   /api/notes          │
            │   - PATCH  /api/notes/:id      │
            │   - DELETE /api/notes/:id      │
            │   - GET    /api/health         │
            └───────────────────────────────┘
                             │
                             │ 3. @supabase/supabase-js (service_role key)
                             │    HTTPS，仅服务端持有凭证
                             ↓
            ┌───────────────────────────────┐
            │       Supabase Cloud           │
            │    <project>.supabase.co       │
            │                                │
            │  Postgres: notes 表            │
            │                                │
            │  （Auth / Storage / Realtime   │
            │    本项目不用）                 │
            └───────────────────────────────┘
```

### 三个关键边界

**边界 1：浏览器 ⇄ GitHub Pages**
- 纯静态资源，没有服务端逻辑；所有 HTML 都是 Next.js 构建时预渲染
- 路由走 Next.js 的 client-side routing，页面切换不触发 Pages 请求

**边界 2：浏览器 ⇄ Vercel API**
- 前端域 `newbieluo.github.io` ≠ 后端域 `fullstack-notes-api.vercel.app` → 跨域，Hono 必须显式配置 CORS 白名单
- 前端通过环境变量 `NEXT_PUBLIC_API_BASE_URL` 知道后端在哪里，构建时注入
- 所有请求都是明文 JSON，不带任何 token（无 auth）

**边界 3：Vercel API ⇄ Supabase**
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 只存在于后端环境变量，永不进前端 bundle
- 使用 service role client，绕过 RLS（本项目不启用 RLS）
- 后端是 Supabase 的唯一客户端，浏览器永远不直连 Supabase

### 典型数据流："新建一条笔记"

```
用户在浏览器填表单，点"保存"
  │
  ├→ React onClick → fetch('https://fullstack-notes-api.vercel.app/api/notes',
  │                    { method: 'POST', body: JSON.stringify({title, content}) })
  │
  ├→ Vercel 冷启动 / 复用 Serverless function
  │
  ├→ Hono 路由匹配 POST /api/notes → 中间件 (cors, zod validation)
  │
  ├→ handler 调 supabase.from('notes').insert({title, content}).select().single()
  │
  ├→ Supabase 返回新建的 row
  │
  ├→ Hono 返回 JSON { id, title, content, created_at, updated_at }
  │
  └→ 前端收到 → invalidate query cache → 路由跳转到 /notes/:id
```

---

## 3. monorepo 结构

```
fullstack-notes/
├── .github/workflows/ci.yml           # CI & 双端部署
├── .husky/commit-msg                  # commitlint 钩子
├── apps/
│   ├── web/                           # Next.js 15 前端（静态导出）
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # / 列表
│   │   │   ├── new/page.tsx           # /new 新建
│   │   │   └── edit/page.tsx          # /edit?id=xxx 编辑+删除（用 search params）
│   │   ├── components/
│   │   ├── lib/api-client.ts          # fetch 封装
│   │   ├── next.config.mjs            # output: 'export', basePath: '/fullstack-notes', trailingSlash: true
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── api/                           # Hono 后端
│       ├── src/
│       │   ├── index.ts               # app entry
│       │   ├── routes/notes.ts        # CRUD routes
│       │   ├── middleware/cors.ts
│       │   └── lib/supabase.ts        # supabase client (service_role)
│       ├── vercel.json                # serverless function config
│       └── package.json
├── packages/
│   ├── ui/                            # 共享 shadcn 组件
│   ├── shared/                        # 前后端共享 zod schema + TS 类型
│   └── config/                        # 共享 tsconfig / biome / tailwind 预设
├── .gitignore
├── .nvmrc                             # 20
├── biome.json
├── commitlint.config.mjs
├── package.json                       # root, workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── README.md
```

### 各 workspace 职责边界

| workspace | 依赖 | 职责 | 禁止 |
|---|---|---|---|
| `apps/web` | `packages/{ui, shared, config}` | 渲染 UI，调 API，管理本地 UI 状态 | 业务逻辑、直连 Supabase |
| `apps/api` | `packages/{shared, config}` | 业务逻辑、参数校验、调 Supabase | 渲染 UI |
| `packages/ui` | `packages/config` | 无状态 UI 组件（Button/Card/Input/Alert/Dialog/Skeleton 等） | 业务逻辑、网络请求 |
| `packages/shared` | 无 | zod schema + 导出 TS 类型 | 任何运行时依赖 |
| `packages/config` | 无 | tsconfig / biome / tailwind 预设 | 代码 |

### workspace 命名（package.json `name`）

- 根：`fullstack-notes`
- `@fullstack-notes/web`
- `@fullstack-notes/api`
- `@fullstack-notes/ui`
- `@fullstack-notes/shared`
- `@fullstack-notes/config`

---

## 4. 数据层

### Supabase schema

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

-- 不启用 RLS；后端用 service_role key 直接访问
```

### 共享 zod schema（`packages/shared/src/schemas/note.ts`）

```ts
import { z } from 'zod';

export const NoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const NoteCreateSchema = NoteSchema.pick({ title: true, content: true });
export const NoteUpdateSchema = NoteCreateSchema.partial();

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
```

### API 契约

| Method | Path | Body | 成功响应 | 失败响应 |
|---|---|---|---|---|
| GET | `/api/health` | — | `200 { ok: true }` | — |
| GET | `/api/notes` | — | `200 Note[]`（按 created_at 倒序） | — |
| GET | `/api/notes/:id` | — | `200 Note` | `404` |
| POST | `/api/notes` | `NoteCreate` | `201 Note` | `400` |
| PATCH | `/api/notes/:id` | `NoteUpdate` | `200 Note` | `400 / 404` |
| DELETE | `/api/notes/:id` | — | `200 { ok: true }` | `404` |

**统一错误响应格式：**
```json
{ "error": "NOT_FOUND", "message": "Note not found" }
```

**错误码枚举：**
- `VALIDATION_ERROR` → 400（zod 解析失败）
- `NOT_FOUND` → 404
- `INTERNAL_ERROR` → 500（其它未知错误，日志里打完整堆栈）

---

## 5. 前端页面 & 交互

### 路由表

| 路径 | 页面 | 关键组件 |
|---|---|---|
| `/` | 笔记列表 | `NoteCard` ×N + "新建"按钮，空态引导 |
| `/new` | 新建笔记 | `NoteForm`（title input + content textarea） |
| `/edit?id=xxx` | 编辑 / 删除已有笔记 | `NoteForm` + `DeleteButton` + 返回链接 |

### 为什么不用 `/notes/[id]` 动态路由

Next.js `output: 'export'` 静态导出模式下，动态路由 `[id]` 必须在构建时通过 `generateStaticParams` 穷举所有路径段。笔记 id 是运行时动态产生的，无法在构建时枚举，因此：

- **方案 A（不采用）**：`/notes/[id]/page.tsx` + `generateStaticParams` 返回空数组 → 构建能过，但访问任何 `/notes/xxx` 都会 404（因为没有对应 HTML 产物）
- **方案 B（采用）**：一个固定的静态页 `/edit` + 通过 URL search params 传 id → 构建产物是一个 `edit/index.html`，客户端读 `useSearchParams()` 拿到 id 再 fetch 数据

`/edit` 页面本身导出为 `'use client'` 组件；因为 `useSearchParams` 必须在 client component 里用，而且页面入口要被 `<Suspense>` 包住以满足 Next.js 的静态导出限制。

### 状态管理选型

- **服务端状态**：`@tanstack/react-query`（列表缓存、乐观更新、失效策略）
- **表单状态**：`react-hook-form` + `@hookform/resolvers/zod`，resolver 用 `@fullstack-notes/shared` 的 `NoteCreateSchema`
- **UI 状态**：局部 `useState`；不引入全局 store

### 交互细节

- **列表加载**：React Query fetch `GET /api/notes`
  - loading：shadcn `<Skeleton>` ×5
  - error：shadcn `<Alert variant="destructive">` + 重试按钮
  - empty：引导文案 + "创建第一条笔记" CTA
- **新建提交**：表单校验通过 → `useMutation` → 成功后 `queryClient.invalidateQueries(['notes'])` + 路由跳 `/`
- **编辑保存**：同上，mutation 同时失效 `['notes']` 和 `['notes', id]`
- **删除**：shadcn `<Dialog>` 二次确认 → `DELETE` → 失效缓存 + 跳回 `/`
- **列表项点击**：`NoteCard` 里用 `<Link href={`/edit?id=${note.id}`}>` 跳转到编辑页

---

## 6. CI/CD workflow

### `.github/workflows/ci.yml`

```yaml
name: CI & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PNPM_VERSION: 9
  NODE_VERSION: 20

jobs:
  quality:
    name: Lint / Typecheck / Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test

  build-web:
    name: Build Web (Next.js → static)
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
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

### GitHub Secrets

| Secret | 用途 | 获取方式 |
|---|---|---|
| `VERCEL_TOKEN` | Vercel CLI 鉴权 | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel 团队/个人 ID | `.vercel/project.json` 里的 `orgId` |
| `VERCEL_PROJECT_ID_API` | 后端 api 项目 ID | `.vercel/project.json` 里的 `projectId` |

### GitHub 仓库设置

- `Settings → Pages → Source` = "GitHub Actions"
- workflow 已在 `permissions:` 里声明 `pages: write` 和 `id-token: write`

### Vercel 项目初始化（一次性）

```bash
cd apps/api
pnpm dlx vercel link       # 把目录和 Vercel 项目绑定
pnpm dlx vercel pull       # 拉 .vercel/project.json
# 把 project.json 里的 orgId / projectId 配到 GitHub Secrets
```

---

## 7. 本地开发流程

### 一次性准备

1. 在 [supabase.com](https://supabase.com) 新建 project（免费 tier 够用）
2. Supabase SQL Editor 执行第 4 节的建表 SQL
3. 从 Supabase Dashboard → Settings → API 复制 `Project URL` 和 `service_role` key

### 环境变量

`apps/api/.env.local`（后端，不进版本库）：
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
ALLOWED_ORIGINS=http://localhost:3000,https://newbieluo.github.io
PORT=8787
```

`apps/web/.env.local`（前端）：
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
```

仓库根有 `.env.example` 说明上面两份该怎么填。

### 根 `package.json` scripts

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "format": "biome format --write ."
  }
}
```

### 启动

```bash
pnpm install
pnpm dev
```

- 前端：`http://localhost:3000/fullstack-notes/`
- 后端：`http://localhost:8787/api/health`

---

## 8. 测试策略

- **单元测试**：Vitest
  - `apps/api`：每个 route handler 一个 test 文件，mock `@supabase/supabase-js` 的 client
  - `packages/shared`：对 zod schema 做 happy path + 典型错误输入的校验
  - `packages/ui`：组件 smoke 测试（用 `@testing-library/react`）
- **集成测试 / E2E**：**不做**（非目标）
- **覆盖率目标**：不设硬指标，作业不为覆盖率打工

---

## 9. 明确未处理的风险 / 后续可扩展项

这些都**不在当前作业范围**，列出只是为了心里有数：

- **没有 auth** → 任何人知道 API URL 都能读写。可接受，作业不对外公开。未来加 Supabase Auth 就是：api 加 JWT 中间件 + notes 表加 `user_id` + 启用 RLS
- **service_role key 泄漏 = 数据库被接管**。防护靠 Vercel env var 不泄漏 + 仓库 `.gitignore` 正确
- **Supabase 免费 tier 不活跃项目会 pause**。作业演示前跑一下 `/api/health` 唤醒
- **GitHub Pages 有构建和带宽配额**，作业体量远低于限制
- **CORS 白名单写死在后端**，换前端域名要改后端 env

---

## 10. 验收标准

项目完成后必须同时满足：

1. ✅ `git clone` 后 `pnpm install && pnpm dev` 能同时启动前后端，能在 `localhost:3000` 完成一次完整的 CRUD
2. ✅ push 到 main 分支后，GitHub Actions 的 4 个 job 全绿
3. ✅ `https://newbieluo.github.io/fullstack-notes/` 能打开，列表能从生产 API 拉到数据
4. ✅ `https://fullstack-notes-api.vercel.app/api/health` 返回 `{ ok: true }`
5. ✅ 在生产 URL 上完成一次"新建 → 编辑 → 删除"闭环
6. ✅ `pnpm lint` / `pnpm typecheck` / `pnpm test` 均通过，无 warning
7. ✅ `git commit` 不符合 conventional commits 规范时被 husky 拦截
