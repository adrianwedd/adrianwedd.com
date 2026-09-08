/** Verify expected heroes, actual image bytes, public originals and budget. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { parse } from 'node-html-parser';
import sharp from 'sharp';
import { heroEntries } from './sync-hero-images.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const entries = heroEntries(root);
assert(entries.length > 0, 'No expected responsive heroes');
let nativeCapped = 0;
for (const entry of entries) {
  const file = resolve(dist, `.${entry.page}`, 'index.html');
  const html = parse(readFileSync(file, 'utf8'));
  const hero = html.querySelector('header picture img[fetchpriority="high"]');
  assert(hero, `${entry.page}: missing hero Picture`);
  const original = readFileSync(resolve(root, `public${entry.image}`));
  assert(original.equals(readFileSync(resolve(dist, `.${entry.image}`))), `${entry.page}: public artwork changed`);
  const originalMeta = await sharp(original).metadata();
  // Astro avoids upscaling. Six existing 1024 px covers retain their native cap.
  const maxWidth = Math.min(originalMeta.width, 1200);
  const expectedWidths = [...new Set([480, 768, maxWidth].filter((width) => width <= maxWidth))];
  if (maxWidth < 1200) nativeCapped++;
  const sources = hero.parentNode.querySelectorAll('source');
  assert.deepEqual(
    sources.map((source) => source.getAttribute('type')),
    ['image/avif', 'image/webp'],
  );
  for (const source of sources) {
    const candidates = (source.getAttribute('srcset') ?? '').split(',').map((item) => item.trim().split(/\s+/));
    assert.deepEqual(
      candidates.map(([, width]) => Number(width.replace('w', ''))),
      expectedWidths,
      entry.page,
    );
    assert.equal(new Set(candidates.map(([url]) => url)).size, candidates.length);
    assert(source.getAttribute('sizes'), `${entry.page}: missing sizes`);
    for (const [url, width] of candidates) {
      assert(url.startsWith('/_astro/'), `${entry.page}: unprocessed hero URL`);
      const meta = await sharp(resolve(dist, url.slice(1))).metadata();
      assert.equal(`image/${meta.format === 'heif' ? 'avif' : meta.format}`, source.getAttribute('type'));
      assert.equal(meta.width, Number(width.replace('w', '')));
      assert(Math.abs(meta.height / meta.width - originalMeta.height / originalMeta.width) < 0.005);
    }
  }
  const fallback = await sharp(resolve(dist, hero.getAttribute('src').slice(1))).metadata();
  assert.equal(fallback.format, 'webp');
  assert.equal(fallback.width, maxWidth);
  assert(
    !html.querySelector('link[rel="preload"][as="image"][href^="/notebook-assets/"]'),
    `${entry.page}: preloads original`,
  );
}
function size(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const path = resolve(dir, entry.name);
    return total + (entry.isDirectory() ? size(path) : statSync(path).size);
  }, 0);
}
const bytes = size(resolve(dist, '_astro'));
assert(bytes <= 100 * 1024 * 1024, `dist/_astro exceeds 100 MiB: ${bytes}`);
console.log(
  `Verified ${entries.length} responsive heroes (${nativeCapped} native-width caps); public originals unchanged; dist/_astro ${(bytes / 1024 / 1024).toFixed(1)} MiB.`,
);
