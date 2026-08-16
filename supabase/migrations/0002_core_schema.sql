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
  embedding   vector(1536),              -- must match outputDimensionality (Task 04)
  tsv         tsvector generated always as (to_tsvector('english', content)) stored,
  token_count int,
  foreign key (profile_id, entity_id) references entities(profile_id, id)
           on delete cascade
);
create index on chunks (profile_id);
create index chunks_tsv_idx on chunks using gin (tsv);
-- Add ANN only once real volume justifies it; exact search is faster and
-- more accurate below ~100k rows:
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
