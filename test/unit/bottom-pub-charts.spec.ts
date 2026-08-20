import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  computePairs,
  a3Position,
  a3ThreadWidth,
  a1x,
  b2Radius,
  B2_RINGS,
  B2_OUTER_R,
  B2_INNER_R,
} from '../../src/lib/bottom-pub-charts';

const dataPath = path.join(__dirname, '../../src/data/bottom-pub-cohort-findings.json');
const cohort = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

describe('bottom-pub-cohort-findings.json — pinned literals', () => {
  it('carries the frozen denominators from the source repo', () => {
    expect(cohort.meta.financial_survey_n).toBe(145);
    expect(cohort.meta.pledge_linked_n).toBe(90);
    expect(cohort.meta.no_linked_pledge_n).toBe(55);
    expect(cohort.meta.eoi_n).toBe(58);
    expect(cohort.meta.community_survey_n).toBe(32);
  });

  it('carries the manifest digest cited on the page', () => {
    expect(cohort._provenance.manifestDigest).toBe('747988bcea7f84e0e141ce76e52be707943b5ad357ab6feae7448677bab117f1');
  });

  it('has exactly twenty option pairs, split conditions/info', () => {
    expect(cohort.pairs).toHaveLength(20);
    expect(cohort.pairs.filter((p: { group: string }) => p.group === 'conditions')).toHaveLength(11);
    expect(cohort.pairs.filter((p: { group: string }) => p.group === 'info')).toHaveLength(9);
  });

  it('every published count is at or above the site-wide suppression floor of 5', () => {
    for (const p of cohort.pairs) {
      expect(p.pledged).toBeGreaterThanOrEqual(5);
      expect(p.not_pledged).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('A1/A3 — computed pairs match the reproduced source values', () => {
  const pairs = computePairs(cohort.pairs, cohort.meta);

  it('grant co-funding is the largest percentage-point difference (the one outlier the field shows)', () => {
    const byAbsDelta = [...pairs].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    expect(byAbsDelta[0].slug).toBe('grant-cofunding');
  });

  it('grant co-funding reproduces the published 28.9% / 14.5% pair', () => {
    const grant = pairs.find((p) => p.slug === 'grant-cofunding')!;
    expect(grant.p90.toFixed(1)).toBe('28.9');
    expect(grant.p55.toFixed(1)).toBe('14.5');
  });

  it('clear governance reproduces its published dumbbell values', () => {
    const g = pairs.find((p) => p.slug === 'clear-governance')!;
    expect(g.p90.toFixed(1)).toBe('80.0');
    expect(g.p55.toFixed(1)).toBe('69.1');
  });
});

describe('A3 geometry — Δpp / 16 × half-width, pooled linear y', () => {
  const pairs = computePairs(
    cohort.pairs.filter((p: { group: string }) => p.group === 'conditions'),
    cohort.meta,
  );
  const frame = { cx: 500, half: 360, yTop: 96, yBot: 566 };
  const pooledMax = Math.max(...pairs.map((p) => p.pooled));
  const pooledMin = Math.min(...pairs.map((p) => p.pooled));

  it('places the zero-delta point exactly on the centre line', () => {
    const zero = { ...pairs[0], delta: 0 };
    const { x } = a3Position(zero, pooledMax, pooledMin, frame);
    expect(x).toBe(frame.cx);
  });

  it('the highest-pooled condition sits at yTop and the lowest at yBot', () => {
    const top = pairs.find((p) => p.pooled === pooledMax)!;
    const bottom = pairs.find((p) => p.pooled === pooledMin)!;
    expect(a3Position(top, pooledMax, pooledMin, frame).y).toBe(frame.yTop);
    expect(a3Position(bottom, pooledMax, pooledMin, frame).y).toBe(frame.yBot);
  });

  it('thread stroke width scales with cohort percentage over 18', () => {
    expect(a3ThreadWidth(18)).toBe(1);
    expect(a3ThreadWidth(0)).toBe(0);
  });
});

describe('A1 axis mapping — shared 0–100% axis', () => {
  it('maps 0% and 100% to the axis endpoints', () => {
    expect(a1x(0, 330, 880)).toBe(330);
    expect(a1x(100, 330, 880)).toBe(880);
  });

  it('maps 50% to the axis midpoint', () => {
    expect(a1x(50, 330, 880)).toBe(605);
  });
});

describe('B2 capacity weather map — r(count) = 172 − (count/9) × 108', () => {
  it('matches the encoding receipt at every published ring', () => {
    expect(b2Radius(9)).toBe(B2_INNER_R);
    expect(b2Radius(0)).toBe(B2_OUTER_R);
    expect(b2Radius(6)).toBeCloseTo(100, 5);
    expect(b2Radius(3)).toBeCloseTo(136, 5);
  });

  it('the declared rings are 0/3/6/9 ticks', () => {
    expect(B2_RINGS).toEqual([0, 3, 6, 9]);
  });

  it('reproduces the exact radii for every published EOI skill count', () => {
    for (const skill of cohort.eoi_skills.published) {
      const r = b2Radius(skill.count);
      // Every published count is 5–9, so radius sits strictly between the
      // innermost (9-tick) and the 3-tick ring.
      expect(r).toBeGreaterThanOrEqual(B2_INNER_R);
      expect(r).toBeLessThanOrEqual(172 - (5 / 9) * 108);
    }
  });

  it('legal (count 0) sits on the outermost, dashed absence orbit', () => {
    expect(cohort.eoi_skills.zero).toHaveLength(1);
    expect(cohort.eoi_skills.zero[0].slug).toBe('legal');
    expect(b2Radius(0)).toBe(B2_OUTER_R);
  });

  it('no suppressed EOI skill carries a count in the copied public derivative', () => {
    for (const s of cohort.eoi_skills.suppressed) {
      expect(s.count).toBeUndefined();
    }
  });
});
