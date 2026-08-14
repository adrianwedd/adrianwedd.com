import { describe, expect, it } from 'vitest';
import * as utils from '../../src/lib/utils';
import * as validation from '../../scripts/validate-content.js';

const canonical = {
  asOf: '2026-05-06',
  upstreamCommit: 'e3b850c0d8460435d67fb6cd11781050af9b9754',
  models: 258,
  prompts: 142307,
  techniques: 346,
  benchmarkRuns: 38729,
  gradedResults: 140794,
};

describe('Failure-First stat presentation', () => {
  it('derives exact and compact renderings from numeric facts', () => {
    expect(typeof utils.formatNumber).toBe('function');
    expect(typeof utils.formatCompactNumber).toBe('function');
    expect(utils.formatNumber?.(142307)).toBe('142,307');
    expect(utils.formatCompactNumber?.(142307)).toBe('142k');
    expect(utils.formatCompactNumber?.(140794)).toBe('141k');
  });
});

describe('Failure-First project integrity', () => {
  const validProject = `---
description: 'Adversarial evaluation framework: 258 models, 142k prompts, 346 techniques, 141k graded results.'
---

258 models across the corpus. There are 142,307 prompts spanning 346 techniques.
The corpus includes 38,729 benchmark runs and 140,794 graded results.
`;

  it('accepts canonical values independent of prose punctuation and layout', () => {
    expect(typeof validation.validateFailureFirstProject).toBe('function');
    expect(validation.validateFailureFirstProject?.(validProject, canonical)).toEqual([]);
  });

  it('reports the field and expected rendering when a copied value drifts', () => {
    expect(typeof validation.validateFailureFirstProject).toBe('function');
    const stale = validProject.replace('142,307 prompts', '142,068 prompts');
    expect(validation.validateFailureFirstProject?.(stale, canonical)).toEqual([
      'body is missing canonical prompts value 142,307',
    ]);
  });

  it('rejects stale metric copies even when the canonical rendering is also present', () => {
    const contradictory = `${validProject}\nEarlier draft: 142,068 prompts.`;
    expect(validation.validateFailureFirstProject?.(contradictory, canonical)).toEqual([
      'body contains non-canonical prompts value 142,068 (expected 142,307)',
    ]);
  });

  it('rejects a contradictory compact value in project frontmatter', () => {
    const contradictory = validProject.replace('142k prompts', '142k prompts (formerly 140k prompts)');
    expect(validation.validateFailureFirstProject?.(contradictory, canonical)).toEqual([
      'description contains non-canonical prompts value 140k (expected 142k)',
    ]);
  });
});

describe('Failure-First upstream comparison', () => {
  it('reports metric drift and the exact upstream revision consulted', () => {
    expect(typeof validation.compareFailureFirstStats).toBe('function');
    const local = { ...canonical, models: 257 };
    const upstream = {
      commit: canonical.upstreamCommit,
      committedAt: '2026-05-06T03:16:59Z',
      totals: {
        models_evaluated: 258,
        prompts: 142307,
        techniques: 346,
        results: 140794,
      },
    };

    expect(validation.compareFailureFirstStats?.(local, upstream)).toEqual([
      `models differs: local 257, upstream 258 (${canonical.upstreamCommit})`,
    ]);
  });

  it('rejects a stale pin and a synchronization date masquerading as evidence time', () => {
    const local = { ...canonical, asOf: '2026-08-14', upstreamCommit: 'old-revision' };
    const upstream = {
      commit: canonical.upstreamCommit,
      committedAt: '2026-05-06T03:16:59Z',
      totals: {
        models_evaluated: 258,
        prompts: 142307,
        techniques: 346,
        results: 140794,
      },
    };

    expect(validation.compareFailureFirstStats?.(local, upstream)).toEqual([
      `upstreamCommit differs: local old-revision, upstream ${canonical.upstreamCommit} (${canonical.upstreamCommit})`,
      `asOf differs: local 2026-08-14, upstream evidence date 2026-05-06 (${canonical.upstreamCommit})`,
    ]);
  });

  it('rejects disagreement with the pinned programme stats module', () => {
    const upstream = {
      commit: canonical.upstreamCommit,
      committedAt: '2026-05-06T03:16:59Z',
      totals: { models_evaluated: 258, prompts: 142307, techniques: 346, results: 140794 },
      statsCommit: 'b93768fad966041645b2b99f4302e76456abe7f1',
      statsTotals: { models: 258, prompts: 142307, techniques: 346, runs: 38730, results: 140794 },
    };
    expect(validation.compareFailureFirstStats?.(canonical, upstream)).toEqual([
      'benchmarkRunsCommit differs: local undefined, upstream b93768fad966041645b2b99f4302e76456abe7f1 (b93768fad966041645b2b99f4302e76456abe7f1)',
      'benchmarkRuns differs: local 38729, upstream 38730 (b93768fad966041645b2b99f4302e76456abe7f1)',
    ]);
  });

  it('rejects provenance labels that do not identify the consulted artifacts', () => {
    const upstream = {
      commit: canonical.upstreamCommit,
      committedAt: '2026-05-06T03:16:59Z',
      artifact: 'adrianwedd/failure-first:MANIFEST.json',
      totals: { models_evaluated: 258, prompts: 142307, techniques: 346, results: 140794 },
    };
    expect(validation.compareFailureFirstStats?.({ ...canonical, upstreamArtifact: 'wrong:path' }, upstream)).toEqual([
      'upstreamArtifact differs: local wrong:path, consulted adrianwedd/failure-first:MANIFEST.json (e3b850c0d8460435d67fb6cd11781050af9b9754)',
    ]);
  });
});
