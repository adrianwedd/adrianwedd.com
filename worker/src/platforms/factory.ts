import type { Platform, SocialPlatform } from './types';
import type { Env } from '../env';
import { createFacebookPlatform } from './facebook';
import { createInstagramPlatform } from './instagram';

/**
 * Create the appropriate platform adapter for the given platform name.
 * Bluesky will be implemented in a future task.
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
      return createInstagramPlatform(
        env.INSTAGRAM_BUSINESS_ACCOUNT_ID,
        env.INSTAGRAM_ACCESS_TOKEN,
        env.FACEBOOK_APP_TOKEN,
        env.GRAPH_API_VERSION,
      );
    case 'bluesky':
      throw new Error('Bluesky platform adapter not yet implemented');
    default:
      throw new Error(`Unknown platform: ${platform as string}`);
  }
}

/** Platforms that have a fully implemented adapter. */
export const CONFIGURED_PLATFORMS: Platform[] = ['facebook', 'instagram'];
