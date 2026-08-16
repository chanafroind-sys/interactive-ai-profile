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
