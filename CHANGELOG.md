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

## Task 02 — Database, Storage & RLS

### Files created

- `supabase/config.toml` — from `pnpm supabase init` (also added `supabase/.gitignore` for
  `.branches`/`.temp`/local env files, CLI-managed).
- `supabase/migrations/0001_extensions.sql` — `vector`, `pg_trgm`, `pgcrypto`, `citext`.
- `supabase/migrations/0002_core_schema.sql` — `tenants`, `onboarding_tokens`, `profiles`,
  `entities`, `chunks`, `credentials`, `usage_counters`, `chat_messages`, transcribed verbatim
  from `tasks/ARCHITATUR.md` §3. Composite PK `entities(profile_id, id)` created before `chunks`'
  composite FK references it (migration order matters — noted as a common failure mode in the
  task file). `chunks.tsv` is a generated, stored `tsvector` column with a GIN index.
  `chunks.embedding` is `vector(1536)`. HNSW index left as a commented-out future step, not created.
- `supabase/migrations/0003_rls.sql` — RLS enabled on all eight tables; exactly two permissive
  policies (`profiles`, `entities`, both public-read-if-published). Everything else — `credentials`,
  `chunks`, `tenants`, `onboarding_tokens`, `usage_counters`, `chat_messages` — has RLS on and no
  policy, i.e. deny-all except the service role.
- `supabase/migrations/0004_match_chunks.sql` — `match_chunks` hybrid-search RPC (RRF fusion of
  vector + `ts_rank` lexical search), `security definer`, `p_profile_id` as the required first
  argument, `execute` revoked from `anon`/`authenticated`. Also creates the private `cvs` storage
  bucket (`public: false`).
- `src/lib/db.ts` — typed service-role Supabase client, `import 'server-only'` at the top.
- `src/types/database.ts` — **hand-written**, not generated (see Decisions below). Mirrors the four
  migrations table-for-table, including the `Relationships: []` field each table needs to satisfy
  `@supabase/supabase-js@2.112`'s `GenericTable` constraint (its absence silently collapses query
  results to `never` instead of erroring loudly — worth knowing before generating real types too).
- `src/types/profile.ts` — hand-written `EntityKind`, `Entity`, `ProfileJSON` (exact shapes from the
  task spec) plus `UiActionKind`/`UiAction` from `tasks/reference/ui-action-contract.md`.
- `scripts/seed-fixture.ts` — inserts one tenant + one published profile (`username: 'demo'`) with
  19 entities: 1 summary, 3 experiences, 4 projects, 8 skills, 1 education, 2 faqs (task asked for
  ~12; used a fuller, more realistic set since no CV file was supplied to source content from —
  see Decisions). `chunks` left empty for Task 04.
- `scripts/verify-rls.ts` — anon-key client asserting every blocked-table/RPC case from the task's
  verification checklist, plus the published/unpublished profile visibility cases.

### Configuration

- **Dependencies added**: `server-only` (runtime), `dotenv` and `supabase` (CLI, dev).
- `src/app/api/health/route.ts` now runs `db().from('profiles').select('id').limit(1)` and returns
  503 on error, per the task spec. Already had no `edge` runtime directive (removed in Task 01 for
  adapter-compatibility reasons — see that entry), so no further change needed there.
- Removed `.gitkeep` placeholders in `src/types/`, `scripts/`, `supabase/migrations/` now that each
  holds real files.

### Decisions / deviations from the task text

- **Could not run `supabase link`, `db push`, `gen types`, `seed-fixture.ts`, or `verify-rls.ts`
  against a live database.** `.env.local` has no `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Task 01 left them blank pending account setup — see that entry),
  and there is no `SUPABASE_ACCESS_TOKEN` for `supabase login`. All four migrations, the typed
  client, domain types, and both scripts are written and match the task spec exactly, and
  `pnpm typecheck` / `pnpm lint` / `pnpm build` all pass — but nothing has touched a real Postgres
  instance. **This is the task's central blocker**: create a Supabase project, put its URL + anon
  key + service-role key in `.env.local`, run `pnpm supabase login` and
  `pnpm supabase link --project-ref <ref>`, then run, in order:
  ```
  pnpm supabase db push
  pnpm supabase gen types typescript --linked > src/types/database.ts
  pnpm typecheck
  pnpm tsx scripts/seed-fixture.ts
  pnpm tsx scripts/verify-rls.ts
  ```
  `gen types` will overwrite the hand-written `src/types/database.ts` with the real generated file —
  expected and desired; the hand-written version exists only so the rest of the codebase can
  typecheck and be reviewed before a project is linked.
- **`src/types/database.ts` hand-written instead of generated**, for the reason above. Verified it
  satisfies `@supabase/supabase-js`'s actual `GenericSchema`/`GenericTable` constraints (checked
  against the installed package's `.d.ts`, not assumed) so `db().from('profiles').select('id')` etc.
  really do type-check against real column names — this isn't just `any`.
- **Seed fixture uses synthetic demo content, not a real CV.** The task suggests "your own CV is
  ideal" since the fixture becomes the Task 03 public demo profile; no CV file exists anywhere in
  the repo or was provided. Used a realistic fictional software-engineer profile (Acme/Globex/Initex
  employers, Technion degree) instead, sized generously (19 vs. the ~12 suggested) so Task 03 has a
  representative mix of every entity kind to render.
- **`pnpm supabase init` run non-interactively** (`--workdir .`) — created `supabase/config.toml`
  cleanly with no prompts to answer.

### Verification (Definition of Done) — status

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0, no warnings |
| `pnpm build` | ✅ succeeds |
| `pnpm supabase db push` | ⛔ not run — no linked project (see Decisions) |
| `pnpm tsx scripts/seed-fixture.ts` | ⛔ not run — same blocker |
| `curl localhost:3000/api/health` | ⛔ not run — would 503 without a real DB; code path confirmed by reading, not executed |
| `scripts/verify-rls.ts` passes every assertion | ⛔ not run — same blocker |
| `match_chunks` not callable by `anon` | ✅ by construction (`revoke execute ... from anon, authenticated` in the migration) — not independently re-verified against a live DB |
| `cvs` bucket exists and is private | ✅ by construction (`public: false` in the migration) — not independently re-verified |
| Demo profile renders via service client | ⛔ not run — same blocker |
| `chunks.embedding` is `vector(1536)` | ✅ confirmed by reading `0002_core_schema.sql` |
| No HNSW index | ✅ confirmed — left commented out |

Per instruction, **no QA/review audit pass has been run on this task** (including the Opus RLS
review the task file recommends) — that is left for a separate, explicitly-requested pass.

### Unblocked — live Supabase project connected, migrations applied, RLS verified

The blocker above is resolved. The user supplied real project credentials for
`tzwgzcbcmwtdkfrabwhz.supabase.co`; `.env.local` now has real
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` values (still
gitignored, never committed — confirmed with `git check-ignore -v .env.local` before touching it).

**`supabase link` / `supabase login` were not usable** — both need a
`SUPABASE_ACCESS_TOKEN` (personal access token), which wasn't available. Used the direct-connection
flags instead, with the user-supplied Postgres database password:
```
pnpm supabase db push --db-url "postgresql://postgres:<url-encoded password>@db.tzwgzcbcmwtdkfrabwhz.supabase.co:5432/postgres" --yes
```
All four migrations applied cleanly: `0001_extensions.sql`, `0002_core_schema.sql`,
`0003_rls.sql`, `0004_match_chunks.sql`. (One warning, non-blocking: the CLI tried to cache a
migrations catalog and failed because Docker isn't installed in this environment — that step is
optional tooling, unrelated to whether the migration itself applied.)

**`supabase gen types typescript --db-url ...` could not run** — this CLI version
(`supabase@2.114.0`) requires a local Docker/Podman runtime even for `--db-url`/`--project-id`
type generation (`LegacyContainerRuntimeNotFoundError: docker: command not found`), and Docker
isn't available here. Reverted the accidental overwrite (`git checkout -- src/types/database.ts`)
and kept the hand-written `src/types/database.ts` from earlier in this task — it was already
verified against the real schema via `pnpm typecheck` and now additionally via the live queries
below, so this is a low-risk gap. **Follow-up for a machine with Docker:**
`pnpm supabase gen types typescript --db-url '<connection string>' --schema public > src/types/database.ts`,
then `pnpm typecheck` to confirm nothing drifted.

**`pnpm tsx scripts/seed-fixture.ts`** — ran clean. Inserted 1 tenant, 1 published profile
(`username: 'demo'`), 19 entities. `chunks` intentionally left empty for Task 04.

**`pnpm tsx scripts/verify-rls.ts`** — all 9 assertions passed against the live project:

| Assertion | Result |
|---|---|
| anon `SELECT credentials` | ✅ blocked |
| anon `SELECT chunks` | ✅ blocked |
| anon `SELECT tenants` | ✅ blocked |
| anon `SELECT onboarding_tokens` | ✅ blocked |
| anon `SELECT usage_counters` | ✅ blocked |
| anon `SELECT chat_messages` | ✅ blocked |
| anon RPC `match_chunks` | ✅ blocked |
| anon `SELECT profiles WHERE username='demo'` (published) | ✅ visible |
| anon `SELECT profiles WHERE username='demo-unpublished'` | ✅ blocked (no such row — trivially zero rows; no second unpublished fixture profile was created, since the task only asked for one) |

RLS holds exactly as designed: the two permissive policies (`profiles`, `entities`, published-only)
work, and every other table is unreachable with the anon key.

**`curl localhost:3000/api/health`** — ran `pnpm dev`, confirmed `GET /api/health` →
`{"ok":true,"ts":...}` with HTTP 200, live against the real database (not mocked). Dev server
stopped afterward.

**Noted but not acted on:** the `dotenv@17` package prints a random promotional "tip" line
(`injected env (N) from .env.local // tip: ...`) to stdout on every load, including one instance
referencing an unfamiliar third-party domain. This is a known, documented feature of that package
version (a `console.log` of a random string from its own bundled tip list) — not a code-execution
or exfiltration path, and nothing in this session acted on or visited it. Mentioning it here only
because unexpected third-party references in tool output are worth a paper trail; not a blocker.

### Definition of Done — final status

| Check | Result |
|---|---|
| All four migrations applied cleanly | ✅ |
| `verify-rls.ts` passes every assertion | ✅ |
| `match_chunks` not callable by `anon` | ⚠️ was a false positive — see "Security fix" section below |
| `cvs` bucket exists and is private | ✅ by construction (`public: false`); not independently re-queried against Storage API this pass |
| Demo profile renders data via the service client | ✅ (`/api/health` query + seed script's own read-back) |
| `chunks.embedding` is `vector(1536)` | ✅ |
| No HNSW index | ✅ |
| `pnpm supabase gen types` from the live project | ⛔ blocked on missing Docker/Podman in this environment — hand-written types kept as the working substitute |

Task 02 is functionally complete. The one open item is regenerating `src/types/database.ts` from
the live schema once Docker is available, which is a mechanical follow-up, not a design gap — the
hand-written version already matches the applied schema exactly, as evidenced by every live query
above type-checking and executing correctly.

### Security fix — `match_chunks` was reachable by the anon key after all

**Correcting a prior status claim.** The "✅ (live-verified)" mark on "`match_chunks` not callable
by `anon`" above was a false positive. `0004_match_chunks.sql` ran
`revoke execute on function match_chunks from anon, authenticated`, but Postgres grants every newly
created function `EXECUTE` to `PUBLIC` by default — and `anon`/`authenticated` implicitly inherit
from `PUBLIC` like every role does. Revoking from the two named roles never touched that standing
`PUBLIC` grant, so the anon key could still execute the function.

The old `verify-rls.ts` didn't catch this because its `match_chunks` assertion only checked whether
the response held rows (`data.length === 0`) or an error — it did not distinguish "the call was
rejected" from "the call succeeded but the query itself matched nothing." The probe used a
non-existent `profile_id`, so a *successful, unauthorized* execution and a *properly rejected* one
looked identical: both returned an empty array with no error. The check passed either way, which is
exactly why it missed the hole.

**Fix — `supabase/migrations/0005_fix_match_chunks_grant.sql`:**
```sql
revoke execute on function match_chunks(uuid, vector, text, int) from public;
revoke execute on function match_chunks(uuid, vector, text, int) from anon, authenticated;
```
Pushed with the same `--db-url` flow as the earlier migrations (`supabase link`/`login` still
unavailable — no access token). Applied cleanly.

**`verify-rls.ts` strengthened** to assert on the actual failure mode instead of an ambiguous empty
result: the `match_chunks` probe now requires the response to carry Postgres error code `42501`
(permission denied) — `checkPermissionDenied()`, replacing the old `checkBlocked()` call for that
one case. `checkBlocked()` stays as-is for table `SELECT`s, where RLS legitimately produces an
empty result rather than an error, so that distinction is preserved rather than papered over.

**`scripts/seed-fixture.ts` now seeds a second, unpublished profile** (`username:
'demo-unpublished'`, `is_published: false`, tenant `demo-unpublished@example.com`, one minimal
`summary` entity) alongside the original `demo` profile. Previously the "unpublished profile blocked"
assertion in `verify-rls.ts` queried a username with no row at all — a nonexistent row and an
RLS-filtered row are indistinguishable to the client, so that check was also not really proving
anything. The script was made idempotent (deletes any existing seed tenants by email before
re-inserting, relying on `on delete cascade`) so it can be re-run safely.

**Re-ran end to end against the live project** — `pnpm typecheck` (clean), `pnpm tsx
scripts/seed-fixture.ts` (both profiles seeded), `pnpm tsx scripts/verify-rls.ts`:

| Assertion | Result |
|---|---|
| anon `SELECT credentials` | ✅ blocked |
| anon `SELECT chunks` | ✅ blocked |
| anon `SELECT tenants` | ✅ blocked |
| anon `SELECT onboarding_tokens` | ✅ blocked |
| anon `SELECT usage_counters` | ✅ blocked |
| anon `SELECT chat_messages` | ✅ blocked |
| anon RPC `match_chunks` | ✅ rejected with `42501` (real permission-denied error, not an empty-array artifact) |
| anon `SELECT profiles WHERE username='demo'` (published) | ✅ visible |
| anon `SELECT profiles WHERE username='demo-unpublished'` (real unpublished row) | ✅ blocked |

**Corrected status:** "`match_chunks` not callable by `anon`" in the two tables above should be read
as ✅ **only as of this fix** (migration `0005` + live re-verification on this date), not as of the
original Task 02 pass. The underlying cause — Postgres's implicit `PUBLIC` execute grant on new
functions — is worth carrying forward: any future `security definer` RPC needs the same explicit
`revoke ... from public`, not just `from anon, authenticated`, or it will have the identical hole.

### QA Audit — 2026-08-16 — ✅ APPROVED

Independent verification against the "Definition of Done & Verification" of `tasks/task-02-schema.md`.
Audited at commit `c408c3d`. This stamp supersedes the failed audit of `534a87a`, which was rejected
for the `match_chunks` `PUBLIC`-grant hole documented in the section above.

**Build & type gates — all four exit 0**

| Gate | Result |
|---|---|
| `pnpm typecheck` | ✅ exit 0, no errors |
| `pnpm lint` | ✅ exit 0, "No ESLint warnings or errors" |
| `pnpm build` | ✅ Next 15.5.23 — 4 routes, 6/6 static pages generated |
| `pnpm cf:build` | ✅ OpenNext 1.20.2 — `Worker saved in .open-next\worker.js` |

`cf:build` initially failed with `EPERM … rm '.open-next'`. This was **environmental, not a code
defect**: a wedged `pnpm preview` tree (wrangler + `workerd`) from an earlier session held an
OS-level lock on `.open-next/assets`, so the adapter could not clear its output directory. Renaming
the directory also failed with `Permission denied`, confirming the lock. After terminating the stale
process tree the gate passed unmodified, first try.

**RLS re-verified live — all 9 assertions pass, and independently re-probed over raw HTTP**

`pnpm tsx scripts/verify-rls.ts` exits 0 with 9/9 PASS. Because the previous audit was defeated by a
check that *reported* PASS while the hole was open, the script's own result was not accepted as
sufficient this pass; each claim was re-tested directly against the PostgREST API:

| Verification | Method | Result |
|---|---|---|
| anon RPC `match_chunks` rejected | raw `POST /rest/v1/rpc/match_chunks` with the anon key | ✅ HTTP 401, `{"code":"42501","message":"permission denied for function match_chunks"}` — a real permission error, not an empty array |
| …with a *real* `profile_id` | same, using the live `demo` profile id | ✅ `42501` |
| …with the *unpublished* `profile_id` | same, using the `demo-unpublished` id | ✅ `42501` |
| **Regression proof** — chunk content is genuinely unreachable | seeded one real sentinel row into `chunks` via the service role, then attacked it with the anon key | ✅ direct `SELECT` → `[]`; RPC → `42501`; **sentinel not leaked**. Under the old code this exact probe returned the row in full. |
| Service-role path still works | same RPC with the service-role key | ✅ HTTP 200 and the sentinel **is** returned — the `revoke … from public` did not break the retrieval path Tasks 04/05 depend on |
| `demo-unpublished` is a real row | service-role read | ✅ exists, `is_published = false` — the negative assertion is no longer vacuous |
| Unpublished profile invisible to anon | anon `SELECT` on profile **and** its entities | ✅ both `[]`; anon sees 19 of 20 entities — the one entity belonging to the unpublished profile is filtered by the `entities` policy |
| `cvs` bucket private | Storage API `GET /storage/v1/bucket` | ✅ `"public": false`; anon cannot list buckets or objects; public object path → `NoSuchBucket` |
| Anon writes rejected | anon `INSERT` into `profiles` / `chunks` / `credentials` | ✅ all `42501`; anon `UPDATE` of the real demo row affects 0 rows |
| `/api/health` does real work | `pnpm dev`, `GET /api/health` | ✅ HTTP 200 `{"ok":true,"ts":…}` against the live database |

All audit test data was removed afterward and the end state re-confirmed: `chunks` empty, both
profiles intact, 20 entities.

**Secret / git hygiene**

- Only `.env.example` is tracked (10 variable names, all values empty). `.env.local` is ignored via
  `.gitignore:34` (`git check-ignore -v` confirms).
- Secret-pattern sweep (JWT `eyJ…`, `sk-…`, `AIza…`) across **every blob in every commit of all
  refs** — zero hits. The `c408c3d` diff introduces no keys, URLs, or passwords.
- `git status` clean; `main` in sync with `origin/main`.

**Findings**

- **[CRITICAL] — none. Both prior CRITICALs are closed and re-verified:** the `match_chunks` `PUBLIC`
  execute grant (fixed by `0005`, proven closed by the sentinel regression test above) and the
  fail-open verification gate (`checkPermissionDenied()` now asserts `42501`; `checkBlocked()` is
  correctly retained for table `SELECT`s, where RLS legitimately yields an empty result rather than
  an error — the distinction is preserved rather than papered over).
- **[WARNING] The Task 01 build-output warning has now materialised with a real secret.** Task 01
  flagged that `.open-next/cloudflare/next-env.mjs` inlines `.env.local`, and stated it must be
  resolved *before* Task 02 put a real `SUPABASE_SERVICE_ROLE_KEY` there. That precondition has now
  been crossed. Verified against the fresh `cf:build` output: `next-env.mjs` contains the real
  service-role key and `MASTER_ENCRYPTION_KEY`, and the chain `worker.js` →
  `cloudflare/init.js` → `next-env.mjs` means `pnpm deploy` would ship both inside the Worker
  script, bypassing `wrangler secret put`. **Not** a git leak (`.open-next/` is ignored — verified)
  and **not** in `.open-next/assets`, the browser-served tree (verified), so nothing is publicly
  exposed today, and invariant 5 still holds (no secret in a `NEXT_PUBLIC_` var or client component).
  Must be resolved before the first real deploy: keep production secrets out of `.env.local`, using
  `.dev.vars` for local Workers values and `wrangler secret put` for production.
- **[WARNING] `seed-fixture.ts` is destructive by design.** Its idempotency step deletes the seed
  tenants by email, and `on delete cascade` propagates to `profiles` → `entities` → `chunks`. Correct
  for a fixture, but once Task 04 populates `chunks`, re-running the seed silently discards every
  embedding for the demo profile. Worth a guard or a note before Task 04.
- **[WARNING] `src/types/database.ts` is still hand-written**, not generated from the live schema
  (`supabase gen types` remains blocked on a missing Docker/Podman runtime). Typecheck and every live
  query in this audit agree with it, so drift risk is low but nonzero. Carried forward unchanged.
- **[PASSED] Schema correctness.** Composite PK `(profile_id, id)` on `entities` is declared before
  the composite FK in `chunks` references it; `embedding` is `vector(1536)`; `tsv` is
  `generated always as (to_tsvector('english', content)) stored` with a GIN index;
  `gumroad_sale_id` unique; `username` is `citext unique`; no HNSW index — left commented as a
  documented future step.
- **[PASSED] RLS shape.** Enabled on all 8 tables; exactly two policies exist, both `for select`, and
  neither touches `credentials` or `chunks` — the trap called out in the task text was avoided.
- **[PASSED] Security invariants 1, 3 and 5.** Invariant 1 (`credentials`/`chunks` unreachable with
  the anon key) now holds through *both* the table path and the RPC path — the latter only as of
  `0005`. Invariant 3 holds structurally: `p_profile_id` is the first, required argument of
  `match_chunks` and both CTEs filter on it. Invariants 2 and 4 are not yet exercisable (no BYOK
  decryption, no LLM in the tree).

## Task 03 — Core Profile UI

**Note on task naming.** The user asked for `tasks/task-03-core-api.md`, which doesn't exist. The
only Task 03 in the repo is `tasks/task-03-profile-ui.md` ("Core Profile UI"), a frontend task —
confirmed with the user before starting, since implementing the wrong ~4000-word task would have
been a large wasted effort.

### Files created

- `src/components/profile/ProfileProvider.tsx` — client context holding `profile`, `entityMap`
  (`Map<string, Entity>`, built once via `useMemo`), all highlight state (`focusedTimeline`,
  `revealedCards`, `spotlitTools`, `openSnippet`, `animatingMetric`, `revealedLinks`), and
  `dispatch()` — the single entry point implementing the action registry from
  `tasks/reference/ui-action-contract.md`. IDs are filtered against `entityMap` *before* touching
  any state, so an unknown ID is a silent no-op everywhere, not just wherever a component happens
  to check — matching the task's "centralise state, don't let components manage their own" note in
  Common Failure Modes. `dispatch` takes a loose `{ action: string; ids?; id? }` shape rather than
  the strict `UiAction` type, since real actions (Task 05) arrive as parsed JSON with no
  compile-time guarantee — the whole point of the registry is validating that at runtime.
- `src/components/profile/Timeline.tsx`, `ToolGrid.tsx`, `CardPanel.tsx`, `CodePanel.tsx`,
  `MetricStat.tsx` (exports `MetricStrip`), `DebugActions.tsx` — the six visual components plus
  the debug panel, per task steps 3-9. Every rendered entity carries `data-entity-id` and
  `data-state` (`default`/`focused`/`dimmed`/`spotlit`/`open`/`active` as appropriate). Timeline
  alternates left/right on desktop, sorted by `meta.start` (falling back to `meta.end`) descending;
  reveals on first scroll via `IntersectionObserver`, skipped entirely when
  `prefers-reduced-motion` is set. ToolGrid groups by `meta.category` with a fixed label order
  (language/framework/datastore/infra/tooling, then anything else), draws vendor icons from
  `simple-icons`' own path data by `meta.icon` slug (never hotlinked), and falls back to a lettered
  tile when no icon is configured. CardPanel is a `md:static` right column on desktop and a
  bottom sheet on mobile that starts collapsed to a peek handle and auto-expands when new cards are
  revealed; shows the first 3 projects by default (`ProfileProvider`'s `defaultFeaturedCardIds`) so
  the empty state is never blank. CodePanel highlights with shiki at request time in
  `src/lib/highlight.ts` (server-only) and is a manual disclosure widget via a dedicated
  `toggleSnippet(id)` context method — deliberately *not* wired through `dispatch({action:
  'reset_view'})`, since a user collapsing one snippet shouldn't also clear timeline focus and
  spotlit tools. MetricStrip treats `award` entities carrying a numeric `meta.value` as the
  quantifiable-achievement kind for `show_metric` (see Decisions below); each tile counts up via
  `requestAnimationFrame` on first scroll into view and replays + scrolls-to on `show_metric`.
  DebugActions is dev-only (`process.env.NODE_ENV === 'development'`), derives every button's IDs
  from the *current* profile's real entities rather than hardcoding fixture IDs, and includes the
  two deliberately-broken cases (`teleport` unknown action, `proj_nonexistent` unknown ID) the
  Definition of Done calls out as the forward-compatibility proof.
- `src/components/chat/ChatWidget.tsx`, `useProfileChat.ts` — pinned bottom bar that expands to a
  message list with 4 starter-question chips, typing indicator, and local mock. The mock (in the
  hook, not the widget) reads real IDs off `useProfile()` — first experience, its matching skills,
  first project — so it produces a sensible `{reply, ui[]}` for *any* tenant's data, not just the
  demo fixture; Task 05 swaps `window.setTimeout` for the real SSE stream at the same `dispatch()`
  call sites. Always dispatches `reset_view` before applying new actions, per the contract.
- `src/lib/color.ts` — `getAccessibleAccentPair(hex)`. Task 06 lets tenants pick any accent colour;
  this clamps HSL lightness (bounded 12-88%) until the accent clears 4.5:1 contrast against both a
  light and a dark page background, returning both variants rather than one compromise value that
  satisfies neither well. `page.tsx` sets `--accent-light`/`--accent-dark` inline per profile;
  `.accent-scope` in `globals.css` picks the right one under `prefers-color-scheme: dark`.
- `src/lib/highlight.ts` — `import 'server-only'`. Wraps shiki's `createHighlighter` with the
  **JavaScript regex engine** (`createJavaScriptRegexEngine`), not the default WASM/oniguruma one -
  shiki's own documented recommendation for edge runtimes, avoiding a `.wasm` load in the Workers
  bundle. Loads only the languages actually used by a profile's snippet entities (via
  `isSpecialLang` to skip `text`), not the full bundled language set.
- `src/app/p/[username]/not-found.tsx` — branded 404 instead of the framework default.

### Configuration / files modified

- `src/app/p/[username]/page.tsx` — rewritten. Server component: `getProfileRow` wrapped in React's
  `cache()` so `generateMetadata` and the page body share one Supabase read per render;
  `revalidate = 3600` + `dynamicParams = true` for on-demand ISR; `notFound()` when the row is
  missing *or* `is_published` is false. `generateMetadata` builds OG/Twitter tags from
  `display_name`/`headline`/`avatar_url`. Snippet highlighting runs here (server-side) and the
  resulting `Record<entityId, html>` is passed into `ProfileProvider` as `snippetHtml`, alongside
  the accent-pair CSS vars on the root wrapper.
- `src/app/layout.tsx` — replaced the `create-next-app` scaffold title/description (flagged as a
  cosmetic carryover in the Task 01 QA audit).
- `src/app/globals.css` — `.accent-scope` (see above), `@utility animate-pulse-once` /
  `animate-card-in` keyframes (Tailwind v4's `@utility` so they support `motion-safe:`), shiki's
  dual-theme CSS variable rules, `.mobile-sheet` (see Decisions), and a blanket
  `prefers-reduced-motion` media query collapsing all animation/transition durations to ~0 as a
  backstop for any utility not individually gated.
- `scripts/seed-fixture.ts` — see Decisions.
- `.claude/launch.json` (gitignored) — `dev` (port 3000) and `preview` (port 8787) configurations
  for browser-driven verification.
- `.dev.vars` (gitignored) — copied from `.env.local` so `pnpm preview`'s wrangler runtime has
  Supabase credentials; Task 01's audit had flagged this as the correct local-Workers pattern.

### Decisions / deviations from the task text

- **`award` entities double as the `show_metric` target.** `EntityKind` has no dedicated "metric"
  kind, and the task only says `MetricStat` animates `meta.value`. Interpreted `award` (the closest
  fit - quantifiable achievements like "10x faster deploys") as the kind that carries `meta.value`/
  `meta.suffix`/`meta.label`. Worth confirming against the real extraction schema in Task 04.
- **Seed fixture extended, not just re-themed.** The pre-existing fixture (Task 02) had no
  `snippet` or `award` entities and no `meta.category`/`meta.icon` on skills - meaning `show_code`,
  `show_metric`, and tech-grid grouping would have had nothing real to point at. Added
  `snippet_dockerfile_multistage`, two `award_*` metric entities, and category/icon metadata on
  every skill (AWS and CI/CD deliberately left iconless to exercise the lettered-fallback-tile
  requirement), plus a `url` on `proj_interactive_profile` so `open_link` has something to reveal.
  Re-ran `pnpm tsx scripts/seed-fixture.ts` against the live Supabase project (22 entities now,
  up from 19).
- **`.mobile-sheet` transform reset lives in CSS, not JS.** First pass computed the panel's
  open/closed state through Tailwind's `translate-y-[...]` arbitrary-value utilities, swapped by
  React state. Two real bugs surfaced during manual browser testing (see Verification): a
  malformed `calc()` (missing the space Tailwind requires escaped as `_` around the arithmetic
  operator, so the whole declaration was silently dropped) collapsed the mobile "peek" state
  entirely, and a desktop/mobile split originally handled via a `useMediaQuery` JS hook raced with
  hydration on first paint. Final version: a single inline `--panel-y` custom property plus one
  `.mobile-sheet { transform: translateY(var(--panel-y, 0)); } @media (min-width: 768px) {
  transform: none; }` rule in `globals.css` — no JS viewport check, no hydration race.
- **CardPanel and ChatWidget are both independently-toggled `fixed bottom-0` elements.** Not called
  out in the task text, but real: without a deliberate offset, ChatWidget's higher `z-40` sits
  directly on top of CardPanel's peek handle at `z-30`. CardPanel now reserves a `5rem` clearance
  (a little over ChatWidget's own ~4.65rem height) above the true viewport bottom in both its open
  and collapsed states.

### Manual verification

Walked every item in the Definition of Done via a live browser (`pnpm dev` against the real
Supabase project) plus direct `curl` against the built Worker (`pnpm preview`, port 8787) - the
latter specifically because the task says `pnpm dev`'s caching differs from the Workers runtime
and "only `pnpm preview` tells you the truth."

**Debug panel — every action in the vocabulary, against real fixture IDs:**

| Check | Result |
|---|---|
| `focus_timeline` (1 id) | PASS - ring + pulse on the target, scrolls into view |
| `focus_timeline` (2 ids) | PASS - both focused, third dimmed, scrolls to first |
| `show_cards` (3 ids) | PASS - staggered reveal (verified via translate/opacity state, not just the default-3 no-op case) |
| `highlight_tools` | PASS - spotlit chips get accent bg + scale, rest dimmed (`skill_docker`/`skill_k8s`/`skill_postgres` verified via `data-state`) |
| `show_code` | PASS - Dockerfile snippet expands with real shiki syntax colouring (confirmed both in-browser and in the raw Worker HTML response) |
| `show_metric` | PASS - scrolls to and rings the target tile |
| `open_link` | PASS (after pairing with `show_cards` in the debug button - see below) - CTA renders with `target="_blank" rel="noopener noreferrer"`, never auto-navigates |
| `reset_view` | PASS - every state (timeline, tools, cards, snippet, metric, links) returns to its documented default, cards back to the 3 featured |
| Unknown action (`teleport`) | PASS - silently ignored, no console error, no state change, page stays alive |
| Unknown ID (`proj_nonexistent`) | PASS - silently ignored, same |

`open_link`'s debug button initially targeted `proj_interactive_profile`, the only fixture project
with a `url` - but that project isn't among the default 3 featured cards, so the CTA had nowhere to
render and the button appeared to do nothing. Fixed by having the button dispatch `show_cards` for
that ID first, matching how a real AI response would name the project in the same breath it offers
the link, rather than changing which project has the URL.

**Real bug found and fixed during this pass — Timeline dimming.** `focus_timeline` with one ID left
*every other* timeline node fully bright instead of dimmed. Cause: the dimmed state's `opacity-40`
and the scroll-reveal's `opacity-100` were both being applied as separate Tailwind classes on the
same element - Tailwind's generated stylesheet order decided the winner, not which one the code
intended. Fixed by computing one `opacityClass` per render instead of concatenating two competing
ones. Confirmed via `getComputedStyle().opacity` before/after (0.4 vs 1).

**Chat widget mock:** "Tell me about a recent project" produced the correct canned reply,
`focus_timeline` on the matching experience, `highlight_tools` on that role's actual tech stack,
and `show_cards` on a project - all derived from real entity data, not hardcoded IDs.

**Routing / SEO:**

| Check | Result |
|---|---|
| `/p/nonexistent` | HTTP 404 (checked via `read_network_requests`, not just visually) |
| `/p/demo-unpublished` (real unpublished row, not an absent one) | HTTP 404 |
| `/p/demo` OG/Twitter tags, `<title>` | present in raw HTML (`og:title`, `og:description`, `twitter:card`) |
| `profile_json` content in initial HTML | present (`proj_k8s_migration` etc. in the raw response before any client JS runs) |
| `/api/health` | `{"ok":true,...}` against the live DB, through both `pnpm dev` and the built Worker |

**A note on this pass's browser-tool limitations.** For a stretch of this session the Browser pane
repeatedly reported it "is not displayed, so the page is not compositing frames," and
`getBoundingClientRect()` reads taken during that window returned stale/frozen values even though
the underlying `style`/`className`/ARIA attributes were independently confirmed correct - i.e. the
React state and CSS were right, but geometry reads weren't trustworthy at that moment. Rather than
report an unverified pass, functional correctness for the affected checks (CardPanel open/collapse,
Timeline card widths) was re-confirmed through attribute-level inspection and, for the final
mobile-sheet fix, through the raw HTML returned by `curl` against the actual built Worker
(`class="mobile-sheet ..." style="--panel-y:calc(100% - 3.25rem - 5rem)"` present exactly as
written). Lighthouse was not run - no Lighthouse-capable tool is available in this environment;
performance/accessibility scores are unverified and should be checked before shipping.

### Verification (Definition of Done)

| Gate | Result |
|---|---|
| `pnpm typecheck` | PASS - exit 0 |
| `pnpm lint` | PASS - exit 0, no warnings |
| `pnpm build` | PASS - 6 routes generated |
| `pnpm cf:build` | PASS - `Worker saved in .open-next\worker.js` |
| `pnpm preview` real Worker serves `/p/demo`, `/p/nonexistent`, `/p/demo-unpublished`, `/api/health` correctly | PASS - verified via direct `curl`, see above |
| Debug panel: all 7 actions + 2 forward-compat cases | PASS - see table above |
| `/p/nonexistent` and unpublished profile return 404 not 500 | PASS |
| `profile_json` present in view-source | PASS |
| Mobile viewport (390px): timeline, grid, card sheet usable | PASS - card sheet peek/expand and chat-bar clearance verified via computed styles and the built Worker's raw HTML |
| Lighthouse >= 90 / >= 95 | NOT RUN - no Lighthouse tool available in this environment |
| Second load issues no new Supabase query | PASS by construction (`revalidate = 3600`, no `generateStaticParams`, no dynamic APIs in the render path - Next's Full Route Cache handles this; not independently re-verified against the Supabase dashboard's request log) |

**Commits** (per the task's 4-commit plan): profile page shell; timeline/tech-grid/card-panel/
code-panel components; ProfileProvider registry + debug panel; chat widget shell. Squashed into
fewer commits in practice - see git log for the actual split.
