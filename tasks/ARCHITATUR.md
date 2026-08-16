# Interactive AI Profile SaaS — Architecture Blueprint

*Target: near-$0 running cost, multi-tenant, BYOK inference, fast to ship.*
*Verified against provider pricing as of August 2026.*

---

## 0. The verdict up front

Three decisions drive everything else:

**1. Build the frontend in code (Next.js), not no-code.** You asked for no-code, but for *this specific product* no-code is the slower and more expensive path. The core feature — an AI that returns structured JSON which conditionally drives a timeline, a tech grid, and card reveals, over a streaming connection — is exactly the thing visual builders are worst at. You'd spend your time fighting the builder's escape hatches (embed blocks, custom code widgets) and paying $25–40/mo for CMS-backed dynamic routing you get free in Next.js. A no-code variant is specced in §7 if you still want it.

**2. The AI must never generate visual content — only *select* it.** The single most important architectural idea in this document. Hydrate the whole profile into the page at load. The LLM's structured output returns nothing but action verbs and **entity IDs** (`{"action":"show_cards","ids":["proj_k8s"]}`). The frontend reveals elements it already has. This kills hallucinated project cards, cuts output tokens by ~10x, makes the UI instant, and — critically — is simple enough that even a no-code frontend can execute it. Full spec in §5.

**3. Split the keys.** BYOK covers *chat inference only*. You pay for embeddings on your own key. Embeddings are effectively free at this scale (Gemini free tier / Voyage's 200M free tokens), and this sidesteps a landmine: **Anthropic has no embeddings endpoint.** If a user gives you an Anthropic key and you also try to embed with it, onboarding breaks. Detail in §4.3.

---

## 1. The stack

| Layer | Pick | Why | Cost |
|---|---|---|---|
| **Frontend + API** | Next.js 15 (App Router) | Native dynamic routing (`/p/[username]`), RSC for static profile shells, Route Handlers give you the backend in the same repo. One deploy, one language on the hot path. | $0 |
| **Hosting** | **Cloudflare Workers/Pages** via `@opennextjs/cloudflare` | 100k req/day free, **commercial use permitted**, global edge, free cron triggers, free KV. | $0 |
| **Database + Vector** | **Supabase** (Postgres + pgvector) | pgvector on the free plan. Auth, S3-compatible Storage for CVs, and RLS in one product. One connection string, no vector DB to sync. | $0 |
| **Vector store** | `pgvector` in the same DB | At your scale (~50–200 chunks/tenant) a separate vector DB is pure overhead and a second consistency problem. | $0 |
| **File storage** | Supabase Storage (1 GB free) | CV PDFs. Delete the original after parsing — you don't need it. | $0 |
| **Ingestion worker** | Next.js Route Handler (TS) — or **Modal** if you want Python | See §1.3. | $0 |
| **Payments** | Gumroad (as specified) | Ping webhooks + HMAC-SHA256 signing + License API. | 10% + $0.50/sale |
| **Embeddings (your key)** | Gemini `gemini-embedding-001` or Voyage `voyage-4-lite` | Both have real free allowances. Voyage: first 200M tokens free on voyage-4 family. | ~$0 |
| **Chat inference** | **User's key (BYOK)** | Zero marginal cost to you — the whole point. | $0 |
| **Rate limit / cache** | Cloudflare KV (free, 100k reads/day) | Per-IP throttling + semantic response cache. Avoids adding Redis. | $0 |
| **Email** | Resend (3k/mo free) | Onboarding link, "your profile is ready". | $0 |
| **Errors** | Sentry free tier | You will need this. | $0 |

### 1.1 Two landmines to know about before you start

**Vercel Hobby forbids commercial use.** The free tier's terms exclude revenue-generating sites. The day you turn on Gumroad you're in violation. Your options: pay Vercel Pro ($20/mo — fine, but it's not $0), or deploy the same Next.js app to Cloudflare Workers via the OpenNext adapter, where commercial use on the free plan is allowed. **Recommendation: Cloudflare.** Keep Vercel Hobby for preview branches only, where it's genuinely non-commercial.

*Caveat on Cloudflare Workers free:* 10ms CPU per invocation. This sounds fatal for AI streaming but isn't — time spent awaiting `fetch()` (i.e. waiting on the LLM) does **not** count as CPU time. Your actual CPU work is JSON parsing and a DB round-trip, comfortably under 10ms. Just don't do PDF parsing or embedding math in a Worker; that's what §1.3 is about.

**Supabase free projects pause after 7 days with no API requests.** For a live SaaS this is unacceptable — a customer's public profile URL would 500. Mitigation: a Cloudflare Cron Trigger (free) hitting a `/api/health` endpoint that runs `SELECT 1` every 6 hours. Two lines of config, problem gone permanently. Also note the free plan's 500 MB DB / 5 GB egress ceiling — see §8 for when that actually binds.

*Alternative if the pause behaviour bothers you:* **Neon** (0.5 GB storage, 100 compute-hours/month/project) scales to zero after 5 minutes and **resumes automatically** on the next connection — no manual unpause, no cron hack. You lose Supabase's bundled Auth + Storage, which you'd then have to solve separately (Cloudflare R2 for files, Lucia/Auth.js for auth). Supabase-plus-cron is the faster path; Neon is the more robust one.

### 1.2 Why not a separate Python/FastAPI backend

You have the Java/Python background, so this is tempting. Resist it for the hot path. The chat endpoint does three things: embed a query, run one SQL query, stream an HTTP response. None of that benefits from Python, and a second runtime means a second deploy target, a second set of secrets, cross-origin auth, and — the killer — there is no genuinely free, always-warm Python host. Render's free tier cold-starts for ~50 seconds; your visitor is gone.

Keep the hot path in TypeScript inside Next.js. Use Python only where it earns its keep: the CV ingestion job.

### 1.3 The ingestion worker

CV parsing is slow (5–60s), rare (once per customer), and CPU-heavy. It must not run inline in a Worker.

- **Simplest (recommended for v1):** a Next.js Route Handler on a Node runtime, invoked as a fire-and-forget background job. Parse the PDF with `unpdf`, chunk, embed, write. If you're on Cloudflare, use a **Queue** or just a `waitUntil()` continuation. Ships in a day, no second runtime.
- **If you want Python:** **Modal** — serverless Python, real free monthly credits, sub-second warm starts, `@app.function()` decorator and you're done. Trigger it over HTTPS from your webhook handler. This is the right call if your extraction pipeline gets sophisticated (layout-aware parsing, OCR fallback for scanned CVs).
- **Zero-cost hack:** GitHub Actions `repository_dispatch` as a job runner (2000 free minutes/mo). Works, genuinely free, ~30s startup. Fine for a job the user already expects to take a minute.

---

## 2. Architecture

```
                          ┌──────────────────────────┐
   VISITOR ──────────────►│  Cloudflare Edge          │
                          │  /p/[username]            │
                          │  (cached HTML + hydrated  │
                          │   profile JSON)           │
                          └───────────┬───────────────┘
                                      │ POST /api/chat (SSE)
                                      ▼
                          ┌──────────────────────────┐
                          │  Chat Route Handler       │
                          │  1. rate-limit (KV)       │
                          │  2. semantic cache (KV)   │
                          │  3. embed query (YOUR key)│
                          │  4. hybrid search (pgvec) │
                          │  5. decrypt tenant key    │
                          │  6. stream LLM (THEIR key)│
                          │  7. parse+validate ui[]   │
                          └───────────┬───────────────┘
                                      ▼
                        ┌─────────────────────────────┐
                        │  Supabase Postgres          │
                        │  tenants / profiles /       │
                        │  entities / chunks(vector)  │
                        │  credentials (encrypted)    │
                        └─────────────────────────────┘
                                      ▲
   BUYER ──► Gumroad ──Ping webhook──►│  /api/webhooks/gumroad
                                      │  ──► /onboard?t=<signed token>
                                      │  ──► ingest job ──► entities+chunks
```

### 2.1 Onboarding flow (step by step)

**1 — Purchase.** User buys on Gumroad. Nothing of yours runs yet.

**2 — Ping webhook.** Gumroad POSTs form-encoded data to `POST /api/webhooks/gumroad`.
- Verify the HMAC-SHA256 signature against your shared secret. Reject on mismatch. *Do not* trust the payload before this.
- **Idempotency is mandatory** — Gumroad retries. `INSERT ... ON CONFLICT (gumroad_sale_id) DO NOTHING`. Webhooks fire more than once; a non-idempotent handler creates duplicate tenants.
- Create `tenants` row: `status='awaiting_setup'`, store `email`, `gumroad_sale_id`, `license_key`.
- Generate a single-use onboarding token: random 32 bytes, store its **SHA-256 hash** (never the plaintext) with a 7-day expiry.
- Return 200 fast (< 3s) — do all real work async.
- Email the setup link via Resend: `https://yourapp.com/setup?t=<token>`. Do this *in addition to* Gumroad's redirect, because redirects get lost.

**3 — Setup page.** `/setup?t=...` validates the token hash, marks it used, mints a short-lived session cookie scoped to that tenant. Then a 3-step wizard:
- **Step A — CV upload.** Direct-to-Supabase-Storage via a signed upload URL, so the file never transits your Worker (which has body-size limits and CPU limits). Cap at 10 MB, PDF only.
- **Step B — Core questions.** ~6 fields: headline, "what are you looking for", tone of voice (professional / casual / witty), 2–3 things you want the agent to *always* mention, anything it should *never* discuss, accent colour + username slug. These become the agent's system prompt and let a user differentiate their profile without a designer.
- **Step C — API key.** Provider dropdown (OpenAI / Anthropic), key field. **Validate immediately** with a 1-token completion call before accepting. A key that fails silently at 2am on a visitor's request is your worst support ticket. Show a clear cost estimate and an explicit consent checkbox that you store the key encrypted.

**4 — Generation.** Enqueue the ingest job:

```
PDF ──► text extraction (unpdf / pdfplumber)
    ──► LLM structured extraction (ONE call, your key, cheap model,
        strict JSON schema) ──► ProfileJSON
    ──► write `entities` rows (one per experience/project/skill/education)
    ──► build chunk text per entity (entity-first chunking, §4.2)
    ──► embed batch (your key)
    ──► write `chunks` rows with entity_id FK
    ──► render + cache profile page
    ──► tenants.status = 'live'
    ──► delete the source PDF from Storage
    ──► email "your profile is live: /p/username"
```

**5 — Review screen.** Before going live, show the extracted structure in an editable form. LLM CV extraction is ~85–90% right; the remaining 10% is job titles and dates, which are exactly the things a user will be furious about getting wrong on their public professional profile. An edit step converts a refund into a good review. Editing an entity re-embeds only that entity's chunk.

### 2.2 Profile interaction flow

**Page load** (`/p/[username]`) — statically rendered / ISR-cached at the edge, revalidated on profile update. A profile view should hit **zero** database queries in the common case; this is what keeps you inside Supabase's free egress and compute budget. The full `ProfileJSON` — every timeline event, every project card, every tool, each with a stable `id` — is embedded in the page payload. Cards and snippets render into the DOM in a hidden/collapsed state at load.

**Visitor asks a question:**

1. `POST /api/chat` with `{profile_id, session_id, message}`.
2. **Rate limit** on `ip + profile_id` in Cloudflare KV. Reject over quota. (§7)
3. **Semantic cache** lookup: embed the query, compare against cached Q&A for this profile at cosine ≥ 0.95. Most visitors ask the same eight questions ("what's your experience with X", "are you available", "tell me about yourself"). A hit returns the cached `{reply, ui[]}` instantly at zero inference cost. Expect a 50–80% hit rate on a profile with any traffic — the single biggest cost lever you have.
4. **Retrieve:** hybrid search over `chunks WHERE profile_id = $1` (§4.4). Top-k = 8.
5. **Build context:** system prompt (persona + tone + rules) + a compact **entity ID manifest** listing only the IDs retrieved + the chunk text + last 6 turns of history.
6. **Decrypt** the tenant's API key in-memory. Never log it, never put it in the prompt.
7. **Stream** to the user's provider with their key. Server-Sent Events back to the browser.
8. **Parse** the trailing structured block, **validate every ID against the profile's entity map**, drop unknown IDs, emit as a typed SSE `ui` event.
9. Write to `usage_counters` and (optionally) `chat_messages`.

**Frontend receives:**
```
event: token  data: {"t":"I ran the Docker"}
event: token  data: {"t":" migration at Acme…"}
event: ui     data: {"action":"focus_timeline","ids":["exp_acme"]}
event: ui     data: {"action":"show_cards","ids":["proj_k8s"]}
event: done   data: {"tokens":412,"cached":false}
```
Text streams into the bubble. `ui` events fire the animations. See §5.

---

## 3. Database schema

```sql
create extension if not exists vector;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ─── Tenancy & billing ────────────────────────────────────────────
create table tenants (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  status          text not null default 'awaiting_setup',
                  -- awaiting_setup | onboarding | processing | live
                  -- | suspended | refunded
  gumroad_sale_id text unique,          -- idempotency key. NOT NULL in prod.
  license_key     text,
  plan            text default 'lifetime',
  created_at      timestamptz default now()
);

create table onboarding_tokens (
  token_hash  text primary key,          -- sha256(token); never store plaintext
  tenant_id   uuid not null references tenants(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- ─── The public profile ───────────────────────────────────────────
create table profiles (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  username     citext unique not null,   -- the /p/<username> slug
  is_published boolean default false,
  display_name text,
  headline     text,
  avatar_url   text,
  theme        jsonb default '{}',       -- accent colour, layout variant
  persona      jsonb default '{}',       -- tone, always_mention[], never_discuss[]
  profile_json jsonb not null default '{}',  -- FULL render payload, denormalised
  updated_at   timestamptz default now()
);
create unique index on profiles (tenant_id);
```

> `profile_json` is deliberately denormalised: it's the exact blob the page hydrates with, so a page view is one row read (and usually a cache hit). `entities` below is the normalised source of truth used for retrieval and editing. Regenerate `profile_json` from `entities` on every edit.

```sql
-- ─── Entities: the join between RAG and the UI ───────────────────
create table entities (
  id          text not null,             -- STABLE, human-readable: 'exp_acme_2021'
  profile_id  uuid not null references profiles(id) on delete cascade,
  kind        text not null,
                -- experience | project | skill | education
                -- | award | snippet | faq | summary
  title       text,
  body        text,                       -- narrative used for embedding
  meta        jsonb default '{}',         -- dates, company, url, tech[], logo
  sort_order  int default 0,
  primary key (profile_id, id)
);
create index on entities (profile_id, kind);

-- ─── Vector chunks ────────────────────────────────────────────────
create table chunks (
  id          bigserial primary key,
  profile_id  uuid not null references profiles(id) on delete cascade,
  entity_id   text not null,             -- ← the link back to a UI element
  content     text not null,
  embedding   vector(1536),              -- match your embedding model's dims
  tsv         tsvector generated always as (to_tsvector('english', content)) stored,
  token_count int,
  foreign key (profile_id, entity_id) references entities(profile_id, id)
           on delete cascade
);
create index on chunks (profile_id);
create index chunks_tsv_idx on chunks using gin (tsv);
-- Add ANN only once you have real volume; exact search is faster below ~100k rows:
-- create index on chunks using hnsw (embedding vector_cosine_ops);

-- ─── BYOK credentials — isolated table, deny-all RLS ─────────────
create table credentials (
  tenant_id     uuid primary key references tenants(id) on delete cascade,
  provider      text not null,           -- 'openai' | 'anthropic'
  ciphertext    bytea not null,          -- AES-256-GCM
  iv            bytea not null,
  auth_tag      bytea not null,
  key_version   int  not null default 1, -- for master-key rotation
  key_last4     text,                    -- to show "sk-…a4f9" in settings
  validated_at  timestamptz,
  last_error    text,
  last_error_at timestamptz
);

-- ─── Abuse & cost control ────────────────────────────────────────
create table usage_counters (
  profile_id   uuid references profiles(id) on delete cascade,
  day          date not null,
  messages     int default 0,
  cache_hits   int default 0,
  tokens_in    bigint default 0,
  tokens_out   bigint default 0,
  primary key (profile_id, day)
);

create table chat_messages (          -- optional; enables an analytics upsell
  id          bigserial primary key,
  profile_id  uuid references profiles(id) on delete cascade,
  session_id  uuid not null,
  role        text not null,
  content     text,
  ui_actions  jsonb,
  created_at  timestamptz default now()
);
```

### 3.1 Row Level Security

Enable RLS on **every** table. The public profile page and the chat endpoint both run server-side with the service role, so you don't need permissive policies for them — you need policies that stop a leaked anon key from being a breach.

```sql
alter table credentials enable row level security;
-- No policy at all = deny all for anon and authenticated.
-- Only the service role (which bypasses RLS) can read this table. That is the point.

alter table profiles enable row level security;
create policy "public reads published profiles" on profiles
  for select using (is_published = true);

alter table entities enable row level security;
create policy "public reads published entities" on entities
  for select using (exists (
    select 1 from profiles p
    where p.id = entities.profile_id and p.is_published
  ));

alter table chunks enable row level security;
-- No policy. Chunks are only ever read by the service role during retrieval.
```

The rule to hold onto: **`credentials` and `chunks` must never be reachable from a browser-side key, under any circumstance.** If you ever find yourself writing a policy for `credentials`, stop.

### 3.2 BYOK key security

This is the part that will keep you up at night, so be deliberate.

**Encrypt at the application layer, not with `pgcrypto`.** If you encrypt inside Postgres, the key material lives near the data; a DB dump plus a config leak is game over. Encrypt in your Worker with AES-256-GCM using a master key held in a Cloudflare secret. Then a stolen database dump is inert.

```ts
// Store
const key = await crypto.subtle.importKey('raw', b64d(env.MASTER_KEY),
              'AES-GCM', false, ['encrypt']);
const iv  = crypto.getRandomValues(new Uint8Array(12));
const ct  = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key,
              new TextEncoder().encode(apiKey));
// persist { ciphertext: ct, iv, key_version: 1, key_last4: apiKey.slice(-4) }
```

Non-negotiables:
- **Never send the key into an LLM prompt.** It travels only in the `Authorization` header. This is what makes prompt-injection key exfiltration structurally impossible rather than merely unlikely — a very good property to be able to state on your landing page.
- **Never log it.** Scrub it in your Sentry `beforeSend`.
- **Never return it** from any API, even to its owner. Show `sk-…a4f9` only.
- **Hard daily cap per profile** (§7). You are spending someone else's money. If a scraper hammers a profile, your customer gets the bill and you get the chargeback. A cap is a product feature, not a nicety.
- **Surface failures.** On a 401 from the provider, write `credentials.last_error`, flip the profile to a graceful degraded mode ("the AI assistant is temporarily unavailable" — never a raw error), and email the owner.
- **Key rotation:** `key_version` lets you re-encrypt everything under a new master key without downtime. You will thank yourself.
- **Say it in your Terms.** "We store your provider key encrypted with AES-256-GCM; it is used solely to answer questions on your profile." Explicit consent at input time.

---

## 4. RAG strategy

### 4.1 Extraction, not chunking

Do not naively split the CV into 500-token windows. A CV is already structured; sliding-window chunking destroys that structure and, worse, breaks the ID linkage that makes the visual layer work.

Instead: one LLM call with a strict JSON schema turns the raw PDF text into a `ProfileJSON` of typed entities. Cheap model, one-time cost, on your key. Assign every entity a **stable, semantic ID** at this point — `exp_acme_2021`, `proj_k8s_migration`, `skill_docker`. These IDs become the vocabulary the AI uses to drive the UI for the entire life of the profile, so make them deterministic (slugified from title + year) rather than random.

### 4.2 Entity-first chunking

One chunk per entity. Chunk text is a *self-contained narrative*, not raw fields:

> `exp_acme_2021` → "Senior Backend Engineer at Acme Corp, Jan 2021 – Mar 2024. Led migration of a Java monolith to containerised Python services. Technologies: Docker, Kubernetes, PostgreSQL, FastAPI. Reduced deploy time from 40 minutes to 4."

Why self-contained: retrieval returns this chunk alone, with no surrounding context, so it must carry its own dates and employer or the model will confidently misattribute them.

Add two synthetic entities every profile needs:
- `summary` — a 150-word overview, **always injected** regardless of retrieval score. Without it, "tell me about yourself" retrieves three random projects and the answer is incoherent.
- `faq_*` — answers to the setup questions ("are you available for work", "what are you looking for"). These are the highest-traffic questions on the page and they aren't in the CV.

A realistic profile is 40–150 chunks. That is *small*. Skip the ANN index; exact cosine over a `profile_id`-filtered set is both faster and more accurate at this size.

### 4.3 Embeddings — use your key, not theirs

**Anthropic does not offer an embeddings API.** If a user brings an Anthropic key and your pipeline needs embeddings, onboarding dies. Handle this by owning embeddings yourself:

- **Gemini `gemini-embedding-001`** — real free tier, generous throughput. Best free option today.
- **Voyage `voyage-4-lite`** — first 200M tokens free per account, then $0.02/M. At ~10k tokens per profile ingest, 200M tokens is ~20,000 customers. Effectively free.

Keep embeddings on one model forever, or version the column — changing embedding models means re-embedding every chunk, and mixed-dimension vectors will silently return garbage.

### 4.4 Hybrid retrieval

Pure vector search is weak on exactly the queries this product gets: short technical tokens. "K8s", "FastAPI", "gRPC" are near-noise to an embedding model but exact lexical matches. Fuse both with Reciprocal Rank Fusion in one SQL statement:

```sql
with vec as (
  select id, entity_id, content,
         row_number() over (order by embedding <=> $2) as rank
  from chunks where profile_id = $1
  order by embedding <=> $2 limit 20
),
lex as (
  select id, entity_id, content,
         row_number() over (order by ts_rank(tsv, plainto_tsquery($3)) desc) as rank
  from chunks
  where profile_id = $1 and tsv @@ plainto_tsquery($3)
  limit 20
)
select coalesce(v.id, l.id) as id,
       coalesce(v.entity_id, l.entity_id) as entity_id,
       coalesce(v.content, l.content) as content,
       coalesce(1.0/(60 + v.rank), 0) + coalesce(1.0/(60 + l.rank), 0) as score
from vec v full outer join lex l on v.id = l.id
order by score desc
limit 8;
```

`profile_id = $1` is the tenant boundary. It appears in every retrieval query, without exception. Consider a `SECURITY DEFINER` function that takes `profile_id` as its first argument so no calling code can ever forget it.

---

## 5. The Visual-AI contract

This is the heart of the product. Get it right and everything downstream is easy — including a no-code frontend.

### 5.1 Principle: select, don't generate

The model never emits card titles, dates, or descriptions. It emits **action + IDs**. The browser already holds the content.

Consequences worth stating plainly:
- **No hallucinated visuals.** A card can only show data that came from the CV, because the model can only reference it by ID.
- **~10x fewer output tokens** — you're streaming `"proj_k8s"`, not a paragraph of JSON per card. On the user's key, this matters.
- **Instant UI.** No render waiting on generation; it's a CSS class toggle.
- **No-code compatible.** Show/hide by ID is the one thing every visual builder can do.

### 5.2 The action vocabulary (closed enum)

| Action | Payload | Frontend behaviour |
|---|---|---|
| `focus_timeline` | `ids: string[]` | Scroll timeline to first ID, pulse-highlight all, dim the rest |
| `show_cards` | `ids: string[]` | Reveal project cards in the side panel, staggered fade-in |
| `highlight_tools` | `ids: string[]` | Light up chips in the tech grid, dim the others |
| `show_code` | `id: string` | Expand a syntax-highlighted snippet |
| `show_metric` | `id: string` | Animated stat counter |
| `open_link` | `id: string` | Reveal a CTA button (never auto-navigate) |
| `reset_view` | — | Clear all highlights, return to default |

Keep this enum small and **version it** (`"v": 1`). The frontend must **ignore unknown actions silently** — that forward-compatibility rule lets you ship new visuals without breaking cached responses or older sessions.

### 5.3 Wire format

```json
{
  "v": 1,
  "reply": "Docker's been central to my work for about four years…",
  "ui": [
    { "action": "focus_timeline",  "ids": ["exp_acme_2021"] },
    { "action": "highlight_tools", "ids": ["skill_docker", "skill_k8s"] },
    { "action": "show_cards",      "ids": ["proj_k8s_migration"] }
  ],
  "citations": ["exp_acme_2021", "proj_k8s_migration"]
}
```

### 5.4 Getting reliable structure *while streaming*

You want text to stream (feels alive) **and** valid JSON at the end. Three approaches; pick by taste.

**A — Sentinel block (recommended).** Instruct the model to write its prose reply, then a delimited block:

```
<prose>
⟦UI⟧{"v":1,"ui":[{"action":"show_cards","ids":["proj_k8s"]}]}
```

Server-side, stream everything before `⟦UI⟧` as `token` events; buffer after it, parse on stream close, emit `ui` events. One call, one key charge, natural streaming. Failure mode is malformed trailing JSON — which is *safe*, because you just drop it and the visitor still gets a correct text answer. Degrade to text-only, never to an error.

**B — Forced tool call.** Anthropic: define one tool `render_profile_ui` and set `tool_choice: {"type":"tool","name":"render_profile_ui"}`. OpenAI: `response_format: {type:"json_schema", strict:true}`. Guaranteed-valid structure, but you lose token streaming (or pay for two turns). Best if you want UI to fire *before* the text finishes.

**C — Parallel classifier.** Stream the prose from the main model; simultaneously fire a tiny, cheap model that only picks IDs. Lowest latency to first visual, but two calls on the customer's key.

Start with A. Move to B for any action where a wrong render is worse than a slow one.

### 5.5 Constrain, then validate

Two layers, both required.

**Constrain:** inject only the IDs you actually retrieved into the prompt, as a manifest:

```
AVAILABLE UI ELEMENTS (you may reference ONLY these IDs):
  timeline: exp_acme_2021 ("Senior Backend Engineer, Acme")
  cards:    proj_k8s_migration ("Monolith → K8s migration")
  tools:    skill_docker, skill_k8s, skill_postgres
Rules: reference at most 4 IDs total. If none are relevant, return "ui": [].
```

**Validate:** after parsing, intersect every returned ID with the profile's real entity map and **drop anything that isn't there**. Log the drop rate — it's your best early signal that a prompt change broke something. Never render an unvalidated ID.

### 5.6 Frontend handler

```ts
const registry = {
  focus_timeline:  ids => { timeline.dimAll(); ids.forEach(timeline.pulse);
                            timeline.scrollTo(ids[0]); },
  show_cards:      ids => ids.forEach((id, i) =>
                            setTimeout(() => cards.reveal(id), i * 120)),
  highlight_tools: ids => toolGrid.spotlight(ids),
  show_code:       id  => codePanel.open(id),
  show_metric:     id  => metrics.animate(id),
  open_link:       id  => cta.reveal(id),
  reset_view:      ()  => ui.resetAll(),
};

es.addEventListener('ui', e => {
  const { action, ids, id } = JSON.parse(e.data);
  registry[action]?.(ids ?? id);   // unknown action → silently ignored
});
```

Always `reset_view` at the start of each new question, or highlights accumulate into visual mud after four turns.

---

## 6. The no-code frontend variant

If you still want to avoid a code frontend, here's the honest version.

**Best fit: Framer** (or Webflow). Both support CMS-collection-backed dynamic routes (`/p/:slug`) and custom code embeds.

**How the architecture adapts:**
- Profile pages become CMS items. Your ingest job writes to the Framer/Webflow CMS API instead of rendering from `profile_json`. You now have a **sync problem** — the DB and the CMS can disagree — and CMS item limits on lower plans.
- The timeline, toolbox and cards are built visually, bound to CMS fields.
- The chat widget is a **custom code component** — an `<iframe>` or embedded script hitting your API. You are writing this in JavaScript regardless; no-code doesn't save you here.
- `ui` actions are executed by that same embedded JS, toggling classes on elements it finds by `data-entity-id`. This works because §5.1 reduced the problem to show/hide.

**What it costs you:**

| | Next.js | Framer/Webflow |
|---|---|---|
| Dynamic routes | Free, native | Requires a paid CMS plan (~$25–40/mo) |
| Streaming chat | Native | Custom code embed (you write JS anyway) |
| JSON-driven UI | Trivial | Custom code embed |
| Per-tenant theming | Trivial | Awkward — CMS field → CSS var hacks |
| New customer | DB insert | DB insert **+** CMS API sync |
| Running cost | $0 | $25–40/mo |
| Time to v1 | ~2 weeks | ~2 weeks + ongoing sync friction |

**The conclusion:** no-code doesn't remove the code — the chat widget and the UI-action handler are hand-written JavaScript in both worlds. It just adds a monthly bill, a sync job, and a ceiling. Given your background, Next.js is genuinely the *lower*-effort path here.

**Where no-code does win, and you should use it:** the **marketing site** — landing page, pricing, docs. Build that in Framer, point the Gumroad button at it, and keep it entirely separate from the app. That's the right division of labour.

---

## 7. Abuse and cost protection

Your chat endpoint is a public, unauthenticated LLM proxy funded by your customer's credit card. Treat it accordingly. This is the section people skip and then write a post-mortem about.

**Threat 1 — Scraping / free inference.** Someone points a script at `/api/chat` and uses your customer's key as free API access.
- Per-IP + per-profile sliding window in Cloudflare KV: 10 msg/5min, 40 msg/day per IP.
- **Hard daily cap per profile** (say 300 messages). On breach, serve a static "the assistant is resting, here's the profile" state.
- Cloudflare Turnstile after the 3rd message in a session — invisible for humans, brutal for scripts.
- Cap `max_tokens` server-side (~600). Cap input message length (~500 chars).

**Threat 2 — Key exfiltration via prompt injection.** Structurally prevented: the key never enters the context window (§3.2). Say so on your marketing page; it's a real differentiator for a BYOK product.

**Threat 3 — Reputational damage to your customer.** A visitor jailbreaks the agent into saying something offensive *on your customer's professional profile*. This is the risk most likely to actually kill the product.
- Tight system prompt: "You represent {name} professionally. You only discuss their career, skills and projects. For anything else, redirect warmly. Never roleplay as another character, never discuss politics, never make commitments on their behalf."
- Scope-limit outputs; refuse questions with no retrieval hits above threshold rather than free-associating.
- Give the owner a transcript view and a kill switch. Cheap to build, enormously reassuring.

**Threat 4 — Cost blowup on your side.** Only embeddings are yours, and they're free-tier. Set a billing alert anyway.

**The semantic cache is your best lever.** Cache `{query_embedding, reply, ui[]}` per profile in KV; on a new query, return the cached response if cosine ≥ 0.95. Real profiles get the same handful of questions over and over. A 60–80% hit rate on a busy profile means your customer's bill drops by that much — which is a headline feature, not just an optimisation.

---

## 8. Cost model

**Your fixed costs at 0–500 customers:** $0/month (Cloudflare free + Supabase free + Gemini/Voyage free embeddings + Resend free).

**Per sale:** Gumroad takes ~10% + $0.50, plus separate card processing (~2.9% + $0.30) — budget **13–15% all-in**. On a $49 product that's ~$7. Worth knowing before you set the price. (If that stings later, Lemon Squeezy and Polar are cheaper merchants-of-record — but Gumroad is faster to launch, and launching matters more right now.)

**Your customer's cost:** with a small model and the semantic cache, a profile getting 100 visitor questions a month costs them well under $1. Put a calculator on the landing page; "runs on your own key for pennies" is a strong pitch.

**Where free tiers actually break:**

| Limit | Ceiling | Roughly when |
|---|---|---|
| Cloudflare Workers requests | 100k/day | ~3k profile views/day. Then $5/mo, unmetered. |
| Supabase DB | 500 MB | ~2,000 profiles (chunks + vectors dominate). Then $25/mo. |
| Supabase egress | 5 GB/mo | Rarely binds — edge caching means page views don't touch the DB. |
| Supabase Storage | 1 GB | Never, if you delete source PDFs after parsing. **Do this.** |
| Voyage free tokens | 200M | ~20,000 ingests. |

You will be paying Gumroad far more than you pay for infrastructure, long before any of these bind. That's the correct shape for this business.

---

## 9. Build order

**Week 1 — the product that sells itself.** Build *your own* profile at `/p/you`, hardcoded. Static `ProfileJSON`, the timeline, the toolbox, the cards, the chat endpoint, the UI-action contract. No auth, no payments, no DB multi-tenancy. This is both your demo and your proof the visual-AI contract works. Ship it publicly and see if anyone asks for one.

**Week 2 — make it multi-tenant.** Schema, RLS, `/p/[username]` dynamic route, `profile_json` from the DB, edge caching, ingest pipeline (upload → extract → entities → chunks → embed), the review/edit screen.

**Week 3 — commerce.** Gumroad webhook with signature verification and idempotency, onboarding tokens, the 3-step setup wizard, BYOK encryption and validation, the rate limiter, the semantic cache, the health cron.

**Then:** owner dashboard (transcripts, visitor analytics, kill switch, edit profile). The analytics — *"47 recruiters asked about your Kubernetes experience this month"* — is the feature that turns a one-time purchase into a recurring one. Design the schema for it now (`chat_messages` is already there); build it after launch.

**Two things to decide before you write code:**
1. Your entity ID naming convention. It's the contract between RAG, the AI, and the UI, and it's painful to change once profiles exist.
2. Your embedding model. Changing it later means re-embedding everything.

---

## Sources

- [Supabase Pricing 2026 — free tier limits](https://uibakery.io/blog/supabase-pricing) · [Supabase free tier pauses](https://www.itpathsolutions.com/supabase-free-tier-limits)
- [Neon pricing & free tier](https://neon.com/pricing) · [Neon free tier FAQ](https://github.com/neondatabase/website/blob/main/content/faqs/managed-postgres-databases-free-tier.md)
- [Vercel free tier limits on Hobby](https://www.promptstoproduct.com/vercel-free-tier-limits) · [Is Vercel Free? Hobby plan limits](https://zplatform.ai/guides/is-vercel-free/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [Cloudflare Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [Gumroad fees 2026](https://checkoutpage.com/blog/gumroad-fees) · [Gumroad pricing breakdown](https://www.swell.is/content/gumroad-pricing)
- [Gemini Embedding in the Gemini API](https://developers.googleblog.com/gemini-embedding-available-gemini-api/) · [Gemini API pricing 2026](https://geotoolbox.ai/blog/gemini-api-pricing)
- [Voyage AI pricing](https://docs.voyageai.com/docs/pricing) · [Voyage free trial limits 2026](https://costbench.com/software/embedding-apis/voyage-ai/free-plan/)
