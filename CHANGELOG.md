# Changelog

All notable changes to this project are documented here. Format is free-form,
grouped by task per `tasks/README.md`.

## Task 01 — Project Setup

### Files created

- `src/app/**` — scaffolded by `create-next-app` (App Router, `layout.tsx`, `page.tsx`, `globals.css`), plus:
  - `src/app/api/health/route.ts` — health check endpoint, returns `{ ok, ts }`.
  - `src/app/p/[username]/page.tsx` — placeholder public profile route (Next 15 async `params`).
- `src/components/profile/.gitkeep`, `src/components/chat/.gitkeep` — component dirs from `conventions.md`.
- `src/lib/llm/.gitkeep` — LLM provider wrapper dir (populated in Task 05).
- `src/types/.gitkeep` — shared TS types dir (populated in Task 02+).
- `src/app/setup/` — onboarding wizard route, empty (populated in Task 06).
- `src/app/api/ingest/`, `src/app/api/webhooks/gumroad/` — route dirs, empty (populated in Tasks 04/06).
- `supabase/migrations/.gitkeep` — DDL migrations dir (populated in Task 02).
- `scripts/.gitkeep` — CLI/seed scripts dir (populated in Task 02+).
- `open-next.config.ts` — Cloudflare adapter entrypoint config (empty defaults).
- `wrangler.jsonc` — Workers config: `nodejs_compat` flag, ASSETS binding, 6-hourly cron trigger.
  `kv_namespaces` block is present but commented out — Task 07 creates the real KV namespaces
  and uncomments it; placeholder IDs would fail `wrangler deploy`.
- `.env.example` — variable names only, matching `tasks/reference/conventions.md` exactly.
- `.env.local` (gitignored) — local secrets; `MASTER_ENCRYPTION_KEY` generated via
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, rest left blank
  pending Supabase/Gemini/Gumroad/Resend/Turnstile account setup.
- `CLAUDE.md` — standing brief for future Claude Code sessions (stack, invariants, commands, conventions).
- `pnpm-workspace.yaml` — pnpm build-approval allowlist (`esbuild`, `workerd`) plus `nodeLinker: hoisted`
  (see Decisions below).

### Configuration

- **`package.json` scripts**: `dev`, `build`, `start` (from scaffold) plus `lint` (switched to
  `next lint`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `cf:build`, `preview`, `deploy`
  (all via `opennextjs-cloudflare`).
- **`tsconfig.json`**: added `noUncheckedIndexedAccess: true` and `types: ["@cloudflare/workers-types"]`
  on top of the scaffold's `strict: true`.
- **`.gitignore`**: added `!.env.example` (the scaffold's blanket `.env*` rule would otherwise exclude
  it), `.open-next/`, `.wrangler/`, `.dev.vars`.
- **Dependencies**: `@supabase/supabase-js`, `zod` (runtime); `@opennextjs/cloudflare`, `wrangler`,
  `@cloudflare/workers-types`, `vitest`, `@types/node`, `tsx` (dev), per the task spec. No LLM vendor
  SDK installed — Tasks 04/05 call provider REST APIs directly via `fetch` to keep the Workers bundle
  small, as `CLAUDE.md` states.

### Decisions / deviations from the task text

- **Pinned Next.js to 15.5.23, not `@latest`.** `pnpm create next-app@latest` currently scaffolds
  Next 16; the task and `conventions.md` both require Next 15 (App Router, stable `LayoutProps<T>`
  typed-route generation is a 16-only feature). Downgraded `next`, `eslint-config-next`,
  `@next/eslint-plugin-next` to `15.5.23` and kept React 19 (Next 15's supported default), then removed
  the generated `LayoutProps<"/">` layout signature (a Next 16-only global type) in favor of a plain
  `{ children: React.ReactNode }` prop type.
- **ESLint flat config needed `FlatCompat`.** The scaffold generated `eslint.config.mjs` assuming
  `eslint-config-next` exports flat-config arrays; `eslint-config-next@15.5.23` still ships legacy
  (`.eslintrc`-style) configs. Rewrote `eslint.config.mjs` to load them through
  `@eslint/eslintrc`'s `FlatCompat`, and added the plugin peer deps
  (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`,
  `eslint-import-resolver-typescript`) explicitly so they resolve at the project root.
- **`pnpm-workspace.yaml: nodeLinker: hoisted`.** On Windows without Developer Mode enabled (no admin
  rights in this environment), pnpm's default symlinked `node_modules` layout cannot be reproduced by
  Next's build-trace file copier when generating the Workers `standalone` bundle — it fails with
  `EPERM: operation not permitted, symlink`. Switching pnpm to a flat/hoisted `node_modules` (still
  pnpm, just no internal symlinks) avoids the symlink recreation entirely and is the standard
  workaround for `@opennextjs/cloudflare` on Windows outside WSL. (Note: pnpm v11 reads `nodeLinker`
  from `pnpm-workspace.yaml`, not `.npmrc` — `.npmrc` was tried first and silently ignored.)
- **Removed `export const runtime = 'edge'` from `src/app/api/health/route.ts`.** The task text
  specifies it, but the installed `@opennextjs/cloudflare@1.20.2` adapter rejects any route
  individually marked `edge` runtime (`OpenNext requires edge runtime function to be defined in a
  separate function`) — the whole app already runs on Workers via the adapter, so the directive is
  both redundant and, in this adapter version, a hard build error. Left off; behavior is unchanged
  (still runs on the Workers runtime end-to-end).
- **Scaffolded into a temp `profile-ai/` subfolder, then merged up to the repo root.** `create-next-app`
  refuses a non-empty target directory, and `tasks/` already existed at the git root. Ran the scaffold
  in a `profile-ai/` subdirectory, deleted its generated `node_modules`/`.next`/placeholder
  `CLAUDE.md`/`AGENTS.md`, then moved everything else up so `package.json`, `CLAUDE.md`, `src/`, etc.
  live at the same root as `tasks/` and the git remote.

### Verification (Definition of Done)

All four gates pass:

```
pnpm typecheck   # exits 0
pnpm lint        # exits 0, no warnings
pnpm build       # Next build succeeds
pnpm cf:build    # OpenNext/Workers build succeeds — the real gate
```

`pnpm dev` confirmed locally: `GET /api/health` → `{"ok":true,"ts":...}`; `GET /p/testuser` renders
"Profile: testuser" server-side.

### QA Audit — 2026-08-16 — ✅ APPROVED

Independent verification against the "Definition of Done" of `tasks/task-01-setup.md`.
Audited at commit `33dc2c1`.

**Build & type gates — all four exit 0**

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0, no errors |
| `pnpm lint` | ✅ exit 0, "No ESLint warnings or errors" |
| `pnpm build` | ✅ Next 15.5.23 build succeeded — 4 routes (`/`, `/_not-found` static; `/api/health`, `/p/[username]` dynamic) |
| `pnpm cf:build` | ✅ OpenNext 1.20.2 / workerd `compatibility_date 2026-08-01` bundle written to `.open-next/worker.js` |

**Runtime verification**

- `pnpm dev` → `GET /api/health` = `{"ok":true,"ts":…}` (HTTP 200);
  `GET /p/testuser` = HTTP 200, renders `<h1 class="text-2xl">Profile: testuser</h1>`.
- `pnpm preview` → wrangler 4.123.0 local server on `127.0.0.1:8787`. **Both routes verified through the
  Workers runtime**, not just the Next dev server: `/api/health` = HTTP 200 JSON, `/p/testuser` = HTTP 200
  with the same server-rendered markup. This was the task's stated "real gate".

**Secret / git hygiene**

- `git ls-files` — no `.env.local`, no `.wrangler/`, no `.open-next/`, no `.dev.vars`. Only `.env.example`
  (names, empty values) is tracked.
- `git check-ignore -v` confirms active rules for all four: `.env*` (`.gitignore:34`), `.open-next/` (`:45`),
  `.wrangler/` (`:46`), `.dev.vars` (`:47`), with `!.env.example` re-including the template.
- Secret-pattern sweep (`sk-…`, `AIza…`, JWT `eyJ…`, `service_role`, populated key assignments) across
  **every blob in every commit of all refs** — zero hits. No secret has ever entered history.
- `.env.example` variable names and order match the `conventions.md` table **exactly** (10/10).
- `git status` clean; `main` in sync with `origin/main`.

**Findings**

- **[CRITICAL] — none.**
- **[WARNING] Build output bakes `.env.local` into the Worker bundle.** `.open-next/cloudflare/next-env.mjs`
  contains the full env map with the real `MASTER_ENCRYPTION_KEY` value inlined, and is imported by
  `.open-next/cloudflare/init.js`, which `worker.js` pulls in. Not a git leak (`.open-next/` is ignored —
  verified) and **not** present in `.open-next/assets` (the browser-served tree — verified), so nothing is
  publicly exposed today. But `pnpm deploy` would ship whatever is in `.env.local` inside the deployed
  Worker script, bypassing `wrangler secret put`. Must be resolved before Task 02 puts a real
  `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`: keep production secrets out of `.env.local` (use `.dev.vars`
  for local Workers values and `wrangler secret put` for production).
- **[WARNING] `pnpm test` exits 1.** `vitest run` finds no test files and fails by design. `CLAUDE.md`
  advertises `pnpm test` as a standing command, so this breaks any CI gate that runs it. Fix with
  `--passWithNoTests` or a first smoke test.
- **[WARNING] `next lint` is deprecated** and is removed in Next.js 16; migration to the ESLint CLI is
  needed before any Next 16 upgrade.
- **[WARNING] Cron trigger has no handler.** `wrangler.jsonc` declares `"crons": ["0 */6 * * *"]` but no
  `scheduled` export calls `/api/health`. Expected — Task 02 owns this — noted so it is not forgotten.
- **[PASSED] Security invariants 1–5** are not yet exercisable (no DB, no BYOK, no retrieval, no LLM in the
  tree). Nothing in the current code contradicts them: no `NEXT_PUBLIC_` var carries a secret, and no
  client component reads one.

**Cosmetic (non-blocking):** `src/app/layout.tsx` still carries the scaffold metadata
(`title: "Create Next App"`); Task 03 replaces it.
