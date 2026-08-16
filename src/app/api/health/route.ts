import { db } from '@/lib/db';

export async function GET() {
  const { error } = await db().from('profiles').select('id').limit(1);
  return Response.json({ ok: !error, ts: Date.now() }, { status: error ? 503 : 200 });
}
