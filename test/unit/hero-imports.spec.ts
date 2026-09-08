import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { heroEntries, syncHeroImages } from '../../scripts/sync-hero-images.mjs';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'hero-imports-'));
  roots.push(root);
  for (const dir of ['src/content/blog', 'src/content/projects']) mkdirSync(resolve(root, dir), { recursive: true });
  function write(path: string, content: string) {
    const dest = resolve(root, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  function post(name: string, fields = '') {
    write(`src/content/blog/${name}.md`, `---\nheroImage: /notebook-assets/${name}/cover.webp\n${fields}---\nBody\n`);
    write(`public/notebook-assets/${name}/cover.webp`, `canonical ${name}`);
  }
  return { root, write, post };
}
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

it('excludes drafts and video-only covers but keeps explicit Lyria and ordinary video posts', () => {
  const { root, post } = fixture();
  post('draft', 'draft: true\n');
  post('video', 'series: The Lyria Chronicles\nvideoUrl: https://cdn.test/video.mp4\n');
  post('explicit', 'series: The Lyria Chronicles\nvideoUrl: https://cdn.test/video.mp4\nexplicit: true\n');
  post('ordinary-post', 'videoUrl: https://cdn.test/video.mp4\n');
  expect(heroEntries(root).map((entry) => entry.page)).toEqual(['/blog/explicit/', '/blog/ordinary/']);
  expect(syncHeroImages(root).count).toBe(2);
  expect(existsSync(resolve(root, 'src/assets/generated-heroes/notebook-assets/video/cover.webp'))).toBe(false);
  expect(readFileSync(resolve(root, 'public/notebook-assets/video/cover.webp'), 'utf8')).toBe('canonical video');
});

it('refreshes changed artwork, leaves identical copies alone, and prunes newly unpublished heroes', () => {
  const { root, post, write } = fixture();
  post('sample');
  syncHeroImages(root);
  const generated = resolve(root, 'src/assets/generated-heroes/notebook-assets/sample/cover.webp');
  const modified = statSync(generated).mtimeMs;
  syncHeroImages(root);
  expect(statSync(generated).mtimeMs).toBe(modified);
  write('public/notebook-assets/sample/cover.webp', 'revised source');
  syncHeroImages(root);
  expect(readFileSync(generated, 'utf8')).toBe('revised source');
  write('src/content/blog/sample.md', '---\ndraft: true\nheroImage: /notebook-assets/sample/cover.webp\n---\n');
  syncHeroImages(root);
  expect(existsSync(generated)).toBe(false);
  expect(readFileSync(resolve(root, 'public/notebook-assets/sample/cover.webp'), 'utf8')).toBe('revised source');
});

it('fails for missing sources and refuses paths outside the generated asset directory', () => {
  const { root, write } = fixture();
  write('src/content/blog/missing.md', '---\nheroImage: /notebook-assets/missing.webp\n---\n');
  expect(() => syncHeroImages(root)).toThrow();
  write('src/content/blog/missing.md', '---\nheroImage: /notebook-assets/../../escape.webp\n---\n');
  expect(() => syncHeroImages(root)).toThrow('escapes asset directory');
});
