# Worker Deploy Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-deploy the three Cloudflare Workers on merge to `main`, gated by a GitHub Environment approval, with post-deploy edge verification, auto-rollback on failure, and a nightly drift check.

**Architecture:** One workflow (`.github/workflows/worker-deploy.yml`) drives four small Node scripts (target selector, wrangler-deployments parser, edge-verification prober, drift classifier) plus one bash deploy step. Deploy jobs reference a gated `worker-production` environment (write token); the ungated drift job uses a separate repo-level read-only token. All wrangler invocations use a pinned binary from `worker/node_modules/`.

**Tech Stack:** GitHub Actions, Node 22 (ESM `.mjs`), vitest (root `test:unit` suite), wrangler 4 (pinned via `worker/`), bash.

## Global Constraints

- **Two Cloudflare tokens.** `CLOUDFLARE_API_TOKEN` (Edit Workers) lives in the **gated** `worker-production` environment; `CLOUDFLARE_API_TOKEN_READONLY` (Read Workers) is a **repo-level** secret used only by the drift job. `CLOUDFLARE_ACCOUNT_ID` is repo-level. CI never handles the 14 platform secrets.
- **No platform-secret exposure.** `wrangler deploy` inherits existing secrets; never add `wrangler secret put` to CI.
- **Pinned wrangler.** Every job that runs wrangler first runs `npm --prefix worker ci` (worker pins `wrangler@^4.100.0`) and exports `WRANGLER_BIN=<workspace>/worker/node_modules/.bin/wrangler`. Scripts read `process.env.WRANGLER_BIN ?? 'npx wrangler'` so they work locally too. Never rely on a bare `npx wrangler` in CI (unpinned download, and `worker-mta-sts/` has no `node_modules`).
- **`mta-sts` has no `package.json`** — never run `npm ci`/tests in `worker-mta-sts/`.
- **SHA-pin actions** per repo convention: `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`, `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`.
- **`permissions: contents: read`** at workflow top level; nothing else.
- **Lint only via `npm run lint`** (`eslint .`). Never `eslint <file>` — single-file invocation hits a broken `astro-eslint-parser` transitive and errors spuriously (an environment quirk, not a code issue).
- **CSP verification checks the body too:** the header nonce must also appear in the HTML body (proves the worker rewrote the page, not just set a header).
- **`/api/health` is a liveness probe only** (unauth response is `{"ok":true}`).
- **Rollback targets an explicit captured version id** (never the bare default). If rollback exits non-zero, print a loud MANUAL-INTERVENTION message (a Durable Object migration or a changed secret can block it) and fail — do not silently continue.
- Unit tests go in `test/unit/*.spec.ts` (picked up by `npm run test:unit`); scripts live in `scripts/*.mjs`.

## File structure

- `scripts/worker-targets.mjs` — worker registry + `selectTargets()`; CLI emits the deploy matrix.
- `scripts/wrangler-deployments.mjs` — `extractDeployMessage()`, `currentVersionId()`, `listDeployments()`; CLI prints the current version id or the deploy message.
- `scripts/verify-worker.mjs` — pure assertion fns + a retrying `probe()`; CLI verifies one worker at the live edge.
- `scripts/worker-drift.mjs` — `parseDeployedSha()` + `classifyDrift()`; CLI checks all workers, fails on drift.
- `scripts/worker-deploy-step.sh` — capture-prev / install / test / deploy / verify / rollback for one worker.
- `.github/workflows/worker-deploy.yml` — the workflow.
- `test/unit/{worker-targets,wrangler-deployments,verify-worker,worker-drift}.spec.ts` — unit tests.
- `docs/runbooks/worker-deploy.md` — token/environment setup runbook.
- `worker-csp/README.md` — fix the stale "Not deployed" claim.

---

### Task 1: Worker registry + target selection

**Files:**
- Create: `scripts/worker-targets.mjs`
- Test: `test/unit/worker-targets.spec.ts`

**Interfaces:**
- Produces: `WORKERS` (object keyed `social`/`csp`/`mta-sts`, each `{ key, dir, name, hasPkg }`); `selectTargets({ changedFiles, dispatchTarget }) → Array<worker>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/worker-targets.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/worker-targets.spec.ts`
Expected: FAIL — cannot resolve `../../scripts/worker-targets.mjs`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/worker-targets.mjs
// Registry of the three Cloudflare workers + pure target selection. CLI entry
// (guarded by import.meta.url) emits the deploy matrix to GITHUB_OUTPUT.
import { execSync } from 'node:child_process';

export const WORKERS = {
  social: { key: 'social', dir: 'worker', name: 'adrianwedd-social', hasPkg: true },
  csp: { key: 'csp', dir: 'worker-csp', name: 'adrianwedd-csp', hasPkg: true },
  'mta-sts': { key: 'mta-sts', dir: 'worker-mta-sts', name: 'adrianwedd-mta-sts', hasPkg: false },
};

export function selectTargets({ changedFiles = [], dispatchTarget = null } = {}) {
  if (dispatchTarget === 'all') return Object.values(WORKERS);
  if (dispatchTarget) return WORKERS[dispatchTarget] ? [WORKERS[dispatchTarget]] : [];
  return Object.values(WORKERS).filter((w) =>
    changedFiles.some((f) => f === w.dir || f.startsWith(w.dir + '/')),
  );
}

function main() {
  const event = process.env.EVENT;
  let changedFiles = [];
  let dispatchTarget = null;
  if (event === 'workflow_dispatch') dispatchTarget = process.env.DISPATCH_TARGET || 'all';
  else if (event === 'schedule') dispatchTarget = 'all';
  else {
    const before = process.env.BEFORE;
    const head = process.env.GITHUB_SHA || 'HEAD';
    const base =
      !before || /^0+$/.test(before)
        ? execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf8' }).trim().split('\n').pop()
        : before;
    changedFiles = execSync(`git diff --name-only ${base} ${head}`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  }
  const targets = selectTargets({ changedFiles, dispatchTarget });
  process.stdout.write(`matrix=${JSON.stringify(targets)}\n`);
  process.stdout.write(`any=${targets.length > 0}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/worker-targets.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/worker-targets.mjs test/unit/worker-targets.spec.ts
git commit -m "feat(worker-deploy): worker registry + target selection"
```

---

### Task 2: Wrangler deployments parser

**Files:**
- Create: `scripts/wrangler-deployments.mjs`
- Test: `test/unit/wrangler-deployments.spec.ts`

**Interfaces:**
- Produces: `extractDeployMessage(deployments) → string`; `currentVersionId(deployments) → string|null`; `listDeployments(cwd) → Array` (I/O — runs wrangler, not unit-tested).
- Note on shape (verified against wrangler 4 `cli.js` by both QA engines): `wrangler deployments list --json` returns up to 10 deployments **sorted ascending by `created_on`**, so the newest is `deployments.at(-1)`. The deploy message is a **deployment-level** annotation at `deployment.annotations["workers/message"]`. Each deployment has a `versions` array of `{ version_id, percentage }`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/wrangler-deployments.spec.ts
import { describe, it, expect } from 'vitest';
import { extractDeployMessage, currentVersionId } from '../../scripts/wrangler-deployments.mjs';

const sample = [
  { annotations: { 'workers/message': 'gitsha:aaa' }, versions: [{ version_id: 'v-old', percentage: 100 }] },
  {
    annotations: { 'workers/message': 'gitsha:bbb1111111111111111111111111111111111111' },
    versions: [
      { version_id: 'v-new', percentage: 100 },
      { version_id: 'v-canary', percentage: 0 },
    ],
  },
];

describe('extractDeployMessage', () => {
  it('reads the newest deployment message (last element)', () => {
    expect(extractDeployMessage(sample)).toBe('gitsha:bbb1111111111111111111111111111111111111');
  });
  it('returns empty string when there is no message', () => {
    expect(extractDeployMessage([{ versions: [] }])).toBe('');
    expect(extractDeployMessage([])).toBe('');
  });
});

describe('currentVersionId', () => {
  it('picks the 100%-traffic version of the newest deployment', () => {
    expect(currentVersionId(sample)).toBe('v-new');
  });
  it('falls back to the last version when none is at 100%', () => {
    expect(currentVersionId([{ versions: [{ version_id: 'a', percentage: 50 }, { version_id: 'b', percentage: 50 }] }])).toBe('b');
  });
  it('returns null when there are no versions', () => {
    expect(currentVersionId([{ versions: [] }])).toBeNull();
    expect(currentVersionId([])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/wrangler-deployments.spec.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/wrangler-deployments.mjs
// Parse `wrangler deployments list --json`. Pure helpers + a thin I/O wrapper.
// CLI: `node scripts/wrangler-deployments.mjs <current-version|message>` run
// from within a worker dir; prints to stdout for capture by the deploy step.
import { execSync } from 'node:child_process';

export function extractDeployMessage(deployments) {
  return deployments?.at?.(-1)?.annotations?.['workers/message'] ?? '';
}

export function currentVersionId(deployments) {
  const d = deployments?.at?.(-1);
  if (!d?.versions?.length) return null;
  const at100 = d.versions.find((v) => v.percentage === 100);
  return (at100 ?? d.versions.at(-1)).version_id ?? null;
}

export function listDeployments(cwd) {
  const wrangler = process.env.WRANGLER_BIN ?? 'npx wrangler';
  const out = execSync(`${wrangler} deployments list --json`, { cwd, encoding: 'utf8' });
  return JSON.parse(out);
}

function main() {
  const cmd = process.argv[2];
  const deployments = listDeployments(process.cwd());
  if (cmd === 'current-version') {
    const v = currentVersionId(deployments);
    if (!v) process.exit(1);
    process.stdout.write(v);
  } else if (cmd === 'message') {
    process.stdout.write(extractDeployMessage(deployments));
  } else {
    process.stderr.write('usage: wrangler-deployments.mjs <current-version|message>\n');
    process.exit(2);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/wrangler-deployments.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/wrangler-deployments.mjs test/unit/wrangler-deployments.spec.ts
git commit -m "feat(worker-deploy): wrangler deployments parser"
```

---

### Task 3: Edge verification prober

**Files:**
- Create: `scripts/verify-worker.mjs`
- Test: `test/unit/verify-worker.spec.ts`

**Interfaces:**
- Produces: `assertSocialHealth(status, body) → {ok, reason?}`; `assertCsp(headerValue, body) → {ok, reason?}`; `assertMtaSts(status, body) → {ok, reason?}`; `probe(key, {attempts, delayMs}) → {ok, reason?}` (I/O, retries internally — not unit-tested).

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/verify-worker.spec.ts
import { describe, it, expect } from 'vitest';
import { assertSocialHealth, assertCsp, assertMtaSts } from '../../scripts/verify-worker.mjs';

describe('assertSocialHealth (liveness)', () => {
  it('passes on 200 + the unauth {"ok":true} body', () => {
    expect(assertSocialHealth(200, '{"ok":true}').ok).toBe(true);
  });
  it('fails on non-200', () => {
    expect(assertSocialHealth(503, '{"ok":true}').ok).toBe(false);
  });
  it('fails on non-JSON body', () => {
    expect(assertSocialHealth(200, '<html>error</html>').ok).toBe(false);
  });
});

describe('assertCsp', () => {
  const nonce = 'X0PqfxDjWOOHu7gxnySUAQ';
  it('passes when header nonce is real AND present in the body (worker rewrote HTML)', () => {
    const header = `script-src 'nonce-${nonce}' 'strict-dynamic'`;
    const body = `<html><script nonce="${nonce}">x()</script></html>`;
    expect(assertCsp(header, body).ok).toBe(true);
  });
  it('fails when there is no CSP header at all', () => {
    expect(assertCsp(null, '<html></html>').ok).toBe(false);
  });
  it('fails on a degenerate empty nonce literal', () => {
    expect(assertCsp("script-src 'nonce-' 'strict-dynamic'", '<html></html>').ok).toBe(false);
  });
  it('fails when the header has a nonce but the body was NOT rewritten', () => {
    const header = `script-src 'nonce-${nonce}' 'strict-dynamic'`;
    const body = '<html><script>x()</script></html>'; // no nonce in body
    expect(assertCsp(header, body).ok).toBe(false);
  });
});

describe('assertMtaSts', () => {
  it('passes on 200 + version: STSv1', () => {
    expect(assertMtaSts(200, 'version: STSv1\nmode: enforce\n').ok).toBe(true);
  });
  it('fails when the body lacks the version line', () => {
    expect(assertMtaSts(200, 'mode: enforce\n').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/verify-worker.spec.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/verify-worker.mjs
// Post-deploy edge verification. Pure assertion fns + a retrying probe runner.
// CLI: `node scripts/verify-worker.mjs <social|csp|mta-sts>` → exit 0 pass / 1 fail.

export function assertSocialHealth(status, body) {
  // Liveness/routing probe only — the unauthenticated response is {"ok":true}.
  if (status !== 200) return { ok: false, reason: `expected 200, got ${status}` };
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, reason: 'body is not valid JSON' };
  }
  if (typeof json !== 'object' || json === null) {
    return { ok: false, reason: 'JSON body is not an object' };
  }
  return { ok: true };
}

const CSP_NONCE_RE = /nonce-([A-Za-z0-9+/=]{20,})/;
export function assertCsp(headerValue, body) {
  if (!headerValue) return { ok: false, reason: 'no Content-Security-Policy response header' };
  const m = CSP_NONCE_RE.exec(headerValue);
  if (!m) return { ok: false, reason: 'CSP header lacks a real nonce-<base64> token' };
  const nonce = m[1];
  // The worker injects the SAME nonce into <script> tags. If the header carries
  // a nonce but the body doesn't, the worker set a header without rewriting the
  // HTML — a broken deploy that a header-only check would miss.
  if (!body || !body.includes(nonce)) {
    return { ok: false, reason: 'header nonce not found in HTML body (worker did not rewrite the page)' };
  }
  return { ok: true };
}

export function assertMtaSts(status, body) {
  if (status !== 200) return { ok: false, reason: `expected 200, got ${status}` };
  if (!/version:\s*STSv1/.test(body)) return { ok: false, reason: 'body missing "version: STSv1"' };
  return { ok: true };
}

const TARGETS = {
  social: {
    url: 'https://social.adrianwedd.com/api/health',
    check: async (res) => assertSocialHealth(res.status, await res.text()),
  },
  csp: {
    url: 'https://adrianwedd.com/',
    check: async (res) => assertCsp(res.headers.get('content-security-policy'), await res.text()),
  },
  'mta-sts': {
    url: 'https://mta-sts.adrianwedd.com/.well-known/mta-sts.txt',
    check: async (res) => assertMtaSts(res.status, await res.text()),
  },
};

export async function probe(key, { attempts = 5, delayMs = 10000 } = {}) {
  const t = TARGETS[key];
  if (!t) return { ok: false, reason: `unknown worker key: ${key}` };
  let last = { ok: false, reason: 'no attempts made' };
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(t.url, { redirect: 'manual' });
      last = await t.check(res);
    } catch (e) {
      last = { ok: false, reason: `fetch error: ${e.message}` };
    }
    if (last.ok) return last;
    if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

async function main() {
  const key = process.argv[2];
  const result = await probe(key);
  if (result.ok) {
    console.log(`verify ${key}: OK`);
    process.exit(0);
  }
  console.error(`verify ${key}: FAIL — ${result.reason}`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/verify-worker.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Sanity-check against the live edge (all three already deployed)**

Run: `node scripts/verify-worker.mjs csp && node scripts/verify-worker.mjs social && node scripts/verify-worker.mjs mta-sts`
Expected: three `OK` lines (confirms the assertions — including the CSP body-nonce check — match production before they gate a deploy).

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-worker.mjs test/unit/verify-worker.spec.ts
git commit -m "feat(worker-deploy): edge verification prober"
```

---

### Task 4: Drift classifier

**Files:**
- Create: `scripts/worker-drift.mjs`
- Test: `test/unit/worker-drift.spec.ts`

**Interfaces:**
- Consumes: `WORKERS` (Task 1), `listDeployments`/`extractDeployMessage` (Task 2).
- Produces: `parseDeployedSha(message) → string|null`; `classifyDrift({ sha, shaExists, isAncestor, undeployedCount }) → {drift, reason}`.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/worker-drift.spec.ts
import { describe, it, expect } from 'vitest';
import { parseDeployedSha, classifyDrift } from '../../scripts/worker-drift.mjs';

describe('parseDeployedSha', () => {
  it('extracts the sha from a gitsha: message', () => {
    expect(parseDeployedSha('gitsha:e43d57a0f1c2b3a4d5e6f7a8b9c0d1e2f3a4b5c6')).toBe(
      'e43d57a0f1c2b3a4d5e6f7a8b9c0d1e2f3a4b5c6',
    );
  });
  it('returns null for an unstamped message', () => {
    expect(parseDeployedSha('Manual deploy')).toBeNull();
    expect(parseDeployedSha('')).toBeNull();
    expect(parseDeployedSha(null)).toBeNull();
  });
});

describe('classifyDrift', () => {
  it('unstamped → drift', () => {
    expect(classifyDrift({ sha: null }).drift).toBe(true);
  });
  it('sha absent from repo → drift', () => {
    expect(classifyDrift({ sha: 'deadbeef', shaExists: false }).drift).toBe(true);
  });
  it('sha not an ancestor → drift', () => {
    expect(classifyDrift({ sha: 'abc', shaExists: true, isAncestor: false }).drift).toBe(true);
  });
  it('undeployed commits touch the worker → drift', () => {
    expect(
      classifyDrift({ sha: 'abc', shaExists: true, isAncestor: true, undeployedCount: 2 }).drift,
    ).toBe(true);
  });
  it('in sync → no drift', () => {
    const r = classifyDrift({ sha: 'abc', shaExists: true, isAncestor: true, undeployedCount: 0 });
    expect(r.drift).toBe(false);
    expect(r.reason).toMatch(/in sync/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/worker-drift.spec.ts`
Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/worker-drift.mjs
// Drift check: is each deployed worker in sync with main? Pure classifier +
// a CLI that queries wrangler (READ-ONLY token) and git, and fails on any drift.
import { execSync } from 'node:child_process';
import { WORKERS } from './worker-targets.mjs';
import { listDeployments, extractDeployMessage } from './wrangler-deployments.mjs';

export function parseDeployedSha(message) {
  const m = /gitsha:([0-9a-f]{7,40})/.exec(message ?? '');
  return m ? m[1] : null;
}

export function classifyDrift({ sha, shaExists, isAncestor, undeployedCount } = {}) {
  if (!sha) {
    return {
      drift: true,
      reason: 'unstamped (deployed out-of-band, or >10 unstamped deploys hid the stamp)',
    };
  }
  if (!shaExists) {
    return { drift: true, reason: `deployed SHA ${sha} absent from repo (force-push / other branch)` };
  }
  if (!isAncestor) {
    return { drift: true, reason: `deployed SHA ${sha} not an ancestor of HEAD (history rewritten)` };
  }
  if (undeployedCount > 0) {
    return { drift: true, reason: `${undeployedCount} undeployed commit(s) touch this worker` };
  }
  return { drift: false, reason: 'in sync' };
}

function gitOk(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  let drifted = 0;
  for (const worker of Object.values(WORKERS)) {
    const sha = parseDeployedSha(extractDeployMessage(listDeployments(worker.dir)));
    const shaExists = sha ? gitOk(`git cat-file -e ${sha}^{commit}`) : false;
    const isAncestor = sha && shaExists ? gitOk(`git merge-base --is-ancestor ${sha} HEAD`) : false;
    const undeployedCount =
      sha && isAncestor
        ? Number(
            execSync(`git rev-list --count ${sha}..HEAD -- ${worker.dir}`, { encoding: 'utf8' }).trim(),
          )
        : 0;
    const r = classifyDrift({ sha, shaExists, isAncestor, undeployedCount });
    console.log(`${r.drift ? 'DRIFT' : 'ok   '}  ${worker.name}: ${r.reason}`);
    if (r.drift) drifted++;
  }
  if (drifted > 0) {
    console.error(`::error::${drifted} worker(s) drifted from main`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/unit/worker-drift.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/worker-drift.mjs test/unit/worker-drift.spec.ts
git commit -m "feat(worker-deploy): drift classifier"
```

---

### Task 5: Deploy/verify/rollback bash step

**Files:**
- Create: `scripts/worker-deploy-step.sh`

**Interfaces:**
- Consumes env: `WORKER_KEY`, `WORKER_DIR`, `WORKER_NAME`, `GIT_SHA`, `GITHUB_WORKSPACE`, `WRANGLER_BIN`. Calls `scripts/wrangler-deployments.mjs current-version` and `scripts/verify-worker.mjs <key>`.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# One worker's deploy lifecycle: capture-prev → install → test → deploy →
# verify → rollback-to-explicit-version. If rollback exits non-zero (a Durable
# Object migration or a changed secret can block it), demand manual action.
set -euo pipefail

WRANGLER="${WRANGLER_BIN:-npx wrangler}"

# Capture the currently-live version BEFORE deploying, so rollback targets the
# exact known-good version rather than wrangler's default heuristic.
PREV_VERSION="$(cd "$WORKER_DIR" && node "${GITHUB_WORKSPACE}/scripts/wrangler-deployments.mjs" current-version || true)"
echo "previous version for ${WORKER_NAME}: ${PREV_VERSION:-<none>}"

cd "$WORKER_DIR"

if [ -f package.json ]; then
  npm ci
  case "$WORKER_KEY" in
    social) npm test ;;
    csp) npm test && npx tsc --noEmit ;;
    *) ;; # a future worker with a package.json but no known test command
  esac
fi

echo "::group::deploy ${WORKER_NAME}"
"$WRANGLER" deploy --message "gitsha:${GIT_SHA}"
echo "::endgroup::"

if node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY"; then
  echo "verification passed for ${WORKER_NAME}"
  exit 0
fi

echo "::error::verification failed for ${WORKER_NAME} — attempting rollback"
if [ -z "$PREV_VERSION" ]; then
  echo "::error::MANUAL INTERVENTION REQUIRED for ${WORKER_NAME}: no previous version captured; cannot auto-rollback. Failed version gitsha:${GIT_SHA} is live."
  exit 1
fi

# --yes is belt-and-suspenders; in CI wrangler already auto-confirms (ci-info
# detects CI). Rolling back to an explicit version id, not the default heuristic.
if "$WRANGLER" rollback "$PREV_VERSION" --yes --message "auto-rollback ${GIT_SHA}"; then
  echo "rolled ${WORKER_NAME} back to ${PREV_VERSION}; re-verifying (probe retries internally)"
  node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY" \
    || echo "::error::post-rollback verify still failing for ${WORKER_NAME}"
  exit 1
fi

echo "::error::MANUAL INTERVENTION REQUIRED for ${WORKER_NAME}: rollback to ${PREV_VERSION} failed. A Durable Object migration or a changed secret can block rollback. Failed version gitsha:${GIT_SHA} is live — roll back by hand."
exit 1
```

- [ ] **Step 2: Syntax-check + optional shellcheck**

Run: `bash -n scripts/worker-deploy-step.sh && chmod +x scripts/worker-deploy-step.sh`
Expected: no output (syntax OK). If `shellcheck` is installed, also run `shellcheck scripts/worker-deploy-step.sh` and expect no warnings.

- [ ] **Step 3: Commit**

```bash
git add scripts/worker-deploy-step.sh
git commit -m "feat(worker-deploy): deploy/verify/rollback step script"
```

---

### Task 6: The workflow

**Files:**
- Create: `.github/workflows/worker-deploy.yml`

**Interfaces:**
- Consumes: all four scripts. Secrets `CLOUDFLARE_API_TOKEN` (env `worker-production`), `CLOUDFLARE_API_TOKEN_READONLY` (repo), `CLOUDFLARE_ACCOUNT_ID` (repo).

- [ ] **Step 1: Write the workflow**

```yaml
name: Worker Deploy

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
      - 'worker-csp/**'
      - 'worker-mta-sts/**'
  workflow_dispatch:
    inputs:
      target:
        description: Which worker(s) to deploy
        type: choice
        default: all
        options: [all, social, csp, mta-sts]
      mode:
        description: deploy the target, or run a read-only drift check
        type: choice
        default: deploy
        options: [deploy, drift-only]
  schedule:
    - cron: '0 15 * * *' # ~01:00 AEST, offset from the e2e nightly

permissions:
  contents: read

jobs:
  detect:
    if: ${{ github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && github.event.inputs.mode == 'deploy') }}
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      matrix: ${{ steps.select.outputs.matrix }}
      any: ${{ steps.select.outputs.any }}
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 22
      - id: select
        env:
          EVENT: ${{ github.event_name }}
          BEFORE: ${{ github.event.before }}
          DISPATCH_TARGET: ${{ github.event.inputs.target }}
        run: node scripts/worker-targets.mjs >> "$GITHUB_OUTPUT"

  deploy:
    needs: detect
    if: ${{ needs.detect.outputs.any == 'true' }}
    environment: worker-production
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        worker: ${{ fromJSON(needs.detect.outputs.matrix) }}
    concurrency:
      group: worker-deploy-${{ matrix.worker.key }}
      cancel-in-progress: false
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: worker/package-lock.json
      - name: Install pinned wrangler toolchain
        run: |
          npm --prefix worker ci
          echo "WRANGLER_BIN=${GITHUB_WORKSPACE}/worker/node_modules/.bin/wrangler" >> "$GITHUB_ENV"
      - name: Deploy, verify, rollback
        env:
          WORKER_KEY: ${{ matrix.worker.key }}
          WORKER_DIR: ${{ matrix.worker.dir }}
          WORKER_NAME: ${{ matrix.worker.name }}
          GIT_SHA: ${{ github.sha }}
        run: bash scripts/worker-deploy-step.sh

  drift-check:
    if: ${{ github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && github.event.inputs.mode == 'drift-only') }}
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN_READONLY }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: worker/package-lock.json
      - name: Install pinned wrangler toolchain
        run: |
          npm --prefix worker ci
          echo "WRANGLER_BIN=${GITHUB_WORKSPACE}/worker/node_modules/.bin/wrangler" >> "$GITHUB_ENV"
      - run: node scripts/worker-drift.mjs
```

- [ ] **Step 2: Validate the workflow syntax**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/worker-deploy.yml','utf8'))"`
Expected: no throw. If `actionlint` is installed, also run `actionlint .github/workflows/worker-deploy.yml` and expect no errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/worker-deploy.yml
git commit -m "ci(worker-deploy): gated deploy + nightly drift workflow"
```

---

### Task 7: Setup runbook + README fix

**Files:**
- Create: `docs/runbooks/worker-deploy.md`
- Modify: `worker-csp/README.md` (correct the stale "Not deployed" status)
- Modify: `CLAUDE.md` (point the Worker section at the new runbook)

- [ ] **Step 1: Write the runbook**

```markdown
# Worker deploy runbook

`.github/workflows/worker-deploy.yml` auto-deploys the three workers on merge to
`main` (path-filtered), behind an approval gate, with edge verification,
auto-rollback, and a nightly drift check.

## One-time setup (required before first CI deploy)

1. **Create `CLOUDFLARE_API_TOKEN`** — Cloudflare dashboard → My Profile → API
   Tokens → Create Token. Permissions: **Account → Workers Scripts → Edit** and
   **Account → Account Settings → Read**. Add **Zone → Workers Routes → Edit**
   and **Zone → DNS → Edit** only if CI must ever (re)create the `worker-csp`
   route or the `mta-sts` custom domain (all three already exist, so redeploys
   don't need zone scopes).
2. **Create `CLOUDFLARE_API_TOKEN_READONLY`** — same flow, permission
   **Account → Workers Scripts → Read** only.
3. **Add repo secrets** `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN_READONLY`
   (Settings → Secrets and variables → Actions → repository secrets).
4. **Create the `worker-production` environment** (Settings → Environments):
   add **required reviewer = Adrian**, then add `CLOUDFLARE_API_TOKEN` as an
   **environment** secret scoped to it.

## Flow

- **push to main** touching `worker*/` → `deploy` job pauses for approval →
  approve → deploy + verify at the edge → auto-rollback on failure.
- **nightly** → `drift-check` compares each deployed worker's stamped `gitsha:`
  against `main` and fails red on divergence.
- **manual** → Actions → Worker Deploy → Run workflow → choose `mode`
  (`deploy` a `target`, or `drift-only` for a read-only check).

## Limitations

- Rollback targets the explicit pre-deploy version. If wrangler refuses (a
  Durable Object migration or a changed secret can block it), the run prints
  "MANUAL INTERVENTION REQUIRED" and leaves the failed version live — roll back
  by hand. Only `worker/` has a Durable Object migration.
- `/api/health` verification is a liveness probe; token health is owned by
  `social-token-alert.yml`.
```

- [ ] **Step 2: Fix the stale worker-csp README**

Open `worker-csp/README.md`, replace any "Not deployed" / "routes are commented out" status text with:

```markdown
**Status:** Live. Routed on `adrianwedd.com/*` (see `wrangler.toml`). Deployed via
`.github/workflows/worker-deploy.yml` — see `docs/runbooks/worker-deploy.md`.
```

- [ ] **Step 3: Point CLAUDE.md at the runbook**

In the CLAUDE.md Worker section, replace the manual-deploy note (`Deploy: cd worker && npx wrangler deploy`) with:

```markdown
**Deploy:** automated via `.github/workflows/worker-deploy.yml` (gated approval +
edge verify + auto-rollback + nightly drift check). See
`docs/runbooks/worker-deploy.md`. Manual fallback: `cd <worker> && npx wrangler deploy`.
```

- [ ] **Step 4: Run the full local gate**

Run: `npm run test:unit && npm run lint`
Expected: all unit tests pass (incl. the 4 new specs), lint clean.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/worker-deploy.md worker-csp/README.md CLAUDE.md
git commit -m "docs(worker-deploy): setup runbook + fix stale csp README"
```

---

### Task 8: Post-merge live validation (blocked on Adrian's token setup)

**Not code** — a validation checklist to run after Task 7 merges AND the one-time
setup in the runbook is done. Cannot run earlier (needs the secrets + environment).

- [ ] **Step 1:** Dispatch against the lowest-blast-radius worker first: Actions → Worker Deploy → Run workflow → `mode: deploy`, `target: mta-sts`. Approve at the gate. Expect: deploy → `verify mta-sts: OK` → green.
- [ ] **Step 2:** Repeat with `target: social`, then `target: csp`. Expect green each time; confirm the site still serves a CSP header after the csp run (`curl -sI https://adrianwedd.com/ | grep -i content-security-policy`).
- [ ] **Step 3: Prove rollback.** On a throwaway branch, temporarily edit `scripts/verify-worker.mjs`'s mta-sts assertion to require an impossible string; dispatch `mode: deploy`, `target: mta-sts`. Expect: verify fails → `wrangler rollback <prev>` runs → prior version restored → run red. Revert the edit.
- [ ] **Step 4: Prove drift both ways.** Dispatch `mode: drift-only` on a day with no worker changes → drift-check green. Then merge a no-op comment change under `worker-mta-sts/` **without** approving its deploy, and dispatch `mode: drift-only` again → drift-check red with "undeployed commit(s)" for mta-sts. Approve the pending deploy to clear it.
- [ ] **Step 5:** Update the Sprint 39 checkboxes in `docs/ROADMAP-2026-H2.md` and note completion.

---

## Self-review

- **Spec coverage:** trigger+gate (Task 6 `deploy` + environment), path filter (Task 6), per-worker conditional install/test with catch-all (Task 5), **explicit-version** capture/deploy/verify/rollback with honest manual-intervention on rollback failure (Tasks 2/5), two-token model (Tasks 6/7), verification incl. real-nonce + **body-rewrite** CSP check and honest liveness (Task 3), drift SHA classification incl. `cat-file`/ancestor/`at(-1)`/annotation path (Tasks 2/4), **drift-only manual mode** (Task 6), pinned-wrangler toolchain (Global Constraints + Task 6), `permissions`/per-worker-concurrency/timeouts/`cache`/`fetch-depth`/SHA-pins (Task 6), runbook + README fix (Task 7), staged live validation incl. rollback + drift proofs (Task 8). All spec sections map to a task.
- **QA findings addressed:** rollback wrong-version (explicit `PREV_VERSION`), fictional migration grep removed (honest rollback-failure path), CSP body check, no-wrangler-in-CI (pinned toolchain + `WRANGLER_BIN`), `mta-sts` `npm ci` skip, drift-only mode, timeouts, npm cache, detect gated off schedule, bash `case` catch-all, deployment-message parsing extracted + tested, `--yes` reasoning corrected, lint-via-`npm run lint` only.
- **Placeholder scan:** no TBD/TODO; all code blocks complete.
- **Type consistency:** `WORKERS` shape (`key,dir,name,hasPkg`) consistent across Tasks 1/4/6; `extractDeployMessage`/`currentVersionId`/`listDeployments` consistent across Tasks 2/4/5; `assertCsp(headerValue, body)` two-arg signature matches between Task 3 code, its tests, and the `probe` caller; `classifyDrift`/`parseDeployedSha` match Task 4 code/tests; env vars (`WORKER_KEY`/`WORKER_DIR`/`WORKER_NAME`/`GIT_SHA`/`WRANGLER_BIN`/`GITHUB_WORKSPACE`) match between Task 5 script and Task 6 workflow.
```
