'use client';

import { motion } from 'motion/react';
import { KIND_COLOR, type NodeVariant, type RoadmapKind } from './roadmap-types';

interface RoadmapNodeProps {
  kind: RoadmapKind;
  variant: NodeVariant;
  label: string;
  durationLabel?: string;
  rangeLabel?: string;
  hovered: boolean;
  active: boolean;
  /** The tour is resting here — adds a continuous glow pulse. */
  pulsing?: boolean;
  /** 'left'/'right' offset the label horizontally instead of stacking it
   *  above/below the platform — needed on the vertical roadmap, where
   *  stations sit close together and a vertically-stacked label would reach
   *  into the neighbouring station's space. */
  labelSide: 'top' | 'bottom' | 'left' | 'right';
  scale: number;
  labelWidth: number;
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  nodeRef?: (el: HTMLButtonElement | null) => void;
}

/**
 * A station on the highway. Every platform is generic — driven by entity kind,
 * never by a particular employer — so an arbitrary CV renders correctly.
 */
export function RoadmapNode({
  kind,
  variant,
  label,
  durationLabel,
  rangeLabel,
  hovered,
  active,
  pulsing = false,
  labelSide,
  scale,
  labelWidth,
  onClick,
  onPointerEnter,
  onPointerLeave,
  nodeRef,
}: RoadmapNodeProps) {
  const color = KIND_COLOR[kind];
  const lit = hovered || active || pulsing;
  const badgeText = [durationLabel, rangeLabel].filter(Boolean).join(' · ');

  return (
    <motion.button
      ref={nodeRef}
      type="button"
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onPointerEnter}
      onBlur={onPointerLeave}
      aria-pressed={active}
      aria-label={badgeText ? `${label} · ${badgeText}` : label}
      animate={{ scale: pulsing ? scale * 1.14 : lit ? scale * 1.07 : scale }}
      whileTap={{ scale: scale * 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="relative flex cursor-pointer flex-col items-center rounded-2xl outline-none focus-visible:ring-2"
      style={{ ['--ring-color' as string]: color }}
    >
      {/* Glass title badge, offset clear of the platform so the 3D station
          stays fully visible. Nothing opaque is drawn over the structure. */}
      <span
        className={`pointer-events-none absolute z-20 flex flex-col gap-1.5 leading-snug ${
          labelSide === 'top'
            ? 'bottom-full left-1/2 mb-6 -translate-x-1/2 items-center text-center'
            : labelSide === 'bottom'
              ? 'top-full left-1/2 mt-6 -translate-x-1/2 items-center text-center'
              : labelSide === 'left'
                ? 'right-full top-1/2 mr-4 -translate-y-1/2 items-end text-right'
                : 'left-full top-1/2 ml-4 -translate-y-1/2 items-start text-left'
        }`}
        style={{ width: labelWidth }}
      >
        <span
          className="inline-block rounded-xl border px-3.5 py-2 text-[15px] font-semibold backdrop-blur-md"
          style={{
            borderColor: `color-mix(in oklch, ${color} 55%, transparent)`,
            background: `linear-gradient(160deg, color-mix(in oklch, ${color} 16%, transparent), oklch(0.18 0.05 255 / 0.55))`,
            color: 'var(--cyber-text)',
            textShadow: '0 1px 8px oklch(0.10 0.03 255 / 0.95)',
            boxShadow: lit
              ? `0 0 24px color-mix(in oklch, ${color} 50%, transparent), inset 0 1px 0 oklch(1 0 0 / 0.16)`
              : 'inset 0 1px 0 oklch(1 0 0 / 0.1)',
          }}
          dir="auto"
        >
          {label}
        </span>
        {badgeText && (
          <span
            className="inline-block whitespace-nowrap rounded-full border px-3 py-1 text-[13px] font-bold tabular-nums backdrop-blur-md"
            style={{
              borderColor: `color-mix(in oklch, ${color} 60%, transparent)`,
              background: `color-mix(in oklch, ${color} 14%, oklch(0.15 0.04 255 / 0.55))`,
              color,
              textShadow: '0 1px 6px oklch(0.10 0.03 255 / 0.95)',
              boxShadow: lit ? `0 0 16px color-mix(in oklch, ${color} 45%, transparent)` : 'none',
            }}
            dir="auto"
          >
            {badgeText}
          </span>
        )}
      </span>

      {/* Ambient pulse glow */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: color }}
        animate={{ opacity: pulsing ? [0.4, 0.7, 0.4] : lit ? 0.55 : 0.2 }}
        transition={pulsing ? { duration: 1.6, repeat: Infinity } : { duration: 0.35 }}
      />

      {variant === 'hex' && <HexPlatform color={color} lit={lit} />}
      {variant === 'building' && <GlassBuilding color={color} lit={lit} />}
      {variant === 'podium' && <Podium color={color} lit={lit} />}
      {variant === 'sun' && <SunPlatform lit={lit} />}
    </motion.button>
  );
}

/* ---------- Opening station: low-profile hexagonal platform ---------- */
function HexPlatform({ color, lit }: { color: string; lit: boolean }) {
  const gid = `hex-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-28 overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.98 0.02 250)" stopOpacity="0.85" />
          <stop offset="55%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor="oklch(0.24 0.05 255)" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* extruded sides */}
      <polygon points="16,52 60,74 60,88 16,66" fill="oklch(0.15 0.04 255)" />
      <polygon points="104,52 60,74 60,88 104,66" fill="oklch(0.11 0.03 258)" />
      {/* top face */}
      <polygon points="60,30 104,52 60,74 16,52" fill={`url(#${gid})`} stroke={color} strokeWidth="1.8" />
      <polygon points="60,40 88,54 60,68 32,54" fill="none" stroke={color} strokeWidth="1" opacity="0.85" />
      <ellipse cx="60" cy="54" rx="9" ry="5" fill="oklch(0.98 0.02 250)">
        <animate attributeName="opacity" values="0.55;1;0.55" dur="2s" repeatCount="indefinite" />
      </ellipse>
      {lit && <polygon points="60,30 104,52 60,74 16,52" fill="none" stroke={color} strokeWidth="2.6" opacity="0.85" />}
    </svg>
  );
}

/* ---------- Education: isometric glass building with lit floors ---------- */
function GlassBuilding({ color, lit }: { color: string; lit: boolean }) {
  const gid = `glass-${color.replace(/[^a-z0-9]/gi, '')}`;
  const floors = [0, 1, 2, 3];
  return (
    <svg viewBox="0 0 140 150" className="h-36 w-32 overflow-visible">
      <defs>
        <linearGradient id={`${gid}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor="oklch(0.2 0.05 250)" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${gid}-r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.75" />
          <stop offset="100%" stopColor="oklch(0.26 0.06 245)" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* base platform */}
      <polygon points="70,104 132,132 70,150 8,132" fill="oklch(0.18 0.045 255)" stroke={color} strokeWidth="1.5" />
      <polygon points="70,104 132,132 70,150 8,132" fill={color} opacity="0.12" />

      {/* tower: two visible faces + roof, drawn in true isometric */}
      <polygon points="70,26 8,54 8,132 70,104" fill={`url(#${gid}-l)`} stroke={color} strokeWidth="1.2" />
      <polygon points="70,26 132,54 132,132 70,104" fill={`url(#${gid}-r)`} stroke={color} strokeWidth="1.2" />
      <polygon points="70,26 132,54 70,82 8,54" fill="oklch(0.42 0.08 235)" stroke={color} strokeWidth="1.4" opacity="0.9" />

      {/* glowing internal floor slabs */}
      {floors.map((f) => {
        const dy = 16 + f * 17;
        return (
          <g key={f} opacity={lit ? 0.95 : 0.6}>
            <line x1="8" y1={54 + dy} x2="70" y2={104 - 24 + dy + 24} stroke="oklch(0.95 0.03 240)" strokeWidth="1.1" opacity="0.35" />
            <line x1="70" y1={82 + dy} x2="132" y2={54 + dy} stroke="oklch(0.95 0.03 240)" strokeWidth="1.1" opacity="0.5" />
            <line x1="8" y1={54 + dy} x2="70" y2={82 + dy} stroke={color} strokeWidth="1.3" opacity="0.75">
              <animate attributeName="opacity" values="0.35;0.9;0.35" dur={`${2.4 + f * 0.4}s`} repeatCount="indefinite" />
            </line>
          </g>
        );
      })}

      {lit && <polygon points="70,26 132,54 70,82 8,54" fill="none" stroke={color} strokeWidth="2.4" opacity="0.9" />}
    </svg>
  );
}

/* ---------- Experience & projects: generic elevated podium ---------- */
function Podium({ color, lit }: { color: string; lit: boolean }) {
  const gid = `podium-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 200 130" className="h-28 w-48 overflow-visible">
      <defs>
        <linearGradient id={`${gid}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor="oklch(0.26 0.055 250)" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* riser (the elevation) */}
      <polygon points="16,74 100,116 100,96 16,54" fill="oklch(0.15 0.04 256)" />
      <polygon points="184,74 100,116 100,96 184,54" fill="oklch(0.11 0.03 258)" />

      {/* stage top face */}
      <polygon points="100,12 184,54 100,96 16,54" fill={`url(#${gid}-top)`} stroke={color} strokeWidth="1.8" />
      {/* inner inlay */}
      <polygon points="100,28 158,57 100,86 42,57" fill="none" stroke="oklch(0.96 0.02 250)" strokeWidth="1" opacity="0.35" />

      {/* light strip along the leading edges */}
      <line x1="16" y1="54" x2="100" y2="96" stroke={color} strokeWidth="2.4" opacity="0.9" />
      <line x1="184" y1="54" x2="100" y2="96" stroke={color} strokeWidth="2.4" opacity="0.9" />

      {/* core beacon */}
      <ellipse cx="100" cy="57" rx="12" ry="6.5" fill="oklch(0.98 0.02 250)" opacity="0.9">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.2s" repeatCount="indefinite" />
      </ellipse>

      {lit && <polygon points="100,12 184,54 100,96 16,54" fill="none" stroke={color} strokeWidth="2.8" opacity="0.9" />}
    </svg>
  );
}

/* ---------- Vision: elevated golden sun with diagonal sunburst ---------- */
function SunPlatform({ lit }: { lit: boolean }) {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <div className="relative h-32 w-36">
      <motion.span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-36 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
        style={{ background: 'var(--neon-gold)' }}
        animate={{ opacity: lit ? 0.75 : 0.45 }}
        transition={{ duration: 0.4 }}
      />
      <svg viewBox="0 0 140 120" className="relative h-32 w-36 overflow-visible">
        <defs>
          <radialGradient id="sun-core" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="oklch(0.99 0.05 95)" />
            <stop offset="55%" stopColor="var(--neon-gold)" />
            <stop offset="100%" stopColor="oklch(0.45 0.11 70 / 0.55)" />
          </radialGradient>
        </defs>

        {/* diagonal sunburst */}
        <g opacity={lit ? 0.85 : 0.5}>
          {rays.map((deg) => (
            <rect
              key={deg}
              x="68"
              y="14"
              width="4"
              height="44"
              rx="2"
              fill="var(--neon-gold)"
              transform={`rotate(${deg} 70 46)`}
              opacity="0.55"
            >
              <animate attributeName="opacity" values="0.25;0.8;0.25" dur="3s" begin={`${deg / 360}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>

        {/* elevated platform */}
        <polygon points="26,74 70,96 70,112 26,90" fill="oklch(0.22 0.06 70)" />
        <polygon points="114,74 70,96 70,112 114,90" fill="oklch(0.16 0.05 70)" />
        <polygon points="70,52 114,74 70,96 26,74" fill="oklch(0.28 0.07 72)" stroke="var(--neon-gold)" strokeWidth="1.8" />

        {/* the sun */}
        <circle cx="70" cy="46" r="16" fill="url(#sun-core)">
          <animate attributeName="r" values="14;17.5;14" dur="2.8s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
