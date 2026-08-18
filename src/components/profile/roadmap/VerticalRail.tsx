'use client';

import { forwardRef } from 'react';
import { KIND_COLOR, type RoadmapEntry } from './roadmap-types';
import type { RoadmapLayout } from './roadmap-layout';

interface VerticalRailProps {
  layout: RoadmapLayout;
  /** Parallel to `layout.points` — colours each station's contact ring by kind. */
  entries: RoadmapEntry[];
}

/**
 * The volumetric winding highway: a filled isometric ribbon (glowing
 * asphalt surface + extruded side wall) that curves gently left/right as it
 * runs down the column, with glowing kerbs, animated lane markers, and a
 * contact-glow ring seated at every station so platforms read as planted on
 * the surface. The centreline is exposed as an invisible path too, so the
 * scroll marker can ride it via `getPointAtLength`.
 */
export const VerticalRail = forwardRef<SVGPathElement, VerticalRailProps>(function VerticalRail(
  { layout, entries },
  centerlineRef
) {
  const { width, height, surfacePath } = layout;
  if (!surfacePath) return null;

  return (
    <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id="rail-asphalt" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.30 0.045 250)" />
          <stop offset="55%" stopColor="oklch(0.235 0.04 253)" />
          <stop offset="100%" stopColor="oklch(0.185 0.035 255)" />
        </linearGradient>
        <linearGradient id="rail-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.17 0.04 258)" />
          <stop offset="100%" stopColor="oklch(0.10 0.03 260)" />
        </linearGradient>
        <linearGradient id="rail-kerb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--neon-cyan)" />
          <stop offset="55%" stopColor="var(--neon-blue)" />
          <stop offset="100%" stopColor="var(--neon-gold)" />
        </linearGradient>
        <filter id="rail-kerb-glow" x="-60%" y="-25%" width="220%" height="150%">
          <feGaussianBlur stdDeviation="4.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="rail-ring-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="rail-shadow-blur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Extruded side depth. */}
      <path d={layout.wallPath} fill="url(#rail-wall)" />
      <path d={layout.edgeNearPath} stroke="oklch(0.10 0.03 260)" strokeWidth="1.2" fill="none" opacity="0.9" />

      {/* Asphalt surface. */}
      <path d={layout.surfacePath} fill="url(#rail-asphalt)" />
      <path d={layout.edgeFarPath} stroke="oklch(0.62 0.06 250)" strokeWidth="1.5" fill="none" opacity="0.3" />

      {/* Glowing kerbs. */}
      <path d={layout.edgeFarPath} stroke="url(#rail-kerb)" strokeWidth="2" fill="none" opacity="0.8" filter="url(#rail-kerb-glow)" />
      <path d={layout.edgeNearPath} stroke="url(#rail-kerb)" strokeWidth="2.2" fill="none" opacity="0.9" filter="url(#rail-kerb-glow)" />

      {/* Illuminated lane markers, animated to read as energy flow. */}
      <path
        d={layout.centerPath}
        stroke="oklch(0.95 0.03 240)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="14 20"
        fill="none"
        opacity="0.75"
        style={{ animation: 'roadmap-dash 1s linear infinite' }}
      />

      {/* Per-station contact shadow + kind-coloured glow ring. */}
      {layout.points.map((point, i) => {
        const entry = entries[i];
        if (!entry) return null;
        const color = KIND_COLOR[entry.kind];
        return (
          <g key={entry.id ?? i}>
            <ellipse
              cx={point.x}
              cy={point.y + 5}
              rx="20"
              ry="7"
              fill="oklch(0.05 0.02 260)"
              opacity="0.5"
              filter="url(#rail-shadow-blur)"
            />
            <circle cx={point.x} cy={point.y} r="15" fill="none" stroke={color} strokeWidth="1.6" opacity="0.85" filter="url(#rail-ring-glow)" />
          </g>
        );
      })}

      {/* Invisible centreline the scroll marker rides. */}
      <path ref={centerlineRef} d={layout.centerPath} stroke="none" fill="none" />
    </svg>
  );
});
