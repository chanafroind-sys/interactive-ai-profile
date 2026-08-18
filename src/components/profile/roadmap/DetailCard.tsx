'use client';

import { motion } from 'motion/react';
import { Building2, ChevronUp, Code2, GraduationCap, Sparkles, X } from 'lucide-react';
import type { RoadmapEntry, RoadmapKind } from './roadmap-types';

const KIND_META: Record<RoadmapKind, { color: string; label: string; Icon: typeof GraduationCap }> = {
  education: { color: 'var(--neon-cyan)', label: 'לימודים', Icon: GraduationCap },
  experience: { color: 'var(--neon-blue)', label: 'תעסוקה', Icon: Building2 },
  project: { color: 'var(--neon-purple)', label: 'פרויקט', Icon: Code2 },
  goal: { color: 'var(--neon-gold)', label: 'מטרה עתידית', Icon: Sparkles },
};

interface DetailCardProps {
  entry: RoadmapEntry;
  /** Whether the card opens above or below its station. */
  placement: 'above' | 'below';
  onClose: () => void;
}

export const DETAIL_CARD_WIDTH = 260;

/**
 * Glassy floating details card. Its position is resolved by the caller against
 * the canvas and viewport bounds, so it flips above the station and shifts
 * horizontally rather than ever running off-screen.
 */
export function DetailCard({ entry, placement, onClose }: DetailCardProps) {
  const meta = KIND_META[entry.kind];
  const { Icon } = meta;
  const fromY = placement === 'below' ? -12 : 12;

  return (
    <motion.div
      role="dialog"
      aria-label={entry.title}
      initial={{ opacity: 0, y: fromY, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: fromY, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-2xl border p-4 backdrop-blur-xl"
      style={{
        width: DETAIL_CARD_WIDTH,
        borderColor: `color-mix(in oklch, ${meta.color} 55%, transparent)`,
        background: 'oklch(0.17 0.045 255 / 0.9)',
        boxShadow: `0 0 40px color-mix(in oklch, ${meta.color} 38%, transparent), inset 0 1px 0 oklch(1 0 0 / 0.08)`,
      }}
    >
      <button
        onClick={onClose}
        aria-label="סגירה"
        className="absolute left-3 top-3 rounded-md p-1 text-cyber-muted transition-colors hover:text-cyber-text"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in oklch, ${meta.color} 22%, transparent)`, color: meta.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <h3 className="truncate text-sm font-semibold text-cyber-text">{entry.title}</h3>
        </div>
      </div>

      {entry.subtitle && <p className="text-xs font-medium text-cyber-text/90">{entry.subtitle}</p>}
      {(entry.durationLabel || entry.rangeLabel) && (
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums text-cyber-muted" dir="auto">
          {entry.rangeLabel && <span>{entry.rangeLabel}</span>}
          {entry.durationLabel && (
            <span
              className="rounded-full px-1.5 py-0.5 font-semibold"
              style={{ background: `color-mix(in oklch, ${meta.color} 18%, transparent)`, color: meta.color }}
            >
              {entry.durationLabel}
            </span>
          )}
        </p>
      )}
      {entry.description && <p className="mt-2 text-xs leading-relaxed text-cyber-muted">{entry.description}</p>}

      {entry.bullets && entry.bullets.length > 0 && (
        <div className="mt-3 rounded-xl border p-2" style={{ borderColor: `color-mix(in oklch, ${meta.color} 35%, transparent)` }}>
          <div className="mb-1 flex items-center justify-end gap-1 text-[10px] text-cyber-muted">
            <span>נושאים</span>
            <ChevronUp className="h-3 w-3" />
          </div>
          <ul className="space-y-1">
            {entry.bullets.map((b) => (
              <li key={b} className="flex items-center justify-end gap-2 text-[11px] text-cyber-text/90">
                <span>{b}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
