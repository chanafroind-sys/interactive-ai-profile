// WCAG contrast clamp for the user-chosen accent colour (Task 06 lets tenants
// pick any hex; a bad choice must not become an unreadable public profile).
// Produces two variants of the same hue/saturation — one dark enough to read
// on a light background, one light enough to read on a dark background —
// rather than trusting a single midpoint to satisfy both.

const MIN_CONTRAST = 4.5;
const WHITE_LUMINANCE = 1;
const NEAR_BLACK_LUMINANCE = relativeLuminanceHex('#0a0a0a');

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsl([r, g, b]: [number, number, number]): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return { h: h * 60, s, l };
}

function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return [
    hue2rgb(p, q, hn + 1 / 3) * 255,
    hue2rgb(p, q, hn) * 255,
    hue2rgb(p, q, hn - 1 / 3) * 255,
  ];
}

function channelLuminance(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function relativeLuminanceHex(hex: string): number {
  return relativeLuminance(hexToRgb(hex));
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Walk lightness toward `direction` (down = darker, up = lighter) until the
 * colour clears MIN_CONTRAST against `againstLuminance`, or hits a floor/
 * ceiling that keeps it from going achromatic.
 */
function clampLightness(hsl: Hsl, against: number, direction: 'down' | 'up'): Hsl {
  const floor = 0.12;
  const ceiling = 0.88;
  let l = hsl.l;
  const step = direction === 'down' ? -0.02 : 0.02;
  for (let i = 0; i < 40; i++) {
    const [r, g, b] = hslToRgb({ ...hsl, l });
    if (contrastRatio(relativeLuminance([r, g, b]), against) >= MIN_CONTRAST) break;
    const next = l + step;
    if (next < floor || next > ceiling) break;
    l = next;
  }
  return { ...hsl, l: clamp(l, floor, ceiling) };
}

export interface AccentPair {
  light: string; // for use on a light page background
  dark: string; // for use on a dark page background
}

export function getAccessibleAccentPair(hex: string): AccentPair {
  const hsl = rgbToHsl(hexToRgb(hex));
  const light = hslToRgb(clampLightness(hsl, WHITE_LUMINANCE, 'down'));
  const dark = hslToRgb(clampLightness(hsl, NEAR_BLACK_LUMINANCE, 'up'));
  return { light: rgbToHex(light), dark: rgbToHex(dark) };
}
