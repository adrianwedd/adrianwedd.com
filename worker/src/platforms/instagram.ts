import type {
  SocialPlatform,
  SocialPost,
  PublishResult,
  Comment,
  AuthStatus,
} from './types';
import { classifyGraphError, type GraphErrorBody } from './facebook';

export function createInstagramPlatform(
  igUserId: string,
  accessToken: string,
  appToken: string,
  graphVersion = 'v21.0',
): SocialPlatform {
  const graphBase = `https://graph.facebook.com/${graphVersion}`;

  async function publishPost(post: SocialPost): Promise<PublishResult> {
    // Instagram requires an image for ALL post types
    if (!post.imageUrl) {
      return { success: false, error: 'Instagram requires an image for all posts (imageUrl missing)', isTransient: false, isAuthError: false };
    }

    try {
      // Step 1: Create media container
      const containerParams = new URLSearchParams();
      containerParams.set('image_url', post.imageUrl);

      // Build caption: for link posts, append the link URL
      let caption = post.message;
      if (post.type === 'link' && post.link) {
        caption = `${caption}\n\n${post.link}`;
      }
      containerParams.set('caption', caption);

      const containerRes = await fetch(`${graphBase}/${igUserId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: containerParams.toString(),
      });

      if (!containerRes.ok) {
        if (containerRes.status >= 500) {
          const errText = await containerRes.text().catch(() => `HTTP ${containerRes.status}`);
          console.error(`Graph API server error (HTTP ${containerRes.status}): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP ${containerRes.status}`, errorCode: containerRes.status, isTransient: true, isAuthError: false };
        }
        const body = await containerRes.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: containerRes.status, message: `HTTP ${containerRes.status}` };
        const classification = classifyGraphError(err);
        console.error(`Graph API error (${err.code}): ${err.message}`);
        return { success: false, error: err.message, errorCode: err.code, ...classification };
      }

      const containerData = await containerRes.json() as { id?: string };
      const containerId = containerData.id;
      if (!containerId) {
        return { success: false, error: 'No container ID returned', isTransient: false, isAuthError: false };
      }

      // Step 2: Publish the container
      const publishParams = new URLSearchParams();
      publishParams.set('creation_id', containerId);

      const publishRes = await fetch(`${graphBase}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: publishParams.toString(),
      });

      if (!publishRes.ok) {
        if (publishRes.status >= 500) {
          const errText = await publishRes.text().catch(() => `HTTP ${publishRes.status}`);
          console.error(`Graph API server error (HTTP ${publishRes.status}): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP ${publishRes.status}`, errorCode: publishRes.status, isTransient: true, isAuthError: false };
        }
        const body = await publishRes.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: publishRes.status, message: `HTTP ${publishRes.status}` };
        const classification = classifyGraphError(err);
        console.error(`Graph API error (${err.code}): ${err.message}`);
        return { success: false, error: err.message, errorCode: err.code, ...classification };
      }

      const publishData = await publishRes.json() as { id?: string };
      return { success: true, platformPostId: publishData.id, isTransient: false, isAuthError: false };
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

  async function debugAuth(): Promise<AuthStatus> {
    try {
      const res = await fetch(
        `${graphBase}/debug_token?input_token=${encodeURIComponent(accessToken)}`,
        { headers: { 'Authorization': `Bearer ${appToken}` } },
      );
      if (!res.ok) {
        return { valid: false, platform: 'instagram', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const body = await res.json() as Record<string, unknown>;
      const data = body?.data as Record<string, unknown> | undefined;
      if (!data) {
        return { valid: false, platform: 'instagram', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const now = Math.floor(Date.now() / 1000);
      const dataAccessExpiresAt = Number(data.data_access_expires_at) || 0;
      const daysUntilExpiry = dataAccessExpiresAt > 0
        ? Math.floor((dataAccessExpiresAt - now) / 86400)
        : Infinity;
      return {
        valid: Boolean(data.is_valid),
        platform: 'instagram',
        expiresAt: Number(data.expires_at) || 0,
        dataAccessExpiresAt,
        daysUntilExpiry: Number.isFinite(daysUntilExpiry) ? daysUntilExpiry : 999,
      };
    } catch {
      return { valid: false, platform: 'instagram', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
    }
  }

  async function listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>> {
    const posts: Array<{ id: string; createdTime: string }> = [];
    let url: string | null = `${graphBase}/${igUserId}/media?fields=id,timestamp&limit=25`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; timestamp: string }>; paging?: { next?: string } };
      for (const p of body.data ?? []) {
        // Instagram /media endpoint doesn't support `since` param — filter client-side
        if (new Date(p.timestamp) >= since) {
          posts.push({ id: p.id, createdTime: p.timestamp });
        }
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return posts;
  }

  async function getComments(postId: string, since: Date): Promise<Comment[]> {
    const comments: Comment[] = [];
    let url: string | null = `${graphBase}/${postId}/comments?fields=id,from,text,timestamp&limit=50`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; text: string; timestamp: string }>; paging?: { next?: string } };
      for (const c of body.data ?? []) {
        if (new Date(c.timestamp) >= since) {
          comments.push({
            id: c.id,
            postId,
            rawAuthorId: c.from?.id ?? '',
            message: c.text,
            createdTime: c.timestamp,
            isFromPage: c.from?.id === igUserId,
          });
        }
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return comments;
  }

  async function getCommentReplies(commentId: string): Promise<Comment[]> {
    const res = await fetch(
      `${graphBase}/${commentId}/replies?fields=id,from,text,timestamp&limit=50`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } },
    );
    if (!res.ok) return [];
    const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; text: string; timestamp: string }> };
    return (body.data ?? []).map(c => ({
      id: c.id,
      postId: commentId,
      rawAuthorId: c.from?.id ?? '',
      message: c.text,
      createdTime: c.timestamp,
      isFromPage: c.from?.id === igUserId,
    }));
  }

  async function replyToComment(commentId: string, message: string): Promise<PublishResult> {
    try {
      const params = new URLSearchParams();
      params.set('message', message);
      const res = await fetch(`${graphBase}/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
    return igUserId;
  }

  return {
    platform: 'instagram',
    publishPost,
    listRecentPosts,
    getComments,
    getCommentReplies,
    replyToComment,
    getPageIdentity,
    debugAuth,
  };
}
