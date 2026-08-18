import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';
import type { Entity, ProfileJSON } from '../src/types/profile';

const client = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const entities: Entity[] = [
  {
    id: 'summary',
    kind: 'summary',
    title: 'Summary',
    body: 'Backend-leaning full-stack engineer with 7 years building and operating production systems, most recently focused on distributed data pipelines and developer tooling. Comfortable owning a service end to end: design, implementation, on-call, and the migration off it years later. Enjoys turning ambiguous problems into small, well-tested pieces.',
    meta: {},
    sort_order: 0,
  },
  {
    id: 'exp_acme_2021',
    kind: 'experience',
    title: 'Senior Backend Engineer, Acme Corp',
    body: 'Senior Backend Engineer at Acme Corp, Jan 2021 – Mar 2024. Led the migration of a Java monolith to containerised Python services on Kubernetes. Designed the rollout strategy, cut deploy time from 40 minutes to 4, and mentored two mid-level engineers through the transition.',
    meta: { company: 'Acme Corp', start: '2021-01', end: '2024-03', tech: ['Docker', 'Kubernetes', 'PostgreSQL', 'FastAPI'] },
    sort_order: 1,
  },
  {
    id: 'exp_globex_2018',
    kind: 'experience',
    title: 'Backend Engineer, Globex',
    body: 'Backend Engineer at Globex, Jun 2018 – Dec 2020. Built the payments reconciliation service handling ~2M transactions/day, and the internal feature-flag platform used across 30+ services.',
    meta: { company: 'Globex', start: '2018-06', end: '2020-12', tech: ['Node.js', 'Postgres', 'Redis'] },
    sort_order: 2,
  },
  {
    id: 'exp_initech_2016',
    kind: 'experience',
    title: 'Software Engineer, Initech',
    body: 'Software Engineer at Initech, Jul 2016 – May 2018. First engineering role after graduating; worked on the internal admin dashboard and wrote the team\'s first integration test suite.',
    meta: { company: 'Initech', start: '2016-07', end: '2018-05', tech: ['Ruby on Rails', 'MySQL'] },
    sort_order: 3,
  },
  {
    id: 'proj_k8s_migration',
    kind: 'project',
    title: 'Monolith → K8s migration',
    body: 'Led the design and rollout of migrating a legacy Java monolith to containerised microservices on Kubernetes, including a strangler-fig cutover plan that kept the system live throughout. Deploy time dropped from 40 minutes to 4.',
    // Dated to the Acme role this project was done in — the roadmap orders
    // stations chronologically, and undated projects can only be guessed at.
    meta: { url: null, start: '2021-04', end: '2023-02', tech: ['Docker', 'Kubernetes', 'Helm'] },
    sort_order: 4,
  },
  {
    id: 'proj_reconciliation_engine',
    kind: 'project',
    title: 'Payments reconciliation engine',
    body: 'Built a reconciliation service that matches ~2M daily transactions against three upstream ledgers, flagging discrepancies within minutes instead of the previous next-day batch job.',
    // Exercises the image-carousel path — no GitHub link, just screenshots.
    meta: {
      url: null,
      start: '2018-09',
      end: '2019-11',
      tech: ['Node.js', 'PostgreSQL', 'Redis'],
      imageUrl: [
        'https://picsum.photos/seed/reconciliation-dashboard/800/450',
        'https://picsum.photos/seed/reconciliation-alerts/800/450',
        'https://picsum.photos/seed/reconciliation-ledger/800/450',
      ],
    },
    sort_order: 5,
  },
  {
    id: 'proj_feature_flags',
    kind: 'project',
    title: 'Internal feature-flag platform',
    body: 'Designed and built an internal feature-flag and gradual-rollout platform adopted by 30+ services, replacing a spreadsheet-driven config process.',
    meta: { url: null, start: '2020-01', end: '2020-11', tech: ['TypeScript', 'Postgres'] },
    sort_order: 6,
  },
  {
    id: 'proj_interactive_profile',
    kind: 'project',
    title: 'Interactive AI profile (this site)',
    body: 'A multi-tenant SaaS that turns a CV into an AI-driven interactive profile page: visitors chat with an agent that selects which timeline entries, cards and tools to reveal, backed by hybrid RAG search over pgvector.',
    // A real repo link, so `open_link` has something to reveal *and* the
    // GitHub-preview path in CardPanel has a real repo to fetch a preview for.
    meta: {
      url: 'https://github.com/vercel/next.js',
      start: '2026-06',
      end: '2026-08',
      tech: ['Next.js', 'Cloudflare Workers', 'Supabase', 'pgvector'],
    },
    sort_order: 7,
  },
  {
    id: 'skill_docker',
    kind: 'skill',
    title: 'Docker',
    body: 'Docker — containerising services and build pipelines, daily use since 2019.',
    meta: { category: 'infra', icon: 'docker' },
    sort_order: 8,
  },
  {
    id: 'skill_k8s',
    kind: 'skill',
    title: 'Kubernetes',
    body: 'Kubernetes — operating and deploying production workloads, including custom controllers and Helm charts.',
    meta: { category: 'infra', icon: 'kubernetes' },
    sort_order: 9,
  },
  {
    id: 'skill_postgres',
    kind: 'skill',
    title: 'PostgreSQL',
    body: 'PostgreSQL — schema design, query tuning, and pgvector for retrieval workloads.',
    meta: { category: 'datastore', icon: 'postgresql' },
    sort_order: 10,
  },
  {
    id: 'skill_typescript',
    kind: 'skill',
    title: 'TypeScript',
    body: 'TypeScript — primary language for backend services and tooling over the last 4 years.',
    meta: { category: 'language', icon: 'typescript' },
    sort_order: 11,
  },
  {
    id: 'skill_python',
    kind: 'skill',
    title: 'Python',
    body: 'Python — FastAPI services and data pipeline scripting.',
    meta: { category: 'language', icon: 'python' },
    sort_order: 12,
  },
  {
    id: 'skill_nextjs',
    kind: 'skill',
    title: 'Next.js',
    body: 'Next.js — App Router, server components and edge deployment.',
    meta: { category: 'framework', icon: 'nextdotjs' },
    sort_order: 13,
  },
  {
    id: 'skill_aws',
    kind: 'skill',
    title: 'AWS',
    body: 'AWS — EC2, RDS, S3 and IAM for production infrastructure.',
    // No simple-icons entry for AWS (trademark policy) — exercises the lettered fallback tile.
    meta: { category: 'infra' },
    sort_order: 14,
  },
  {
    id: 'skill_cicd',
    kind: 'skill',
    title: 'CI/CD',
    body: 'CI/CD — GitHub Actions pipelines for test, build and deploy across a multi-service repo.',
    // Deliberately iconless — also exercises the lettered fallback tile.
    meta: { category: 'tooling' },
    sort_order: 15,
  },
  {
    id: 'skill_redis',
    kind: 'skill',
    title: 'Redis',
    body: 'Redis — caching, rate limiting and pub/sub for the reconciliation engine and feature-flag platform.',
    meta: { category: 'datastore', icon: 'redis' },
    sort_order: 16,
  },
  {
    id: 'skill_react',
    kind: 'skill',
    title: 'React',
    body: 'React — component-level frontend work on top of the backend services, including this profile’s own UI.',
    meta: { category: 'framework', icon: 'react' },
    sort_order: 17,
  },
  {
    id: 'edu_technion_2016',
    kind: 'education',
    title: 'B.Sc. Computer Science, Technion',
    body: 'B.Sc. Computer Science, Technion – Israel Institute of Technology, graduated 2016.',
    meta: { institution: 'Technion', end: '2016' },
    sort_order: 16,
  },
  {
    id: 'snippet_dockerfile_multistage',
    kind: 'snippet',
    title: 'Multi-stage Dockerfile',
    body: `FROM node:20-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/server.js"]`,
    meta: { lang: 'dockerfile' },
    sort_order: 17,
  },
  {
    id: 'award_deploy_time_10x',
    kind: 'award',
    title: '10x faster deploys',
    body: 'Cut deployment time from 40 minutes to 4 by redesigning the CI/CD pipeline and container build-cache strategy during the Acme monolith-to-Kubernetes migration.',
    meta: { value: 10, suffix: 'x faster', label: 'Deploy time' },
    sort_order: 18,
  },
  {
    id: 'award_transactions_2m',
    kind: 'award',
    title: '2M transactions/day reconciled',
    body: 'Built a reconciliation engine at Globex that matches roughly two million payment transactions per day against three upstream ledgers.',
    meta: { value: 2, suffix: 'M/day', label: 'Transactions reconciled' },
    sort_order: 19,
  },
  {
    id: 'faq_availability',
    kind: 'faq',
    title: 'Are you available for work?',
    body: 'Open to select contract and full-time opportunities; happiest on backend-heavy or infrastructure-adjacent problems.',
    meta: {},
    sort_order: 20,
  },
  {
    id: 'faq_relocation',
    kind: 'faq',
    title: 'Are you open to relocation?',
    body: 'Open to remote roles and occasional travel; prefer not to relocate permanently.',
    meta: {},
    sort_order: 21,
  },
];

const profileJson: ProfileJSON = {
  display_name: 'Demo Profile',
  headline: 'Backend-leaning full-stack engineer',
  avatar_url: null,
  theme: { accent: '#6366f1' },
  entities,
};

// A second, unpublished profile exists purely so verify-rls.ts has a real
// row to assert against for the "unpublished profiles are never visible to
// anon" case — testing that against a username with no matching row at all
// proves nothing, since an absent row and an RLS-blocked row look identical
// from the client's side.
const unpublishedEntities: Entity[] = [
  {
    id: 'summary',
    kind: 'summary',
    title: 'Summary',
    body: 'Draft profile, not yet published. Used only to test that unpublished profiles stay invisible to the anon key.',
    meta: {},
    sort_order: 0,
  },
];

const unpublishedProfileJson: ProfileJSON = {
  display_name: 'Draft Profile',
  headline: 'Unpublished — RLS negative-test fixture',
  avatar_url: null,
  theme: { accent: '#6366f1' },
  entities: unpublishedEntities,
};

interface SeedProfile {
  tenantEmail: string;
  username: string;
  isPublished: boolean;
  entities: Entity[];
  profileJson: ProfileJSON;
}

const seedProfiles: SeedProfile[] = [
  { tenantEmail: 'demo@example.com', username: 'demo', isPublished: true, entities, profileJson },
  {
    tenantEmail: 'demo-unpublished@example.com',
    username: 'demo-unpublished',
    isPublished: false,
    entities: unpublishedEntities,
    profileJson: unpublishedProfileJson,
  },
];

async function seedProfile({ tenantEmail, username, isPublished, entities, profileJson }: SeedProfile) {
  const { data: tenant, error: tenantError } = await client
    .from('tenants')
    .insert({ email: tenantEmail, status: 'live', plan: 'lifetime' })
    .select('id')
    .single();
  if (tenantError || !tenant) throw tenantError ?? new Error('tenant insert failed');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      tenant_id: tenant.id,
      username,
      is_published: isPublished,
      display_name: profileJson.display_name,
      headline: profileJson.headline,
      avatar_url: profileJson.avatar_url,
      theme: profileJson.theme,
      profile_json: profileJson as unknown as Database['public']['Tables']['profiles']['Insert']['profile_json'],
    })
    .select('id')
    .single();
  if (profileError || !profile) throw profileError ?? new Error('profile insert failed');

  const { error: entitiesError } = await client.from('entities').insert(
    entities.map((e) => ({
      id: e.id,
      profile_id: profile.id,
      kind: e.kind,
      title: e.title,
      body: e.body,
      meta: e.meta as Database['public']['Tables']['entities']['Insert']['meta'],
      sort_order: e.sort_order,
    }))
  );
  if (entitiesError) throw entitiesError;

  console.log(`Seeded tenant ${tenant.id}, profile ${profile.id} (/p/${username}, published=${isPublished}), ${entities.length} entities.`);
}

async function main() {
  // Idempotent re-run: drop any prior seed data for these fixtures first.
  // Tenant deletion cascades to profiles, which cascades to entities.
  const emails = seedProfiles.map((p) => p.tenantEmail);
  const { error: cleanupError } = await client.from('tenants').delete().in('email', emails);
  if (cleanupError) throw cleanupError;

  for (const profile of seedProfiles) {
    await seedProfile(profile);
  }

  console.log('chunks table left empty — Task 04 fills it.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
