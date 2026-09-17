#!/usr/bin/env node
/**
 * Publish auto-discovered paper candidates to ONE rolling backlog branch/PR.
 *
 * Replaces the old behaviour in content-pipeline.yml, which created a uniquely
 * named `content/auto-drafts-<timestamp>` branch on every weekly run and then
 * failed at `gh pr create` ("GitHub Actions is not permitted to create or approve
 * pull requests"). No branch was reviewable, merged or expired; 15 accumulated,
 * holding 78 sightings of 8 papers.
 *
 * The transaction invariant this enforces:
 *
 *   A failed PR-publication step must not create an unbounded new remote branch.
 *
 * So the capability to publish is preflighted BEFORE anything is pushed, and the
 * branch name is constant, so a failure can never add refs.
 *
 * Usage:
 *   node scripts/publish-auto-drafts.mjs --preflight
 *   node scripts/publish-auto-drafts.mjs --check             # dry: report, change nothing
 *   node scripts/publish-auto-drafts.mjs                     # publish (needs push rights)
 *   node scripts/publish-auto-drafts.mjs --max-backlog 12
 *
 * Exit codes: 0 ok / no-op, 1 preflight or safety failure, 2 push failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  DEFAULT_MANIFEST_PATH,
  loadManifest,
  saveManifest,
  classifyObservation,
  recordObservation,
} from './auto-drafts-manifest.mjs';

export const ROLLING_BRANCH = 'content/auto-drafts';
export const PR_TITLE = 'Research drafts — rolling backlog';
export const CONTENT_DIR = 'src/content/blog';
export const DEFAULT_MAX_BACKLOG = 20;

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

function git(...a) {
  return execFileSync('git', a, { encoding: 'utf8' }).trim();
}
function gitOk(...a) {
  try {
    execFileSync('git', a, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
function gh(...a) {
  return execFileSync('gh', a, { encoding: 'utf8' }).trim();
}
function ghOk(...a) {
  try {
    execFileSync('gh', a, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Preflight: can this identity publish a PR at all?
 *
 * Called BEFORE any branch is created or pushed. The old workflow discovered
 * this capability was missing only after committing and pushing a fresh branch.
 *
 * Preferred fix is the repository's native Actions setting
 * (`can_approve_pull_request_reviews`). A PAT is deliberately NOT used as a
 * workaround here: it would widen credential scope silently. If policy blocks the
 * native mechanism, the run fails loudly instead.
 */
export function preflight({ ghBin = gh, ghOkBin = ghOk } = {}) {
  const problems = [];
  if (!ghOkBin('auth', 'status')) problems.push('gh is not authenticated');

  let perms = null;
  try {
    perms = JSON.parse(ghBin('api', 'repos/{owner}/{repo}/actions/permissions/workflow'));
  } catch {
    // Endpoint may be unreadable with a fine-grained token; treat as unknown.
  }
  const canCreatePr = perms ? perms.can_approve_pull_request_reviews === true : null;

  if (canCreatePr === false) {
    problems.push(
      'GitHub Actions is not permitted to create pull requests ' +
        '(repos/.../actions/permissions/workflow can_approve_pull_request_reviews = false). ' +
        'Enable: Settings -> Actions -> General -> "Allow GitHub Actions to create and ' +
        'approve pull requests". Refusing to push a new branch instead.',
    );
  }

  let repo = null;
  try {
    repo = JSON.parse(ghBin('repo', 'view', '--json', 'nameWithOwner'));
  } catch {
    /* non-fatal */
  }

  return { ok: problems.length === 0, problems, canCreatePr, repo };
}

function isDraft(text) {
  return /^draft:\s*true\s*$/m.test(text);
}

/** Candidate markdown files on the current checkout (drafts only). */
export function candidateFiles(root = process.cwd()) {
  const dir = path.join(root, CONTENT_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(CONTENT_DIR, f))
    .filter((p) => isDraft(fs.readFileSync(path.join(root, p), 'utf8')));
}

/**
 * Which candidates are genuinely new relative to durable memory?
 * Identity comes from the paper, never the filename or the generated date.
 */
export function partition(manifest, files, root = process.cwd()) {
  const fresh = [];
  const known = [];
  for (const rel of files) {
    const md = fs.readFileSync(path.join(root, rel), 'utf8');
    const cls = classifyObservation(manifest, {
      markdown: md,
      filePath: rel,
      seenOn: new Date().toISOString().slice(0, 10),
    });
    (cls.action === 'new' ? fresh : known).push({ rel, md, cls });
  }
  return { fresh, known };
}

/**
 * Existing backlog count = tracked draft files under CONTENT_DIR.
 * Used only as a safety bound, so unexpected growth alerts instead of silently
 * becoming another orphan branch.
 */
export function backlogCount(root = process.cwd()) {
  return candidateFiles(root).length;
}

async function main() {
  const dry = has('--check') || has('--dry-run');
  const onlyPreflight = has('--preflight');
  const maxBacklog = Number(val('--max-backlog', DEFAULT_MAX_BACKLOG));
  const manifestPath = val('--manifest', DEFAULT_MANIFEST_PATH);

  // 1. Capability preflight FIRST — before any ref exists to leak.
  const pf = preflight();
  if (onlyPreflight) {
    if (!pf.ok) {
      console.error('PREFLIGHT FAILED:');
      for (const p of pf.problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    console.log(`PREFLIGHT OK (can_create_pr=${pf.canCreatePr})`);
    return;
  }

  const manifest = loadManifest(manifestPath);
  const files = candidateFiles();
  const { fresh, known } = partition(manifest, files);
  const backlog = backlogCount();

  console.log(`candidates on checkout : ${files.length}`);
  console.log(`  known (skipped)      : ${known.length}`);
  console.log(`  genuinely new        : ${fresh.length}`);
  console.log(`backlog bound          : ${backlog} / ${maxBacklog}`);

  for (const k of known) {
    const st = manifest.candidates[k.cls.key];
    console.log(`  skip ${k.cls.key} [${st?.state ?? 'unknown'}] sighting #${(st?.sightings ?? 0) + 1}`);
  }

  // 2. Safety bound — backlog growth becomes a failure, not branch proliferation.
  if (backlog > maxBacklog) {
    console.error(
      `SAFETY BOUND EXCEEDED: ${backlog} draft candidates exceeds --max-backlog ${maxBacklog}. ` +
        'Refusing to publish. Triage the rolling PR before the next run.',
    );
    process.exit(1);
  }

  // 3. Successful no-op when there is nothing new.
  //    Repeat sightings are still recorded, so the manifest learns even when the
  //    run publishes nothing — otherwise every week re-adds the same DOI as new.
  if (fresh.length === 0) {
    for (const obs of known) recordObservation(manifest, { ...obs.cls, markdown: obs.md });
    saveManifest(manifestPath, manifest);
    console.log('No genuinely new candidates — successful no-op (no branch, no PR, no commit).');
    return;
  }

  if (dry) {
    console.log(`DRY RUN: would add ${fresh.length} candidate(s) to ${ROLLING_BRANCH} and update the rolling PR.`);
    return;
  }

  // 4. Publishing requires the capability that the old job lacked.
  if (!pf.ok) {
    console.error('REFUSING TO PUSH: preflight failed.');
    for (const p of pf.problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  // 5. One rolling branch. Never timestamped, so failures cannot add refs.
  gitOk('fetch', 'origin', ROLLING_BRANCH);
  const branchExists = gitOk('rev-parse', '--verify', `origin/${ROLLING_BRANCH}`);
  if (branchExists) {
    gitOk('checkout', '-B', ROLLING_BRANCH, `origin/${ROLLING_BRANCH}`);
    gitOk('merge', '--ff-only', `origin/${ROLLING_BRANCH}`);
  } else {
    gitOk('checkout', '-b', ROLLING_BRANCH);
  }

  for (const f of fresh) {
    const dest = path.join(process.cwd(), f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, f.md);
  }

  // Record EVERY observation — new candidates and repeat sightings alike.
  // Without this the manifest never learns, and the same DOI is re-added as new
  // on the next run (which is exactly how the 15 orphan branches were born).
  for (const obs of [...fresh, ...known]) {
    recordObservation(manifest, { ...obs.cls, markdown: obs.md });
  }

  git('add', '--', ...fresh.map((f) => f.rel));
  saveManifest(manifestPath, manifest);
  git('add', '--', manifestPath);

  const staged = gitOk('diff', '--cached', '--quiet') ? false : true;
  if (!staged) {
    console.log('Nothing staged — successful no-op.');
    return;
  }

  git(
    'commit',
    '-m',
    `content(auto-drafts): add ${fresh.length} new candidate(s)\n\n` +
      `Rolling backlog branch. ${ROLLING_BRANCH} is generator-owned and updated by\n` +
      `fast-forward commits; harvest a candidate onto a human-owned branch instead of\n` +
      `editing here.\n\nCandidates:\n${fresh.map((f) => `- ${f.cls.key}`).join('\n')}`,
  );

  if (!gitOk('push', 'origin', `${ROLLING_BRANCH}`)) {
    console.error('PUSH FAILED — no new branch was created (rolling name is fixed).');
    process.exit(2);
  }

  // 6. One corresponding PR: update if present, create only if absent.
  const prExists = ghOk('pr', 'view', ROLLING_BRANCH);
  if (prExists) {
    console.log(`Rolling PR already exists for ${ROLLING_BRANCH} — updated by the push above.`);
  } else {
    const body =
      '## Rolling auto-discovered research drafts\n\n' +
      'Generator-owned backlog. Updated weekly in place by the content pipeline.\n' +
      'All candidates are `draft: true` and require human review.\n\n' +
      '**Triage:** copy a candidate onto its own human-owned branch to harvest it into a\n' +
      'real article, or reject it in `data/auto-drafts-seen.json` so it cannot reappear.\n';
    if (!ghOk('pr', 'create', '--title', PR_TITLE, '--body', body, '--label', 'content')) {
      console.error('PR create failed after push — the rolling branch was updated, not multiplied.');
      process.exit(2);
    }
    console.log('Rolling PR created.');
  }
}

// Only run when invoked directly (so tests can import without side effects).
if (process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`) {
  main().catch((e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  });
}
