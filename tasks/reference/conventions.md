# Project Conventions

Frozen decisions. Every task assumes these. Do not deviate without updating this file first.

## Stack

- Next.js 15 (App Router) + TypeScript strict + Tailwind v4
- Deployed to Cloudflare Workers via `@opennextjs/cloudflare` + `wrangler`
- Supabase Postgres (pgvector, pg_trgm) — accessed via `@supabase/supabase-js` service-role client
- Package manager: **pnpm**
- Node 20+

## Repository layout

```
profile-ai/
├── CLAUDE.md                       # standing instructions for Claude Code
├── wrangler.jsonc                  # Cloudflare config, KV bindings, cron
├── open-next.config.ts
├── supabase/
│   ├── config.toml
│   └── migrations/                 # NNNN_name.sql, applied in order
├── scripts/
│   └── seed-fixture.ts             # local demo profile
├── src/
│   ├── app/
│   │   ├── p/[username]/page.tsx   # public profile (ISR-cached)
│   │   ├── setup/page.tsx          # onboarding wizard
│   │   └── api/
│   │       ├── chat/route.ts       # SSE chat endpoint
│   │       ├── ingest/route.ts     # CV → entities → chunks
│   │       ├── health/route.ts     # cron target, keeps Supabase awake
│   │       └── webhooks/gumroad/route.ts
│   ├── components/
│   │   ├── profile/                # Timeline, ToolGrid, CardPanel, CodePanel
│   │   └── chat/                   # ChatWidget, useProfileChat hook
│   ├── lib/
│   │   ├── db.ts                   # supabase service client (server-only)
│   │   ├── crypto.ts               # AES-256-GCM for BYOK keys
│   │   ├── embeddings.ts           # Gemini embedding wrapper
│   │   ├── retrieval.ts            # match_chunks RPC wrapper
│   │   ├── ui-contract.ts          # zod schema + validator for ui actions
│   │   ├── ratelimit.ts            # Cloudflare KV sliding window
│   │   ├── cache.ts                # semantic response cache
│   │   └── llm/{openai,anthropic}.ts
│   └── types/profile.ts            # ProfileJSON, Entity, UiAction
└── tasks/                          # these files
```

`src/lib/db.ts` and `src/lib/crypto.ts` must carry `import 'server-only'` at the top. If either ever ends up in a client bundle it is a breach, not a bug.

## Entity IDs — the most important convention

Entity IDs are the contract between RAG, the LLM and the UI. They are **stable, deterministic and human-readable**. Never random, never renumbered.

Format: `{kind}_{slug}` — lowercase, ASCII, underscores.

| Kind | Pattern | Example |
|---|---|---|
| experience | `exp_{company}_{startYear}` | `exp_acme_2021` |
| project | `proj_{slug}` | `proj_k8s_migration` |
| skill | `skill_{slug}` | `skill_docker` |
| education | `edu_{institution}_{endYear}` | `edu_technion_2019` |
| award | `award_{slug}` | `award_hackathon_2022` |
| snippet | `snippet_{slug}` | `snippet_dockerfile_multistage` |
| faq | `faq_{slug}` | `faq_availability` |
| summary | `summary` | (exactly one per profile) |

On collision, append `_2`. On re-ingest, **preserve existing IDs** by matching on title+year — regenerating IDs orphans every cached response and breaks the semantic cache.

## Environment variables

Single source of truth. `.env.example` in the repo must match this table exactly.

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | both | e.g. `https://yourapp.com` |
| `SUPABASE_URL` | server | |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | bypasses RLS — never expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | only ever reads published profiles |
| `MASTER_ENCRYPTION_KEY` | server | base64 of 32 random bytes |
| `GEMINI_API_KEY` | server | **your** key — embeddings + CV extraction |
| `GUMROAD_WEBHOOK_SECRET` | server | |
| `RESEND_API_KEY` | server | |
| `TURNSTILE_SECRET_KEY` | server | Task 07 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | client | Task 07 |

Cloudflare KV bindings (in `wrangler.jsonc`): `RATE_LIMIT_KV`, `SEMANTIC_CACHE_KV`.

Local secrets live in `.env.local` (gitignored). Production secrets go in via `wrangler secret put`. **Never** commit a real key; the repo must stay clean enough to open-source.

## Embeddings

- Model: `gemini-embedding-001`, `outputDimensionality: 1536`
- The `chunks.embedding` column is `vector(1536)`. These two numbers must match forever.
- Changing the embedding model means re-embedding every chunk in the database. Treat it as a migration, not a config change.

## Git

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
One commit per task at minimum; each task file names the commits it expects.
Never commit `.env.local`, `.wrangler/`, `.open-next/`, `node_modules/`.

## Security invariants

These are non-negotiable and every task is checked against them:

1. `credentials` and `chunks` are **never** readable with the anon key. RLS enabled, no permissive policy.
2. A decrypted BYOK API key exists only in a request-scoped variable. Never logged, never returned by an API, never placed in an LLM prompt.
3. Every retrieval query filters on `profile_id`. No exceptions.
4. Every LLM-returned entity ID is validated against the profile's real entity map before rendering.
5. `SUPABASE_SERVICE_ROLE_KEY` and `MASTER_ENCRYPTION_KEY` never appear in a `NEXT_PUBLIC_` variable or a client component.
