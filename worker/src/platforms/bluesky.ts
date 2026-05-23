import type {
  SocialPlatform,
  SocialPost,
  PublishResult,
  Comment,
  AuthStatus,
} from './types';
import { isAllowedMediaUrl, safeFetch, readBoundedArrayBuffer } from './safe-fetch';

const BSKY_BASE = 'https://bsky.social/xrpc';
const MAX_GRAPHEMES = 300;

// YouTube IDs are exactly 11 chars from the alphabet [A-Za-z0-9_-]. Match
// either ?v=ID, &v=ID (long-form) or youtu.be/ID (short-form). Capture group
// is whichever matched. Used in both publish (Bluesky embed) and the Astro
// VideoObject schema — keep in sync with src/pages/{blog,projects}/[...slug].astro.
const YOUTUBE_ID_REGEX = /(?:[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/;

interface BskySession {
  did: string;
  accessJwt: string;
  pdsEndpoint: string;
}

interface BskyError {
  error: string;
  message: string;
}

/**
 * Detect URL facets in text for Bluesky rich text.
 * Returns facet objects with byte-level offsets (AT Protocol requirement).
 */
export function detectFacets(text: string): Array<{
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri: string }>;
}> {
  const encoder = new TextEncoder();
  const facets: Array<{
    index: { byteStart: number; byteEnd: number };
    features: Array<{ $type: string; uri: string }>;
  }> = [];

  // Match URLs starting with http:// or https://
  const urlRegex = /https?:\/\/[^\s<>)"']+/g;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    const beforeUrl = text.slice(0, match.index);
    const byteStart = encoder.encode(beforeUrl).byteLength;
    const byteEnd = byteStart + encoder.encode(match[0]).byteLength;

    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }

  return facets;
}

/**
 * Truncate text to a maximum number of graphemes (Unicode-aware).
 */
function truncateGraphemes(text: string, max: number): string {
  const graphemes = [...text];
  if (graphemes.length <= max) return text;
  return graphemes.slice(0, max).join('');
}


async function uploadVideo(session: BskySession, videoUrl: string): Promise<unknown | null> {
  if (!isAllowedMediaUrl(videoUrl)) return null;
  try {
    // Skip if video is too large for CF Worker outgoing request (~20MB practical limit).
    // Require a Content-Length header; without it we cannot bound memory usage safely.
    // safeFetch enforces `redirect: 'manual'` and re-validates each Location hop,
    // so a 302 from cdn.adrianwedd.com cannot pivot to a private/metadata IP.
    const headRes = await safeFetch(videoUrl, { method: 'HEAD' }, isAllowedMediaUrl);
    if (!headRes.response) return null;
    const rawContentLength = headRes.response.headers.get('content-length');
    if (rawContentLength === null) return null;
    const contentLength = parseInt(rawContentLength, 10);
    if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > 20 * 1024 * 1024) return null;

    const saParams = new URLSearchParams({ aud: 'did:web:video.bsky.app', lxm: 'app.bsky.video.uploadVideo' });
    const serviceAuthRes = await fetch(`${session.pdsEndpoint}/com.atproto.server.getServiceAuth?${saParams}`, {
      headers: { 'Authorization': `Bearer ${session.accessJwt}` },
    });
    if (!serviceAuthRes.ok) return null;
    const { token } = await serviceAuthRes.json() as { token: string };

    const videoFetch = await safeFetch(videoUrl, {}, isAllowedMediaUrl);
    if (!videoFetch.response || !videoFetch.response.ok) return null;
    // HEAD reported a size we accept; cap the actual read at the same bound to
    // defend against an origin that returns a small HEAD and a huge GET (TOCTOU).
    const videoBytes = await readBoundedArrayBuffer(videoFetch.response, 20 * 1024 * 1024);
    if (!videoBytes) return null;

    const uploadRes = await fetch(`https://video.bsky.app/xrpc/app.bsky.video.uploadVideo?did=${session.did}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'video/mp4' },
      body: videoBytes,
    });
    if (!uploadRes.ok) return null;
    const { jobId } = await uploadRes.json() as { jobId: string };

    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2500));
      const statusRes = await fetch(
        `https://video.bsky.app/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`,
        { headers: { 'Authorization': `Bearer ${token}` } },
      );
      if (!statusRes.ok) continue;
      const { jobStatus } = await statusRes.json() as { jobStatus: { state: string; blob?: unknown } };
      if (jobStatus.state === 'JOB_STATE_COMPLETED' && jobStatus.blob) return jobStatus.blob;
      if (jobStatus.state === 'JOB_STATE_FAILED') return null;
    }
    return null;
  } catch {
    return null;
  }
}

export function createBlueskyPlatform(
  handle: string,
  appPassword: string,
): SocialPlatform {

  async function login(): Promise<BskySession> {
    const res = await fetch(`${BSKY_BASE}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown', message: `HTTP ${res.status}` })) as BskyError;
      const err = new Error(body.message || `HTTP ${res.status}`);
      (err as Error & { status: number }).status = res.status;
      throw err;
    }

    const data = await res.json() as { did: string; accessJwt: string };
    // PDS endpoint is HARD-PINNED to bsky.social. The previous implementation
    // honoured `didDoc.service[].serviceEndpoint` (or fell back to plc.directory),
    // but PLC is open — anyone can register a DID with a service endpoint pointing
    // at attacker-controlled hostname, which can resolve to 169.254.169.254 etc.
    // The resulting accessJwt would then be sent to the attacker on every
    // subsequent authenticated call. Hostname-only allowlisting cannot defend
    // against DNS-rebinding here. If federation is ever needed, restrict PDS
    // endpoints to a curated allowlist (e.g. *.host.bsky.network) and pin to
    // resolved IPs across the connect.
    return { did: data.did, accessJwt: data.accessJwt, pdsEndpoint: BSKY_BASE };
  }

  async function publishPost(post: SocialPost): Promise<PublishResult> {
    let session: BskySession;
    try {
      session = await login();
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status === 401) {
        return { success: false, error: 'Authentication failed', isTransient: false, isAuthError: true };
      }
      if (status === 429 || (status !== undefined && status >= 500)) {
        return { success: false, error: (error as Error).message, errorCode: status, isTransient: true, isAuthError: false };
      }
      return { success: false, error: (error as Error).message, isTransient: true, isAuthError: false };
    }

    try {
      const text = truncateGraphemes(post.message, MAX_GRAPHEMES);
      const facets = detectFacets(text);

      const record: Record<string, unknown> = {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
      };

      if (facets.length > 0) {
        record.facets = facets;
      }

      // Native video upload (small files only — falls through to YouTube card on failure)
      if (post.videoUrl) {
        const blob = await uploadVideo(session, post.videoUrl);
        if (blob) {
          record.embed = { $type: 'app.bsky.embed.video', video: blob, alt: '' };
        }
      }

      if (!record.embed && post.youtubeUrl) {
        const videoId = post.youtubeUrl.match(YOUTUBE_ID_REGEX)?.[1];
        if (videoId) {
          // img.youtube.com is in the allowlist; videoId is captured from a tight regex
          const thumbUrl = `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
          const thumbFetch = await safeFetch(thumbUrl, {}, isAllowedMediaUrl);
          let thumbBlob: unknown = undefined;
          if (thumbFetch.response?.ok) {
            const thumbBytes = await readBoundedArrayBuffer(thumbFetch.response, 5 * 1024 * 1024);
            if (thumbBytes) {
              const blobRes = await fetch(`${session.pdsEndpoint}/com.atproto.repo.uploadBlob`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.accessJwt}`, 'Content-Type': 'image/jpeg' },
                body: thumbBytes,
              });
              if (blobRes.ok) {
                thumbBlob = (await blobRes.json() as { blob: unknown }).blob;
              }
            } else {
              console.warn(`YouTube thumbnail exceeded 5MB cap: ${thumbUrl}`);
            }
          }
          record.embed = {
            $type: 'app.bsky.embed.external',
            external: {
              uri: post.youtubeUrl,
              title: '',
              description: '',
              ...(thumbBlob ? { thumb: thumbBlob } : {}),
            },
          };
        }
      }

      if (!record.embed && post.imageUrl && isAllowedMediaUrl(post.imageUrl)) {
        // Fall back to static image embed
        const imgFetch = await safeFetch(post.imageUrl, {}, isAllowedMediaUrl);
        if (imgFetch.response?.ok) {
          const imgBytes = await readBoundedArrayBuffer(imgFetch.response, 5 * 1024 * 1024);
          if (imgBytes) {
            const mimeType = imgFetch.response.headers.get('content-type') ?? 'image/jpeg';
            const blobRes = await fetch(`${session.pdsEndpoint}/com.atproto.repo.uploadBlob`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session.accessJwt}`, 'Content-Type': mimeType },
              body: imgBytes,
            });
            if (blobRes.ok) {
              const blobData = await blobRes.json() as { blob: unknown };
              record.embed = { $type: 'app.bsky.embed.images', images: [{ image: blobData.blob, alt: '' }] };
            }
          } else {
            console.warn(`Image embed exceeded 5MB cap: ${post.imageUrl}`);
          }
        }
      }

      if (!record.embed && post.type === 'link' && post.link) {
        record.embed = {
          $type: 'app.bsky.embed.external',
          external: { uri: post.link, title: '', description: '' },
        };
      }

      const res = await fetch(`${session.pdsEndpoint}/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.post',
          record,
        }),
      });

      if (!res.ok) {
        const status = res.status;
        if (status >= 500 || status === 429) {
          const errText = await res.text().catch(() => `HTTP ${status}`);
          console.error(`Bluesky API server error (HTTP ${status}): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP ${status}`, errorCode: status, isTransient: true, isAuthError: false };
        }
        if (status === 401) {
          return { success: false, error: 'Authentication failed', errorCode: 401, isTransient: false, isAuthError: true };
        }
        const body = await res.json().catch(() => ({ error: 'Unknown', message: `HTTP ${status}` })) as BskyError;
        return { success: false, error: body.message || `HTTP ${status}`, errorCode: status, isTransient: false, isAuthError: false };
      }

      const data = await res.json() as { uri?: string; cid?: string };
      return { success: true, platformPostId: data.uri, isTransient: false, isAuthError: false };
    } catch (error) {
      console.error('Bluesky API fetch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isTransient: true,
        isAuthError: false,
      };
    }
  }

  async function debugAuth(): Promise<AuthStatus> {
    try {
      await login();
      return {
        valid: true,
        platform: 'bluesky',
        expiresAt: 0,
        dataAccessExpiresAt: 0,
        daysUntilExpiry: 999,
      };
    } catch {
      return {
        valid: false,
        platform: 'bluesky',
        expiresAt: 0,
        dataAccessExpiresAt: 0,
        daysUntilExpiry: 0,
      };
    }
  }

  async function listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>> {
    let session: BskySession;
    try {
      session = await login();
    } catch {
      return [];
    }

    const posts: Array<{ id: string; createdTime: string }> = [];
    let cursor: string | undefined;
    let pages = 0;

    while (pages < 4) {
      const params = new URLSearchParams({ actor: session.did, limit: '50' });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`${session.pdsEndpoint}/app.bsky.feed.getAuthorFeed?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` },
      });
      if (!res.ok) break;

      const body = await res.json() as {
        feed?: Array<{ post: { uri: string; record: { createdAt?: string } } }>;
        cursor?: string;
      };

      for (const item of body.feed ?? []) {
        const createdAt = item.post.record.createdAt;
        if (createdAt && new Date(createdAt) >= since) {
          posts.push({ id: item.post.uri, createdTime: createdAt });
        }
      }

      cursor = body.cursor;
      if (!cursor) break;
      pages++;
    }

    return posts;
  }

  async function getComments(postId: string, since: Date): Promise<Comment[]> {
    let session: BskySession;
    try {
      session = await login();
    } catch {
      return [];
    }

    const params = new URLSearchParams({ uri: postId, depth: '1' });
    const res = await fetch(`${session.pdsEndpoint}/app.bsky.feed.getPostThread?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${session.accessJwt}` },
    });
    if (!res.ok) return [];

    const body = await res.json() as {
      thread?: {
        replies?: Array<{
          post: {
            uri: string;
            cid: string;
            author: { did: string };
            record: { text?: string; createdAt?: string };
          };
        }>;
      };
    };

    const comments: Comment[] = [];
    for (const reply of body.thread?.replies ?? []) {
      const createdAt = reply.post.record.createdAt;
      if (createdAt && new Date(createdAt) >= since) {
        comments.push({
          id: reply.post.uri,
          postId,
          rawAuthorId: reply.post.author.did,
          message: reply.post.record.text ?? '',
          createdTime: createdAt,
          isFromPage: reply.post.author.did === session.did,
        });
      }
    }

    return comments;
  }

  async function getCommentReplies(commentId: string): Promise<Comment[]> {
    let session: BskySession;
    try {
      session = await login();
    } catch {
      return [];
    }

    const params = new URLSearchParams({ uri: commentId, depth: '1' });
    const res = await fetch(`${session.pdsEndpoint}/app.bsky.feed.getPostThread?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${session.accessJwt}` },
    });
    if (!res.ok) return [];

    const body = await res.json() as {
      thread?: {
        replies?: Array<{
          post: {
            uri: string;
            cid: string;
            author: { did: string };
            record: { text?: string; createdAt?: string };
          };
        }>;
      };
    };

    return (body.thread?.replies ?? []).map(reply => ({
      id: reply.post.uri,
      postId: commentId,
      rawAuthorId: reply.post.author.did,
      message: reply.post.record.text ?? '',
      createdTime: reply.post.record.createdAt ?? '',
      isFromPage: reply.post.author.did === session.did,
    }));
  }

  async function replyToComment(commentId: string, message: string): Promise<PublishResult> {
    let session: BskySession;
    try {
      session = await login();
    } catch (error) {
      return { success: false, error: (error as Error).message, isTransient: true, isAuthError: false };
    }

    try {
      // Fetch the parent post to get its CID (needed for reply reference)
      const threadParams = new URLSearchParams({ uri: commentId, depth: '0' });
      const threadRes = await fetch(`${session.pdsEndpoint}/app.bsky.feed.getPostThread?${threadParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` },
      });

      if (!threadRes.ok) {
        return { success: false, error: `Failed to fetch parent post: HTTP ${threadRes.status}`, isTransient: true, isAuthError: false };
      }

      const threadBody = await threadRes.json() as {
        thread?: {
          post: { uri: string; cid: string };
        };
      };

      const parentUri = threadBody.thread?.post.uri;
      const parentCid = threadBody.thread?.post.cid;
      if (!parentUri || !parentCid) {
        return { success: false, error: 'Could not resolve parent post', isTransient: false, isAuthError: false };
      }

      // Use parent as root (works for direct replies to posts)
      const record: Record<string, unknown> = {
        $type: 'app.bsky.feed.post',
        text: truncateGraphemes(message, MAX_GRAPHEMES),
        createdAt: new Date().toISOString(),
        reply: {
          root: { uri: parentUri, cid: parentCid },
          parent: { uri: parentUri, cid: parentCid },
        },
      };

      const facets = detectFacets(record.text as string);
      if (facets.length > 0) {
        record.facets = facets;
      }

      const res = await fetch(`${session.pdsEndpoint}/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.post',
          record,
        }),
      });

      if (!res.ok) {
        const status = res.status;
        if (status >= 500 || status === 429) {
          return { success: false, error: `HTTP ${status}`, errorCode: status, isTransient: true, isAuthError: false };
        }
        const body = await res.json().catch(() => ({ error: 'Unknown', message: `HTTP ${status}` })) as BskyError;
        return { success: false, error: body.message || `HTTP ${status}`, errorCode: status, isTransient: false, isAuthError: false };
      }

      const data = await res.json() as { uri?: string };
      return { success: true, platformPostId: data.uri, isTransient: false, isAuthError: false };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), isTransient: true, isAuthError: false };
    }
  }

  function getPageIdentity(): string {
    return handle;
  }

  return {
    platform: 'bluesky',
    publishPost,
    listRecentPosts,
    getComments,
    getCommentReplies,
    replyToComment,
    getPageIdentity,
    debugAuth,
  };
}
