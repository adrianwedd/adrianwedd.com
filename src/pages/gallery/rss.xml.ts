import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import { getFileSize } from '../../lib/enclosure-size';
import type { APIContext } from 'astro';

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/webp';
}

export async function GET(context: APIContext) {
  const collections = (await getCollection('gallery'))
    .filter((g) => !g.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const site = context.site!.toString().replace(/\/$/, '');

  return rss({
    title: 'Adrian Wedd — Gallery',
    description: 'Visual thinking—process documentation, experiments, and patterns.',
    site: context.site!.toString(),
    // Sizes resolve before rss() because enclosure/@length must be a number,
    // and getFileSize is async for the CDN case. Shared with the podcast feeds
    // so a cover image that ever moves to the CDN just works.
    items: await Promise.all(
      collections.map(async (collection) => ({
        title: collection.data.title,
        pubDate: collection.data.date,
        description: collection.data.description || `Gallery: ${collection.data.title}`,
        link: `/gallery/${slug(collection.id)}/`,
        categories: collection.data.tags,
        ...(collection.data.coverImage
          ? {
              enclosure: {
                url: collection.data.coverImage.startsWith('http')
                  ? collection.data.coverImage
                  : `${site}${collection.data.coverImage}`,
                type: getMimeType(collection.data.coverImage),
                length: await getFileSize(collection.data.coverImage),
              },
            }
          : {}),
      })),
    ),
  });
}
