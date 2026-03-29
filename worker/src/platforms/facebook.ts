import type {
  SocialPlatform,
  SocialPost,
  PublishResult,
  Comment,
  AuthStatus,
} from './types';

export interface GraphErrorBody {
  code: number;
  error_subcode?: number;
  message: string;
}

const AUTH_CODES = new Set([190]);
const TRANSIENT_CODES = new Set([1, 2, 4, 17]);

export function classifyGraphError(err: GraphErrorBody): { isTransient: boolean; isAuthError: boolean } {
  if (AUTH_CODES.has(err.code)) return { isTransient: false, isAuthError: true };
  if (TRANSIENT_CODES.has(err.code)) return { isTransient: true, isAuthError: false };
  return { isTransient: false, isAuthError: false };
}

export function createFacebookPlatform(
  pageId: string,
  pageToken: string,
  appToken: string,
  graphVersion = 'v21.0',
): SocialPlatform {
  const graphBase = `https://graph.facebook.com/${graphVersion}`;

  async function publishPost(post: SocialPost): Promise<PublishResult> {
    if (post.type === 'photo' && !post.imageUrl) {
      return { success: false, error: 'Photo post requires imageUrl', isTransient: false, isAuthError: false };
    }

    const endpoint = post.type === 'photo'
      ? `${graphBase}/${pageId}/photos`
      : `${graphBase}/${pageId}/feed`;

    const params = new URLSearchParams();
    if (post.type === 'photo') {
      params.set('url', post.imageUrl!);
      params.set('caption', post.message);
    } else {
      params.set('message', post.message);
      if (post.type === 'link' && post.link) {
        params.set('link', post.link);
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        if (res.status >= 500) {
          const errText = await res.text().catch(() => `HTTP ${res.status}`);
          console.error(`Graph API server error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP ${res.status}`, errorCode: res.status, isTransient: true, isAuthError: false };
        }
        const body = await res.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: res.status, message: `HTTP ${res.status}` };
        const classification = classifyGraphError(err);
        console.error(`Graph API error (${err.code}): ${err.message}`);
        return { success: false, error: err.message, errorCode: err.code, ...classification };
      }

      const data = await res.json() as Record<string, unknown>;
      // For photo posts, Graph API returns { id: photo_id, post_id: page_post_id }
      // Prefer post_id (the page feed entry) over id (the photo object)
      const postId = (data.post_id as string) ?? (data.id as string) ?? undefined;
      return { success: true, platformPostId: postId, isTransient: false, isAuthError: false };
    } catch (error) {
      console.error('Graph API fetch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isTransient: true,
        isAuthError: false,
      };
    }
  }

  // debugToken: Exception — input_token must be in query string per Graph API design
  async function debugAuth(): Promise<AuthStatus> {
    try {
      const res = await fetch(
        `${graphBase}/debug_token?input_token=${encodeURIComponent(pageToken)}`,
        { headers: { 'Authorization': `Bearer ${appToken}` } },
      );
      if (!res.ok) {
        return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const body = await res.json() as Record<string, unknown>;
      const data = body?.data as Record<string, unknown> | undefined;
      if (!data) {
        return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const now = Math.floor(Date.now() / 1000);
      const dataAccessExpiresAt = Number(data.data_access_expires_at) || 0;
      const daysUntilExpiry = dataAccessExpiresAt > 0
        ? Math.floor((dataAccessExpiresAt - now) / 86400)
        : Infinity;
      return {
        valid: Boolean(data.is_valid),
        platform: 'facebook',
        expiresAt: Number(data.expires_at) || 0,
        dataAccessExpiresAt,
        daysUntilExpiry: Number.isFinite(daysUntilExpiry) ? daysUntilExpiry : 999,
      };
    } catch {
      return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
    }
  }

  async function listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>> {
    const sinceUnix = Math.floor(since.getTime() / 1000);
    const posts: Array<{ id: string; createdTime: string }> = [];
    let url: string | null = `${graphBase}/${pageId}/feed?fields=id,created_time&since=${sinceUnix}&limit=25`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; created_time: string }>; paging?: { next?: string } };
      for (const p of body.data ?? []) {
        posts.push({ id: p.id, createdTime: p.created_time });
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return posts;
  }

  async function getComments(postId: string, since: Date): Promise<Comment[]> {
    const sinceUnix = Math.floor(since.getTime() / 1000);
    const comments: Comment[] = [];
    let url: string | null = `${graphBase}/${postId}/comments?fields=id,from,message,created_time,is_hidden&since=${sinceUnix}&limit=50`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; message: string; created_time: string; is_hidden?: boolean }>; paging?: { next?: string } };
      for (const c of body.data ?? []) {
        if (c.is_hidden) continue;
        comments.push({
          id: c.id,
          postId,
          rawAuthorId: c.from?.id ?? '',  // Caller is responsible for hashing before storage
          message: c.message,
          createdTime: c.created_time,
          isFromPage: c.from?.id === pageId,
        });
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return comments;
  }

  async function getCommentReplies(commentId: string): Promise<Comment[]> {
    const res = await fetch(
      `${graphBase}/${commentId}/comments?filter=stream&fields=id,from,message,created_time&limit=50`,
      { headers: { 'Authorization': `Bearer ${pageToken}` } },
    );
    if (!res.ok) return [];
    const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; message: string; created_time: string }> };
    return (body.data ?? []).map(c => ({
      id: c.id,
      postId: commentId,
      rawAuthorId: c.from?.id ?? '',
      message: c.message,
      createdTime: c.created_time,
      isFromPage: c.from?.id === pageId,
    }));
  }

  async function replyToComment(commentId: string, message: string): Promise<PublishResult> {
    try {
      const params = new URLSearchParams();
      params.set('message', message);
      const res = await fetch(`${graphBase}/${commentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        if (res.status >= 500) {
          return { success: false, error: `HTTP ${res.status}`, isTransient: true, isAuthError: false };
        }
        const body = await res.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: res.status, message: `HTTP ${res.status}` };
        return { success: false, error: err.message, errorCode: err.code, ...classifyGraphError(err) };
      }
      const data = await res.json() as { id?: string };
      return { success: true, platformPostId: data.id, isTransient: false, isAuthError: false };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), isTransient: true, isAuthError: false };
    }
  }

  function getPageIdentity(): string {
    return pageId;
  }

  return {
    platform: 'facebook',
    publishPost,
    listRecentPosts,
    getComments,
    getCommentReplies,
    replyToComment,
    getPageIdentity,
    debugAuth,
  };
}
