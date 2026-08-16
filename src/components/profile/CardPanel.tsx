'use client';

import { useEffect, useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';
import type { Entity } from '@/types/profile';

// Fixed clearance above the chat bar's own fixed bottom-0 strip (~4.65rem
// tall) — a little extra so the two independently-toggled bottom sheets
// never sit on top of each other, in either state.
const CHAT_BAR_CLEARANCE = '5rem';
const PEEK_HEIGHT = '3.25rem';

interface ProjectMeta {
  tech?: string[];
  url?: string | null;
}

function ProjectCard({ entity }: { entity: Entity }) {
  const { revealedLinks } = useProfile();
  const meta = entity.meta as ProjectMeta;
  const tech = Array.isArray(meta.tech) ? meta.tech : [];
  const showLink = revealedLinks.has(entity.id) && !!meta.url;

  return (
    <li
      data-entity-id={entity.id}
      className="motion-safe:animate-card-in rounded-xl border border-foreground/10 p-4 shadow-sm"
    >
      <h3 className="font-semibold">{entity.title}</h3>
      <p className="mt-1 text-sm text-foreground/80">{entity.body}</p>
      {tech.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {tech.map((t) => (
            <li key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs">
              {t}
            </li>
          ))}
        </ul>
      )}
      {showLink && meta.url && (
        <a
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          View project ↗
        </a>
      )}
    </li>
  );
}

export function CardPanel() {
  const { profile, revealedCards } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const skippedFirstRender = useRef(false);

  const projects = profile.entities.filter((e) => e.kind === 'project');
  const visible = projects.filter((p) => revealedCards.includes(p.id));

  // Auto-expand the mobile sheet whenever the AI (or the debug panel) reveals
  // new cards, but keep it collapsed to a peek handle at first load.
  useEffect(() => {
    if (!skippedFirstRender.current) {
      skippedFirstRender.current = true;
      return;
    }
    setMobileOpen(true);
  }, [revealedCards]);

  if (projects.length === 0) return null;

  // Set directly as a literal inline --panel-y value rather than swapping
  // Tailwind `translate-y-[...]` utility classes: Tailwind v4 composes those
  // through a shared `--tw-translate-y` custom property, and because the
  // *declared* value of `translate`/`transform` ends up textually identical
  // between the open and collapsed utility rules, `transition-transform`
  // can fail to notice it changed and gets stuck on the old resolved
  // position. A literal string that actually differs between states
  // sidesteps that. The md+ override lives in globals.css as plain CSS
  // (`.mobile-sheet` + a media query), not a JS viewport check, so there's
  // no hydration-timing race on first paint.
  const panelY = mobileOpen ? `-${CHAT_BAR_CLEARANCE}` : `calc(100% - ${PEEK_HEIGHT} - ${CHAT_BAR_CLEARANCE})`;

  return (
    <aside
      aria-live="polite"
      aria-label="Featured projects"
      style={{ '--panel-y': panelY } as React.CSSProperties}
      className="mobile-sheet fixed inset-x-0 bottom-0 z-30 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-foreground/10 bg-background p-4 shadow-2xl transition-transform duration-300 md:static md:z-auto md:max-h-none md:rounded-2xl md:border md:p-5 md:shadow-none"
    >
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="mb-3 flex w-full items-center justify-between md:hidden"
      >
        <span className="text-xl font-semibold">Projects</span>
        <span aria-hidden="true" className="text-foreground/50">
          {mobileOpen ? '▾' : '▴'}
        </span>
      </button>
      <h2 className="mb-3 hidden text-xl font-semibold md:block">Projects</h2>
      {visible.length === 0 ? (
        <p className="text-sm text-foreground/60">Nothing revealed yet — ask the assistant about a project.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((entity) => (
            <ProjectCard key={entity.id} entity={entity} />
          ))}
        </ul>
      )}
    </aside>
  );
}
