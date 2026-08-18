'use client';

import { KIND_COLOR, type RoadmapEntry } from './roadmap-types';
import type { StationPoint } from './roadmap-layout';

interface TimelineAxisProps {
  entries: RoadmapEntry[];
  /** Same points the rail uses — sharing them (instead of an independent
   *  calendar scale) is what guarantees every tick lands exactly level with
   *  its station instead of drifting from a slightly different coordinate
   *  space. */
  points: StationPoint[];
  height: number;
  hoveredId: string | null;
  hoveredKind: string | null;
  onHoverEntry: (id: string | null) => void;
  onSelectEntry: (id: string) => void;
}

const AXIS_X = 8;
const TICK_END_X = 24;

/**
 * Sleek vertical timeline axis, running parallel to the rail on its outer
 * side. Every dated station gets a tick at the *exact* y its platform sits
 * at, a short glowing trace reaching across to the rail, and its year range
 * + duration — so the connection between "station" and "point in time" is
 * literal, not implied by proximity.
 */
export function TimelineAxis({ entries, points, height, hoveredId, hoveredKind, onHoverEntry, onSelectEntry }: TimelineAxisProps) {
  const segments = entries
    .map((entry, i) => ({ entry, point: points[i] }))
    .filter((d): d is { entry: RoadmapEntry; point: StationPoint } => !!d.point && (!!d.entry.rangeLabel || !!d.entry.durationLabel));

  if (segments.length === 0 || height === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height }} dir="ltr">
      {/* Base rail for the axis itself. */}
      <div
        className="absolute rounded-full"
        style={{
          left: AXIS_X,
          top: points[0]?.y ?? 0,
          bottom: height - (points[points.length - 1]?.y ?? height),
          width: 2,
          background: 'var(--cyber-line)',
        }}
      />

      {segments.map(({ entry, point }) => {
        const isHovered = hoveredId === entry.id || hoveredKind === entry.kind;
        const color = KIND_COLOR[entry.kind];
        return (
          <div key={entry.id} className="absolute" style={{ left: 0, top: point.y, transform: 'translateY(-50%)' }}>
            {/* Horizontal connector trace reaching across to the rail. */}
            <div
              aria-hidden
              className="absolute transition-opacity duration-200"
              style={{
                left: TICK_END_X,
                top: '50%',
                width: 26,
                height: isHovered ? 2.5 : 1.5,
                transform: 'translateY(-50%)',
                background: `linear-gradient(to right, ${color}, transparent)`,
                opacity: isHovered ? 0.95 : 0.4,
                boxShadow: isHovered ? `0 0 10px ${color}` : 'none',
              }}
            />
            <button
              type="button"
              disabled={!entry.entityId}
              data-entity-id={entry.entityId ?? undefined}
              onPointerEnter={() => onHoverEntry(entry.id)}
              onPointerLeave={() => onHoverEntry(null)}
              onFocus={() => onHoverEntry(entry.id)}
              onBlur={() => onHoverEntry(null)}
              onClick={() => onSelectEntry(entry.id)}
              aria-label={`${entry.title}${entry.rangeLabel ? ` · ${entry.rangeLabel}` : ''}`}
              className="pointer-events-auto relative flex -translate-y-1/2 items-center gap-1.5 rounded-md border-0 bg-transparent p-1 text-left outline-none"
            >
              <span
                className="block shrink-0 rounded-full transition-all duration-200"
                style={{
                  width: isHovered ? 11 : 7,
                  height: isHovered ? 11 : 7,
                  background: color,
                  opacity: hoveredId || hoveredKind ? (isHovered ? 1 : 0.35) : 0.85,
                  boxShadow: isHovered ? `0 0 14px ${color}` : 'none',
                }}
              />
              <span className="flex flex-col leading-tight">
                {entry.rangeLabel && (
                  <span
                    className="whitespace-nowrap text-[11px] font-semibold tabular-nums transition-colors"
                    style={{ color: isHovered ? color : 'var(--cyber-text)' }}
                  >
                    {entry.rangeLabel}
                  </span>
                )}
                {entry.durationLabel && (
                  <span className="whitespace-nowrap text-[10px] tabular-nums text-cyber-muted">{entry.durationLabel}</span>
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
