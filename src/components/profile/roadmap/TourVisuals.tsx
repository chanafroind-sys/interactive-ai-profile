'use client';

import { forwardRef } from 'react';
import { motion } from 'motion/react';

/**
 * The glowing energy marker that travels the road during the tour. Its
 * position is written straight to `style.transform` by the parent's motion
 * value subscriber, so moving it never re-renders React.
 */
export const TourMarker = forwardRef<HTMLDivElement, { visible: boolean }>(function TourMarker({ visible }, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms ease' }}
    >
      <div className="relative">
        {/* Outer halo */}
        <motion.span
          className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
          style={{ background: 'var(--neon-cyan)' }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Pulsing ring */}
        <motion.span
          className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: 'var(--neon-cyan)' }}
          animate={{ scale: [1, 1.8], opacity: [0.85, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
        {/* Core */}
        <span
          className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, oklch(1 0 0), var(--neon-cyan) 70%)',
            boxShadow: '0 0 18px var(--neon-cyan), 0 0 40px color-mix(in oklch, var(--neon-cyan) 60%, transparent)',
          }}
        />
      </div>
    </div>
  );
});

/** Expanding rings + sparks fired when the tour reaches the vision node. */
export function CelebrationBurst() {
  const sparks = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[80] -translate-x-1/2 -translate-y-1/2">
      {[0, 0.25, 0.5].map((delay) => (
        <motion.span
          key={delay}
          className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{ borderColor: 'var(--neon-gold)' }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 3.2, opacity: 0 }}
          transition={{ duration: 1.8, delay, repeat: 1, ease: 'easeOut' }}
        />
      ))}
      {sparks.map((angle, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
          style={{ background: 'var(--neon-gold)', boxShadow: '0 0 12px var(--neon-gold)' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(angle) * 150,
            y: Math.sin(angle) * 150,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ duration: 1.6, delay: 0.1 + (i % 5) * 0.06, ease: 'easeOut', repeat: 1 }}
        />
      ))}
    </div>
  );
}
