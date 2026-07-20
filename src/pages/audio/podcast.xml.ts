import { buildPodcastFeed } from '../../lib/podcast-feed';
import type { APIContext } from 'astro';

// The audio-only feed, for Spotify — it rejects any feed carrying a video
// enclosure. Runs alongside /audio/feed.xml rather than replacing it.
export function GET(context: APIContext) {
  return buildPodcastFeed(context, { audioOnly: true, selfPath: '/audio/podcast.xml' });
}
