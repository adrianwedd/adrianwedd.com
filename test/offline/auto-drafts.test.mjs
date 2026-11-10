import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const { reconcileManifests, recordObservation, classifyObservation } = await import(`${repo}/scripts/auto-drafts-manifest.mjs`);
const file = 'src/content/blog/paper.md';
const manifestPath = 'data/auto-drafts-seen.json';
const key = 'doi:10.1234/paper';
const md = (date) => `---\ntitle: Paper\ndraft: true\ndate: ${date}\n---\nhttps://doi.org/10.1234/paper\n`;
const entry = { identity: '10.1234/paper', identity_type: 'doi', state: 'new', title: 'Human title',
  reason: 'Keep for review', archive_ref: 'archive/paper.md', first_seen: '2026-01-01',
  last_seen: '2026-02-01', earliest_generation_date: '2025-12-01', sightings: 8 };
const manifest = (candidate) => ({ version: 1, candidates: { [key]: candidate } });

test('reconciliation preserves provenance, monotonic sightings and human dispositions', () => {
  for (const state of ['new', 'rejected', 'harvested', 'triaged']) {
    const m = reconcileManifests(manifest({ ...entry, sightings: 3 }), manifest({ ...entry, state }));
    const obs = classifyObservation(m, { markdown: md('2026-10-05'), filePath: file, seenOn: '2026-10-05' });
    const result = recordObservation(m, { ...obs, markdown: md('2026-10-05') });
    assert.equal(result.sightings, 9);
    assert.equal(result.first_seen, entry.first_seen);
    assert.equal(result.earliest_generation_date, entry.earliest_generation_date);
    assert.equal(result.title, entry.title);
    assert.equal(result.reason, entry.reason);
    assert.equal(result.archive_ref, entry.archive_ref);
    assert.equal(result.state, state === 'new' ? 'aged' : state);
    assert.notEqual(obs.action, 'new');
  }
  const rejected = reconcileManifests(manifest({ ...entry, state: 'new', reason: 'Keep', archive_ref: 'draft.md' }),
    manifest({ ...entry, state: 'rejected', title: 'Rejected title', reason: 'Out of scope', archive_ref: 'rejected.md' }));
  assert.equal(rejected.candidates[key].reason, 'Out of scope');
  assert.equal(rejected.candidates[key].archive_ref, 'rejected.md');
  assert.equal(rejected.candidates[key].title, 'Rejected title');
  assert.throws(() => reconcileManifests(manifest({ ...entry, state: 'rejected' }), manifest({ ...entry, state: 'harvested' })), /TRIAGE CONFLICT/);
});

test('weekly publisher reconciles rolling branch before classification and --check changes nothing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drafts-offline-'));
  const git = (...args) => execFileSync('/usr/bin/git', args, { cwd: root, encoding: 'utf8' }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const snapshot = () => ({ status: git('status', '--porcelain'), refs: git('show-ref'), manifest: fs.readFileSync(path.join(root, manifestPath), 'utf8'), candidate: fs.readFileSync(path.join(root, file), 'utf8') });
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Offline Fixture');
    git('config', 'user.email', 'fixture@example.invalid');
    write(manifestPath, JSON.stringify(manifest({ ...entry, sightings: 1 })));
    git('add', '.'); git('commit', '-m', 'main');
    git('checkout', '-b', 'content/auto-drafts');
    write(manifestPath, JSON.stringify(manifest(entry)));
    write(file, md('2026-02-01'));
    git('add', '.'); git('commit', '-m', 'retained');
    git('update-ref', 'refs/remotes/origin/content/auto-drafts', 'HEAD');
    git('checkout', 'main');
    const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
    write('unrelated.txt', 'staged user work\n');
    git('add', 'unrelated.txt');
    const userIndex = git('diff', '--cached');
    // Remote operations are mocked. Everything else is real git in this disposable fixture.
    write('bin/git', '#!/bin/sh\ncase "$1" in\nfetch) exit 0;;\npush) exec /usr/bin/git update-ref refs/remotes/origin/content/auto-drafts refs/heads/content/auto-drafts;;\n*) exec /usr/bin/git "$@";;\nesac\n');
    write('bin/gh', `#!/bin/sh
case "$1" in
api) echo '{"can_approve_pull_request_reviews":true}';;
repo) echo '{"nameWithOwner":"fixture/offline"}';;
pr)
  if [ "$2" = view ] && [ -f .fixture-no-pr ]; then exit 1; fi
  if [ "$2" = create ]; then printf '%s\\n' "$@" > .fixture-pr-args; fi;;
esac
exit 0
`);
    fs.chmodSync(path.join(bin, 'git'), 0o755); fs.chmodSync(path.join(bin, 'gh'), 0o755);
    const run = (...args) => execFileSync(process.execPath, [path.join(repo, 'scripts/publish-auto-drafts.mjs'), ...args], { cwd: root, env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` }, encoding: 'utf8' });
    for (let i = 0; i < 2; i++) {
      write(file, md(`2026-10-0${i + 4}`));
      const before = snapshot();
      run('--check');
      assert.deepEqual(snapshot(), before);
      run();
      assert.deepEqual(snapshot().status, before.status);
      assert.equal(git('diff', '--cached'), userIndex);
      assert.equal(git('branch', '--show-current'), 'main');
      const seen = JSON.parse(git('show', `content/auto-drafts:${manifestPath}`)).candidates[key];
      assert.equal(seen.sightings, 9 + i);
      assert.equal(seen.first_seen, entry.first_seen);
      assert.equal(seen.earliest_generation_date, entry.earliest_generation_date);
      assert.equal(seen.title, entry.title);
      assert.equal(seen.reason, entry.reason);
      assert.equal(seen.archive_ref, entry.archive_ref);
      assert.throws(() => git('cat-file', '-e', 'content/auto-drafts:unrelated.txt'));
      git('checkout', 'main');
    }
    write(file, md('2026-10-05').replace('10.1234/paper', '10.1234/new'));
    const beforeFresh = snapshot();
    run('--check');
    assert.deepEqual(snapshot(), beforeFresh);
    // Main's explicit rejection overrides an unjudged retained entry.
    write(manifestPath, JSON.stringify(manifest({ ...entry, state: 'rejected' })));
    write(file, md('2026-10-05'));
    run();
    assert.equal(JSON.parse(git('show', `content/auto-drafts:${manifestPath}`)).candidates[key].state, 'rejected');
    // Opposing human decisions fail before files, refs or the index change.
    write(manifestPath, JSON.stringify(manifest({ ...entry, state: 'harvested' })));
    const beforeConflict = snapshot();
    assert.throws(() => run('--check'), /TRIAGE CONFLICT/);
    assert.deepEqual(snapshot(), beforeConflict);
    write(manifestPath, JSON.stringify(manifest({ ...entry, state: 'rejected', title: 'Conflicting human title' })));
    const beforeTitleConflict = snapshot();
    assert.throws(() => run('--check'), /TRIAGE CONFLICT.*title/);
    assert.deepEqual(snapshot(), beforeTitleConflict);
    assert.throws(() => run(), /TRIAGE CONFLICT.*title/);
    assert.deepEqual(snapshot(), beforeTitleConflict);
    write(manifestPath, JSON.stringify(manifest({ ...entry, state: 'rejected' })));
    write('src/content/blog/new-paper.md', md('2026-10-05').replace('10.1234/paper', '10.1234/new'));
    const beforeBound = snapshot();
    assert.throws(() => run('--check', '--max-backlog', '1'), /SAFETY BOUND EXCEEDED/);
    assert.deepEqual(snapshot(), beforeBound);
    write('.fixture-no-pr', 'missing PR');
    run();
    const prArgs = fs.readFileSync(path.join(root, '.fixture-pr-args'), 'utf8');
    assert.match(prArgs, /--head\ncontent\/auto-drafts\n/);
    assert.match(git('show', 'content/auto-drafts:src/content/blog/new-paper.md'), /10\.1234\/new/);
    assert.equal(git('diff', '--cached'), userIndex);
    const other = path.join(root, 'other-worktree');
    git('worktree', 'add', other, 'content/auto-drafts');
    const beforeCheckedOut = snapshot();
    assert.throws(() => run(), /Rolling branch is checked out in a worktree/);
    assert.deepEqual(snapshot(), beforeCheckedOut);

  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// All publication commands below are intercepted; fixtures have no network remote.
function offlineRepo() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'drafts-history-')));
  const git = (...args) => execFileSync('/usr/bin/git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  const write = (rel, text) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Offline Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  const bin = path.join(root, 'bin');
  write('bin/git', '#!/bin/sh\ncase "$1" in\nfetch) exit 0;;\npush) exec /usr/bin/git update-ref refs/remotes/origin/content/auto-drafts refs/heads/content/auto-drafts;;\n*) exec /usr/bin/git "$@";;\nesac\n');
  write('bin/gh', '#!/bin/sh\ncase "$1" in\napi) printf \'{"can_approve_pull_request_reviews":true}\';;\nrepo) printf \'{"nameWithOwner":"fixture/offline"}\';;\nesac\n');
  for (const name of ['git', 'gh']) fs.chmodSync(path.join(bin, name), 0o755);
  write('clock.cjs', `const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [process.env.FIXTURE_DATE])); }
      static now() { return RealDate.parse(process.env.FIXTURE_DATE); }
    };`);
  const run = (script, date, ...args) => execFileSync(process.execPath,
    ['--require', path.join(root, 'clock.cjs'), script, ...args], {
      cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin`, FIXTURE_DATE: `${date}T12:00:00Z` },
    });
  const snapshot = () => {
    const files = {};
    const walk = (dir) => {
      for (const item of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        if (item.name === '.git') continue;
        const rel = path.join(dir, item.name);
        if (item.isDirectory()) walk(rel);
        else files[rel] = fs.readFileSync(path.join(root, rel)).toString('base64');
      }
    };
    walk('');
    return { files, refs: git('show-ref'), head: git('rev-parse', 'HEAD'),
      branch: git('branch', '--show-current'), index: git('ls-files', '--stage'), status: git('status', '--porcelain') };
  };
  return { root, git, write, run, snapshot };
}

const historicalCommit = 'd8d96d6cc702c87c0540510cba7d5c974d4c35f9';
const historicalFile = (ref, rel) => execFileSync('/usr/bin/git', ['show', `${ref}:${rel}`], { cwd: repo, encoding: 'utf8' });

test('literal d8d96d6 regression: old publisher loses history; fixed successive weekly runs retain it', () => {
  // Exact checked-in historical manifests, read locally; no fetch is performed.
  const main = JSON.parse(historicalFile(historicalCommit, manifestPath));
  const retained = JSON.parse(historicalFile(`${historicalCommit}^`, manifestPath));
  const slugKey = 'slug:scraping-linkedin-without-getting-blocked-post';
  const doiKey = 'doi:10.1101/2022.02.14.22270780';
  assert.equal(retained.candidates[slugKey].first_seen, '2026-09-27');
  assert.equal(main.candidates[slugKey].first_seen, '2026-10-04');
  assert.equal(main.candidates[slugKey].sightings, 1);
  for (const field of ['title', 'reason', 'archive_ref']) {
    assert.ok(retained.candidates[doiKey][field]);
    assert.equal(main.candidates[doiKey][field], undefined);
  }
  // The historical slug had no editorial fields. Add explicit retained human
  // annotations to exercise their survival on that exact identity as well.
  Object.assign(retained.candidates[slugKey], {
    title: 'Retained LinkedIn editorial title', reason: 'Keep for human review',
    archive_ref: 'archive/linked-in-review.md',
  });
  // Pinned main snapshot lacked the slug, just like the weekly Actions checkout.
  const mainManifest = JSON.parse(historicalFile('4468f24593c83169fd3b29a0249775196fd6e4f8', manifestPath));
  const slugFile = `src/content/blog/${retained.candidates[slugKey].slug}.md`;
  const doiFile = `src/content/blog/${retained.candidates[doiKey].slug}.md`;
  const slugMarkdown = '---\ntitle: Scraping LinkedIn\ndraft: true\ndate: 2026-05-04\n---\nOffline slug candidate\n';
  for (const legacy of [true, false]) {
    const { root, git, write, run, snapshot } = offlineRepo();
    try {
      write(manifestPath, JSON.stringify(mainManifest));
      write(slugFile, slugMarkdown);
      git('add', manifestPath, slugFile); git('commit', '-m', 'weekly main manifest');
      git('checkout', '-b', 'content/auto-drafts');
      write(manifestPath, JSON.stringify(retained));
      write(slugFile, slugMarkdown);
      git('add', manifestPath, slugFile); git('commit', '-m', 'retained September 27 backlog');
      git('update-ref', 'refs/remotes/origin/content/auto-drafts', 'HEAD');
      git('checkout', 'main');
      let script = path.join(repo, 'scripts/publish-auto-drafts.mjs');
      if (legacy) {
        // Execute the actual pre-fix source, not a simulated regression.
        for (const name of ['publish-auto-drafts.mjs', 'auto-drafts-manifest.mjs']) {
          write(`legacy/${name}`, historicalFile(historicalCommit, `scripts/${name}`));
        }
        script = path.join(root, 'legacy/publish-auto-drafts.mjs');
      }
      for (const [i, date] of ['2026-10-04', '2026-10-11'].entries()) {
        write(slugFile, slugMarkdown);
        write(doiFile, `---\ntitle: Generated title\ndraft: true\ndate: ${date}\n---\nhttps://doi.org/10.1101/2022.02.14.22270780\n`);
        if (!legacy) {
          const before = snapshot();
          const output = run(script, date, '--check');
          assert.match(output, /genuinely new\s+: 0/);
          assert.deepEqual(snapshot(), before);
        }
        const publicationOutput = run(script, date);
        const seen = JSON.parse(git('show', `content/auto-drafts:${manifestPath}`)).candidates;
        if (legacy) {
          assert.equal(seen[slugKey].first_seen, date, publicationOutput);
          assert.equal(seen[slugKey].sightings, 1);
          for (const candidateKey of [slugKey, doiKey]) {
            for (const field of ['title', 'reason', 'archive_ref']) assert.equal(seen[candidateKey][field], undefined);
          }
        } else {
          assert.equal(seen[slugKey].first_seen, '2026-09-27');
          assert.equal(seen[slugKey].sightings, 2 + i);
          assert.equal(seen[slugKey].earliest_generation_date, '2026-05-04');
          assert.equal(seen[doiKey].sightings, 11 + i);
          assert.equal(seen[doiKey].earliest_generation_date, '2026-10-04');
          assert.equal(seen[doiKey].state, 'rejected');
          for (const candidateKey of [slugKey, doiKey]) {
            for (const field of ['title', 'reason', 'archive_ref']) assert.equal(seen[candidateKey][field], retained.candidates[candidateKey][field]);
          }
        }
        git('checkout', 'main');
      }
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  }
});

test('no rolling branch and no new candidates: --check changes neither files nor refs', () => {
  const { root, git, write, run, snapshot } = offlineRepo();
  try {
    write(manifestPath, JSON.stringify(manifest(entry)));
    write(file, md('2026-10-04'));
    git('add', manifestPath, file); git('commit', '-m', 'known candidate, no rolling branch');
    for (const hasCandidates of [true, false]) {
      if (!hasCandidates) fs.unlinkSync(path.join(root, file));
      const before = snapshot();
      const output = run(path.join(repo, 'scripts/publish-auto-drafts.mjs'), '2026-10-04', '--check');
      assert.match(output, /genuinely new\s+: 0/);
      assert.deepEqual(snapshot(), before);
      assert.throws(() => git('rev-parse', '--verify', 'refs/heads/content/auto-drafts'));
    }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
