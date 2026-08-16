import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

let failures = 0;

function checkBlocked(name: string, error: { message: string } | null, data: unknown[] | null) {
  const blocked = error !== null || data === null || data.length === 0;
  console.log(`${blocked ? 'PASS' : 'FAIL'} — ${name} must be blocked`);
  if (!blocked) failures++;
}

function checkVisible(name: string, error: { message: string } | null, data: unknown[] | null) {
  const visible = error === null && data !== null && data.length > 0;
  console.log(`${visible ? 'PASS' : 'FAIL'} — ${name} must be visible`);
  if (!visible) failures++;
}

async function main() {
  const credentials = await anon.from('credentials').select('*');
  checkBlocked('anon SELECT credentials', credentials.error, credentials.data);

  const chunks = await anon.from('chunks').select('*');
  checkBlocked('anon SELECT chunks', chunks.error, chunks.data);

  const tenants = await anon.from('tenants').select('*');
  checkBlocked('anon SELECT tenants', tenants.error, tenants.data);

  const onboardingTokens = await anon.from('onboarding_tokens').select('*');
  checkBlocked('anon SELECT onboarding_tokens', onboardingTokens.error, onboardingTokens.data);

  const usageCounters = await anon.from('usage_counters').select('*');
  checkBlocked('anon SELECT usage_counters', usageCounters.error, usageCounters.data);

  const chatMessages = await anon.from('chat_messages').select('*');
  checkBlocked('anon SELECT chat_messages', chatMessages.error, chatMessages.data);

  const matchChunks = await anon.rpc('match_chunks', {
    p_profile_id: '00000000-0000-0000-0000-000000000000',
    p_embedding: new Array(1536).fill(0),
    p_query: 'test',
  });
  checkBlocked('anon RPC match_chunks', matchChunks.error, matchChunks.data as unknown[] | null);

  const publishedProfile = await anon.from('profiles').select('*').eq('username', 'demo');
  checkVisible('anon SELECT published demo profile', publishedProfile.error, publishedProfile.data);

  const unpublished = await anon.from('profiles').select('*').eq('username', 'demo-unpublished');
  checkBlocked('anon SELECT unpublished profile', unpublished.error, unpublished.data);

  if (failures > 0) {
    console.error(`\n${failures} RLS assertion(s) FAILED. Fix before continuing — see conventions.md §Security invariants.`);
    process.exit(1);
  }
  console.log('\nAll RLS assertions passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
