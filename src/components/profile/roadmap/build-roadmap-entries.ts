import type { Entity } from '@/types/profile';
import type { RoadmapEntry, RoadmapKind } from './roadmap-types';
import { variantFor } from './roadmap-types';
import { currentDateValue, formatDuration, formatRange, parseDateValue } from './roadmap-dates';

interface RoadmapMeta {
  company?: string;
  institution?: string;
  start?: string;
  end?: string;
  tech?: string[];
}

function toSkills(entityId: string, tech: string[] | undefined): RoadmapEntry['skills'] {
  if (!Array.isArray(tech)) return [];
  return tech.map((label, i) => ({ id: `${entityId}_skill_${i}`, label }));
}

const MIDDLE_KINDS: ReadonlySet<string> = new Set(['education', 'experience', 'project']);

interface Dated {
  entity: Entity;
  meta: RoadmapMeta;
  start?: number;
  end?: number;
  /** Value used for ordering — real for dated entities, carried forward for undated ones. */
  sortValue: number;
}

/**
 * Resolves an ordering value for every entity.
 *
 * Experiences and education carry real dates. Project entities carry none, so
 * they inherit the date of the nearest *preceding* dated entity in sort_order
 * — on a CV a project listed under/after a role generally belongs to that era,
 * and this keeps the road strictly monotonic instead of dumping every undated
 * project at one end. Projects therefore have no duration badge (there is no
 * real timeframe to show) but still sit in a sensible place on the road.
 */
function resolveOrder(entities: Entity[]): Dated[] {
  const bySortOrder = [...entities].sort((a, b) => a.sort_order - b.sort_order);

  const prepared = bySortOrder.map((entity) => {
    const meta = entity.meta as RoadmapMeta;
    const start = parseDateValue(meta.start);
    const end = parseDateValue(meta.end);
    return { entity, meta, start, end };
  });

  const firstDated = prepared.find((p) => p.start !== undefined || p.end !== undefined);
  const fallback = firstDated?.start ?? firstDated?.end ?? 0;

  let carried = fallback;
  return prepared.map((p) => {
    const own = p.start ?? p.end;
    if (own !== undefined) carried = own;
    return { ...p, sortValue: own ?? carried };
  });
}

const START_MARKER: RoadmapEntry = {
  id: 'roadmap_start',
  entityId: null,
  kind: 'education',
  // Explicitly the low-profile hex opener, not the education glass building.
  variant: 'hex',
  label: 'נקודת ההתחלה',
  title: 'נקודת ההתחלה',
  subtitle: 'ראשית הדרך המקצועית',
  description: 'כאן מתחיל המסע. סקרנות טכנולוגית ורצון ללמוד ולבנות.',
  skills: [
    { id: 'roadmap_start_skill_0', label: 'סקרנות' },
    { id: 'roadmap_start_skill_1', label: 'חשיבה לוגית' },
  ],
};

const FUTURE_MARKER: RoadmapEntry = {
  id: 'roadmap_future',
  entityId: null,
  kind: 'goal',
  variant: 'sun',
  label: 'חזון ושאיפות לעתיד',
  title: 'חזון ושאיפות לעתיד',
  subtitle: 'האופק',
  description: 'יצירת השפעה רחבה וטכנולוגיה שמשנה חיים.',
  rangeLabel: 'העתיד',
  skills: [
    { id: 'roadmap_future_skill_0', label: 'AI' },
    { id: 'roadmap_future_skill_1', label: 'מנהיגות טכנית' },
    { id: 'roadmap_future_skill_2', label: 'חזון' },
  ],
};

/**
 * Maps profile.entities into the roadmap's station list, strictly oldest →
 * newest: a fixed start marker, one station per education/experience/project
 * entity in chronological order, and a fixed future/vision marker.
 */
export function buildRoadmapEntries(entities: Entity[]): RoadmapEntry[] {
  const middles = resolveOrder(entities.filter((e) => MIDDLE_KINDS.has(e.kind)))
    .sort((a, b) => a.sortValue - b.sortValue || a.entity.sort_order - b.entity.sort_order)
    .map(({ entity, meta, start, end }): RoadmapEntry => {
      const kind = entity.kind as RoadmapKind;
      // A start with no end means "still going" — only meaningful for roles.
      const ongoing = start !== undefined && end === undefined && kind === 'experience';
      const effectiveEnd = end ?? (ongoing ? currentDateValue() : undefined);

      const hasSpan = start !== undefined && effectiveEnd !== undefined;
      return {
        id: entity.id,
        entityId: entity.id,
        kind,
        variant: variantFor(kind),
        label: entity.title,
        title: entity.title,
        subtitle: meta.company ?? meta.institution ?? undefined,
        description: entity.body,
        startValue: start ?? end,
        endValue: effectiveEnd ?? start ?? end,
        durationLabel: hasSpan ? formatDuration(start, effectiveEnd) : undefined,
        rangeLabel: hasSpan
          ? formatRange(start, effectiveEnd, ongoing)
          : end !== undefined
            ? formatRange(end, end, false)
            : undefined,
        skills: toSkills(entity.id, meta.tech),
      };
    });

  return [START_MARKER, ...middles, FUTURE_MARKER];
}
