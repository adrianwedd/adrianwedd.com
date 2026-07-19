import { describe, it, expect, vi } from 'vitest';
import { processComments, type CommentProcessResult } from '../cron/comments';
import type { SocialPlatform, Comment } from '../platforms/types';

function mockPlatform(overrides: Partial<SocialPlatform> = {}): SocialPlatform {
  return {
    platform: 'facebook',
    publishPost: vi.fn(),
    listRecentPosts: vi.fn().mockResolvedValue([]),
    getComments: vi.fn().mockResolvedValue([]),
    getCommentReplies: vi.fn().mockResolvedValue([]),
    replyToComment: vi.fn().mockResolvedValue({ success: true, platformPostId: 'reply_1', isTransient: false, isAuthError: false }),
    getPageIdentity: vi.fn().mockReturnValue('page_123'),
    debugAuth: vi.fn(),
    ...overrides,
  };
}

function mockKV(): { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('processComments', () => {
  it('skips comments from page itself', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'Hello', createdTime: new Date().toISOString(), isFromPage: true },
      ]),
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(0);
    expect(result.flagged).toBe(0);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('skips already-seen comments', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'Hello', createdTime: new Date().toISOString(), isFromPage: false },
      ]),
    });
    const kv = mockKV();
    kv.get.mockImplementation(async (key: string) => key === 'fb-comment:c1' ? '{}' : null);
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.newComments).toBe(0);
  });

  it('auto-replies to professional inquiries', async () => {
    const replyFn = vi.fn().mockResolvedValue({ success: true, platformPostId: 'reply_1', isTransient: false, isAuthError: false });
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'What are your consulting rates?', createdTime: new Date().toISOString(), isFromPage: false },
      ]),
      getCommentReplies: vi.fn().mockResolvedValue([]),
      replyToComment: replyFn,
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(1);
    expect(replyFn).toHaveBeenCalledOnce();
  });

  it('flags crisis comments without replying', async () => {
    const replyFn = vi.fn();
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: "I can't cope anymore", createdTime: new Date().toISOString(), isFromPage: false },
      ]),
      replyToComment: replyFn,
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.flagged).toBe(1);
    expect(result.replied).toBe(0);
    expect(replyFn).not.toHaveBeenCalled();
  });

  it('skips comments older than 48 hours', async () => {
    const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'What are your rates?', createdTime: oldDate, isFromPage: false },
      ]),
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(0);
  });
});

// Crisis-classified comments get a distinct `flag-crisis:` key with a 90-day
// TTL — a crisis flag silently expiring after the generic 14 days unreviewed
// is unacceptable. Other classifications keep the fb-flag: prefix and 14d TTL.
describe('crisis flag escalation', () => {
  function commentWith(message: string): Comment {
    return { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message, createdTime: new Date().toISOString(), isFromPage: false };
  }

  it('stores crisis comments under flag-crisis: with a 90-day TTL', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([commentWith("I can't go on anymore")]),
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.flagged).toBe(1);

    const flagCall = kv.put.mock.calls.find(([key]) => (key as string).startsWith('flag-crisis:'));
    expect(flagCall).toBeDefined();
    expect(flagCall![0]).toBe('flag-crisis:c1');
    expect(flagCall![2]).toEqual({ expirationTtl: 90 * 24 * 60 * 60 });
    expect(JSON.parse(flagCall![1] as string).reason).toBe('crisis');
    // No generic flag key written for the same comment
    expect(kv.put.mock.calls.some(([key]) => (key as string).startsWith('fb-flag:'))).toBe(false);
  });

  it('keeps non-crisis flags on fb-flag: with the 14-day TTL', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([commentWith('this is rubbish')]),
    });
    const kv = mockKV();
    await processComments(platform, kv as unknown as KVNamespace);
    const flagCall = kv.put.mock.calls.find(([key]) => (key as string).startsWith('fb-flag:'));
    expect(flagCall).toBeDefined();
    expect(flagCall![2]).toEqual({ expirationTtl: 14 * 24 * 60 * 60 });
    expect(kv.put.mock.calls.some(([key]) => (key as string).startsWith('flag-crisis:'))).toBe(false);
  });
});
