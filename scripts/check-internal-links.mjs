#!/usr/bin/env node
/**
 * Build-time internal-link checker.
 *
 * Lychee (the CI link checker) excludes our own domain to avoid pre-deploy
 * 404s on not-yet-published pages. That blind spot let a real bug ship once
 * (an audio entry linking to a curated-out project page — see PR #417), so
 * this fills the gap: it scans the built `dist/**` HTML for *internal* links
 * and fails if any resolve to a path that isn't present in `dist/`.
 *
 * Scope mirrors Lychee's (built HTML) but covers only same-origin links it
 * skips. In-page anchor (#id) verification is intentionally out of scope.
 *
 * Usage: node scripts/check-internal-links.mjs [distDir]   (default: ./dist)
 * Exits non-zero if any broken internal links are found.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, posix } from 'node:path';

const SITE_HOST = 'adrianwedd.com';
const distDir = resolve(process.argv[2] || 'dist');

if (!existsSync(distDir)) {
  console.error(`✗ dist directory not found: ${distDir}\n  Run \`npm run build\` first.`);
  process.exit(1);
}

/** Recursively collect every *.html file under dir. */
function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const HREF_RE = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** Extract every href value from an HTML string. */
function extractHrefs(html) {
  const hrefs = [];
  let m;
  while ((m = HREF_RE.exec(html)) !== null) {
    const raw = m[1] ?? m[2] ?? m[3] ?? '';
    if (raw) hrefs.push(raw);
  }
  return hrefs;
}

/**
 * Return the internal path for an href, or null if it's not an internal link
 * we should check (external, mailto/tel, pure fragment, protocol-relative…).
 */
function toInternalPath(href) {
  const h = href.trim();
  if (!h) return null;
  if (h.startsWith('//')) return null; // protocol-relative (e.g. CDN)
  if (h.startsWith('#')) return null; // same-page anchor
  if (/^(mailto:|tel:|javascript:|data:)/i.test(h)) return null;

  let path;
  if (h.startsWith('/')) {
    path = h;
  } else if (/^https?:\/\//i.test(h)) {
    // Absolute URL — internal only if the host matches ours exactly. Parse
    // with the URL API rather than a startsWith() prefix check, which would
    // also match look-alike hosts (e.g. adrianwedd.com.evil.example).
    let u;
    try {
      u = new URL(h);
    } catch {
      return null;
    }
    if (u.host !== SITE_HOST) return null; // external origin
    path = u.pathname;
  } else {
    return null; // relative link — Astro emits absolute paths; ignore for v1
  }

  // strip query + hash
  path = path.split('#')[0].split('?')[0];
  return path || '/';
}

/** Map an internal path to candidate files on disk; true if any exists. */
function resolves(path) {
  // decode %20 etc. so on-disk lookups match
  let p;
  try {
    p = decodeURIComponent(path);
  } catch {
    p = path;
  }
  const rel = p.replace(/^\/+/, ''); // drop leading slash(es)
  const base = join(distDir, rel);

  const candidates = [];
  if (path === '/' || path.endsWith('/')) {
    candidates.push(join(base, 'index.html'));
  } else if (posix.basename(p).includes('.')) {
    candidates.push(base); // looks like a file (has an extension)
  } else {
    // extensionless, no trailing slash: try dir route then .html
    candidates.push(join(base, 'index.html'), `${base}.html`);
  }
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

const files = htmlFiles(distDir);
const broken = new Map(); // target path -> Set of source files (relative)
let checkedLinks = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const src = file.slice(distDir.length + 1);
  for (const href of extractHrefs(html)) {
    const path = toInternalPath(href);
    if (path === null) continue;
    checkedLinks++;
    if (!resolves(path)) {
      if (!broken.has(path)) broken.set(path, new Set());
      broken.get(path).add(src);
    }
  }
}

if (broken.size === 0) {
  console.log(`✓ Internal links OK — ${checkedLinks} internal links across ${files.length} pages, 0 broken.`);
  process.exit(0);
}

console.error(`✗ Found ${broken.size} broken internal link target(s):\n`);
for (const [target, sources] of [...broken.entries()].sort()) {
  console.error(`  ${target}`);
  for (const s of [...sources].sort()) console.error(`      ← ${s}`);
}
console.error(
  `\n${broken.size} broken target(s) across ${files.length} pages. ` +
    `Fix the link or the missing page, then rebuild.`,
);
process.exit(1);
