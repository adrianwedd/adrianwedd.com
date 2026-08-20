/**
 * Pure geometry functions for the Bottom Pub Project case study charts (A1, A3, B2).
 * Formulas are re-typed from bottom.pub's frozen chart-geometry plan
 * (docs/superpowers/plans/2026-08-20-what-cygnet-told-us-story.md, written before
 * implementation) and its internal/corpus/analysis/pass1/visual-prototypes-v2.html
 * B2 encoding receipt. Kept pure and exported so the vitest suite can assert the
 * same geometry the page renders.
 */

export type CohortPair = {
  slug: string;
  label: string;
  group: 'conditions' | 'info';
  pledged: number;
  not_pledged: number;
};

export type CohortMeta = {
  financial_survey_n: number;
  pledge_linked_n: number;
  no_linked_pledge_n: number;
};

export type ComputedPair = CohortPair & {
  p90: number;
  p55: number;
  delta: number;
  pooled: number;
};

export function computePairs(pairs: CohortPair[], meta: CohortMeta): ComputedPair[] {
  const n90 = meta.pledge_linked_n;
  const n55 = meta.no_linked_pledge_n;
  const nfin = meta.financial_survey_n;
  return pairs.map((p) => {
    const p90 = (p.pledged / n90) * 100;
    const p55 = (p.not_pledged / n55) * 100;
    return { ...p, p90, p55, delta: p90 - p55, pooled: ((p.pledged + p.not_pledged) / nfin) * 100 };
  });
}

/** A3 tension field: x = Δpp / 16 × half-width; y = pooled prevalence, linear max→min. */
export function a3Position(
  pair: ComputedPair,
  pooledMax: number,
  pooledMin: number,
  frame: { cx: number; half: number; yTop: number; yBot: number },
): { x: number; y: number } {
  const DELTA_SPAN = 16;
  const x = frame.cx + (pair.delta / DELTA_SPAN) * frame.half;
  const y = frame.yTop + ((pooledMax - pair.pooled) / (pooledMax - pooledMin)) * (frame.yBot - frame.yTop);
  return { x, y };
}

/** Thread stroke width, per the frozen encoding receipt: cohort% / 18. */
export function a3ThreadWidth(cohortPercent: number): number {
  return cohortPercent / 18;
}

/** A1 dumbbell: a value on a shared 0–100% axis. */
export function a1x(percent: number, x0: number, x1: number): number {
  return x0 + (percent / 100) * (x1 - x0);
}

/**
 * B2 "capacity weather map": radial distance is quantitative, abundance moves
 * toward the core. r(count) = 172 − (count / 9) × 108. Rings at 0/3/6/9 ticks.
 * count = 9 -> r = 64 (innermost data ring). count = 0 -> r = 172 (outermost,
 * the dashed absence orbit for "legal").
 */
export function b2Radius(count: number): number {
  return 172 - (count / 9) * 108;
}

export const B2_RINGS = [0, 3, 6, 9] as const;
export const B2_OUTER_R = 172;
export const B2_INNER_R = 64;

/**
 * Golden-angle packing offsets for the dots within one B2 cluster — purely
 * decorative swarm placement around the cluster centre, carries no data. The
 * golden angle (≈137.508°) is the standard low-collision packing increment.
 */
export function goldenAnglePack(count: number, spacing: number): Array<{ dx: number; dy: number }> {
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const r = spacing * Math.sqrt(i + 0.5);
    const theta = i * GOLDEN_ANGLE;
    return { dx: r * Math.cos(theta), dy: r * Math.sin(theta) };
  });
}
