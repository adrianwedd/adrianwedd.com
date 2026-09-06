#!/usr/bin/env node
/**
 * Build one NotebookLM source bundle per static/index page, for OG card generation.
 *
 * Content entries (blog, projects, …) already carry infographic heroes that serve
 * as their og:image. The pages that don't — the homepage, about, now, the section
 * indexes, the app-ish pages — all share a single generic /og-default.png. These
 * bundles are the sources for the per-page cards that replace it.
 *
 * Why a bundle and not just the page text: several of these pages are island-
 * rendered or pure index shells, so the built HTML has almost nothing in <main>
 * (activity: 13 words, search: 20, analytics: 35). Handing NotebookLM 13 words and
 * asking for an infographic is precisely the input that produced fabricated
 * statistics and mistitled cards in earlier batches — with nothing real to draw on
 * it fills the layout from invention. So each bundle combines up to four sources,
 * all of them factual:
 *
 *   1. The page's own SEO title and description — the single most on-topic sentence
 *      that exists about the page, and the one the card should be echoing.
 *   2. The rendered <main> text from dist/ — what a reader actually sees.
 *   3. The .astro source — for island-rendered pages this is where the real copy
 *      lives, since it never made it into the static HTML.
 *   4. For section indexes, the titles and descriptions of the entries in that
 *      collection — what the section *contains* is what its card should convey.
 *
 * Requires a build first: reads dist/. Run `npm run build` if it is stale.
 *
 * Usage: node scripts/build-page-og-sources.mjs [outDir]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PAGES = path.join(ROOT, 'src/pages');
const CONTENT = path.join(ROOT, 'src/content');

// slug → { route, astro, collection? }
// `route` is the dist directory ('' = site root). `collection` pulls in the
// entry list for section indexes. 404 is deliberately absent: it keeps the
// generic default, by decision, not oversight. services already has a card.
const TARGETS = [
  { slug: 'home', route: '', astro: 'index.astro' },
  { slug: 'about', route: 'about', astro: 'about.astro' },
  { slug: 'now', route: 'now', astro: 'now.astro' },
  { slug: 'contact', route: 'contact', astro: 'contact.astro' },
  { slug: 'colophon', route: 'colophon', astro: 'colophon.astro' },
  { slug: 'changelog', route: 'changelog', astro: 'changelog.astro' },
  { slug: 'local', route: 'local', astro: 'local.astro' },
  { slug: 'privacy', route: 'privacy', astro: 'privacy.astro' },
  { slug: 'search', route: 'search', astro: 'search.astro' },
  { slug: 'blog', route: 'blog', astro: 'blog/[...page].astro', collection: 'blog' },
  { slug: 'projects', route: 'projects', astro: 'projects/index.astro', collection: 'projects' },
  { slug: 'gallery', route: 'gallery', astro: 'gallery/index.astro', collection: 'gallery' },
  { slug: 'audio', route: 'audio', astro: 'audio/[...page].astro', collection: 'audio' },
  {
    slug: 'case-studies',
    route: 'case-studies',
    astro: 'case-studies/index.astro',
    collection: 'case-studies',
  },
  { slug: 'fixes', route: 'fixes', astro: 'fixes/index.astro', collection: 'fixes' },
  { slug: 'new', route: 'new', astro: 'new/index.astro' },
  { slug: 'activity', route: 'activity', astro: 'activity/index.astro' },
  { slug: 'analytics', route: 'analytics', astro: 'analytics/index.astro' },
  { slug: 'enquiry', route: 'enquiry', astro: 'enquiry/index.astro' },
];

// Below this, the bundle has too little real material to infographic honestly.
// Better to fail loudly here than to ship a card full of invented numbers.
const MIN_WORDS = 120;

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const stripTags = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

function attr(html, name) {
  const m = html.match(new RegExp(`<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`, 'i'));
  return m ? decode(m[1]) : '';
}

/** Titles + descriptions of a collection's non-draft entries. */
function collectionSummary(name) {
  const dir = path.join(CONTENT, name);
  if (!fs.existsSync(dir)) return '';
  const lines = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.mdx?$/.test(file)) continue;
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const fm = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    const block = fm[1];
    if (/^draft:\s*true\s*$/m.test(block)) continue;
    const get = (key) => {
      const m = block.match(new RegExp(`^${key}:\\s*["']?(.*?)["']?\\s*$`, 'm'));
      return m ? m[1].trim() : '';
    };
    const title = get('title');
    if (!title) continue;
    const desc = get('description');
    lines.push(desc ? `- ${title} — ${desc}` : `- ${title}`);
  }
  return lines.join('\n');
}

const outDir = process.argv[2] || path.join(ROOT, '.og-sources');
fs.mkdirSync(outDir, { recursive: true });

const manifest = [];
const thin = [];

for (const t of TARGETS) {
  const htmlPath = path.join(DIST, t.route, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(`MISSING build output: ${path.relative(ROOT, htmlPath)} — run npm run build`);
    process.exitCode = 1;
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');

  const title = attr(html, 'og:title') || (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? t.slug);
  const description = attr(html, 'description') || attr(html, 'og:description');

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const mainText = mainMatch ? stripTags(mainMatch[1]) : '';

  const astroPath = path.join(PAGES, t.astro);
  const astroSrc = fs.existsSync(astroPath) ? fs.readFileSync(astroPath, 'utf8') : '';

  const parts = [
    `# ${decode(title)}`,
    '',
    `URL: https://adrianwedd.com/${t.route ? t.route + '/' : ''}`,
    '',
    `## What this page is`,
    description || '(no meta description)',
  ];

  if (mainText) parts.push('', '## Page content as rendered', mainText);

  if (t.collection) {
    const summary = collectionSummary(t.collection);
    if (summary) {
      parts.push('', `## Everything listed in this section`, summary);
    }
  }

  if (astroSrc) {
    parts.push(
      '',
      '## Page template source',
      '(Included because this page is partly client-rendered — copy that never',
      'reaches the static HTML lives here. Treat it as reference for what the',
      'page says and does, not as material to reproduce verbatim.)',
      '',
      astroSrc
    );
  }

  const body = parts.join('\n');
  const words = body.split(/\s+/).filter(Boolean).length;
  const file = path.join(outDir, `${t.slug}.md`);
  fs.writeFileSync(file, body);

  if (words < MIN_WORDS) thin.push(`${t.slug} (${words} words)`);
  manifest.push({
    slug: t.slug,
    route: t.route,
    // The card's headline and supporting line are dictated from these, not left
    // to the model — see the brief in generate-page-og-cards.sh.
    title: decode(title).replace(/\s*[—|]\s*Adrian Wedd\s*$/, ''),
    description,
    words,
    file,
  });
  console.log(`${t.slug.padEnd(14)} ${String(words).padStart(6)} words`);
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n${manifest.length} bundles → ${path.relative(ROOT, outDir)}`);
if (thin.length) {
  console.error(`\nToo thin to generate honestly (<${MIN_WORDS} words): ${thin.join(', ')}`);
  process.exitCode = 1;
}
