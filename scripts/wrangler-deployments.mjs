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
