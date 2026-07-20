import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { APIContext } from 'astro';

/**
 * Byte size for a cover-image enclosure. Throws rather than returning 0: a
 * zero-length enclosure is a silently wrong feed, and failing the build is the
 * only way that gets noticed. See the fuller note in lib/podcast-feed.ts.
 *
 * Gallery covers are all local today. A remote one would need the async HEAD
 * path from podcast-feed.ts, so it throws here instead of quietly emitting 0.
 */
function getFileSize(path: string): number {
  if (path.startsWith('http')) {
    throw new Error(
      `Remote gallery coverImage not supported: ${path}. Enclosure length needs a ` +
        `HEAD request — reuse getFileSize() from lib/podcast-feed.ts if covers move to the CDN.`,
    );
  }
  const filePath = join(process.cwd(), 'public', path);
  try {
    return statSync(filePath).size;
  } catch (err) {
    throw new Error(`Gallery coverImage missing on disk: ${path} (looked in ${filePath})`, {
      cause: err,
    });
  }
}

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
              type: getMimeType(collection.data.coverImage),
              length: getFileSize(collection.data.coverImage),
            },
          }
        : {}),
    })),
  });
}
