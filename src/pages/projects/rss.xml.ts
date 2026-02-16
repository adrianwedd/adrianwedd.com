import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const projects = (await getCollection('projects')).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  return rss({
    title: 'Adrian Wedd — Projects',
    description: "Things I've built, broken, and sometimes both.",
    site: context.site!.toString(),
    items: projects.map((project) => ({
      title: project.data.title,
      pubDate: project.data.date,
      description: project.data.description,
      link: `/projects/${slug(project.id)}/`,
      categories: project.data.tags,
    })),
  });
}
