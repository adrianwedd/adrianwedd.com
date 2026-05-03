import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { APIContext } from 'astro';

async function getFileSize(audioUrl: string): Promise<number> {
  if (audioUrl.startsWith('http')) {
    try {
      const res = await fetch(audioUrl, { method: 'HEAD' });
      const len = res.headers.get('content-length');
      return len ? parseInt(len, 10) : 0;
    } catch {
      return 0;
    }
  }
  try {
    const filePath = join(process.cwd(), 'public', audioUrl);
    return statSync(filePath).size;
  } catch {
    return 0;
  }
}

export async function GET(context: APIContext) {
  const [episodes, blogs, projects] = await Promise.all([
    getCollection('audio').then((all) =>
      all.filter((e) => !e.data.draft).sort((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    ),
    getCollection('blog'),
    getCollection('projects'),
  ]);

  const site = context.site!.toString().replace(/\/$/, '');

  // Apple Podcasts requires a square image, minimum 1400×1400 px (recommended 3000×3000),
  // JPEG or PNG, RGB, ≤500KB. Place the file at public/podcast-cover.jpg.
  const podcastCover = `${site}/podcast-cover.jpg`;

  // Index related content by id (without .md extension) for fast lookup
  const blogById = new Map(blogs.map((b) => [slug(b.id), b]));
  const projectById = new Map(projects.map((p) => [slug(p.id), p]));

  const items = await Promise.all(
    episodes.map(async (ep) => {
      const audioUrl = ep.data.audioUrl.startsWith('http') ? ep.data.audioUrl : `${site}${ep.data.audioUrl}`;
      const fileSize = await getFileSize(ep.data.audioUrl);
      const epSlug = slug(ep.id);
      const episodeUrl = `${site}/audio/${epSlug}/`;

      // Resolve episode artwork from the related post/project's heroImage
      const relatedPost = ep.data.relatedPost ? blogById.get(ep.data.relatedPost.replace(/-post$/, '')) : undefined;
      const relatedProject = ep.data.relatedProject ? projectById.get(ep.data.relatedProject) : undefined;
      const heroImage = relatedPost?.data.heroImage ?? relatedProject?.data.heroImage;
      const episodeImage = heroImage
        ? heroImage.startsWith('http')
          ? heroImage
          : `${site}${heroImage}`
        : podcastCover;

      return `
    <item>
      <title>${escapeXml(ep.data.title)}</title>
      <description>${escapeXml(ep.data.description)}</description>
      <itunes:summary>${escapeXml(ep.data.description)}</itunes:summary>
      <content:encoded><![CDATA[${ep.data.description}]]></content:encoded>
      <itunes:author>Adrian Wedd</itunes:author>
      <itunes:image href="${escapeXml(episodeImage)}" />
      <link>${episodeUrl}</link>
      <guid isPermaLink="true">${episodeUrl}</guid>
      <pubDate>${ep.data.date.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" type="audio/mpeg" length="${fileSize}" />
      ${ep.data.duration ? `<itunes:duration>${ep.data.duration}</itunes:duration>` : ''}
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    }),
  );

  const itemsXml = items.join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Adrian Wedd</title>
    <description>Audio overviews, deep dives, and long-form conversations on AI, safety, design, and the edges of practice.</description>
    <itunes:summary>Audio overviews, deep dives, and long-form conversations on AI, safety, design, and the edges of practice.</itunes:summary>
    <link>${site}/audio/</link>
    <atom:link href="${site}/audio/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-AU</language>
    <copyright>© ${new Date().getFullYear()} Adrian Wedd</copyright>
    <itunes:author>Adrian Wedd</itunes:author>
    <itunes:owner>
      <itunes:name>Adrian Wedd</itunes:name>
      <itunes:email>adrianwedd@gmail.com</itunes:email>
    </itunes:owner>
    <itunes:type>episodic</itunes:type>
    <itunes:category text="Technology" />
    <itunes:category text="News">
      <itunes:category text="Tech News" />
    </itunes:category>
    <itunes:category text="Science">
      <itunes:category text="Social Sciences" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:image href="${podcastCover}" />
    <podcast:locked>no</podcast:locked>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
