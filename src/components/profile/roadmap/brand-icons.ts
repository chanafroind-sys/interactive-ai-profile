import {
  siAngular,
  siCloudflare,
  siDocker,
  siElasticsearch,
  siFastapi,
  siGit,
  siGithub,
  siGo,
  siGraphql,
  siGrafana,
  siHelm,
  siJavascript,
  siJest,
  siKotlin,
  siKubernetes,
  siLinux,
  siMongodb,
  siMysql,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siPhp,
  siPostgresql,
  siPrometheus,
  siPython,
  siRabbitmq,
  siReact,
  siRedis,
  siRubyonrails,
  siRust,
  siSpring,
  siSupabase,
  siSvelte,
  siSwift,
  siTailwindcss,
  siTerraform,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';
import { getAccessibleAccentPair } from '@/lib/color';

export interface BrandIcon {
  title: string;
  path: string;
  /** Official brand colour, lightened when needed so it stays legible on the dark theme. */
  color: string;
}

interface SimpleIcon {
  title: string;
  path: string;
  hex: string;
}

/**
 * Official brand marks and colours from `simple-icons`. A few brands are
 * near-black (Next.js, GitHub, Rust); `getAccessibleAccentPair(...).dark`
 * lifts those to a readable tint on the dark surface while keeping the hue,
 * so nothing renders as an invisible black glyph.
 */
function toBrand(icon: SimpleIcon): BrandIcon {
  return {
    title: icon.title,
    path: icon.path,
    color: getAccessibleAccentPair(`#${icon.hex}`).dark,
  };
}

const RULES: { icon: SimpleIcon; keywords: string[] }[] = [
  { icon: siNextdotjs, keywords: ['next.js', 'nextjs', 'next'] },
  { icon: siReact, keywords: ['react'] },
  { icon: siTypescript, keywords: ['typescript'] },
  { icon: siJavascript, keywords: ['javascript'] },
  { icon: siNodedotjs, keywords: ['node.js', 'nodejs', 'node', 'express', 'nest'] },
  { icon: siPython, keywords: ['python', 'פייתון'] },
  { icon: siFastapi, keywords: ['fastapi'] },
  { icon: siDocker, keywords: ['docker', 'container', 'קונטיינר'] },
  { icon: siKubernetes, keywords: ['kubernetes', 'k8s'] },
  { icon: siHelm, keywords: ['helm'] },
  { icon: siPostgresql, keywords: ['postgresql', 'postgres', 'pgvector'] },
  { icon: siMysql, keywords: ['mysql'] },
  { icon: siMongodb, keywords: ['mongo'] },
  { icon: siRedis, keywords: ['redis'] },
  { icon: siSupabase, keywords: ['supabase'] },
  { icon: siCloudflare, keywords: ['cloudflare', 'workers'] },
  { icon: siRubyonrails, keywords: ['ruby on rails', 'rails', 'ruby'] },
  { icon: siSpring, keywords: ['spring'] },
  { icon: siGraphql, keywords: ['graphql'] },
  { icon: siTerraform, keywords: ['terraform'] },
  { icon: siGithub, keywords: ['github'] },
  { icon: siGit, keywords: ['git', 'גיט'] },
  { icon: siGo, keywords: ['golang'] },
  { icon: siRust, keywords: ['rust'] },
  { icon: siKotlin, keywords: ['kotlin'] },
  { icon: siSwift, keywords: ['swift'] },
  { icon: siPhp, keywords: ['php'] },
  { icon: siVuedotjs, keywords: ['vue'] },
  { icon: siAngular, keywords: ['angular'] },
  { icon: siSvelte, keywords: ['svelte'] },
  { icon: siTailwindcss, keywords: ['tailwind'] },
  { icon: siJest, keywords: ['jest'] },
  { icon: siGrafana, keywords: ['grafana'] },
  { icon: siPrometheus, keywords: ['prometheus'] },
  { icon: siElasticsearch, keywords: ['elastic'] },
  { icon: siRabbitmq, keywords: ['rabbit'] },
  { icon: siNginx, keywords: ['nginx'] },
  { icon: siLinux, keywords: ['linux'] },
];

/** Longest keyword first, so "next.js" wins over a bare "next". */
const SORTED = RULES.flatMap((rule) =>
  rule.keywords.map((keyword) => ({ keyword: keyword.toLowerCase(), icon: rule.icon }))
).sort((a, b) => b.keyword.length - a.keyword.length);

const cache = new Map<string, BrandIcon | null>();

/** Official brand mark for a skill label, or null when there's no match. */
export function getBrandIcon(label: string): BrandIcon | null {
  const key = label.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const match = SORTED.find((entry) => key.includes(entry.keyword));
  const brand = match ? toBrand(match.icon) : null;
  cache.set(key, brand);
  return brand;
}
