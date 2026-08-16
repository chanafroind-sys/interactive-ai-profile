'use client';

import { useEffect, useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';
import type { Entity } from '@/types/profile';

interface DateMeta {
  start?: string;
  end?: string;
  company?: string;
  institution?: string;
  tech?: string[];
}

function sortKey(entity: Entity): string {
  const meta = entity.meta as DateMeta;
  return meta.start ?? meta.end ?? '0000-00';
}

function formatMonth(value: string): string {
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  // Pinned to en-US regardless of visitor locale — profile content itself
  // (fixture and tenant-authored text alike) is always English.
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function formatRange(meta: DateMeta): string {
  if (meta.start && meta.end) return `${formatMonth(meta.start)} – ${formatMonth(meta.end)}`;
  if (meta.start) return `${formatMonth(meta.start)} – Present`;
  if (meta.end) return formatMonth(meta.end);
  return '';
}

function TimelineNode({ entity, index }: { entity: Entity; index: number }) {
  const { focusedTimeline, registerNode, prefersReducedMotion } = useProfile();
  const [inView, setInView] = useState(prefersReducedMotion);
  const elRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setInView(true);
      return;
    }
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const isFocusMode = focusedTimeline.size > 0;
  const isFocused = focusedTimeline.has(entity.id);
  const state = !isFocusMode ? 'default' : isFocused ? 'focused' : 'dimmed';
  const meta = entity.meta as DateMeta;
  const subtitle = meta.company ?? meta.institution ?? '';
  const range = formatRange(meta);
  const tech = Array.isArray(meta.tech) ? meta.tech : [];

  // A single opacity utility per render — mixing e.g. `opacity-40` (dimmed)
  // with `opacity-100` (scroll reveal) leaves the winner up to Tailwind's
  // stylesheet order, not which one we intended.
  const revealed = prefersReducedMotion || inView;
  const opacityClass = !revealed ? 'opacity-0' : state === 'dimmed' ? 'opacity-40' : 'opacity-100';

  return (
    <li
      ref={(el) => {
        elRef.current = el;
        registerNode(entity.id, el);
      }}
      data-entity-id={entity.id}
      data-state={state}
      tabIndex={-1}
      className={[
        'relative w-full scroll-mt-24 rounded-xl border bg-background p-4 transition-[opacity,transform,box-shadow] duration-500 md:w-[calc(50%_-_1.75rem)]',
        index % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto',
        state === 'focused' ? 'motion-safe:animate-pulse-once border-[var(--accent)] ring-2 ring-[var(--accent)]' : 'border-foreground/10',
        state === 'dimmed' ? 'grayscale' : '',
        opacityClass,
        revealed ? 'translate-y-0' : 'translate-y-4',
      ].join(' ')}
    >
      {range && <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{range}</p>}
      <h3 className="font-semibold">{entity.title}</h3>
      {subtitle && <p className="text-sm text-foreground/70">{subtitle}</p>}
      <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{entity.body}</p>
      {tech.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {tech.map((t) => (
            <li key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs">
              {t}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Timeline() {
  const { profile } = useProfile();
  const entries = profile.entities
    .filter((e) => e.kind === 'experience' || e.kind === 'education')
    .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="timeline-heading" className="py-8">
      <h2 id="timeline-heading" className="mb-6 text-xl font-semibold">
        Experience
      </h2>
      <ol className="relative flex flex-col gap-6 md:before:absolute md:before:left-1/2 md:before:h-full md:before:w-px md:before:-translate-x-1/2 md:before:bg-foreground/10">
        {entries.map((entity, i) => (
          <TimelineNode key={entity.id} entity={entity} index={i} />
        ))}
      </ol>
    </section>
  );
}
