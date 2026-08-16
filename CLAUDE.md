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
