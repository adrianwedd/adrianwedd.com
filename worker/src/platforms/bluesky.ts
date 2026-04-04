import type {
  SocialPlatform,
  SocialPost,
  PublishResult,
  Comment,
  AuthStatus,
} from './types';

const BSKY_BASE = 'https://bsky.social/xrpc';
const MAX_GRAPHEMES = 300;

interface BskySession {
  did: string;
  accessJwt: string;
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
    return { did: data.did, accessJwt: data.accessJwt };
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

      // For link posts, add external embed (link card)
      if (post.type === 'link' && post.link) {
        record.embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: post.link,
            title: '',
            description: '',
          },
        };
      }

      const res = await fetch(`${BSKY_BASE}/com.atproto.repo.createRecord`, {
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

      const res = await fetch(`${BSKY_BASE}/app.bsky.feed.getAuthorFeed?${params.toString()}`, {
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
    const res = await fetch(`${BSKY_BASE}/app.bsky.feed.getPostThread?${params.toString()}`, {
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
    const res = await fetch(`${BSKY_BASE}/app.bsky.feed.getPostThread?${params.toString()}`, {
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
      const threadRes = await fetch(`${BSKY_BASE}/app.bsky.feed.getPostThread?${threadParams.toString()}`, {
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

      const res = await fetch(`${BSKY_BASE}/com.atproto.repo.createRecord`, {
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
