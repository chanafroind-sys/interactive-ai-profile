/**
 * Types for the career roadmap, ported from the v0 "interactive-career-roadmap"
 * export. The visual station is driven by `kind` — the v0 export only had
 * education/experience/goal; `project` is a 4th kind this integration adds
 * so project entities can render as their own stations.
 */

export type RoadmapKind = 'education' | 'experience' | 'project' | 'goal';
/**
 * Station architecture. All generic — nothing is tied to a specific employer,
 * so any CV renders correctly: `hex` opens the road, `building` is the glass
 * campus used for education, `podium` is the elevated stage used for both
 * experience and project entries, and `sun` closes on the vision marker.
 */
export type NodeVariant = 'hex' | 'building' | 'podium' | 'sun';
export type SkillTone = 'cyan' | 'green' | 'blue' | 'purple';

export interface RoadmapSkill {
  id: string;
  label: string;
  tone?: SkillTone;
}

export interface RoadmapEntry {
  id: string;
  /** The real profile entity this station represents, for data-entity-id and
   *  dispatch()/registerNode binding. Null for the fixed start/future markers,
   *  which aren't backed by a profile entity. */
  entityId: string | null;
  kind: RoadmapKind;
  variant: NodeVariant;
  /** Short label floating next to the node. */
  label: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** Decimal years (2021-07 → 2021.5) — used for chronological sort and for
   *  positioning this station's segment on the timeline axis. */
  startValue?: number;
  endValue?: number;
  /** "2.5 שנים" */
  durationLabel?: string;
  /** "2021–2024" */
  rangeLabel?: string;
  skills: RoadmapSkill[];
  bullets?: string[];
}

export const KIND_COLOR: Record<RoadmapKind, string> = {
  education: 'var(--neon-cyan)',
  experience: 'var(--neon-blue)',
  project: 'var(--neon-purple)',
  goal: 'var(--neon-gold)',
};

export function variantFor(kind: RoadmapKind, override?: NodeVariant): NodeVariant {
  if (override) return override;
  if (kind === 'education') return 'building';
  if (kind === 'experience' || kind === 'project') return 'podium';
  return 'hex';
}
