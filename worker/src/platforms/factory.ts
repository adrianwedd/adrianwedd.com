import type { Platform, SocialPlatform } from './types';
import type { Env } from '../env';
import { createFacebookPlatform } from './facebook';
import { createInstagramPlatform } from './instagram';
import { createBlueskyPlatform } from './bluesky';
import { createTwitterPlatform } from './twitter';

/**
 * Create the appropriate platform adapter for the given platform name.
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
      return createBlueskyPlatform(env.BLUESKY_HANDLE, env.BLUESKY_APP_PASSWORD);
    case 'twitter':
      return createTwitterPlatform({
        apiKey: env.X_API_KEY,
        apiKeySecret: env.X_API_KEY_SECRET,
        accessToken: env.X_ACCESS_TOKEN,
        accessTokenSecret: env.X_ACCESS_TOKEN_SECRET,
      });
    default:
      throw new Error(`Unknown platform: ${platform as string}`);
  }
}

/** Platforms that have a fully implemented adapter. */
export function getConfiguredPlatforms(env: Env): Platform[] {
  const platforms: Platform[] = [];
  if (env.FACEBOOK_PAGE_ID && env.FACEBOOK_PAGE_TOKEN && env.FACEBOOK_APP_TOKEN && env.GRAPH_API_VERSION) {
    platforms.push('facebook');
  }
  if (env.INSTAGRAM_BUSINESS_ACCOUNT_ID && env.INSTAGRAM_ACCESS_TOKEN && env.FACEBOOK_APP_TOKEN && env.GRAPH_API_VERSION) {
    platforms.push('instagram');
  }
  if (env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD) {
    platforms.push('bluesky');
  }
  if (env.X_API_KEY && env.X_API_KEY_SECRET && env.X_ACCESS_TOKEN && env.X_ACCESS_TOKEN_SECRET) {
    platforms.push('twitter');
  }
  return platforms;
}
