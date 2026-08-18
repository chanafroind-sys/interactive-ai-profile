'use client';

import { motion } from 'motion/react';
import { playPop } from '@/lib/audio';
import { getBrandIcon } from './brand-icons';
import type { RoadmapSkill } from './roadmap-types';

interface ToolboxBubbleClusterProps {
  skills: RoadmapSkill[];
  scale?: number;
}

/** Deterministic pseudo-random in [0, 1) — same skill always lands in the
 *  same spot each time the box opens, instead of reshuffling every time. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FALLBACK_COLOR = 'var(--neon-purple)';

/**
 * The toolbox's own bubble cluster — distinct from the roadmap's
 * `SkillBubbles` (a tight circuit-trace fan off one station). This one reads
 * as tools being ejected out of the chest mouth: they launch straight up
 * with varying heights and a bit of horizontal scatter, then settle into a
 * continuous gentle float once landed, instead of holding a rigid ring.
 */
export function ToolboxBubbleCluster({ skills, scale = 1 }: ToolboxBubbleClusterProps) {
  const size = 70 * scale;
  const n = skills.length;

  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 z-30">
      {skills.map((skill, i) => {
        const brand = getBrandIcon(skill.label);
        const color = brand?.color ?? FALLBACK_COLOR;
        const spread = seededRandom(i) - 0.5; // [-0.5, 0.5)
        const targetX = (i - (n - 1) / 2) * (58 * scale) + spread * 34 * scale;
        const targetY = -(120 + seededRandom(i + 50) * 100) * scale;
        const floatAmt = 6 + seededRandom(i + 150) * 6;
        const floatDuration = 2.1 + seededRandom(i + 200) * 1.4;

        return (
          <motion.div
            key={skill.id}
            className="absolute bottom-0 left-0"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.15, rotate: 0 }}
            animate={{ x: targetX, y: targetY, opacity: 1, scale: 1, rotate: (spread * 14) }}
            transition={{ type: 'spring', stiffness: 210, damping: 16, delay: 0.05 * i }}
            onAnimationStart={() => {
              if (i < 7) playPop(1.05 + i * 0.07);
            }}
          >
            {/* Continuous idle float, layered on top of the one-time launch. */}
            <motion.div
              animate={{ y: [0, -floatAmt, 0] }}
              transition={{ duration: floatDuration, repeat: Infinity, ease: 'easeInOut', delay: 0.4 + 0.05 * i }}
            >
              <div
                className="pointer-events-auto relative flex -translate-x-1/2 -translate-y-1/2 cursor-default flex-col items-center justify-center gap-0.5 rounded-full"
                style={{
                  width: size,
                  height: size,
                  // The brand colour is the dominant fill here, not a subtle
                  // accent on a fixed base — a fixed hue behind every bubble
                  // (whatever it was) would flatten Docker/Python/Postgres/etc
                  // into looking like one tinted family instead of each
                  // showing its own official colour.
                  background: `
                    radial-gradient(circle at 30% 22%, oklch(1 0 0 / 0.6), transparent 42%),
                    radial-gradient(circle at 50% 62%, color-mix(in oklch, ${color} 70%, transparent), color-mix(in oklch, ${color} 30%, oklch(0.16 0.01 260)) 78%),
                    oklch(0.13 0.01 260)
                  `,
                  border: `1.5px solid color-mix(in oklch, ${color} 75%, transparent)`,
                  boxShadow: `
                    0 0 22px color-mix(in oklch, ${color} 55%, transparent),
                    inset 0 -7px 14px color-mix(in oklch, ${color} 35%, transparent),
                    inset 0 5px 10px oklch(1 0 0 / 0.18)
                  `,
                  backdropFilter: 'blur(6px)',
                }}
                onPointerEnter={() => playPop(1.3)}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(from 210deg, transparent 0deg, color-mix(in oklch, ${color} 68%, transparent) 60deg, transparent 130deg)`,
                    opacity: 0.5,
                    maskImage: 'radial-gradient(circle, transparent 58%, black 76%)',
                    WebkitMaskImage: 'radial-gradient(circle, transparent 58%, black 76%)',
                  }}
                />
                {brand ? (
                  <svg viewBox="0 0 24 24" style={{ width: size * 0.32, height: size * 0.32, color: brand.color }} fill="currentColor" aria-hidden>
                    <path d={brand.path} />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: size * 0.3, height: size * 0.3, color }} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                    <path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2" />
                  </svg>
                )}
                <span
                  className="relative px-1 text-center font-semibold leading-tight"
                  style={{ fontSize: Math.max(9, 10 * scale), color: 'var(--cyber-text)', textShadow: '0 1px 5px oklch(0.10 0.03 255 / 0.95)' }}
                  dir="auto"
                >
                  {skill.label}
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
