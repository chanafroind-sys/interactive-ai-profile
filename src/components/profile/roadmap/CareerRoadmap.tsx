'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { useProfile } from '../ProfileProvider';
import { isMuted, playBlip, playFanfare, setMuted } from '@/lib/audio';
import { buildRoadmapEntries } from './build-roadmap-entries';
import { computeVerticalRoadmapLayout, NODE_SCALE, RESERVED_WIDTH } from './roadmap-layout';
import { VerticalRail } from './VerticalRail';
import { RoadmapNode } from './RoadmapNode';
import { SkillBubbles } from './SkillBubbles';
import { DetailCard, DETAIL_CARD_WIDTH } from './DetailCard';
import { TimelineAxis } from './TimelineAxis';
import { TourMarker, CelebrationBurst } from './TourVisuals';
import type { RoadmapKind } from './roadmap-types';

interface CareerRoadmapProps {
  title?: string;
}

const LABEL_WIDTH = 138;
/** Fixed, global anti-collision rule — not per-station like the old
 *  alternating horizontal layout: every station's bubbles fan toward the
 *  rail's outer (left) side, and the label + detail card always sit on the
 *  inner (right, content-facing) side. Because it's the same rule for every
 *  station rather than something computed per-station, bubbles and card can
 *  never end up on the same side by construction. Kept as tight as the
 *  label width allows — every extra pixel here is a pixel the whole page
 *  layout has to reserve just for this column. */
const CARD_CLEARANCE = 215;
const CELEBRATE_MS = 3200;

export function CareerRoadmap({ title = 'מפת דרכים מקצועית אינטראקטיבית' }: CareerRoadmapProps) {
  const { profile, focusedTimeline, aiRevealedCards, resetSignal, registerNode } = useProfile();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [hoveredKind, setHoveredKind] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [cardNudge, setCardNudge] = useState({ dx: 0, dy: 0 });
  const [stationAnchor, setStationAnchor] = useState<{ x: number; y: number } | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const entries = useMemo(() => buildRoadmapEntries(profile.entities), [profile.entities]);
  const layout = useMemo(() => computeVerticalRoadmapLayout(entries), [entries]);
  const lastEntryId = entries[entries.length - 1]?.id;

  const scrollStationIntoView = (id: string) => {
    stationRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // The single source of truth for "which station is current": whichever
  // station's centre is nearest the viewport's vertical centre, tracked via
  // IntersectionObserver rather than a scroll-position calculation, so it
  // keeps working correctly no matter how tall the surrounding page content
  // is. Scrolling by hand, clicking a station (which just calls
  // scrollIntoView), and the AI's focus_timeline action (same
  // scrollIntoView, wired in ProfileProvider) all funnel through this one
  // mechanism — there's no separate "AI-focused" vs "scroll-focused" state
  // to keep in sync.
  useEffect(() => {
    if (entries.length === 0) return;
    const distanceFromCenter = new Map<string, number>();
    const observer = new IntersectionObserver(
      (observed) => {
        for (const obs of observed) {
          const id = (obs.target as HTMLElement).dataset.stationId;
          if (!id) continue;
          if (obs.isIntersecting) {
            const rect = obs.boundingClientRect;
            distanceFromCenter.set(id, Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2));
          } else {
            distanceFromCenter.delete(id);
          }
        }
        if (distanceFromCenter.size === 0) {
          setActiveId(null);
          return;
        }
        let bestId: string | null = null;
        let bestDist = Infinity;
        for (const [id, dist] of distanceFromCenter) {
          if (dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
        }
        setActiveId(bestId);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    for (const el of stationRefs.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [entries.length]);

  // Continuous scroll-linked marker position — independent of the discrete
  // "active station" above, purely visual: it travels smoothly along the
  // rail in step with how far the user has scrolled through the stations,
  // rather than snapping station to station.
  useEffect(() => {
    if (entries.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const path = pathRef.current;
      const marker = markerRef.current;
      const firstEl = stationRefs.current.get(entries[0]!.id);
      const lastEl = stationRefs.current.get(entries[entries.length - 1]!.id);
      if (!path || !marker || !firstEl || !lastEl) return;
      const firstRect = firstEl.getBoundingClientRect();
      const lastRect = lastEl.getBoundingClientRect();
      const firstY = firstRect.top + firstRect.height / 2;
      const lastY = lastRect.top + lastRect.height / 2;
      const span = lastY - firstY;
      const fraction = span <= 0 ? 0 : Math.min(1, Math.max(0, (window.innerHeight / 2 - firstY) / span));
      const total = path.getTotalLength();
      const point = path.getPointAtLength(fraction * total);
      marker.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [entries]);

  useEffect(() => {
    if (!activeId || activeId !== lastEntryId) return;
    playFanfare();
    setCelebrated(true);
    const t = setTimeout(() => setCelebrated(false), CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [activeId, lastEntryId]);

  // reset_view clears this component's own local interaction state too.
  useEffect(() => {
    setHoveredStationId(null);
    setHoveredKind(null);
    setDismissedId(null);
  }, [resetSignal]);

  const activeIndex = activeId ? entries.findIndex((e) => e.id === activeId) : -1;
  const activeEntry = activeIndex >= 0 ? entries[activeIndex] : undefined;
  const activePoint = activeIndex >= 0 ? layout.points[activeIndex] : undefined;
  const isCardOpen = !!activeId && activeId !== dismissedId;

  const anchor = stationAnchor ?? activePoint;
  const cardBox = activePoint && anchor ? { left: anchor.x + CARD_CLEARANCE, top: anchor.y - 90 } : null;

  // Measure where the active station actually renders on screen — its own
  // scroll position, not a precomputed layout value — so the card tracks it
  // exactly regardless of where in the page the roadmap sits.
  useLayoutEffect(() => {
    if (!activeId) {
      setStationAnchor(null);
      return;
    }
    const stationEl = stationRefs.current.get(activeId);
    const sceneEl = sceneRef.current;
    if (!stationEl || !sceneEl) return;
    const sRect = stationEl.getBoundingClientRect();
    const cRect = sceneEl.getBoundingClientRect();
    setStationAnchor({
      x: sRect.left + sRect.width / 2 - cRect.left,
      y: sRect.top + sRect.height / 2 - cRect.top,
    });
  }, [activeId]);

  // Final safety net: pull the card back inside the real, current viewport.
  // Can legitimately run a second time for the same activeId once
  // `stationAnchor` resolves — `el.getBoundingClientRect()` at that point
  // already reflects whatever nudge the previous pass applied, so it has to
  // be backed out first or a second pass under-corrects by exactly the
  // first pass's offset.
  useLayoutEffect(() => {
    if (!activeId || !isCardOpen) {
      setCardNudge({ dx: 0, dy: 0 });
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const baseLeft = rect.left - cardNudge.dx;
    const baseTop = rect.top - cardNudge.dy;
    const baseRight = rect.right - cardNudge.dx;
    const baseBottom = rect.bottom - cardNudge.dy;
    const margin = 12;
    let dx = 0;
    let dy = 0;
    if (baseLeft < margin) dx = margin - baseLeft;
    else if (baseRight > window.innerWidth - margin) dx = window.innerWidth - margin - baseRight;
    if (baseTop < margin) dy = margin - baseTop;
    else if (baseBottom > window.innerHeight - margin) dy = window.innerHeight - margin - baseBottom;
    if (dx !== cardNudge.dx || dy !== cardNudge.dy) setCardNudge({ dx, dy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, isCardOpen, cardBox?.left, cardBox?.top]);

  if (entries.length === 0) return null;

  return (
    <MotionConfig reducedMotion="user">
      {/* Reserved wider than the visual rail/label panel on purpose — the
          extra width to the right is empty space the detail card opens
          into, so it never has to spill onto the main content column
          beside it (which sits at reservedWidth + the page's own gap). */}
      <div className="relative" aria-label={title} style={{ width: RESERVED_WIDTH, maxWidth: '100%' }}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="cyber-heading text-base font-bold leading-tight" dir="auto">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => {
              const next = !isMuted();
              setMuted(next);
              setMutedState(next);
            }}
            aria-pressed={muted}
            aria-label={muted ? 'הפעל צליל' : 'השתק'}
            className="shrink-0 rounded-full border px-2.5 py-1.5 text-xs backdrop-blur-md transition-colors"
            style={{
              borderColor: 'color-mix(in oklch, var(--neon-cyan) 40%, transparent)',
              background: 'oklch(0.16 0.04 255 / 0.6)',
              color: 'var(--cyber-muted)',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <Legend hoveredKind={hoveredKind} onHoverKind={setHoveredKind} />

        <div
          ref={sceneRef}
          className="cyber-panel relative mt-4 rounded-2xl"
          style={{ width: layout.width, height: layout.height, maxWidth: '100%' }}
        >
          <TimelineAxis
            entries={entries}
            points={layout.points}
            height={layout.height}
            hoveredId={hoveredStationId}
            hoveredKind={hoveredKind}
            onHoverEntry={setHoveredStationId}
            onSelectEntry={scrollStationIntoView}
          />

          <VerticalRail ref={pathRef} layout={layout} entries={entries} />

          <TourMarker ref={markerRef} visible />

          {layout.points.map((pos, i) => {
            const entry = entries[i]!;
            const isActive = activeId === entry.id;
            const isAiFocused =
              !!entry.entityId && (focusedTimeline.has(entry.entityId) || aiRevealedCards.includes(entry.entityId));
            const isHighlighted = isActive || isAiFocused || hoveredStationId === entry.id || hoveredKind === entry.kind;
            const showBubbles = isActive;

            return (
              <div
                key={entry.id}
                ref={(el) => {
                  if (el) stationRefs.current.set(entry.id, el);
                  else stationRefs.current.delete(entry.id);
                }}
                data-station-id={entry.id}
                data-entity-id={entry.entityId ?? undefined}
                data-state={isHighlighted ? 'focused' : 'default'}
                className="absolute"
                style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: showBubbles ? 60 : 1 }}
              >
                <div className="relative">
                  <RoadmapNode
                    kind={entry.kind}
                    variant={entry.variant}
                    label={entry.label}
                    durationLabel={entry.durationLabel}
                    rangeLabel={entry.rangeLabel}
                    hovered={isHighlighted}
                    active={isActive}
                    labelSide="right"
                    scale={NODE_SCALE}
                    labelWidth={LABEL_WIDTH}
                    onClick={() => scrollStationIntoView(entry.id)}
                    onPointerEnter={() => {
                      setHoveredStationId(entry.id);
                      playBlip(1 + (i % 4) * 0.06);
                    }}
                    onPointerLeave={() => setHoveredStationId((cur) => (cur === entry.id ? null : cur))}
                    nodeRef={(el) => entry.entityId && registerNode(entry.entityId, el)}
                  />

                  <AnimatePresence>
                    {showBubbles && entry.skills.length > 0 && (
                      <SkillBubbles key="bubbles" skills={entry.skills} kind={entry.kind} scale={NODE_SCALE} side="left" />
                    )}
                  </AnimatePresence>

                  {celebrated && entry.id === lastEntryId && <CelebrationBurst />}
                </div>
              </div>
            );
          })}

          {/* Exactly one detail card exists at a time, hoisted out of the
              station list — rendering one per station meant every card that
              had ever opened stayed mounted whenever its exit animation
              didn't finish, and buried the card inside a station's own
              stacking context. */}
          {activeEntry && cardBox && isCardOpen && (
            <div
              ref={cardRef}
              className="absolute"
              style={{
                left: cardBox.left,
                top: cardBox.top,
                transform: `translate(${cardNudge.dx}px, ${cardNudge.dy}px)`,
                zIndex: 9999,
                width: DETAIL_CARD_WIDTH,
              }}
            >
              <DetailCard key={activeEntry.id} entry={activeEntry} placement="below" onClose={() => setDismissedId(activeId)} />
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}

const LEGEND_ITEMS: { kind: RoadmapKind; color: string; label: string }[] = [
  { kind: 'education', color: 'var(--neon-cyan)', label: 'לימודים' },
  { kind: 'experience', color: 'var(--neon-blue)', label: 'תעסוקה' },
  { kind: 'project', color: 'var(--neon-purple)', label: 'פרויקטים' },
  { kind: 'goal', color: 'var(--neon-gold)', label: 'שאיפות' },
];

/**
 * Interactive category legend. Hovering a category highlights every station
 * of that kind on the rail (and its axis tick), not just a static key.
 */
function Legend({ hoveredKind, onHoverKind }: { hoveredKind: string | null; onHoverKind: (kind: string | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
      {LEGEND_ITEMS.map(({ kind, color, label }) => {
        const active = hoveredKind === kind;
        return (
          <button
            key={kind}
            type="button"
            onPointerEnter={() => onHoverKind(kind)}
            onPointerLeave={() => onHoverKind(null)}
            onFocus={() => onHoverKind(kind)}
            onBlur={() => onHoverKind(null)}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200"
            style={{
              borderColor: `color-mix(in oklch, ${color} ${active ? 75 : 32}%, transparent)`,
              background: active
                ? `linear-gradient(160deg, color-mix(in oklch, ${color} 26%, transparent), oklch(0.2 0.05 255 / 0.6))`
                : 'oklch(0.17 0.045 255 / 0.4)',
              color: active ? color : 'var(--cyber-muted)',
              boxShadow: active ? `0 0 14px color-mix(in oklch, ${color} 45%, transparent)` : 'none',
            }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
