/** Recreate disposable Astro imports from the canonical public artwork. */
import { readdirSync, readFileSync, mkdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { slug } from '../src/lib/utils.ts';

export function heroEntries(root) {
  const entries = [];
  for (const collection of ['blog', 'projects']) {
    const dir = resolve(root, 'src/content', collection);
    for (const file of readdirSync(dir).filter((file) => /\.mdx?$/.test(file))) {
      const { data } = matter(readFileSync(resolve(dir, file), 'utf8'));
      // Mirror the templates: non-explicit Lyria video posts have a poster,
      // not a Picture hero. Their public cover must remain available.
      if (data.draft || !data.heroImage?.startsWith('/notebook-assets/')) continue;
      if (collection === 'blog' && data.series === 'The Lyria Chronicles' && data.videoUrl && !data.explicit) continue;
      entries.push({ page: `/${collection}/${slug(file)}/`, image: data.heroImage });
    }
  }
  return entries;
}

export function syncHeroImages(root = resolve(import.meta.dirname, '..')) {
  const generated = resolve(root, 'src/assets/generated-heroes');
  const publicDir = resolve(root, 'public');
  const wanted = new Set();
  for (const hero of new Set(heroEntries(root).map((entry) => entry.image))) {
    const source = resolve(publicDir, `.${hero}`);
    const target = resolve(generated, `.${hero}`);
    if (!source.startsWith(publicDir + sep) || !target.startsWith(generated + sep)) {
      throw new Error(`Hero path escapes asset directory: ${hero}`);
    }
    if (!/\.(webp|jpe?g|png)$/i.test(hero)) throw new Error(`Unsupported hero format: ${hero}`);
    const bytes = readFileSync(source); // Fail the build for missing source artwork.
    wanted.add(target);
    if (!existsSync(target) || !bytes.equals(readFileSync(target))) {
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
  // Prune only this generated directory; never modify canonical public files.
  function prune(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = resolve(dir, entry.name);
      if (entry.isDirectory()) prune(file);
      else if (!wanted.has(file)) unlinkSync(file);
    }
  }
  prune(generated);
  return { count: wanted.size, directory: relative(root, generated) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = syncHeroImages();
  console.log(`Prepared ${result.count} disposable hero imports in ${result.directory}.`);
}
