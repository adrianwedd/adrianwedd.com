# Worker Deploy Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-deploy the three Cloudflare Workers on merge to `main`, gated by a GitHub Environment approval, with post-deploy edge verification, auto-rollback on failure, and a nightly drift check.

**Architecture:** One workflow (`.github/workflows/worker-deploy.yml`) drives three small, independently unit-tested Node scripts — a target selector, an edge-verification prober, and a drift classifier — plus one bash deploy step. Deploy jobs reference a gated `worker-production` environment (write token); the ungated nightly drift job uses a separate repo-level read-only token.

**Tech Stack:** GitHub Actions, Node 22 (ESM `.mjs`), vitest (root `test:unit` suite), wrangler (already a worker devDep), bash.

## Global Constraints

- **Two Cloudflare tokens.** `CLOUDFLARE_API_TOKEN` (Edit Workers) lives in the **gated** `worker-production` environment; `CLOUDFLARE_API_TOKEN_READONLY` (Read Workers) is a **repo-level** secret used only by the drift job. `CLOUDFLARE_ACCOUNT_ID` is repo-level. CI never handles the 14 platform secrets.
- **No platform-secret exposure.** `wrangler deploy` inherits existing secrets; never add `wrangler secret put` to CI.
- **`mta-sts` has no `package.json`** — never run `npm ci`/tests there.
- **SHA-pin actions** per repo convention: `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`, `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`.
- **`permissions: contents: read`** at workflow top level; nothing else.
- **CSP nonce must be real:** regex `nonce-[A-Za-z0-9+/=]{20,}`.
- **`/api/health` is a liveness probe only** (unauth response is `{"ok":true}`).
- **No auto-rollback across a Durable Object migration** — detect the migration-block error and demand manual intervention.
- Unit tests go in `test/unit/*.spec.ts` (picked up by the existing `npm run test:unit`); scripts live in `scripts/*.mjs`.

## File structure

- `scripts/worker-targets.mjs` — worker registry + `selectTargets()`; CLI emits the deploy matrix.
- `scripts/verify-worker.mjs` — pure assertion fns + a retrying `probe()`; CLI verifies one worker at the live edge.
- `scripts/worker-drift.mjs` — `parseDeployedSha()` + `classifyDrift()`; CLI checks all workers and fails on drift.
- `scripts/worker-deploy-step.sh` — install/test/deploy/verify/rollback for one worker (invoked per matrix entry).
- `.github/workflows/worker-deploy.yml` — the workflow wiring it all together.
- `test/unit/worker-targets.spec.ts`, `test/unit/verify-worker.spec.ts`, `test/unit/worker-drift.spec.ts` — unit tests.
- `docs/runbooks/worker-deploy.md` — token/environment setup runbook.
- `worker-csp/README.md` — fix the stale "Not deployed" claim.

---

### Task 1: Worker registry + target selection

**Files:**
- Create: `scripts/worker-targets.mjs`
- Test: `test/unit/worker-targets.spec.ts`

**Interfaces:**
- Produces: `WORKERS` (object keyed by `social`/`csp`/`mta-sts`, each `{ key, dir, name, hasPkg }`); `selectTargets({ changedFiles, dispatchTarget }) → Array<worker>`.

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
    const changed = ['worker-csp/src/index.ts', 'README.md'];
    expect(selectTargets({ changedFiles: changed }).map((w) => w.key)).toEqual(['csp']);
  });

  it('push matches the dir prefix but not a lookalike sibling', () => {
    // "worker-csp" must not be matched by a path under "worker/" and vice-versa
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
// Registry of the three Cloudflare workers + pure target selection. Also a CLI
// entry (guarded by import.meta.url) that emits the deploy matrix to GITHUB_OUTPUT.
import { execSync } from 'node:child_process';

export const WORKERS = {
  social: { key: 'social', dir: 'worker', name: 'adrianwedd-social', hasPkg: true },
  csp: { key: 'csp', dir: 'worker-csp', name: 'adrianwedd-csp', hasPkg: true },
  'mta-sts': { key: 'mta-sts', dir: 'worker-mta-sts', name: 'adrianwedd-mta-sts', hasPkg: false },
};

/**
 * Choose which workers to act on.
 * - dispatchTarget 'all' → every worker; a specific key → just that one.
 * - otherwise (push) → workers whose dir contains a changed file.
 */
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

### Task 2: Edge verification prober

**Files:**
- Create: `scripts/verify-worker.mjs`
- Test: `test/unit/verify-worker.spec.ts`

**Interfaces:**
- Produces: `assertSocialHealth(status, body) → {ok, reason?}`; `assertCsp(headerValue) → {ok, reason?}`; `assertMtaSts(status, body) → {ok, reason?}`; `probe(key, {attempts, delayMs}) → {ok, reason?}` (I/O, not unit-tested).

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
  it('passes when the header carries a real >=20-char nonce', () => {
    expect(assertCsp("script-src 'nonce-X0PqfxDjWOOHu7gxnySUAQ' 'strict-dynamic'").ok).toBe(true);
  });
  it('fails when there is no CSP header at all', () => {
    expect(assertCsp(null).ok).toBe(false);
  });
  it('fails on a degenerate empty nonce literal', () => {
    expect(assertCsp("script-src 'nonce-' 'strict-dynamic'").ok).toBe(false);
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

const CSP_NONCE_RE = /nonce-[A-Za-z0-9+/=]{20,}/;
export function assertCsp(headerValue) {
  if (!headerValue) return { ok: false, reason: 'no Content-Security-Policy response header' };
  if (!CSP_NONCE_RE.test(headerValue)) {
    return { ok: false, reason: 'CSP header lacks a real nonce-<base64> token' };
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
    check: async (res) => assertCsp(res.headers.get('content-security-policy')),
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
Expected: PASS (8 tests).

- [ ] **Step 5: Sanity-check the prober against the live edge (all three already deployed)**

Run: `node scripts/verify-worker.mjs csp && node scripts/verify-worker.mjs social && node scripts/verify-worker.mjs mta-sts`
Expected: three `OK` lines (confirms the assertions match production reality before they gate a deploy).

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-worker.mjs test/unit/verify-worker.spec.ts
git commit -m "feat(worker-deploy): edge verification prober"
```

---

### Task 3: Drift classifier

**Files:**
- Create: `scripts/worker-drift.mjs`
- Test: `test/unit/worker-drift.spec.ts`

**Interfaces:**
- Consumes: `WORKERS` from `scripts/worker-targets.mjs`.
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

function deployedMessage(worker) {
  const out = execSync('npx wrangler deployments list --json', {
    cwd: worker.dir,
    encoding: 'utf8',
  });
  const arr = JSON.parse(out);
  const newest = arr.at(-1); // list is ascending by created_on, truncated to 10
  return newest?.annotations?.['workers/message'] ?? '';
}

function main() {
  let drifted = 0;
  for (const worker of Object.values(WORKERS)) {
    const sha = parseDeployedSha(deployedMessage(worker));
    const shaExists = sha ? gitOk(`git cat-file -e ${sha}^{commit}`) : false;
    const isAncestor = sha && shaExists ? gitOk(`git merge-base --is-ancestor ${sha} HEAD`) : false;
    const undeployedCount =
      sha && isAncestor
        ? Number(
            execSync(`git rev-list --count ${sha}..HEAD -- ${worker.dir}`, {
              encoding: 'utf8',
            }).trim(),
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

### Task 4: Deploy/verify/rollback bash step

**Files:**
- Create: `scripts/worker-deploy-step.sh`

**Interfaces:**
- Consumes env: `WORKER_KEY`, `WORKER_DIR`, `WORKER_NAME`, `GIT_SHA`, `GITHUB_WORKSPACE`. Calls `scripts/verify-worker.mjs <key>`.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# One worker's deploy lifecycle: install → test → deploy → verify → rollback.
# Rollback defaults to the immediately-previous deployment. It refuses (and
# demands manual action) when Cloudflare blocks rollback across a Durable
# Object migration or a changed secret.
set -euo pipefail

cd "$WORKER_DIR"

if [ -f package.json ]; then
  npm ci
  case "$WORKER_KEY" in
    social) npm test ;;
    csp) npm test && npx tsc --noEmit ;;
  esac
fi

echo "::group::deploy ${WORKER_NAME}"
npx wrangler deploy --message "gitsha:${GIT_SHA}"
echo "::endgroup::"

if node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY"; then
  echo "verification passed for ${WORKER_NAME}"
  exit 0
fi

echo "::error::verification failed for ${WORKER_NAME} — attempting rollback"
if npx wrangler rollback --yes --message "auto-rollback ${GIT_SHA}" 2> rollback.err; then
  echo "rolled back ${WORKER_NAME}; re-verifying with backoff"
  node "${GITHUB_WORKSPACE}/scripts/verify-worker.mjs" "$WORKER_KEY" \
    || echo "::error::post-rollback verify still failing for ${WORKER_NAME}"
  exit 1
fi

cat rollback.err
if grep -qiE "migration|10220|durable object|cannot be rolled back" rollback.err; then
  echo "::error::MANUAL INTERVENTION REQUIRED for ${WORKER_NAME}: rollback blocked (Durable Object migration or changed secret). The failed version gitsha:${GIT_SHA} is still live."
else
  echo "::error::rollback command itself failed for ${WORKER_NAME}"
fi
exit 1
```

- [ ] **Step 2: Make it executable + shellcheck**

Run: `chmod +x scripts/worker-deploy-step.sh && shellcheck scripts/worker-deploy-step.sh`
Expected: no warnings (if `shellcheck` is unavailable, skip — the workflow calls it via `bash`).

- [ ] **Step 3: Commit**

```bash
git add scripts/worker-deploy-step.sh
git commit -m "feat(worker-deploy): deploy/verify/rollback step script"
```

---

### Task 5: The workflow

**Files:**
- Create: `.github/workflows/worker-deploy.yml`

**Interfaces:**
- Consumes: `scripts/worker-targets.mjs` (matrix), `scripts/worker-deploy-step.sh`, `scripts/worker-drift.mjs`. Secrets `CLOUDFLARE_API_TOKEN` (env `worker-production`), `CLOUDFLARE_API_TOKEN_READONLY`, `CLOUDFLARE_ACCOUNT_ID`.

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
  schedule:
    - cron: '0 15 * * *' # ~01:00 AEST, offset from the e2e nightly

permissions:
  contents: read

jobs:
  detect:
    runs-on: ubuntu-latest
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
    if: ${{ github.event_name != 'schedule' && needs.detect.outputs.any == 'true' }}
    environment: worker-production
    runs-on: ubuntu-latest
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
      - name: Deploy, verify, rollback
        env:
          WORKER_KEY: ${{ matrix.worker.key }}
          WORKER_DIR: ${{ matrix.worker.dir }}
          WORKER_NAME: ${{ matrix.worker.name }}
          GIT_SHA: ${{ github.sha }}
        run: bash scripts/worker-deploy-step.sh

  drift-check:
    if: ${{ github.event_name != 'push' }}
    runs-on: ubuntu-latest
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
      - run: node scripts/worker-drift.mjs
```

- [ ] **Step 2: Validate the workflow syntax**

Run: `npx --yes @action-validator/cli .github/workflows/worker-deploy.yml || actionlint .github/workflows/worker-deploy.yml`
Expected: no errors. (If neither validator is installed, verify YAML parses: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/worker-deploy.yml','utf8'))"` — expect no throw.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/worker-deploy.yml
git commit -m "ci(worker-deploy): add gated deploy + nightly drift workflow"
```

---

### Task 6: Setup runbook + README fix

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
3. **Add repo secret `CLOUDFLARE_ACCOUNT_ID`** (Settings → Secrets and variables
   → Actions → repository secrets).
4. **Add `CLOUDFLARE_API_TOKEN_READONLY`** as a repository secret (ungated).
5. **Create the `worker-production` environment** (Settings → Environments):
   add **required reviewer = Adrian**, then add `CLOUDFLARE_API_TOKEN` as an
   **environment** secret scoped to it.

## Flow

- **push to main** touching `worker*/` → `deploy` job pauses for approval →
  approve → deploy + verify at the edge → auto-rollback on failure.
- **nightly / dispatch** → `drift-check` compares each deployed worker's stamped
  `gitsha:` against `main` and fails red on divergence.
- **manual** → Actions → Worker Deploy → Run workflow → pick `target`.

## Limitations

- No auto-rollback across a Durable Object migration (only `worker/` has one).
  A blocked rollback prints "MANUAL INTERVENTION REQUIRED"; roll back by hand.
- `/api/health` verification is a liveness probe; token health is owned by
  `social-token-alert.yml`.
```

- [ ] **Step 2: Fix the stale worker-csp README**

Open `worker-csp/README.md`, replace any "Not deployed" / "routes are commented out" status text with the accurate state:

```markdown
**Status:** Live. Routed on `adrianwedd.com/*` (see `wrangler.toml`). Deployed via
`.github/workflows/worker-deploy.yml` — see `docs/runbooks/worker-deploy.md`.
```

- [ ] **Step 3: Point CLAUDE.md at the runbook**

In the CLAUDE.md Worker section, replace the manual-deploy note (`Deploy: cd worker && npx wrangler deploy`) with a line noting deploys are automated:

```markdown
**Deploy:** automated via `.github/workflows/worker-deploy.yml` (gated approval +
edge verify + auto-rollback + nightly drift check). See
`docs/runbooks/worker-deploy.md`. Manual fallback: `cd <worker> && npx wrangler deploy`.
```

- [ ] **Step 4: Run the full local gate**

Run: `npm run test:unit && npm run lint`
Expected: all unit tests pass (incl. the 3 new specs), lint clean.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/worker-deploy.md worker-csp/README.md CLAUDE.md
git commit -m "docs(worker-deploy): setup runbook + fix stale csp README"
```

---

### Task 7: Post-merge live validation (blocked on Adrian's token setup)

**Not code** — a validation checklist to run after Task 6 merges AND the one-time
setup in the runbook is done. Cannot run earlier (needs the secrets + environment).

- [ ] **Step 1:** Dispatch against the lowest-blast-radius worker first: Actions → Worker Deploy → Run workflow → `target: mta-sts`. Approve at the gate. Expect: deploy → `verify mta-sts: OK` → green.
- [ ] **Step 2:** Repeat with `target: social`, then `target: csp`. Expect green each time; confirm the site still serves a CSP header after the csp run (`curl -sI https://adrianwedd.com/ | grep -i content-security-policy`).
- [ ] **Step 3: Prove rollback.** Temporarily edit `scripts/verify-worker.mjs`'s mta-sts assertion to require an impossible string, push via a throwaway branch + dispatch `target: mta-sts`. Expect: verify fails → `wrangler rollback` runs → run red, prior version restored. Revert the edit.
- [ ] **Step 4: Prove drift both ways.** Run workflow with default `target` on a day with no worker changes → drift-check green. Then merge a no-op comment change under `worker-mta-sts/` **without** approving its deploy, and dispatch again → drift-check red with "undeployed commit(s)" for mta-sts. Approve the pending deploy to clear it.
- [ ] **Step 5:** Update the Sprint 39 checkboxes in `docs/ROADMAP-2026-H2.md` and note completion.

---

## Self-review

- **Spec coverage:** trigger+gate (Task 5 `deploy` job + environment), path filter (Task 5), per-worker conditional install/test (Tasks 4/5 via `hasPkg`+key), capture/deploy/verify/rollback with `--yes` and migration refusal (Task 4), two-token model (Tasks 5/6), verification checks incl. real-nonce CSP + honest liveness (Task 2), drift SHA classification incl. `cat-file`/ancestor/`at(-1)`/annotation path (Task 3), `permissions`/concurrency/`fetch-depth`/SHA-pins (Tasks 1–5 Global Constraints), runbook + README fix (Task 6), staged live validation incl. rollback + drift proofs (Task 7). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; all code blocks complete.
- **Type consistency:** `selectTargets`/`WORKERS` shape (`key,dir,name,hasPkg`) is consistent across Tasks 1, 3, 5; `probe(key,…)` and the three `assert*` signatures match between Task 2 code and tests; `classifyDrift`/`parseDeployedSha` signatures match between Task 3 code and tests; env var names (`WORKER_KEY`/`WORKER_DIR`/`WORKER_NAME`/`GIT_SHA`) match between Task 4 script and Task 5 workflow.
