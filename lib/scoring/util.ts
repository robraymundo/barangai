/**
 * Shared numeric helpers for the deterministic scoring engine.
 * Pure functions only — no I/O, no randomness, no Date.now().
 */

/** Clamp a number into [min, max]. */
export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamp into the 0..100 score range and round to 1 decimal for stable display/tests. */
export function toScore(value0to1: number): number {
  return round1(clamp(value0to1, 0, 1) * 100);
}

/** Round to one decimal place — keeps scores stable and test assertions exact. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Round to a whole number. */
export function round0(value: number): number {
  return Math.round(value);
}

/**
 * Min-max normalize a raw value into 0..1 given a reference range. Values outside the
 * range are clamped. If lo === hi, returns 0 (no information).
 */
export function normalize(value: number, lo: number, hi: number): number {
  if (hi === lo) return 0;
  return clamp((value - lo) / (hi - lo), 0, 1);
}

/** Inverse normalize: high raw value → low normalized score (e.g. income, housing). */
export function normalizeInverse(value: number, lo: number, hi: number): number {
  return 1 - normalize(value, lo, hi);
}

/** Population-weighted mean of per-zone values. Falls back to a plain mean if weights sum to 0. */
export function weightedMean(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }
  const weighted = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return weighted / totalWeight;
}

/** Assert (in dev/tests) that a weight map sums to ~1. Returns the same object for chaining. */
export function assertWeightsSumToOne<T>(weights: T, label: string): T {
  const sum = Object.values(weights as Record<string, number>).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error(`${label} weights must sum to 1, got ${sum}`);
  }
  return weights;
}
