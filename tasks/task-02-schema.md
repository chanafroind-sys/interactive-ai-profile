# Task 02 — Database, Storage & RLS

**Recommended model: Sonnet, then an Opus review pass.** The DDL is pre-written, so writing it is transcription. But RLS is security-critical and silently fails open, so re-run the final verification with Opus (prompt in §Verification).

---

## Objective

A Supabase project with the full multi-tenant schema, pgvector + pg_trgm enabled, RLS locked down, a `match_chunks` hybrid-search function, a CV storage bucket, and a typed server-side DB client. Plus a seed fixture so Task 03 has something to render.

## Pre-requisites & Context

- Task 01 complete and pushed.
- A Supabase project created (free tier). Have the project URL, anon key and service role key.
- `supabase` CLI installed and logged in (`pnpm add -D supabase`, `pnpm supabase login`).
- Read `tasks/reference/conventions.md` §Entity IDs and §Security invariants.

---

## Step-by-step instructions

### 1. Link the project

```bash
pnpm supabase init
pnpm supabase link --project-ref <your-project-ref>
```

### 2. Migration `0001_extensions.sql`

```sql
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists citext;
```

### 3. Migration `0002_core_schema.sql`

Transcribe the full DDL from the blueprint: `tenants`, `onboarding_tokens`, `profiles`, `entities`, `chunks`, `credentials`, `usage_counters`, `chat_messages`.

Critical details that are easy to get wrong:

- `entities` has a **composite primary key** `(profile_id, id)` — the `id` is the human-readable string, not a uuid.
- `chunks.entity_id` is a **composite FK** referencing `entities(profile_id, id)` with `on delete cascade`.
- `chunks.embedding` is `vector(1536)`. This must match `outputDimensionality` in Task 04. Do not change one without the other.
- `chunks.tsv` is a **generated** column: `to_tsvector('english', content)` stored, with a GIN index.
- `tenants.gumroad_sale_id` is `unique` — this is the webhook idempotency key in Task 06.
- `profiles.username` is `citext unique` — profile URLs must be case-insensitive.
- **Do not** create the HNSW index. At <100k rows exact search is faster and more accurate. Leave the commented-out `create index ... using hnsw` line in the migration as a documented future step.

### 4. Migration `0003_rls.sql`

Enable RLS on **every** table. Then add exactly three policies — and no more.

```sql
alter table tenants            enable row level security;
alter table onboarding_tokens  enable row level security;
alter table profiles           enable row level security;
alter table entities           enable row level security;
alter table chunks             enable row level security;
alter table credentials        enable row level security;
alter table usage_counters     enable row level security;
alter table chat_messages      enable row level security;

-- Public read of published profiles only.
create policy "public reads published profiles" on profiles
  for select to anon, authenticated using (is_published = true);

create policy "public reads published entities" on entities
  for select to anon, authenticated using (exists (
    select 1 from profiles p
    where p.id = entities.profile_id and p.is_published
  ));

-- Everything else: NO POLICY = deny all. That is deliberate.
-- credentials, chunks, tenants, onboarding_tokens, usage_counters and
-- chat_messages are reachable only by the service role, which bypasses RLS.
```

**If you find yourself writing a policy for `credentials` or `chunks`, stop — that is the bug.**

### 5. Migration `0004_match_chunks.sql`

The hybrid retrieval function. Exposed as an RPC so the Worker doesn't need a raw Postgres driver.

```sql
create or replace function match_chunks(
  p_profile_id  uuid,
  p_embedding   vector(1536),
  p_query       text,
  p_match_count int default 8
)
returns table (chunk_id bigint, entity_id text, content text, score float)
language sql stable
security definer set search_path = public
as $$
  with vec as (
    select c.id, c.entity_id, c.content,
           row_number() over (order by c.embedding <=> p_embedding) as rank
    from chunks c
    where c.profile_id = p_profile_id
    order by c.embedding <=> p_embedding
    limit 20
  ),
  lex as (
    select c.id, c.entity_id, c.content,
           row_number() over (
             order by ts_rank(c.tsv, plainto_tsquery('english', p_query)) desc
           ) as rank
    from chunks c
    where c.profile_id = p_profile_id
      and c.tsv @@ plainto_tsquery('english', p_query)
    limit 20
  )
  select coalesce(v.id, l.id),
         coalesce(v.entity_id, l.entity_id),
         coalesce(v.content, l.content),
         coalesce(1.0/(60 + v.rank), 0) + coalesce(1.0/(60 + l.rank), 0)
  from vec v full outer join lex l on v.id = l.id
  order by 4 desc
  limit p_match_count;
$$;

revoke execute on function match_chunks from anon, authenticated;
```

Two things to notice. `p_profile_id` is the **first argument and always required** — the tenant boundary is structural, not something a caller can forget. And execute is revoked from `anon`, so even though it's `security definer`, only the service role can call it.

### 6. Storage bucket

Create a **private** bucket `cvs`. No public policy. Task 04 uploads via signed URL and deletes the source PDF after parsing, so nothing should live here for long.

```sql
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false) on conflict do nothing;
```

### 7. Apply migrations

```bash
pnpm supabase db push
```

### 8. Typed client — `src/lib/db.ts`

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function db() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

Generate types: `pnpm supabase gen types typescript --linked > src/types/database.ts`

Add `pnpm add server-only`.

### 9. Domain types — `src/types/profile.ts`

Hand-write `Entity`, `EntityKind`, `ProfileJSON` and `UiAction` to match `conventions.md` and `ui-action-contract.md`. `ProfileJSON` is the exact shape the page hydrates with:

```ts
export type EntityKind = 'experience' | 'project' | 'skill' | 'education'
                       | 'award' | 'snippet' | 'faq' | 'summary';

export interface Entity {
  id: string;            // e.g. 'exp_acme_2021'
  kind: EntityKind;
  title: string;
  body: string;
  meta: Record<string, unknown>;   // dates, company, url, tech[], logo
  sort_order: number;
}

export interface ProfileJSON {
  display_name: string;
  headline: string;
  avatar_url: string | null;
  theme: { accent: string };
  entities: Entity[];
}
```

### 10. Health endpoint does real work

Update `src/app/api/health/route.ts` to run a trivial query, so the cron actually keeps the project awake:

```ts
const { error } = await db().from('profiles').select('id').limit(1);
return Response.json({ ok: !error, ts: Date.now() }, { status: error ? 503 : 200 });
```

Note: this needs the Node runtime, not edge — remove `export const runtime = 'edge'`.

### 11. Seed fixture — `scripts/seed-fixture.ts`

Insert one tenant + one published profile (`username: 'demo'`) with ~12 entities: 3 experiences, 4 projects, 8 skills, 1 education, 1 summary, 2 faqs. Use realistic content — **your own CV** is ideal, since this fixture becomes your public demo profile in Task 03.

Leave `chunks` empty; Task 04 fills it.

Run with `pnpm tsx scripts/seed-fixture.ts`.

### 12. Commits

```bash
git add -A && git commit -m "feat: multi-tenant schema, RLS policies, pgvector"
git commit -m "feat: hybrid match_chunks RPC + typed supabase client"
git commit -m "chore: seed fixture profile"
```

---

## Definition of Done & Verification

### Schema applied

```bash
pnpm supabase db push          # no pending migrations
pnpm typecheck                 # exits 0
pnpm tsx scripts/seed-fixture.ts
curl -s localhost:3000/api/health   # → {"ok":true,...}
```

### RLS actually holds — the important test

Write `scripts/verify-rls.ts` that builds a client with the **anon key** and asserts:

```ts
// MUST return zero rows or an error:
await anon.from('credentials').select('*')     // ← blocked
await anon.from('chunks').select('*')          // ← blocked
await anon.from('tenants').select('*')         // ← blocked
await anon.from('onboarding_tokens').select('*')  // ← blocked
await anon.rpc('match_chunks', {...})          // ← blocked

// MUST return the demo profile:
await anon.from('profiles').select('*').eq('username','demo')

// MUST return zero rows (unpublished profile):
// (set is_published=false on a second test profile first)
```

Run it. **If any of the blocked queries returns data, stop and fix before continuing.** RLS misconfiguration is the failure mode most likely to end this project badly, and it fails silently in every other test you'd write.

### Then the Opus review pass

```
/model opus
Review supabase/migrations/0003_rls.sql and 0004_match_chunks.sql against
the five security invariants in tasks/reference/conventions.md.
For each invariant, state whether it holds and cite the exact line that
enforces it. List any table reachable with the anon key that shouldn't be.
```

### Checklist

- [ ] All four migrations applied cleanly
- [ ] `verify-rls.ts` passes every assertion
- [ ] `match_chunks` is not callable by `anon`
- [ ] `cvs` bucket exists and is **private**
- [ ] Demo profile renders data via the service client
- [ ] `chunks.embedding` is `vector(1536)`
- [ ] No HNSW index (documented as a future step instead)

## Common failure modes

- **Composite FK rejected** — `entities` needs its composite PK created before `chunks` references it. Order matters within the migration.
- **Generated `tsv` column errors** — must be `generated always as (...) stored`, and the expression must be immutable (`to_tsvector('english', content)` with an explicit language literal, not a config-dependent call).
- **RLS appears to work in the Supabase dashboard** — the SQL editor runs as a superuser and bypasses RLS entirely. It will happily show you data the anon key can't see. Only trust `verify-rls.ts`.
