import type { SocialPost, SocialPlatform, PublishResult, AuthStatus, Comment } from './types';
import { isAllowedMediaUrl, safeFetch } from './safe-fetch';

// ── OAuth 1.0a ─────────────────────────────────────────────────────────────

interface OAuth1Creds {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

// RFC 3986 percent-encoding — encodeURIComponent omits ! ' ( ) * which OAuth requires encoded
function rfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function oauthHeader(
  method: string,
  baseUrl: string,
  bodyParams: Record<string, string>,
  creds: OAuth1Creds,
): Promise<string> {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const allParams: Record<string, string> = { ...bodyParams, ...oauthParams };
  const paramStr = Object.keys(allParams).sort()
    .map(k => `${rfc3986(k)}=${rfc3986(allParams[k])}`).join('&');

  const signingKey = `${rfc3986(creds.apiKeySecret)}&${rfc3986(creds.accessTokenSecret)}`;
  const baseStr = `${method}&${rfc3986(baseUrl)}&${rfc3986(paramStr)}`;
  oauthParams['oauth_signature'] = await hmacSha1(signingKey, baseStr);

  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(k => `${rfc3986(k)}="${rfc3986(oauthParams[k])}"`)
    .join(', ');
}

// ── Media Upload ───────────────────────────────────────────────────────────

const MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const TWEET_URL = 'https://api.twitter.com/2/tweets';
const VERIFY_URL = 'https://api.twitter.com/2/users/me';

// Twitter v1.1 media upload accepts up to 5MB for images. We enforce the same
// cap during streaming to defend against an origin that lies about Content-Length
// or omits it entirely (HEAD-vs-GET TOCTOU).
const TWITTER_MEDIA_CAP_BYTES = 5 * 1024 * 1024;

async function uploadMedia(imageUrl: string, creds: OAuth1Creds): Promise<string | null> {
  if (!isAllowedMediaUrl(imageUrl)) return null;
  try {
    // safeFetch enforces `redirect: 'manual'` and re-validates each Location hop
    // against the allowlist, so an allowlisted CDN URL cannot redirect to a
    // private/metadata endpoint.
    const imgFetch = await safeFetch(imageUrl, {}, isAllowedMediaUrl);
    if (!imgFetch.response?.ok || !imgFetch.response.body) return null;
    const reader = imgFetch.response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > TWITTER_MEDIA_CAP_BYTES) {
        reader.cancel().catch(() => undefined);
        console.warn(`Twitter media upload exceeded ${TWITTER_MEDIA_CAP_BYTES}-byte cap: ${imageUrl}`);
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const contentType = imgFetch.response.headers.get('content-type') || 'image/jpeg';

    // Multipart body is excluded from OAuth signature base (RFC 5849 §3.4.1.3)
    const auth = await oauthHeader('POST', MEDIA_UPLOAD_URL, {}, creds);
    const form = new FormData();
    form.append('media', new Blob([bytes], { type: contentType }));

    const res = await fetch(MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: auth },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json() as { media_id_string?: string };
    return data.media_id_string ?? null;
  } catch {
    return null;
  }
}

// ── Platform Implementation ────────────────────────────────────────────────

export function createTwitterPlatform(creds: OAuth1Creds): SocialPlatform {
  return {
    platform: 'twitter',

    async publishPost(post: SocialPost): Promise<PublishResult> {
      let mediaId: string | null = null;
      if (post.imageUrl) {
        mediaId = await uploadMedia(post.imageUrl, creds);
      }

      // Append the post's destination link if it's not already present in the message.
      // Twitter shortens URLs to 23 chars via t.co — keep the link out of the truncation budget.
      let message = post.message;
      if (post.link && !message.includes(post.link)) {
        message = `${message} ${post.link}`.trim();
      }
      // Truncate to 280 graphemes (Twitter limit)
      const text = [...message].slice(0, 280).join('');

      const body: Record<string, unknown> = { text };
      if (mediaId) body.media = { media_ids: [mediaId] };

      // JSON body excluded from OAuth signature base
      const auth = await oauthHeader('POST', TWEET_URL, {}, creds);

      try {
        const res = await fetch(TWEET_URL, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.status === 401) {
          // 401 unambiguously means "your credentials are invalid". Drain the body
          // (OAuth response bodies can leak signature data into KV idempotency
          // records, so don't include it in the surfaced error).
          await res.text().catch(() => '');
          console.error(`Twitter publish auth failure: HTTP 401`);
          return { success: false, error: 'HTTP 401', isTransient: false, isAuthError: true };
        }
        if (res.status === 403) {
          // 403 from Twitter v2 means "your credentials are valid but this action
          // is forbidden" — duplicate tweet, content moderation, blocked target,
          // missing write scope on the token, etc. Classifying as auth error here
          // would halt the entire cron run and re-queue the post, creating an
          // infinite-loop poison pill (next tick: same post, same 403, same halt).
          // Treat as a permanent per-post failure so the cron continues and the
          // post moves to post:failed:.
          const errText = await res.text().catch(() => '');
          console.error(`Twitter publish forbidden (HTTP 403): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP 403: ${errText.slice(0, 200)}`, isTransient: false, isAuthError: false };
        }
        if (res.status === 429 || res.status >= 500) {
          return { success: false, error: `HTTP ${res.status}`, isTransient: true, isAuthError: false };
        }
        if (!res.ok) {
          const text = await res.text();
          return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}`, isTransient: false, isAuthError: false };
        }

        const data = await res.json() as { data?: { id?: string } };
        return { success: true, platformPostId: data.data?.id, isTransient: false, isAuthError: false };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err),
          isTransient: true,
          isAuthError: false,
        };
      }
    },

    async debugAuth(): Promise<AuthStatus> {
      // No query params — query params must be included in the OAuth signature base
      // string for GET requests, and we don't include them here to keep it simple.
      const auth = await oauthHeader('GET', VERIFY_URL, {}, creds);
      try {
        const res = await fetch(VERIFY_URL, { headers: { Authorization: auth } });
        if (!res.ok) {
          // Drain body but don't log it — OAuth response bodies can leak signature data.
          await res.text().catch(() => '');
          console.error(`Twitter debugAuth HTTP ${res.status}`);
          return { valid: false, platform: 'twitter', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
        }
        return { valid: true, platform: 'twitter', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 999 };
      } catch (err) {
        console.error(`Twitter debugAuth error: ${String(err)}`);
        return { valid: false, platform: 'twitter', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
    },

    getPageIdentity(): string {
      return creds.accessToken.split('-')[0]; // user ID prefix
    },

    // Twitter read/comment APIs not needed for publishing — stub implementations
    async listRecentPosts(): Promise<Array<{ id: string; createdTime: string }>> { return []; },
    async getComments(): Promise<Comment[]> { return []; },
    async getCommentReplies(): Promise<Comment[]> { return []; },
    async replyToComment(): Promise<PublishResult> {
      return { success: false, error: 'not implemented', isTransient: false, isAuthError: false };
    },
  };
}
