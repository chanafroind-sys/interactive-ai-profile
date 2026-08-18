import type { RoadmapEntry } from './roadmap-types';

/**
 * Compact vertical *winding* roadmap layout.
 *
 * Stations run down the column in a gentle S-curve — alternating left/right
 * around a centreline — rather than a flat straight rail, and the rail is
 * extruded into a volumetric ribbon (asphalt surface + side wall) the same
 * way the original horizontal highway was, just with the primary travel
 * axis and the width-extrusion axis swapped: travel runs down (Y), width
 * extrudes sideways (X).
 *
 * Spacing stays uniform per station (not stretched by duration) — a compact
 * sidebar has no room for that, and duration is still communicated via the
 * badge text and timeline axis. Station x still winds, but always within a
 * narrow band well clear of both the column's outer edge (bubble fan-out
 * room) and the content column beside it (detail-card room) — anti-collision
 * placement anchors to each station's own *measured* screen position, not to
 * a fixed rail x, so the winding doesn't complicate that guarantee at all.
 */

export const CENTER_X = 132;
/** How far the rail winds side to side — modest, so the whole envelope
 *  stays inside the safe middle band regardless of which way a given
 *  station leans. */
export const WIND_AMPLITUDE = 26;
export const STATION_GAP = 156;
export const TOP_PAD = 64;
export const BOTTOM_PAD = 64;
/** Visual width of the rail/label panel itself. */
export const COLUMN_WIDTH = 400;
/** Total width reserved for the whole component, including the zone the
 *  detail card opens into — wider than the visual panel on purpose, so the
 *  card never has to spill into the neighbouring content column to have
 *  room to render. Kept as tight as the card geometry allows (see
 *  CareerRoadmap's LABEL_WIDTH/CARD_CLEARANCE) — this whole width is what
 *  the page layout has to find room for alongside the tech-stack and
 *  projects columns. Trimmed from 700 to 650 (in step with
 *  CARD_CLEARANCE/DETAIL_CARD_WIDTH) to give the projects column more room
 *  in the 3-column dashboard grid, while keeping a real safety margin: at
 *  the widest station x (CENTER_X + WIND_AMPLITUDE = 158) the card's own
 *  right edge lands at ~633, still short of this 650. */
export const RESERVED_WIDTH = 650;
export const NODE_SCALE = 0.7;

/** Isometric width-extrusion basis — fixed, not derived from the curve's
 *  local tangent, which is what makes the ribbon read as a real plane
 *  instead of a stroked line that swivels with every bend. */
const ISO_DY = 0.34;
const HALF_W_FAR = 13;
const HALF_W_NEAR = 38;
const DEPTH_FAR = 5;
const DEPTH_NEAR = 16;
const SAMPLES_PER_SEGMENT = 14;

export interface StationPoint {
  x: number;
  y: number;
}

export interface RoadmapLayout {
  points: StationPoint[];
  /** Filled ribbon: the asphalt surface. */
  surfacePath: string;
  /** Extruded edge: the visible side depth/wall. */
  wallPath: string;
  /** Illuminated lane markers down the centreline. */
  centerPath: string;
  /** Glowing kerbs along both edges. */
  edgeFarPath: string;
  edgeNearPath: string;
  width: number;
  reservedWidth: number;
  height: number;
}

interface Vec {
  x: number;
  y: number;
}

function catmullRom(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function sampleSpline(knots: Vec[]): Vec[] {
  if (knots.length < 2) return knots;
  const out: Vec[] = [];
  for (let i = 0; i < knots.length - 1; i++) {
    const p0 = knots[Math.max(0, i - 1)]!;
    const p1 = knots[i]!;
    const p2 = knots[i + 1]!;
    const p3 = knots[Math.min(knots.length - 1, i + 2)]!;
    const steps = i === knots.length - 2 ? SAMPLES_PER_SEGMENT : SAMPLES_PER_SEGMENT - 1;
    for (let s = 0; s <= steps; s++) out.push(catmullRom(p0, p1, p2, p3, s / SAMPLES_PER_SEGMENT));
  }
  return out;
}

function polyline(points: Vec[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export function computeVerticalRoadmapLayout(entries: RoadmapEntry[]): RoadmapLayout {
  const empty: RoadmapLayout = {
    points: [],
    surfacePath: '',
    wallPath: '',
    centerPath: '',
    edgeFarPath: '',
    edgeNearPath: '',
    width: COLUMN_WIDTH,
    reservedWidth: RESERVED_WIDTH,
    height: 0,
  };
  if (entries.length === 0) return empty;

  const points: StationPoint[] = entries.map((_, i) => {
    const sign = i % 2 === 0 ? -1 : 1;
    return { x: CENTER_X + sign * WIND_AMPLITUDE, y: TOP_PAD + i * STATION_GAP };
  });
  const height = TOP_PAD + (entries.length - 1) * STATION_GAP + BOTTOM_PAD;

  // ---- Sample the winding centreline, then extrude into a ribbon ---------
  const centre = sampleSpline(points);
  const isoLen = Math.hypot(1, ISO_DY);
  const isoDir: Vec = { x: 1 / isoLen, y: ISO_DY / isoLen };

  const farEdge: Vec[] = [];
  const nearEdge: Vec[] = [];
  const wallEdge: Vec[] = [];

  for (const p of centre) {
    const t = p.y / height;
    const halfW = lerp(HALF_W_FAR, HALF_W_NEAR, t);
    const depth = lerp(DEPTH_FAR, DEPTH_NEAR, t);
    const far = { x: p.x - isoDir.x * halfW, y: p.y - isoDir.y * halfW };
    const near = { x: p.x + isoDir.x * halfW, y: p.y + isoDir.y * halfW };
    farEdge.push(far);
    nearEdge.push(near);
    wallEdge.push({ x: near.x + depth, y: near.y });
  }

  const surfacePath = `${polyline(farEdge)} ${polyline([...nearEdge].reverse()).replace(/^M/, 'L')} Z`;
  const wallPath = `${polyline(nearEdge)} ${polyline([...wallEdge].reverse()).replace(/^M/, 'L')} Z`;

  return {
    points,
    surfacePath,
    wallPath,
    centerPath: polyline(centre),
    edgeFarPath: polyline(farEdge),
    edgeNearPath: polyline(nearEdge),
    width: COLUMN_WIDTH,
    reservedWidth: RESERVED_WIDTH,
    height,
  };
}
