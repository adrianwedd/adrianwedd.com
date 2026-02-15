import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const episodes = (await getCollection('audio')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const site = context.site!.toString().replace(/\/$/, '');

  const items = episodes
    .map((ep) => {
      const audioUrl = ep.data.audioUrl.startsWith('http') ? ep.data.audioUrl : `${site}${ep.data.audioUrl}`;

      return `
    <item>
      <title>${escapeXml(ep.data.title)}</title>
      <description>${escapeXml(ep.data.description)}</description>
      <link>${site}/audio/${slug(ep.id)}/</link>
      <guid isPermaLink="true">${site}/audio/${slug(ep.id)}/</guid>
      <pubDate>${ep.data.date.toUTCString()}</pubDate>
      <enclosure url="${escapeXml(audioUrl)}" type="audio/mpeg" />
      ${ep.data.duration ? `<itunes:duration>${ep.data.duration}</itunes:duration>` : ''}
      <itunes:explicit>false</itunes:explicit>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Adrian Wedd</title>
    <description>Podcast episodes, audio essays, and conversations from a creative technologist's workshop.</description>
    <link>${site}/audio/</link>
    <atom:link href="${site}/audio/feed.xml" rel="self" type="application/rss+xml" />
    <language>en-au</language>
    <itunes:author>Adrian Wedd</itunes:author>
    <itunes:category text="Technology" />
    <itunes:explicit>false</itunes:explicit>
    ${items}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
