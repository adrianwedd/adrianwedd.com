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
