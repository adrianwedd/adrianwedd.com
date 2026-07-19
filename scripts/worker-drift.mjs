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
