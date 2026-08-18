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
  /** Optional screenshots/media — when present these take priority over the
   *  GitHub preview. Two or more render as an interactive mini-carousel
   *  nested inside the current slide. */
  imageUrl?: string[];
}

/** Extracts `{owner, repo}` from a `github.com/<owner>/<repo>` URL, or null
 *  for anything else (a different host, a bare `github.com`, a malformed
 *  URL) — every profile that merely happens to link *a* URL still renders
 *  fine as a plain text card, only real repo links get the preview. */
function parseGithubRepo(url: string | null | undefined): { owner: string; repo: string } | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return null;
  const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
  return owner && repo ? { owner, repo: repo.replace(/\.git$/, '') } : null;
}

/** Prev/next image mini-carousel for 2+ screenshots of the *current* slide;
 *  a single image renders without any controls. Distinct from, and nested
 *  inside, the outer project-to-project carousel below. */
function ProjectImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const clamped = Math.min(index, images.length - 1);

  return (
    <div className="relative mb-3 overflow-hidden rounded-lg" style={{ aspectRatio: '16 / 9' }}>
      {/* Tenant-supplied, arbitrary-domain media — same reasoning as the
          avatar image, next/image's remote allowlist can't cover every
          customer's CDN. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[clamped]} alt={`${title} — screenshot ${clamped + 1}`} className="h-full w-full object-cover" />
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="תמונה קודמת"
            onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm backdrop-blur-md"
            style={{ background: 'oklch(0.12 0.02 260 / 0.55)', color: 'var(--cyber-text)' }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="תמונה הבאה"
            onClick={() => setIndex((i) => (i + 1) % images.length)}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm backdrop-blur-md"
            style={{ background: 'oklch(0.12 0.02 260 / 0.55)', color: 'var(--cyber-text)' }}
          >
            ›
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`תמונה ${i + 1}`}
                onClick={() => setIndex(i)}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i === clamped ? 'var(--neon-purple)' : 'oklch(1 0 0 / 0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** GitHub's own auto-generated repo preview image — no API key, no README
 *  parsing, works for any public repo. Hidden entirely (falling back to a
 *  plain text card) if the repo doesn't resolve. */
function GithubPreview({ owner, repo, title }: { owner: string; repo: string; title: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative mb-3 overflow-hidden rounded-lg" style={{ aspectRatio: '1200 / 630' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://opengraph.githubassets.com/1/${owner}/${repo}`}
        alt={`${title} — GitHub preview`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
      <span
        className="absolute bottom-1.5 right-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
        style={{ background: 'oklch(0.12 0.02 260 / 0.6)', color: 'var(--cyber-text)' }}
      >
        GitHub · {owner}/{repo}
      </span>
    </div>
  );
}

/** Renders the current slide's project — adaptively: media screenshots take
 *  priority when present, then a live GitHub repo preview, then a clean
 *  text-only fallback (title, timeframe, description) that every project
 *  gets regardless of which preview it also has. */
function ProjectSlide({ entity }: { entity: Entity }) {
  const { revealedLinks } = useProfile();
  const meta = entity.meta as ProjectMeta;
  const tech = Array.isArray(meta.tech) ? meta.tech : [];
  const showLink = revealedLinks.has(entity.id) && !!meta.url;
  const images = Array.isArray(meta.imageUrl) ? meta.imageUrl.filter(Boolean) : [];
  const githubRepo = images.length === 0 ? parseGithubRepo(meta.url) : null;

  return (
    <article
      data-entity-id={entity.id}
      aria-roledescription="slide"
      aria-label={entity.title}
      className="cyber-panel cyber-panel-purple motion-safe:animate-card-in rounded-xl p-4"
    >
      {images.length > 0 && <ProjectImageCarousel images={images} title={entity.title} />}
      {images.length === 0 && githubRepo && <GithubPreview owner={githubRepo.owner} repo={githubRepo.repo} title={entity.title} />}
      <h3 className="font-semibold" style={{ color: 'var(--cyber-text)' }}>
        {entity.title}
      </h3>
      <p className="mt-1 line-clamp-4 text-sm text-cyber-muted">{entity.body}</p>
      {tech.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {tech.map((t) => (
            <li
              key={t}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                border: '1px solid color-mix(in oklch, var(--neon-purple) 38%, transparent)',
                background: 'color-mix(in oklch, var(--neon-purple) 12%, transparent)',
                color: 'var(--cyber-text)',
              }}
            >
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
          {githubRepo ? 'Repo ↗' : 'View project ↗'}
        </a>
      )}
    </article>
  );
}

export function CardPanel() {
  const { profile, revealedCards, resetSignal } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const skippedFirstRender = useRef(false);
  const prevVisibleLength = useRef(0);

  const projects = profile.entities.filter((e) => e.kind === 'project');
  const visible = projects.filter((p) => revealedCards.includes(p.id));
  const clampedIndex = visible.length === 0 ? 0 : Math.min(slideIndex, visible.length - 1);

  // Auto-expand the mobile sheet, and jump the carousel to whichever project
  // just appeared, whenever the AI (or the debug panel) reveals new cards —
  // `show_cards` reveals its IDs on a 120ms stagger, so each newly-revealed
  // project becomes visible in turn instead of the panel just growing a
  // list. Kept collapsed to a peek handle at first load.
  useEffect(() => {
    if (!skippedFirstRender.current) {
      skippedFirstRender.current = true;
      prevVisibleLength.current = visible.length;
      return;
    }
    if (visible.length > prevVisibleLength.current) {
      setSlideIndex(visible.length - 1);
      setMobileOpen(true);
    }
    prevVisibleLength.current = visible.length;
  }, [visible.length]);

  // reset_view returns the carousel to its first slide too.
  useEffect(() => {
    setSlideIndex(0);
  }, [resetSignal]);

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
  const current = visible[clampedIndex];

  return (
    <aside
      aria-live="polite"
      aria-label="Featured projects"
      style={{ '--panel-y': panelY } as React.CSSProperties}
      className="cyber-panel mobile-sheet fixed inset-x-0 bottom-0 z-30 max-h-[60vh] overflow-y-auto rounded-t-2xl p-4 transition-transform duration-300 md:static md:z-auto md:max-h-none md:rounded-2xl md:p-5"
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
      <h2 className="cyber-heading mb-1 hidden text-xl font-semibold md:block">Projects</h2>
      <div className="cyber-rule mb-4 hidden md:block" />

      {!current ? (
        <p className="text-sm text-cyber-muted">Nothing revealed yet — ask the assistant about a project.</p>
      ) : (
        <div role="region" aria-roledescription="carousel" aria-label="Featured project carousel">
          <ProjectSlide key={current.id} entity={current} />

          {visible.length > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="פרויקט קודם"
                onClick={() => setSlideIndex((i) => (i - 1 + visible.length) % visible.length)}
                className="cyber-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              >
                ‹
              </button>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="בחירת פרויקט">
                {visible.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={i === clampedIndex}
                    aria-label={`מעבר לפרויקט ${p.title}`}
                    onClick={() => setSlideIndex(i)}
                    className="h-2 w-2 shrink-0 rounded-full transition-all"
                    style={{
                      background: i === clampedIndex ? 'var(--neon-purple)' : 'oklch(1 0 0 / 0.25)',
                      boxShadow: i === clampedIndex ? '0 0 8px var(--neon-purple)' : 'none',
                      transform: i === clampedIndex ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="פרויקט הבא"
                onClick={() => setSlideIndex((i) => (i + 1) % visible.length)}
                className="cyber-chip flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
