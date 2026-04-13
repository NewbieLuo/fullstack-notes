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
HTTP_PROXY= HTTPS_PROXY= pnpm dlx vercel login
HTTP_PROXY= HTTPS_PROXY= pnpm dlx vercel link       # 交互式绑定，项目名填 fullstack-notes-api
HTTP_PROXY= HTTPS_PROXY= pnpm dlx vercel env add SUPABASE_URL production
HTTP_PROXY= HTTPS_PROXY= pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY production
HTTP_PROXY= HTTPS_PROXY= pnpm dlx vercel env add ALLOWED_ORIGINS production
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
cp apps/api/.env.example apps/api/.env.local
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
3. `Deploy Web to GitHub Pages` 绿，查看 https://newbieluo.github.io/fullstack-notes/
4. `Deploy API to Vercel` 绿，查看 https://fullstack-notes-api.vercel.app/api/health

全绿即完成。
