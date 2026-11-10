#!/usr/bin/env node
// This repository is a static site: it has no runtime state. Build output is
// `dist/` (regenerable, ignored); anything disposable belongs in the ignored
// `tmp/`. A `var/` directory at the repo root is therefore never part of the
// project — it is the shape agents reach for when they want somewhere to put
// files without deciding who owns them, how big they may get, or when they go.
//
// Two checks, because they see different things:
//   - the filesystem check only has teeth locally, where untracked directories
//     actually exist (CI checks out a clean tree and would always pass);
//   - the tracked-path check is the one that can fail remotely.
//
// Run by `npm run check` and `npm run verify`, i.e. the verification agents
// actually execute before pushing.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

if (fs.existsSync(path.join(root, 'var'))) {
  problems.push('state directory exists in this checkout: var/');
}

let tracked = '';
try {
  tracked = execFileSync('git', ['ls-files', '--', 'var'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // Not a git checkout (e.g. a tarball export) — the filesystem check still ran.
}
if (tracked) {
  problems.push(
    `tracked paths under var/: ${tracked.split('\n').length} file(s)\n${tracked
      .split('\n')
      .map((line) => `      ${line}`)
      .join('\n')}`,
  );
}

if (problems.length > 0) {
  console.error('ERROR: this repository does not keep state in var/.\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    [
      '',
      'A static site has no runtime state. Build output is dist/ and is regenerable.',
      '',
      '  temporary artifacts   -> the ignored tmp/, deleted when the task ends',
      '  durable work          -> a normal commit',
      '  decisions and evidence -> the owning GitHub issue',
      '',
      'A directory that genuinely holds state needs an owner, a size bound and a',
      'reaper. If you cannot name all three, do not create it.',
    ].join('\n'),
  );
  process.exit(1);
}

console.log('✓ No var/ state directory.');
