#!/usr/bin/env node
/**
 * Crop generated page cards to the 1200x630 og:image standard.
 *
 * NotebookLM returns landscape infographics at 2752x1536 (1.79:1). The social
 * standard is 1.905:1, so squaring up costs 92px of height — 46 top and bottom,
 * with the full width kept. The generation brief reserves an 8% margin on every
 * edge precisely so this crop cannot clip anything meaningful; if that brief
 * changes, re-check the crop.
 *
 * Usage: node scripts/crop-page-og-cards.mjs <inDir> [outDir]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OG_W = 1200;
const OG_H = 630;

const inDir = process.argv[2];
const outDir = process.argv[3] || path.join(ROOT, 'public/og/pages');

if (!inDir || !fs.existsSync(inDir)) {
  console.error('Usage: node scripts/crop-page-og-cards.mjs <inDir> [outDir]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(inDir).filter((f) => f.endsWith('.png')).sort();
if (!files.length) {
  console.error(`No PNGs in ${inDir}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const src = path.join(inDir, file);
  const dest = path.join(outDir, file);
  try {
    const meta = await sharp(src).metadata();
    const info = await sharp(src)
      .resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(dest);
    console.log(
      `${file.replace(/\.png$/, '').padEnd(14)} ${meta.width}x${meta.height} -> ${info.width}x${info.height}  ${String(Math.round(info.size / 1024)).padStart(4)}KB`
    );
  } catch (err) {
    console.error(`${file}: FAILED — ${err.message}`);
    failed++;
  }
}

console.log(`\n${files.length - failed}/${files.length} cropped -> ${path.relative(ROOT, outDir)}`);
if (failed) process.exit(1);
