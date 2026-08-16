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

-- Private CV storage bucket. Task 04 uploads via signed URL and deletes
-- the source PDF after parsing, so nothing should live here for long.
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false) on conflict do nothing;
