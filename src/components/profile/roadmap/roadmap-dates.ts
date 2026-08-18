/**
 * Date parsing + Hebrew duration formatting for the roadmap.
 *
 * Entity date metadata is not uniform: experiences carry `meta.start`/`meta.end`
 * as "YYYY-MM", education carries a year-only `meta.end` ("2016"), and project
 * entities carry no dates at all. Everything here degrades to `undefined`
 * rather than throwing or inventing a date.
 */

/** Decimal year: "2021-07" → 2021.5, "2016" → 2016. */
export function parseDateValue(raw: unknown): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) return Number(yearOnly[1]);
  const yearMonth = /^(\d{4})-(\d{1,2})$/.exec(trimmed);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);
    if (month < 1 || month > 12) return year;
    return year + (month - 1) / 12;
  }
  return undefined;
}

export function currentDateValue(): number {
  const now = new Date();
  return now.getFullYear() + now.getMonth() / 12;
}

function formatYear(value: number): string {
  return String(Math.floor(value));
}

/** "2.5 שנים", "8 חודשים", "שנה" */
export function formatDuration(startValue: number, endValue: number): string | undefined {
  const months = Math.round((endValue - startValue) * 12);
  if (months <= 0) return undefined;
  if (months < 12) return `${months} חודשים`;
  const years = months / 12;
  if (Math.round(years * 10) === 10) return 'שנה';
  const rounded = Math.round(years * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} שנים`;
}

/** "2021–2024", "2021–היום" */
export function formatRange(startValue: number, endValue: number, ongoing: boolean): string {
  const from = formatYear(startValue);
  if (ongoing) return `${from}–היום`;
  const to = formatYear(endValue);
  return from === to ? from : `${from}–${to}`;
}
