import { buildPodcastFeed } from '../../lib/podcast-feed';
import type { APIContext } from 'astro';

// The full feed: every published episode, including the video-only ones.
// Spotify won't take this one — see audio/podcast.xml.ts.
export function GET(context: APIContext) {
  return buildPodcastFeed(context, { selfPath: '/audio/feed.xml' });
}
