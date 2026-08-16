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
