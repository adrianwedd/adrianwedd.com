import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInstagramPlatform } from '../platforms/instagram';
import type { SocialPost } from '../platforms/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('Instagram publishPost', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  const basePost: SocialPost = {
    id: 'test-001',
    platform: 'instagram',
    type: 'photo',
    message: 'Hello Instagram',
    imageUrl: 'https://example.com/img.png',
    scheduledAt: '2026-03-28T09:00:00+10:00',
    scheduledAtEpoch: 1774850400000,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  it('publishes a photo post via container flow (2 API calls)', async () => {
    // Step 1: Create container
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'container_123' }),
    });
    // Step 2: Publish container
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'media_456' }),
    });

    const result = await ig.publishPost(basePost);
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('media_456');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify container creation call
    const [createUrl, createOpts] = mockFetch.mock.calls[0];
    expect(createUrl).toContain('/17841400000/media');
    expect(createOpts.headers['Authorization']).toBe('Bearer fake-ig-token');
    expect(createOpts.body).toContain('image_url=');
    expect(createOpts.body).toContain('caption=');

    // Verify publish call
    const [publishUrl, publishOpts] = mockFetch.mock.calls[1];
    expect(publishUrl).toContain('/17841400000/media_publish');
    expect(publishOpts.body).toContain('creation_id=container_123');
  });

  it('rejects text-only posts (no imageUrl)', async () => {
    const textPost: SocialPost = { ...basePost, type: 'text', imageUrl: undefined };
    const result = await ig.publishPost(textPost);
    expect(result.success).toBe(false);
    expect(result.error).toContain('image');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects link-only posts without imageUrl', async () => {
    const linkPost: SocialPost = { ...basePost, type: 'link', link: 'https://adrianwedd.com/', imageUrl: undefined };
    const result = await ig.publishPost(linkPost);
    expect(result.success).toBe(false);
    expect(result.error).toContain('image');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('publishes link+image post with link appended to caption', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'container_789' }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'media_101' }),
    });

    const linkPost: SocialPost = {
      ...basePost,
      type: 'link',
      link: 'https://adrianwedd.com/blog/test/',
      imageUrl: 'https://example.com/img.png',
    };
    const result = await ig.publishPost(linkPost);
    expect(result.success).toBe(true);

    const [, createOpts] = mockFetch.mock.calls[0];
    const body = new URLSearchParams(createOpts.body as string);
    const caption = body.get('caption')!;
    expect(caption).toContain('Hello Instagram');
    expect(caption).toContain('https://adrianwedd.com/blog/test/');
  });

  it('classifies auth errors from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 190, message: 'Invalid token' } }),
    });
    const result = await ig.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
    expect(result.isTransient).toBe(false);
  });

  it('treats HTTP 5xx as transient', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    const result = await ig.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
  });

  it('handles fetch exceptions as transient', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    const result = await ig.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.error).toContain('Network timeout');
  });
});

describe('Instagram debugAuth', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('returns auth status with platform set to instagram', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          is_valid: true,
          expires_at: 0,
          data_access_expires_at: Math.floor(Date.now() / 1000) + 86400 * 60,
        },
      }),
    });

    const status = await ig.debugAuth();
    expect(status.platform).toBe('instagram');
    expect(status.valid).toBe(true);
    expect(status.daysUntilExpiry).toBeGreaterThan(0);
  });

  it('returns invalid status on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const status = await ig.debugAuth();
    expect(status.valid).toBe(false);
    expect(status.platform).toBe('instagram');
  });
});

describe('Instagram listRecentPosts', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('fetches media and maps timestamp field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'media_1', timestamp: '2026-03-28T00:00:00+0000' },
          { id: 'media_2', timestamp: '2026-03-27T00:00:00+0000' },
        ],
      }),
    });

    const since = new Date('2026-03-26T00:00:00Z');
    const posts = await ig.listRecentPosts(since);
    expect(posts).toHaveLength(2);
    expect(posts[0].id).toBe('media_1');
    expect(posts[0].createdTime).toBe('2026-03-28T00:00:00+0000');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/17841400000/media');
    expect(url).toContain('fields=id,timestamp');
  });

  it('filters posts before since date', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'media_1', timestamp: '2026-03-28T00:00:00+0000' },
          { id: 'media_old', timestamp: '2026-03-20T00:00:00+0000' },
        ],
      }),
    });

    const since = new Date('2026-03-25T00:00:00Z');
    const posts = await ig.listRecentPosts(since);
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('media_1');
  });
});

describe('Instagram getComments', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('fetches comments and maps text/timestamp fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'comment_1', from: { id: 'user_1' }, text: 'Great post!', timestamp: '2026-03-28T01:00:00+0000' },
        ],
      }),
    });

    const since = new Date('2026-03-27T00:00:00Z');
    const comments = await ig.getComments('media_1', since);
    expect(comments).toHaveLength(1);
    expect(comments[0].message).toBe('Great post!');
    expect(comments[0].createdTime).toBe('2026-03-28T01:00:00+0000');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('fields=id,from,text,timestamp');
  });
});

describe('Instagram getCommentReplies', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('fetches replies using text/timestamp fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'reply_1', from: { id: 'user_2' }, text: 'Thanks!', timestamp: '2026-03-28T02:00:00+0000' },
        ],
      }),
    });

    const replies = await ig.getCommentReplies('comment_1');
    expect(replies).toHaveLength(1);
    expect(replies[0].message).toBe('Thanks!');
    expect(replies[0].createdTime).toBe('2026-03-28T02:00:00+0000');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/comment_1/replies');
    expect(url).toContain('fields=id,from,text,timestamp');
  });
});

describe('Instagram replyToComment', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('posts reply to comment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'reply_new' }),
    });

    const result = await ig.replyToComment('comment_1', 'Thank you!');
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('reply_new');

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/comment_1/replies');
    expect(opts.method).toBe('POST');
    expect(opts.body).toContain('message=');
  });
});

describe('Instagram getPageIdentity', () => {
  const ig = createInstagramPlatform('17841400000', 'fake-ig-token', 'fake-app-token', 'v21.0');

  it('returns igUserId', () => {
    expect(ig.getPageIdentity()).toBe('17841400000');
  });
});
