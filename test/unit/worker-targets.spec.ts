import { describe, it, expect } from 'vitest';
import { WORKERS, selectTargets } from '../../scripts/worker-targets.mjs';

describe('selectTargets', () => {
  it('dispatch "all" returns every worker', () => {
    expect(selectTargets({ dispatchTarget: 'all' }).map((w) => w.key).sort()).toEqual([
      'csp',
      'mta-sts',
      'social',
    ]);
  });
  it('dispatch of a single worker returns just that one', () => {
    expect(selectTargets({ dispatchTarget: 'csp' })).toEqual([WORKERS.csp]);
  });
  it('push maps changed files to their worker dirs', () => {
    expect(
      selectTargets({ changedFiles: ['worker-csp/src/index.ts', 'README.md'] }).map((w) => w.key),
    ).toEqual(['csp']);
  });
  it('push matches the dir prefix but not a lookalike sibling', () => {
    expect(selectTargets({ changedFiles: ['worker/src/index.ts'] }).map((w) => w.key)).toEqual([
      'social',
    ]);
  });
  it('push with no worker changes returns nothing', () => {
    expect(selectTargets({ changedFiles: ['src/pages/index.astro'] })).toEqual([]);
  });
  it('mta-sts is flagged hasPkg:false', () => {
    expect(WORKERS['mta-sts'].hasPkg).toBe(false);
    expect(WORKERS.social.hasPkg).toBe(true);
  });
});
