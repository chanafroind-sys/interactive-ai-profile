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
    meta: { url: null, tech: ['Docker', 'Kubernetes', 'Helm'] },
    sort_order: 4,
  },
  {
    id: 'proj_reconciliation_engine',
    kind: 'project',
    title: 'Payments reconciliation engine',
    body: 'Built a reconciliation service that matches ~2M daily transactions against three upstream ledgers, flagging discrepancies within minutes instead of the previous next-day batch job.',
    meta: { url: null, tech: ['Node.js', 'PostgreSQL', 'Redis'] },
    sort_order: 5,
  },
  {
    id: 'proj_feature_flags',
    kind: 'project',
    title: 'Internal feature-flag platform',
    body: 'Designed and built an internal feature-flag and gradual-rollout platform adopted by 30+ services, replacing a spreadsheet-driven config process.',
    meta: { url: null, tech: ['TypeScript', 'Postgres'] },
    sort_order: 6,
  },
  {
    id: 'proj_interactive_profile',
    kind: 'project',
    title: 'Interactive AI profile (this site)',
    body: 'A multi-tenant SaaS that turns a CV into an AI-driven interactive profile page: visitors chat with an agent that selects which timeline entries, cards and tools to reveal, backed by hybrid RAG search over pgvector.',
    meta: { url: null, tech: ['Next.js', 'Cloudflare Workers', 'Supabase', 'pgvector'] },
    sort_order: 7,
  },
  {
    id: 'skill_docker',
    kind: 'skill',
    title: 'Docker',
    body: 'Docker — containerising services and build pipelines, daily use since 2019.',
    meta: {},
    sort_order: 8,
  },
  {
    id: 'skill_k8s',
    kind: 'skill',
    title: 'Kubernetes',
    body: 'Kubernetes — operating and deploying production workloads, including custom controllers and Helm charts.',
    meta: {},
    sort_order: 9,
  },
  {
    id: 'skill_postgres',
    kind: 'skill',
    title: 'PostgreSQL',
    body: 'PostgreSQL — schema design, query tuning, and pgvector for retrieval workloads.',
    meta: {},
    sort_order: 10,
  },
  {
    id: 'skill_typescript',
    kind: 'skill',
    title: 'TypeScript',
    body: 'TypeScript — primary language for backend services and tooling over the last 4 years.',
    meta: {},
    sort_order: 11,
  },
  {
    id: 'skill_python',
    kind: 'skill',
    title: 'Python',
    body: 'Python — FastAPI services and data pipeline scripting.',
    meta: {},
    sort_order: 12,
  },
  {
    id: 'skill_nextjs',
    kind: 'skill',
    title: 'Next.js',
    body: 'Next.js — App Router, server components and edge deployment.',
    meta: {},
    sort_order: 13,
  },
  {
    id: 'skill_aws',
    kind: 'skill',
    title: 'AWS',
    body: 'AWS — EC2, RDS, S3 and IAM for production infrastructure.',
    meta: {},
    sort_order: 14,
  },
  {
    id: 'skill_cicd',
    kind: 'skill',
    title: 'CI/CD',
    body: 'CI/CD — GitHub Actions pipelines for test, build and deploy across a multi-service repo.',
    meta: {},
    sort_order: 15,
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
    id: 'faq_availability',
    kind: 'faq',
    title: 'Are you available for work?',
    body: 'Open to select contract and full-time opportunities; happiest on backend-heavy or infrastructure-adjacent problems.',
    meta: {},
    sort_order: 17,
  },
  {
    id: 'faq_relocation',
    kind: 'faq',
    title: 'Are you open to relocation?',
    body: 'Open to remote roles and occasional travel; prefer not to relocate permanently.',
    meta: {},
    sort_order: 18,
  },
];

const profileJson: ProfileJSON = {
  display_name: 'Demo Profile',
  headline: 'Backend-leaning full-stack engineer',
  avatar_url: null,
  theme: { accent: '#6366f1' },
  entities,
};

async function main() {
  const { data: tenant, error: tenantError } = await client
    .from('tenants')
    .insert({ email: 'demo@example.com', status: 'live', plan: 'lifetime' })
    .select('id')
    .single();
  if (tenantError || !tenant) throw tenantError ?? new Error('tenant insert failed');

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      tenant_id: tenant.id,
      username: 'demo',
      is_published: true,
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

  console.log(`Seeded tenant ${tenant.id}, profile ${profile.id} (/p/demo), ${entities.length} entities.`);
  console.log('chunks table left empty — Task 04 fills it.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
