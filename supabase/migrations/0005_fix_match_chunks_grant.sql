-- 0004_match_chunks.sql revoked EXECUTE from anon/authenticated, but every
-- Postgres function is GRANT EXECUTE TO PUBLIC by default at creation time.
-- Because every role (including anon and authenticated) implicitly inherits
-- from PUBLIC, that default grant alone was enough to keep match_chunks
-- callable with the anon key, regardless of the explicit anon/authenticated
-- revokes. Revoke PUBLIC first, then re-assert the explicit revokes.
revoke execute on function match_chunks(uuid, vector, text, int) from public;
revoke execute on function match_chunks(uuid, vector, text, int) from anon, authenticated;
