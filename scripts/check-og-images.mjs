#!/usr/bin/env node
/**
 * Assert every og:image the build emits exists and is actually usable as one.
 *
 * Two failure modes, both invisible without a check like this — social scrapers
 * are the only consumer of these tags, so nothing on the site surfaces either:
 *
 *   1. Missing. The og:image a page points at is chosen by the templates, while
 *      the text card is produced by a separate script. Those two decisions read
 *      the same path and default the same direction, but they use different
 *      image readers (sharp vs. lib/image-dimensions), so they can still drift.
 *      This check — not that agreement — is what actually makes it safe.
 *   2. Wrong shape. twitter:card=summary_large_image crops to ~1.91:1, so a
 *      portrait og:image (our NotebookLM infographics are 1536x2752) centre-
 *      crops into mush. That was the original bug across 100 pages, and it is
 *      the one a "does the file exist" check would happily pass.
 *
 * Also asserts coverage: every HTML page must emit an og:image. Without that
 * floor, a markup change that stops this scanner matching would report success
 * over zero tags — "fine" when it means "I didn't look".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(path.resolve(__dirname, '..'), 'dist');
const SITE_ORIGIN = 'https://adrianwedd.com';

// summary_large_image renders at ~1.91:1. Anything taller than 4:3 loses enough
// of the frame to be worth failing over; squares included (a 1:1 card loses
// roughly half its width to the crop).
const MIN_ASPECT = 4 / 3;

// Sections whose portrait og:image is a known, unfixed defect rather than a
// regression. The blog and project templates fall back to a landscape text card
// (see src/pages/{blog,projects}/[...slug].astro); the gallery and audio
// templates still point og:image straight at portrait artwork, which crops badly
// on X/Facebook. Fixing them is a design call — a gallery page arguably *should*
// advertise its own artwork — so it is tracked separately, not silently passed.
// Reported below as a warning with a count so it cannot quietly grow.
const ASPECT_WARN_ONLY = ['gallery/', 'audio/'];

// Meta-refresh redirect stubs carry no OG metadata by design.
const NO_OG_EXPECTED = ['2023/03/paperclip-maximizer/', 'projects/ticketsmith/'];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
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

// Attribute order and quoting are not guaranteed by the templates, so match any
// <meta> carrying property="og:image" and pull content out separately.
const META_RE = /<meta\b[^>]*>/gi;
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];

if (!fs.existsSync(DIST)) {
  console.error('ERROR: dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const missing = [];
const badAspect = [];
const warnAspect = [];
const noOgImage = [];
const pages = walk(DIST);
let checked = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(DIST, file);
  let sawOgImage = false;

  for (const [tag] of html.matchAll(META_RE)) {
    if (attr(tag, 'property')?.toLowerCase() !== 'og:image') continue;
    const content = attr(tag, 'content');
    if (!content) continue;
    sawOgImage = true;

    const pathname = sameOriginPathname(content);
    if (pathname === null) continue;
    checked++;

    const asset = path.join(DIST, decodeURIComponent(pathname).replace(/^\//, ''));
    if (!fs.existsSync(asset)) {
      missing.push(`${rel} -> ${pathname}`);
      continue;
    }

    const { width, height } = await sharp(asset).metadata();
    if (!width || !height) {
      missing.push(`${rel} -> ${pathname} (unreadable)`);
    } else if (width / height < MIN_ASPECT) {
      const entry = `${rel} -> ${pathname} (${width}x${height})`;
      if (ASPECT_WARN_ONLY.some((p) => rel.startsWith(p))) warnAspect.push(entry);
      else badAspect.push(entry);
    }
  }

  if (!sawOgImage && !NO_OG_EXPECTED.some((p) => rel.startsWith(p))) noOgImage.push(rel);
}

let failed = false;

if (noOgImage.length > 0) {
  failed = true;
  console.error(`ERROR: ${noOgImage.length} page(s) emit no og:image:\n`);
  for (const f of noOgImage.slice(0, 20)) console.error(`  ${f}`);
  if (noOgImage.length > 20) console.error(`  … and ${noOgImage.length - 20} more`);
  console.error('\nIf the markup changed, this scanner may no longer match — check META_RE.\n');
}

if (missing.length > 0) {
  failed = true;
  console.error(`ERROR: ${missing.length} og:image reference(s) do not resolve in dist/:\n`);
  for (const f of missing) console.error(`  ${f}`);
  console.error('\nIf these are text cards, run `node scripts/generate-og-images.mjs`.\n');
}

if (badAspect.length > 0) {
  failed = true;
  console.error(`ERROR: ${badAspect.length} og:image(s) are too tall for summary_large_image (~1.91:1):\n`);
  for (const f of badAspect) console.error(`  ${f}`);
  console.error('\nPortrait heroes must fall back to the generated landscape text card.\n');
}

if (warnAspect.length > 0) {
  const sections = [...new Set(warnAspect.map((w) => w.split('/')[0]))].join(', ');
  console.warn(
    `⚠ ${warnAspect.length} portrait og:image(s) in ${sections} — known unfixed, not a regression. ` +
      'These crop badly on X/Facebook; see the src/assets follow-up issue.'
  );
}

if (failed) process.exit(1);

console.log(`✓ ${checked} og:image reference(s) across ${pages.length} pages: all resolve and are landscape.`);
