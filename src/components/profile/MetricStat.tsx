'use client';

import { useEffect, useRef, useState } from 'react';
import { useProfile } from './ProfileProvider';
import type { Entity } from '@/types/profile';

interface MetricMeta {
  value?: number;
  suffix?: string;
  label?: string;
}

function CountUp({ value, play }: { value: number; play: boolean }) {
  const [display, setDisplay] = useState(play ? value : 0);

  useEffect(() => {
    if (!play) return;
    let raf = 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play]);

  return <span>{display}</span>;
}

function MetricTile({ entity }: { entity: Entity }) {
  const { animatingMetric, registerNode, prefersReducedMotion } = useProfile();
  const [inView, setInView] = useState(prefersReducedMotion);
  const elRef = useRef<HTMLLIElement | null>(null);
  const meta = entity.meta as MetricMeta;
  const active = animatingMetric === entity.id;

  useEffect(() => {
    if (prefersReducedMotion) {
      setInView(true);
      return;
    }
    const el = elRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  if (typeof meta.value !== 'number') return null;

  return (
    <li
      ref={(el) => {
        elRef.current = el;
        registerNode(entity.id, el);
      }}
      data-entity-id={entity.id}
      data-state={active ? 'active' : 'default'}
      className={[
        'cyber-panel scroll-mt-24 rounded-xl p-4 text-center transition-all duration-300',
        active ? 'motion-safe:animate-pulse-once' : '',
      ].join(' ')}
      style={
        active
          ? {
              borderColor: 'color-mix(in oklch, var(--neon-cyan) 70%, transparent)',
              boxShadow: '0 0 26px color-mix(in oklch, var(--neon-cyan) 40%, transparent)',
            }
          : undefined
      }
    >
      <p
        className="text-3xl font-bold"
        style={{ color: 'var(--neon-cyan)', textShadow: '0 0 22px color-mix(in oklch, var(--neon-cyan) 55%, transparent)' }}
      >
        <CountUp value={meta.value} play={inView || prefersReducedMotion} />
        {meta.suffix}
      </p>
      <p className="mt-1 text-sm text-cyber-muted">{meta.label ?? entity.title}</p>
    </li>
  );
}

export function MetricStrip() {
  const { profile } = useProfile();
  const metrics = profile.entities.filter((e) => e.kind === 'award' && typeof (e.meta as MetricMeta).value === 'number');
  if (metrics.length === 0) return null;

  return (
    <section aria-labelledby="metrics-heading" className="py-8">
      <h2 id="metrics-heading" className="cyber-heading mb-2 text-xl font-semibold">
        Highlights
      </h2>
      <div className="cyber-rule mb-4" />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((entity) => (
          <MetricTile key={entity.id} entity={entity} />
        ))}
      </ul>
    </section>
  );
}
