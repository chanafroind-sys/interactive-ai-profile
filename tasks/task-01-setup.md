# Task 01 — Project Setup

**Recommended model: Sonnet.** Mechanical scaffolding against well-known CLIs. No architectural judgement required.

---

## Objective

A running Next.js 15 App Router project, TypeScript strict, Tailwind v4, deploying successfully to Cloudflare Workers via the OpenNext adapter, with `CLAUDE.md` and the agreed folder structure in place and an initial commit pushed.

At the end of this task `pnpm dev` serves a placeholder page locally and `pnpm preview` serves the same page through the Workers runtime.

## Pre-requisites & Context

- Node 20+, pnpm, git installed.
- A GitHub repo created (empty).
- A Cloudflare account, `wrangler` authenticated.
- Read `tasks/reference/conventions.md` **first** — it defines the folder layout, env var names and git conventions this task must produce.

Nothing else is required. No Supabase yet.

---

## Step-by-step instructions

### 1. Scaffold

```bash
pnpm create next-app@latest profile-ai \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack
cd profile-ai
```

### 2. Install dependencies

```bash
pnpm add @supabase/supabase-js zod
pnpm add -D @opennextjs/cloudflare wrangler @cloudflare/workers-types \
             vitest @types/node tsx
```

Do **not** install an LLM SDK. Tasks 04 and 05 call the provider REST APIs with `fetch` directly — the vendor SDKs pull in Node built-ins that bloat or break the Workers bundle.

### 3. Cloudflare adapter

Create `open-next.config.ts`:

```ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
export default defineCloudflareConfig({});
```

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "profile-ai",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "kv_namespaces": [
    { "binding": "RATE_LIMIT_KV",     "id": "PLACEHOLDER_CREATE_IN_TASK_07" },
    { "binding": "SEMANTIC_CACHE_KV", "id": "PLACEHOLDER_CREATE_IN_TASK_07" }
  ],
  "triggers": { "crons": ["0 */6 * * *"] }
}
```

`nodejs_compat` is required — without it `crypto.subtle` and stream handling misbehave in Task 05.

Leave the KV IDs as placeholders and **comment out the `kv_namespaces` block** for now so deploys don't fail. Task 07 creates the namespaces and uncomments it.

### 4. Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "cf:build": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

### 5. Strict TypeScript

In `tsconfig.json` ensure `"strict": true` and add `"noUncheckedIndexedAccess": true`. Add `"types": ["@cloudflare/workers-types"]`.

### 6. Folder skeleton

Create the directory structure from `conventions.md`, with `.gitkeep` files where empty:

```
src/app/p/[username]/
src/app/setup/
src/app/api/{chat,ingest,health}/
src/app/api/webhooks/gumroad/
src/components/{profile,chat}/
src/lib/llm/
src/types/
supabase/migrations/
scripts/
```

### 7. Health endpoint

`src/app/api/health/route.ts` — the cron target that stops Supabase from pausing. For now it returns `{ ok: true }`; Task 02 adds the `SELECT 1`.

```ts
export const runtime = 'edge';
export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
```

### 8. Placeholder profile route

`src/app/p/[username]/page.tsx` — renders the username. Proves dynamic routing works end to end. Note the Next 15 async params signature:

```tsx
export default async function ProfilePage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  return <main className="p-8"><h1 className="text-2xl">Profile: {username}</h1></main>;
}
```

### 9. Environment scaffolding

Create `.env.example` containing **exactly** the variable names in `conventions.md` with empty values. Create `.env.local` with real values where you have them (leave the rest blank).

Generate the master encryption key now and put it in `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.gitignore`: `.env.local`, `.open-next/`, `.wrangler/`, `.dev.vars`.

### 10. `CLAUDE.md`

Create at repo root. This is the standing brief every future session reads automatically:

```md
# profile-ai

Multi-tenant SaaS: AI-driven interactive profile pages at /p/[username].
Visitors chat with an agent that drives the page's visual elements.

## Stack
Next.js 15 App Router · TypeScript strict · Tailwind v4 ·
Cloudflare Workers (@opennextjs/cloudflare) · Supabase Postgres + pgvector

## Read before working
- tasks/reference/conventions.md — folder layout, entity IDs, env vars
- tasks/reference/ui-action-contract.md — the Visual-AI wire format

## Non-negotiable invariants
1. `credentials` and `chunks` tables are unreachable with the anon key.
2. A decrypted BYOK key lives only in a request-scoped variable — never
   logged, never returned by an API, never placed in an LLM prompt.
3. Every retrieval query filters on `profile_id`.
4. Every LLM-returned entity ID is validated against the profile's real
   entity map before rendering.
5. Nothing secret ever appears in a NEXT_PUBLIC_ var or a client component.

## Commands
pnpm dev · pnpm typecheck · pnpm test · pnpm preview · pnpm deploy

## Conventions
- Conventional commits (feat:, fix:, chore:, docs:, refactor:)
- Server-only modules import 'server-only' at the top
- Call LLM/embedding providers with fetch, not vendor SDKs (Workers bundle size)
- Entity IDs are stable and deterministic — never regenerate them
```

### 11. Commit

```bash
git init && git add -A
git commit -m "chore: scaffold Next.js 15 + Cloudflare Workers + Tailwind"
git remote add origin <your-repo-url>
git push -u origin main
```

---

## Definition of Done & Verification

Run all of these. Every one must pass before Task 02.

```bash
pnpm typecheck                 # exits 0, no errors
pnpm lint                      # exits 0
pnpm build                     # Next build succeeds
pnpm cf:build                  # OpenNext build succeeds — this is the real gate
```

```bash
pnpm dev
curl -s localhost:3000/api/health          # → {"ok":true,"ts":...}
curl -s localhost:3000/p/testuser | grep -q "testuser" && echo "routing OK"
```

```bash
pnpm preview
# Visit the printed localhost URL. /p/testuser must render through the
# Workers runtime, not just the Next dev server. If this fails but `pnpm dev`
# works, the OpenNext config or compatibility flags are wrong — fix it now,
# because it only gets harder to debug once there is real code.
```

Then confirm:

- [ ] `git status` is clean; `.env.local` is **not** tracked (`git ls-files | grep env.local` returns nothing)
- [ ] `CLAUDE.md` exists at repo root
- [ ] `.env.example` variable names match `conventions.md` exactly
- [ ] The repo is pushed to GitHub

## Common failure modes

- **`pnpm cf:build` fails on Node built-ins** — you're missing `nodejs_compat` in `compatibility_flags`, or a dependency isn't Workers-compatible. Fix now.
- **Wrangler complains about missing KV namespace IDs** — the `kv_namespaces` block should be commented out until Task 07.
- **`params` type error in the profile page** — Next 15 made `params` a Promise. It must be awaited.
