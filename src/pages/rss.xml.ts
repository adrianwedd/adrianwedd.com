import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const [posts, projects, galleries, episodes] = await Promise.all([
    getCollection('blog'),
    getCollection('projects'),
    getCollection('gallery'),
    getCollection('audio'),
  ]);

  const items = [
    ...posts
      .filter((p) => !p.data.draft)
      .map((p) => ({
        title: p.data.title,
        pubDate: p.data.date,
        description: p.data.description,
        link: `/blog/${slug(p.id)}/`,
        categories: ['blog', ...p.data.tags],
      })),
    ...projects.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description,
      link: `/projects/${slug(p.id)}/`,
      categories: ['project', ...p.data.tags],
    })),
    ...galleries.map((g) => ({
      title: g.data.title,
      pubDate: g.data.date,
      description: g.data.description || `Gallery: ${g.data.title}`,
      link: `/gallery/${slug(g.id)}/`,
      categories: ['gallery', ...g.data.tags],
    })),
    ...episodes.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.description,
      link: `/audio/${slug(e.id)}/`,
      categories: ['audio', ...e.data.tags],
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'Adrian Wedd',
    description: 'AI safety researcher and systems thinker. Projects, writing, audio, and visual work.',
    site: context.site!.toString(),
    items,
  });
}
