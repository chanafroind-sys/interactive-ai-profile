'use client';

import { siDocker, siKubernetes, siNextdotjs, siPostgresql, siPython, siTypescript } from 'simple-icons';
import { useProfile } from './ProfileProvider';
import type { Entity } from '@/types/profile';

// Vendor logos are drawn from the icon's own path data, never hotlinked.
const ICONS: Record<string, { path: string }> = {
  docker: siDocker,
  kubernetes: siKubernetes,
  postgresql: siPostgresql,
  typescript: siTypescript,
  python: siPython,
  nextdotjs: siNextdotjs,
};

const CATEGORY_LABELS: Record<string, string> = {
  language: 'Languages',
  framework: 'Frameworks',
  datastore: 'Datastores',
  infra: 'Infrastructure',
  tooling: 'Tooling',
};
const CATEGORY_ORDER = ['language', 'framework', 'datastore', 'infra', 'tooling'];

interface SkillMeta {
  category?: string;
  icon?: string;
}

function ToolIcon({ slug, title }: { slug?: string; title: string }) {
  const icon = slug ? ICONS[slug] : undefined;
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
        <path d={icon.path} />
      </svg>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-foreground/10 text-[10px] font-bold leading-none"
    >
      {title.charAt(0).toUpperCase()}
    </span>
  );
}

function Chip({ entity }: { entity: Entity }) {
  const { spotlitTools } = useProfile();
  const isSpotlightMode = spotlitTools.size > 0;
  const isSpotlit = spotlitTools.has(entity.id);
  const state = !isSpotlightMode ? 'default' : isSpotlit ? 'spotlit' : 'dimmed';
  const meta = entity.meta as SkillMeta;

  return (
    <li
      data-entity-id={entity.id}
      data-state={state}
      className={[
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-300',
        state === 'spotlit'
          ? 'motion-safe:scale-105 border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
          : 'border-foreground/15',
        state === 'dimmed' ? 'opacity-40' : '',
      ].join(' ')}
    >
      <ToolIcon slug={meta.icon} title={entity.title} />
      {entity.title}
    </li>
  );
}

export function ToolGrid() {
  const { profile } = useProfile();
  const skills = profile.entities.filter((e) => e.kind === 'skill');
  if (skills.length === 0) return null;

  const groups = new Map<string, Entity[]>();
  for (const skill of skills) {
    const category = (skill.meta as SkillMeta).category ?? 'tooling';
    const bucket = groups.get(category) ?? [];
    bucket.push(skill);
    groups.set(category, bucket);
  }
  const orderedCategories = [...CATEGORY_ORDER, ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c))];

  return (
    <section aria-labelledby="tools-heading" className="py-8">
      <h2 id="tools-heading" className="mb-6 text-xl font-semibold">
        Tech stack
      </h2>
      <div className="flex flex-col gap-4">
        {orderedCategories.map((category) => {
          const items = groups.get(category);
          if (!items || items.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {CATEGORY_LABELS[category] ?? category}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {items.map((entity) => (
                  <Chip key={entity.id} entity={entity} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
