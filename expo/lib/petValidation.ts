/**
 * Small pure validators for pet input, so a typo can't store nonsense (e.g.
 * 9999 lb or a negative age). Used by the Add Pet flow / local persistence.
 */

export const MAX_AGE_YEARS = 40;
export const MAX_WEIGHT_LB = 400;

function toNumber(n: number | string | undefined): number {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v) ? (v as number) : 0;
}

export function clampAge(years: number | string | undefined): number {
  return Math.max(0, Math.min(MAX_AGE_YEARS, toNumber(years)));
}

export function clampWeight(lb: number | string | undefined): number {
  return Math.max(0, Math.min(MAX_WEIGHT_LB, toNumber(lb)));
}
