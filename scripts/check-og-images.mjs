#!/usr/bin/env node
/**
 * Assert every og:image the build emits actually resolves to a file in dist/.
 *
 * The og:image a page points at is chosen by the templates (hero when it is
 * known-landscape, otherwise the generated text card), while the card itself is
 * produced by a separate script. Those two decisions used to read different
 * files and fall back in opposite directions, so a page could advertise
 * /og/blog/<slug>.png while the generator had skipped it — a 404 OG card, which
 * is worse than the cropped hero it replaced, and invisible without a check
 * like this one. Social scrapers are the only consumer, so nothing in the site
 * surfaces the breakage.
 *
 * Same-origin og:image only; remote URLs are somebody else's problem.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, '..'), 'dist');
const SITE_ORIGIN = 'https://adrianwedd.com';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error('ERROR: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

/**
 * Pathname of `raw` if it points at this site, else null.
 *
 * Compares parsed origins rather than string prefixes: `startsWith(SITE_ORIGIN)`
 * also matches https://adrianwedd.com.example.test/x.png, which would then be
 * resolved against dist/ and reported as a missing local asset.
 */
function sameOriginPathname(raw) {
  let url;
  try {
    url = new URL(raw, SITE_ORIGIN);
  } catch {
    return null;
  }
  return url.origin === SITE_ORIGIN ? url.pathname : null;
}

const OG_IMAGE_RE = /<meta\s+property="og:image"\s+content="([^"]+)"/gi;
const failures = [];
let checked = 0;

for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf-8');
  for (const match of html.matchAll(OG_IMAGE_RE)) {
    const pathname = sameOriginPathname(match[1]);
    if (pathname === null) continue;
    checked++;
    const asset = path.join(DIST, decodeURIComponent(pathname).replace(/^\//, ''));
    if (!fs.existsSync(asset)) {
      failures.push(`${path.relative(DIST, file)} -> ${pathname}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`ERROR: ${failures.length} og:image reference(s) do not resolve in dist/:\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('\nIf these are text cards, run `node scripts/generate-og-images.mjs`.');
  process.exit(1);
}

console.log(`✓ All ${checked} same-origin og:image references resolve in dist/.`);
