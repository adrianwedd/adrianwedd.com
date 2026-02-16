import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const collections = (await getCollection('gallery')).sort(
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
              length: 0,
            },
          }
        : {}),
    })),
  });
}
