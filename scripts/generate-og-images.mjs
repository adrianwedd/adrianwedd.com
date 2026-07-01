#!/usr/bin/env node
/**
 * Generate OG images (1200x630 PNG) for project and blog pages.
 * Uses sharp + inline SVG. Skips pages that already have an OG image.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJECTS_DIR = path.join(ROOT, 'src', 'content', 'projects');
const BLOG_DIR = path.join(ROOT, 'src', 'content', 'blog');
const FIXES_DIR = path.join(ROOT, 'src', 'content', 'fixes');
const OG_DIR = path.join(ROOT, 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
  bg: '#1a181c',
  accent: '#c48b6e',
  text: '#e2ddd8',
  muted: '#968e96',
};

function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Split title into lines of ~maxChars, max 2 lines */
function splitTitle(title, maxChars = 45) {
  if (title.length <= maxChars) return [title];
  const words = title.split(' ');
  let line1 = '';
  for (let i = 0; i < words.length; i++) {
    const candidate = (line1 + ' ' + words[i]).trim();
    if (candidate.length <= maxChars) {
      line1 = candidate;
    } else {
      const line2 = words.slice(i).join(' ');
      if (line2.length > maxChars + 10) {
        return [line1, line2.slice(0, maxChars) + '\u2026'];
      }
      return [line1, line2];
    }
  }
  return [line1];
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 1) + '\u2026';
}

function buildSvg(title, description, tags) {
  const titleLines = splitTitle(title);
  const titleY = titleLines.length === 1 ? 280 : 250;
  const descY = titleLines.length === 1 ? 340 : 330;

  const titleElements = titleLines
    .map(
      (line, i) =>
        `<text x="80" y="${titleY + i * 60}" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="${COLORS.text}">${xmlEscape(line)}</text>`
    )
    .join('\n    ');

  const desc = truncate(description, 100);
  const tagsStr = tags.slice(0, 5).join('  \u00b7  ');

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}"/>
  <!-- Accent bar -->
  <rect width="${WIDTH}" height="6" fill="${COLORS.accent}"/>
  <!-- Accent glow -->
  <ellipse cx="900" cy="500" rx="400" ry="200" fill="${COLORS.accent}" opacity="0.06"/>
  <!-- Site name -->
  <text x="80" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${COLORS.muted}">adrianwedd.com</text>
  <!-- Title -->
  ${titleElements}
  <!-- Description -->
  <text x="80" y="${descY + (titleLines.length === 1 ? 0 : 60)}" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="${COLORS.muted}">${xmlEscape(desc)}</text>
  <!-- Tags -->
  <text x="80" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${COLORS.accent}">${xmlEscape(tagsStr)}</text>
</svg>`;
}

/** Generate OG images for all .md files in a directory, skipping existing. */
async function generateForDir(dir, outDir, label) {
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    // Match slug() from src/lib/utils.ts — strip -post suffix before extension
    const slug = file.replace(/-post(\.mdx?)?$/, '').replace(/\.mdx?$/, '');
    const outPath = path.join(outDir, `${slug}.png`);

    if (fs.existsSync(outPath)) {
      skipped++;
      continue;
    }

    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data } = matter(raw);

    if (data.draft) continue;
    // Skip when a heroImage is set — the page template uses heroImage (with
    // .webp -> .jpg swap) as og:image, so the auto-generated text-card PNG
    // would be dead weight.
    if (data.heroImage) continue;

    const svg = buildSvg(data.title || slug, data.description || '', data.tags || []);

    await sharp(Buffer.from(svg)).png().toFile(outPath);
    generated++;
    console.log(`  [${label}] created: ${slug}.png`);
  }

  return { generated, skipped };
}

async function main() {
  const projects = await generateForDir(PROJECTS_DIR, path.join(OG_DIR, 'projects'), 'Project');
  const blog = await generateForDir(BLOG_DIR, path.join(OG_DIR, 'blog'), 'Blog');
  const fixes = await generateForDir(FIXES_DIR, path.join(OG_DIR, 'fixes'), 'Fix');

  const generated = projects.generated + blog.generated + fixes.generated;
  const skipped = projects.skipped + blog.skipped + fixes.skipped;
  console.log(`\nDone: ${generated} generated, ${skipped} skipped (already exist).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
