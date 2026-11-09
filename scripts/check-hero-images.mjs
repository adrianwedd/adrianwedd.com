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
  const animatedSources = sources.filter((source) =>
    (source.getAttribute('media') ?? '').includes('prefers-reduced-motion'),
  );
  if (entry.animated) {
    // A hero rendered from the project's own animation: one unprocessed WebP
    // offered only when motion is welcome, with the processed still as the
    // <img> fallback. Assert the source, the file, and that it really animates
    // — a "heroAnimated" that points at a still would otherwise pass silently.
    assert.equal(animatedSources.length, 1, `${entry.page}: expected exactly one reduced-motion source`);
    const [source] = animatedSources;
    assert.equal(source.getAttribute('type'), 'image/webp');
    assert.match(source.getAttribute('media'), /prefers-reduced-motion:\s*no-preference/);
    const candidates = (source.getAttribute('srcset') ?? '')
      .trim()
      .split(',')
      .map((item) => item.trim());
    assert.equal(candidates.length, 1, `${entry.page}: animated hero must be a single file`);
    const url = candidates[0].split(/\s+/)[0];
    assert.equal(url, entry.animated, `${entry.page}: animated source does not match heroAnimated`);
    const bytes = readFileSync(resolve(dist, `.${url}`));
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${entry.page}: animated hero is not a WebP`);
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    const frames = bytes.toString('latin1').split('ANMF').length - 1;
    assert(frames > 1, `${entry.page}: heroAnimated holds ${frames} frame(s) — it is not an animation`);
    const animatedMeta = await sharp(resolve(dist, `.${url}`)).metadata();
    assert(Math.abs(animatedMeta.height / animatedMeta.width - originalMeta.height / originalMeta.width) < 0.005);
    assert.equal(sources.length, 1, `${entry.page}: animated hero must not also emit processed <source> tags`);
  } else {
    assert.equal(animatedSources.length, 0, `${entry.page}: reduced-motion source without heroAnimated`);
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
  }
  const fallback = await sharp(resolve(dist, hero.getAttribute('src').slice(1))).metadata();
  assert.equal(fallback.format, 'webp');
  if (!entry.animated) assert.equal(fallback.width, maxWidth);
  assert(Math.abs(fallback.height / fallback.width - originalMeta.height / originalMeta.width) < 0.005);
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
