import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import {
  identityOf,
  normaliseDoi,
  normaliseOpenAlex,
  generatedDateOf,
  classifyObservation,
  recordObservation,
  loadManifest,
  saveManifest,
  hashWithoutDate,
  DEFAULT_MANIFEST_PATH,
} from '../../scripts/auto-drafts-manifest.mjs';
import {
  ROLLING_BRANCH,
  preflight,
  candidateFiles,
  partition,
  backlogCount,
} from '../../scripts/publish-auto-drafts.mjs';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'auto-drafts-'));
  roots.push(root);
  mkdirSync(resolve(root, 'src/content/blog'), { recursive: true });
  return root;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

interface StubOpts {
  date: string;
  doi?: string;
  openalex?: string;
  slug?: string;
  citations?: number;
  title?: string;
}

/** A machine-generated candidate stub, parameterised by generated date. */
function stub({ date, doi, openalex, slug, citations = 96, title = 'A Paper' }: StubOpts) {
  return `---
title: "${title}"
description: "Authors: Someone"
date: ${date}
tags: ["ai", "security", "research"]
draft: true
---

# ${title}

**Authors:** Someone

**Published:** 2024 | **Citations:** ${citations}

**DOI:** [https://doi.org/${doi ?? '10.1234/example'}](https://doi.org/${doi ?? '10.1234/example'})
${openalex ? `\nOpenAlex: https://openalex.org/${openalex}\n` : ''}
## Abstract

Body text that never changes.
${slug ? `\n<!-- ${slug} -->\n` : ''}`;
}

function writeCandidate(root: string, name: string, content: string) {
  const p = resolve(root, 'src/content/blog', `${name}.md`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  return `src/content/blog/${name}.md`;
}

describe('stable paper identity', () => {
  it('prefers DOI over everything else', () => {
    const md = stub({ date: '2026-05-31', doi: '10.48550/arXiv.2402.00888', openalex: 'W1234567890' });
    expect(identityOf(md, 'src/content/blog/whatever.md')).toEqual({
      key: 'doi:10.48550/arxiv.2402.00888',
      type: 'doi',
      value: '10.48550/arxiv.2402.00888',
    });
  });

  it('falls back to the OpenAlex ID when there is no DOI', () => {
    const md = stub({ date: '2026-05-31', openalex: 'W2987654321' }).replace(/DOI:.*$/m, '');
    expect(identityOf(md, 'src/content/blog/x.md')).toEqual({
      key: 'openalex:W2987654321',
      type: 'openalex',
      value: 'W2987654321',
    });
  });

  it('falls back to the canonical slug when neither is present', () => {
    const md = stub({ date: '2026-05-31' }).replace(/DOI:.*$/m, '');
    expect(identityOf(md, 'src/content/blog/economic-outcomes-in-adulthood-x.md')).toEqual({
      key: 'slug:economic-outcomes-in-adulthood-x',
      type: 'slug',
      value: 'economic-outcomes-in-adulthood-x',
    });
  });

  it('normalises DOI wrappers so the same paper keys identically', () => {
    expect(normaliseDoi('https://doi.org/10.1101/145581')).toBe('10.1101/145581');
    expect(normaliseDoi('https://dx.doi.org/10.1101/145581.')).toBe('10.1101/145581');
    expect(normaliseDoi('doi: 10.1101/145581')).toBe('10.1101/145581');
    expect(normaliseDoi('not-a-doi')).toBeNull();
  });

  it('extracts an OpenAlex work id from a URL', () => {
    expect(normaliseOpenAlex('https://openalex.org/W2741809807')).toBe('W2741809807');
    expect(normaliseOpenAlex('nope')).toBeNull();
  });
});

describe('duplicate candidate with only a changed generation date', () => {
  it('is a duplicate, not new — the whole point of identity keying', () => {
    const manifest = loadManifest('/nonexistent/path.json');
    const first = stub({ date: '2026-05-31', doi: '10.1101/145581', citations: 188 });
    const c1 = classifyObservation(manifest, {
      markdown: first,
      filePath: 'src/content/blog/genome-wide.md',
      seenOn: '2026-05-31',
    });
    expect(c1.action).toBe('new');
    const e = recordObservation(manifest, { ...c1, markdown: first });
    expect(e.first_seen).toBe('2026-05-31');
    expect(e.earliest_generation_date).toBe('2026-05-31');

    // Next Sunday: same paper, restamped date AND a refreshed citation count.
    const second = stub({ date: '2026-06-07', doi: '10.1101/145581', citations: 189 });
    const c2 = classifyObservation(manifest, {
      markdown: second,
      filePath: 'src/content/blog/genome-wide.md',
      seenOn: '2026-06-07',
    });
    expect(c2.action).toBe('duplicate');
    expect(c2.key).toBe(c1.key);
    expect(generatedDateOf(second)).toBe('2026-06-07');

    // Recorded as a sighting; the first OBSERVATION date is never overwritten,
    // and the earliest generated date is not promoted by the restamp.
    const e2 = recordObservation(manifest, { ...c2, markdown: second });
    expect(e2.first_seen).toBe('2026-05-31');
    expect(e2.last_seen).toBe('2026-06-07');
    expect(e2.earliest_generation_date).toBe('2026-05-31');
    expect(e2.sightings).toBe(2);
  });

  it('treats date + citation drift as benign, not as changed content', () => {
    const a = stub({ date: '2026-05-31', doi: '10.1101/145581', citations: 188 });
    const b = stub({ date: '2026-06-07', doi: '10.1101/145581', citations: 189 });
    expect(hashWithoutDate(a)).toBe(hashWithoutDate(b));
  });
});

describe('repeated DOI across weekly runs', () => {
  it('never creates a second "new" for the same DOI, over many weeks', () => {
    const manifest = loadManifest('/nonexistent/path.json');
    const dates = ['2026-05-31', '2026-06-07', '2026-06-14', '2026-06-28'];
    const actions: string[] = [];
    dates.forEach((d) => {
      const md = stub({ date: d, doi: '10.31222/osf.io/k7a9p' });
      const cls = classifyObservation(manifest, {
        markdown: md,
        filePath: 'src/content/blog/bridging-neurodiversity.md',
        seenOn: d,
      });
      actions.push(cls.action);
      recordObservation(manifest, { ...cls, markdown: md });
    });
    expect(actions).toEqual(['new', 'duplicate', 'duplicate', 'duplicate']);
    expect(Object.keys(manifest.candidates)).toHaveLength(1);
    expect(manifest.candidates['doi:10.31222/osf.io/k7a9p'].sightings).toBe(4);
  });

  it('does not resurrect a rejected candidate when the date changes', () => {
    const manifest = loadManifest('/nonexistent/path.json');
    const md = stub({ date: '2026-05-31', doi: '10.48550/arxiv.2311.03191' });
    const cls = classifyObservation(manifest, {
      markdown: md,
      filePath: 'src/content/blog/deep.md',
      seenOn: '2026-05-31',
    });
    const e = recordObservation(manifest, { ...cls, markdown: md });
    e.state = 'rejected';

    const restamped = stub({ date: '2026-06-07', doi: '10.48550/arxiv.2311.03191' });
    const again = classifyObservation(manifest, {
      markdown: restamped,
      filePath: 'src/content/blog/deep.md',
      seenOn: '2026-06-07',
    });
    expect(again.action).toBe('rejected');
    expect(again.action).not.toBe('new');
  });
});

describe('OpenAlex fallback identity', () => {
  it('dedupes two sightings that share an OpenAlex id but differ in date', () => {
    const manifest = loadManifest('/nonexistent/path.json');
    const a = stub({ date: '2026-07-19', openalex: 'W2987654321' }).replace(/DOI:.*$/m, '');
    const b = stub({ date: '2026-07-26', openalex: 'W2987654321' }).replace(/DOI:.*$/m, '');
    const c1 = classifyObservation(manifest, { markdown: a, filePath: 'src/content/blog/p.md', seenOn: '2026-07-19' });
    expect(c1.identity.type).toBe('openalex');
    recordObservation(manifest, { ...c1, markdown: a });
    const c2 = classifyObservation(manifest, { markdown: b, filePath: 'src/content/blog/p.md', seenOn: '2026-07-26' });
    expect(c2.action).toBe('duplicate');
  });
});

describe('ageing is provenance, not deletion', () => {
  it('marks a repeatedly-unjudged candidate aged without removing it', () => {
    const manifest = loadManifest('/nonexistent/path.json');
    const md = stub({ date: '2026-05-31', doi: '10.1101/145581' });
    const c1 = classifyObservation(manifest, { markdown: md, filePath: 'src/content/blog/g.md', seenOn: '2026-05-31' });
    recordObservation(manifest, { ...c1, markdown: md });

    const longAfter = classifyObservation(manifest, {
      markdown: md,
      filePath: 'src/content/blog/g.md',
      seenOn: '2026-12-31',
      ageDays: 30,
    });
    expect(longAfter.state).toBe('aged');
    expect(longAfter.action).toBe('duplicate');
    // Entry still present and complete.
    recordObservation(manifest, { ...longAfter, markdown: md });
    const e = manifest.candidates['doi:10.1101/145581'];
    expect(e.first_seen).toBe('2026-05-31');
    expect(e.sightings).toBe(2);
  });
});

describe('no-new-paper run is a successful no-op', () => {
  it('reports zero fresh candidates when every file is already known', () => {
    const root = fixture();
    const md = stub({ date: '2026-05-31', doi: '10.1101/145581' });
    const rel = writeCandidate(root, 'genome', md);

    const manifest = loadManifest('/nonexistent/path.json');
    const c1 = classifyObservation(manifest, { markdown: md, filePath: rel, seenOn: '2026-05-31' });
    recordObservation(manifest, { ...c1, markdown: md });

    const { fresh, known } = partition(manifest, candidateFiles(root), root);
    expect(candidateFiles(root)).toEqual([rel]);
    expect(fresh).toHaveLength(0);
    expect(known).toHaveLength(1);
    expect(backlogCount(root)).toBe(1);
  });

  it('ignores non-draft files when counting the backlog', () => {
    const root = fixture();
    writeCandidate(root, 'live', stub({ date: '2026-05-31', doi: '10.1/x' }).replace('draft: true', 'draft: false'));
    writeCandidate(root, 'draft', stub({ date: '2026-05-31', doi: '10.1/y' }));
    expect(backlogCount(root)).toBe(1);
  });
});

describe('PR creation unavailable', () => {
  it('fails preflight BEFORE any branch would be pushed', () => {
    const pf = preflight({
      ghBin: () => JSON.stringify({ default_workflow_permissions: 'read', can_approve_pull_request_reviews: false }),
      ghOkBin: () => true,
    });
    expect(pf.ok).toBe(false);
    expect(pf.canCreatePr).toBe(false);
    expect(pf.problems.join(' ')).toMatch(/not permitted to create pull requests/i);
  });

  it('passes preflight when the native Actions permission is enabled', () => {
    const pf = preflight({
      ghBin: () => JSON.stringify({ can_approve_pull_request_reviews: true }),
      ghOkBin: () => true,
    });
    expect(pf.ok).toBe(true);
    expect(pf.canCreatePr).toBe(true);
  });

  it('does not silently fall back to a PAT', () => {
    const src = readFileSync('scripts/publish-auto-drafts.mjs', 'utf8');
    expect(src).not.toMatch(/PIPELINE_PAT|GH_TOKEN\s*[:=]\s*process\.env/);
  });
});

describe('PR already exists', () => {
  it('reuses one fixed rolling branch name, never a timestamped one', () => {
    expect(ROLLING_BRANCH).toBe('content/auto-drafts');
    expect(ROLLING_BRANCH).not.toMatch(/\d{8}/);
    const src = readFileSync('scripts/publish-auto-drafts.mjs', 'utf8');
    // No date-stamped branch construction anywhere.
    expect(src).not.toMatch(/auto-drafts-\$\{?\(?date|auto-drafts-\$\(date/);
    // The PR path must check for an existing PR before creating one.
    expect(src).toMatch(/pr',\s*'view'/);
  });
});

describe('concurrent-run protection', () => {
  it('declares a concurrency group in the workflow', () => {
    const wf = readFileSync('.github/workflows/content-pipeline.yml', 'utf8');
    expect(wf).toMatch(/^concurrency:/m);
    expect(wf).toMatch(/^\s+group:\s*content-pipeline/m);
    expect(wf).toMatch(/^\s+cancel-in-progress:\s*false/m);
  });
});

describe('durable seen/triaged manifest', () => {
  it('round-trips and keeps stable key order', () => {
    const root = fixture();
    const p = resolve(root, 'data/auto-drafts-seen.json');
    const manifest = loadManifest(p);
    const md = stub({ date: '2026-05-31', doi: '10.1101/145581' });
    const cls = classifyObservation(manifest, {
      markdown: md,
      filePath: 'src/content/blog/g.md',
      seenOn: '2026-05-31',
    });
    recordObservation(manifest, { ...cls, markdown: md });
    saveManifest(p, manifest);

    const back = loadManifest(p);
    expect(Object.keys(back.candidates)).toEqual(['doi:10.1101/145581']);
    expect(back.candidates['doi:10.1101/145581'].state).toBe('new');
    expect(readFileSync(p, 'utf8').endsWith('\n')).toBe(true);
  });

  it('ships a manifest that lives inside the repo, not the failure-mode branches', () => {
    expect(DEFAULT_MANIFEST_PATH).toBe('data/auto-drafts-seen.json');
    expect(DEFAULT_MANIFEST_PATH).not.toMatch(/refs|origin/);
  });

  it('never scans historical remote branches during normal operation', () => {
    const src = readFileSync('scripts/publish-auto-drafts.mjs', 'utf8');
    expect(src).not.toMatch(/for-each-ref|branch -a|ls-remote/);
  });
});
