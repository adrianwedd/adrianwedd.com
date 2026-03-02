import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { APIContext } from 'astro';

function getFileSize(path: string): number {
  if (path.startsWith('http')) return 0;
  try {
    return statSync(join(process.cwd(), 'public', path)).size;
  } catch {
    return 0;
  }
}

export async function GET(context: APIContext) {
  const collections = (await getCollection('gallery')).filter((g) => !g.data.draft).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const site = context.site!.toString().replace(/\/$/, '');

  return rss({
    title: 'Adrian Wedd — Gallery',
    description: 'Visual thinking—process documentation, experiments, and patterns.',
    site: context.site!.toString(),
    items: collections.map((collection) => ({
      title: collection.data.title,
      pubDate: collection.data.date,
      description: collection.data.description || `Gallery: ${collection.data.title}`,
      link: `/gallery/${slug(collection.id)}/`,
      categories: collection.data.tags,
      ...(collection.data.coverImage
        ? {
            enclosure: {
              url: `${site}${collection.data.coverImage}`,
              type: 'image/webp',
              length: getFileSize(collection.data.coverImage),
            },
          }
        : {}),
    })),
  });
}
