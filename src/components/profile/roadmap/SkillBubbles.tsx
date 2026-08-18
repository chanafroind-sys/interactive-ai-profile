'use client';

import { motion } from 'motion/react';
import { playPop } from '@/lib/audio';
import { getBrandIcon } from './brand-icons';
import { KIND_COLOR, type RoadmapKind, type RoadmapSkill } from './roadmap-types';

interface SkillBubblesProps {
  skills: RoadmapSkill[];
  kind: RoadmapKind;
  wide?: boolean;
  scale?: number;
  /** Bubbles fan away from the label/road, so they never sit on top of it. */
  side: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Skill spheres surfacing at the ends of the PCB traces.
 *
 * Positions are locked to strict 45°/90° headings so each connector runs at a
 * real circuit-trace angle rather than an arbitrary fan. Four fan directions
 * cover both the horizontal roadmap (bubbles fan up/down, away from the
 * label) and the vertical roadmap / toolbox (bubbles fan left/right, away
 * from the road or out of the box).
 */
const ANGLES_UP = [-90, -45, -135, -20, -160, -65, -115];
const ANGLES_DOWN = [90, 45, 135, 20, 160, 65, 115];
const ANGLES_LEFT = [180, 135, -135, 160, -160, 110, -110];
const ANGLES_RIGHT = [0, 45, -45, 20, -20, 70, -70];
const ANGLE_SETS: Record<'top' | 'bottom' | 'left' | 'right', number[]> = {
  top: ANGLES_UP,
  bottom: ANGLES_DOWN,
  left: ANGLES_LEFT,
  right: ANGLES_RIGHT,
};

export function SkillBubbles({ skills, kind, wide = false, scale = 1, side }: SkillBubblesProps) {
  const base = ANGLE_SETS[side];
  const radius = (wide ? 158 : 140) * scale;
  const size = 78 * scale;

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
      {skills.map((skill, i) => {
        const brand = getBrandIcon(skill.label);
        const color = brand?.color ?? KIND_COLOR[kind];
        const angleDeg = base[i % base.length] ?? base[0]!;
        // Push overflow onto a second, wider ring instead of overlapping.
        const ring = Math.floor(i / base.length);
        const r = radius + ring * (size + 16);
        const angle = (angleDeg * Math.PI) / 180;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        return (
          <motion.div
            key={skill.id}
            className="absolute left-0 top-0"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
            animate={{ x, y, opacity: 1, scale: 1 }}
            exit={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.025 * i }}
            onAnimationStart={() => {
              // Slight upward pitch per bubble so a burst sounds like a chord.
              if (i < 6) playPop(1 + i * 0.08);
            }}
          >
            {/* Circuit trace back to the platform */}
            <span
              className="absolute left-0 top-0 origin-left"
              style={{
                width: r,
                height: 2,
                transform: `rotate(${angleDeg + 180}deg)`,
                background: `linear-gradient(90deg, transparent, ${color})`,
                opacity: 0.6,
              }}
            />

            {/* Glass sphere */}
            <div
              className="pointer-events-auto relative flex -translate-x-1/2 -translate-y-1/2 cursor-default flex-col items-center justify-center gap-1 rounded-full"
              style={{
                width: size,
                height: size,
                background: `
                  radial-gradient(circle at 30% 22%, oklch(1 0 0 / 0.6), transparent 42%),
                  radial-gradient(circle at 50% 62%, color-mix(in oklch, ${color} 70%, transparent), color-mix(in oklch, ${color} 30%, oklch(0.16 0.01 260)) 78%),
                  oklch(0.13 0.01 260)
                `,
                border: `1.5px solid color-mix(in oklch, ${color} 75%, transparent)`,
                boxShadow: `
                  0 0 22px color-mix(in oklch, ${color} 45%, transparent),
                  inset 0 -8px 16px color-mix(in oklch, ${color} 28%, transparent),
                  inset 0 6px 12px oklch(1 0 0 / 0.18)
                `,
                backdropFilter: 'blur(6px)',
              }}
              onPointerEnter={() => playPop(1.25)}
            >
              {/* Rim light along the lower-right edge */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 210deg, transparent 0deg, color-mix(in oklch, ${color} 70%, transparent) 60deg, transparent 130deg)`,
                  opacity: 0.5,
                  maskImage: 'radial-gradient(circle, transparent 58%, black 76%)',
                  WebkitMaskImage: 'radial-gradient(circle, transparent 58%, black 76%)',
                }}
              />
              {/* Specular highlight */}
              <span
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: size * 0.26,
                  height: size * 0.17,
                  left: size * 0.2,
                  top: size * 0.16,
                  background: 'radial-gradient(circle, oklch(1 0 0 / 0.85), transparent 70%)',
                  filter: 'blur(1px)',
                }}
              />

              {brand ? (
                <svg viewBox="0 0 24 24" style={{ width: size * 0.3, height: size * 0.3, color: brand.color }} fill="currentColor" aria-hidden>
                  <path d={brand.path} />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" style={{ width: size * 0.28, height: size * 0.28, color }} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="7" y="7" width="10" height="10" rx="2" />
                  <path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2" />
                </svg>
              )}
              <span
                className="relative px-1 text-center font-semibold leading-tight"
                style={{
                  fontSize: Math.max(9, 10.5 * scale),
                  color: 'var(--cyber-text)',
                  textShadow: '0 1px 5px oklch(0.10 0.03 255 / 0.95)',
                }}
                dir="auto"
              >
                {skill.label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
