import type { Platform, SocialPlatform } from './types';
import type { Env } from '../env';
import { createFacebookPlatform } from './facebook';

/**
 * Create the appropriate platform adapter for the given platform name.
 * Instagram and Bluesky will be implemented in future tasks.
 */
export function createPlatform(platform: Platform, env: Env): SocialPlatform {
  switch (platform) {
    case 'facebook':
      return createFacebookPlatform(
        env.FACEBOOK_PAGE_ID,
        env.FACEBOOK_PAGE_TOKEN,
        env.FACEBOOK_APP_TOKEN,
        env.GRAPH_API_VERSION,
      );
    case 'instagram':
      throw new Error('Instagram platform adapter not yet implemented');
    case 'bluesky':
      throw new Error('Bluesky platform adapter not yet implemented');
    default:
      throw new Error(`Unknown platform: ${platform as string}`);
  }
}

/** Platforms that have a fully implemented adapter. */
export const CONFIGURED_PLATFORMS: Platform[] = ['facebook'];
