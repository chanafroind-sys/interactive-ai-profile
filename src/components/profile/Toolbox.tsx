'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { useProfile } from './ProfileProvider';
import { playPop } from '@/lib/audio';
import { ToolboxBubbleCluster } from './roadmap/ToolboxBubbleCluster';
import type { RoadmapSkill } from './roadmap/roadmap-types';

const BUBBLE_SCALE = 0.62;
/** How high the ejected bubble cluster can reach above the box (see
 *  `ToolboxBubbleCluster`'s own targetY range, scaled by `BUBBLE_SCALE`) —
 *  reserved as top padding so the cluster never overlaps the bio panel
 *  sitting directly above this row. */
const EJECT_CLEARANCE = 180;

/**
 * "My toolbox" — a playful pop-out of every skill entity, distinct from the
 * flat `ToolGrid` chip list beside it (which stays as the AI-dispatchable
 * `highlight_tools` surface). Sits natively at the top-right of the tech
 * stack section. Hover previews the open state; a click pins it open so
 * touch users get the same interaction. Rendered directly on the page
 * background — no panel, no card, just the image and its bubbles.
 */
export function Toolbox() {
  const { profile } = useProfile();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wasOpen = useRef(false);
  const open = hovered || pinned;

  const skills: RoadmapSkill[] = profile.entities
    .filter((e) => e.kind === 'skill')
    .map((e) => ({ id: e.id, label: e.title }));

  useEffect(() => {
    if (open && !wasOpen.current) playPop(1.35);
    wasOpen.current = open;
  }, [open]);

  if (skills.length === 0) return null;

  return (
    <div className="relative" style={{ paddingTop: EJECT_CLEARANCE }}>
      <span className="mb-1 block text-center text-xs font-medium uppercase tracking-wide text-cyber-muted">
        ארגז הכלים שלי
      </span>

      <button
        type="button"
        aria-pressed={pinned}
        aria-label={open ? 'סגירת ארגז הכלים' : 'פתיחת ארגז הכלים'}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => setPinned((p) => !p)}
        data-state={open ? 'open' : 'closed'}
        className="relative flex h-28 w-32 cursor-pointer items-end justify-center overflow-visible border-0 bg-transparent p-0 outline-none focus-visible:ring-2"
        style={{ ['--ring-color' as string]: 'var(--neon-cyan)' }}
      >
        {/* Soft ambient glow directly behind the box — no panel, no edges,
            just light, so the box reads as sitting on the page itself. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full blur-2xl"
          style={{ width: 140, height: 90, background: 'var(--neon-cyan)' }}
          animate={{ opacity: open ? 0.32 : 0.14 }}
          transition={{ duration: 0.35 }}
        />

        {/* Fan-out zone for the skill bubbles, anchored at the chest mouth. */}
        <div className="pointer-events-none absolute left-1/2 top-1 h-0 w-0">
          <AnimatePresence>
            {open && <ToolboxBubbleCluster key="toolbox-bubbles" skills={skills} scale={BUBBLE_SCALE} />}
          </AnimatePresence>
        </div>

        <div className="relative mb-1 h-24 w-24">
          <Image
            src="/toolbox/toolbox-closed.png"
            alt=""
            fill
            sizes="96px"
            className="object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.55)] transition-opacity duration-300"
            style={{ opacity: open ? 0 : 1 }}
            priority={false}
          />
          <Image
            src="/toolbox/toolbox-open.png"
            alt="ארגז כלים פתוח עם כלי הפיתוח שלי"
            fill
            sizes="96px"
            className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] transition-all duration-300"
            style={{ opacity: open ? 1 : 0, transform: open ? 'scale(1.04)' : 'scale(0.96)' }}
            priority={false}
          />
        </div>
      </button>
    </div>
  );
}
