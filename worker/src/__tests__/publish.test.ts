import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import type { SocialPost, AuthStatus } from '../platforms/types';

// ── Mock createPlatform factory ──────────────────────────────────────────────

const mockPublishPost = vi.fn();
const mockDebugAuth = vi.fn();

vi.mock('../platforms/factory', () => ({
  createPlatform: () => ({
    platform: 'facebook',
    publishPost: mockPublishPost,
    listRecentPosts: vi.fn().mockResolvedValue([]),
    getComments: vi.fn().mockResolvedValue([]),
    getCommentReplies: vi.fn().mockResolvedValue([]),
    replyToComment: vi.fn(),
    getPageIdentity: vi.fn().mockReturnValue('page_123'),
    debugAuth: mockDebugAuth,
  }),
  getConfiguredPlatforms: () => ['facebook'],
  CONFIGURED_PLATFORMS: ['facebook'],
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockKV(): {
  store: Map<string, string>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

function makePost(id: string, epochOffset = 0): SocialPost {
  const epoch = Date.now() - 60_000 + epochOffset; // default: 1 minute in the past
  return {
    id,
    platform: 'facebook',
    type: 'text',
    message: `Post ${id}`,
    scheduledAt: new Date(epoch).toISOString(),
    scheduledAtEpoch: epoch,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };
}

function makeEnv(kv: ReturnType<typeof mockKV>) {
  return {
    SOCIAL: kv as unknown as KVNamespace,
    FACEBOOK_PAGE_ID: 'page_123',
    FACEBOOK_PAGE_TOKEN: 'fake-page-token',
    FACEBOOK_APP_TOKEN: 'fake-app-token',
    GRAPH_API_VERSION: 'v21.0',
    CRON_SECRET: 'test-cron-secret',
    PUBLISH_SECRET: 'test-publish-secret',
    CLI_SECRET: 'test-cli-secret',
  };
}

function cronRequest() {
  return new Request('http://localhost/api/cron/publish', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-cron-secret',
      'Content-Type': 'application/json',
    },
  });
}

const healthyToken: AuthStatus = {
  valid: true,
  platform: 'facebook',
  expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
  dataAccessExpiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000,
  daysUntilExpiry: 60,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockPublishPost.mockReset();
  mockDebugAuth.mockReset();
});

describe('POST /api/cron/publish', () => {

  it('returns 401 without valid cron auth', async () => {
    const kv = mockKV();
    const req = new Request('http://localhost/api/cron/publish', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer wrong-secret' },
    });
    const res = await app.fetch(req, makeEnv(kv));
    expect(res.status).toBe(401);
  });

  it('skips when cron lock exists', async () => {
    const kv = mockKV();
    kv.store.set('cron-lock:publish', '1');

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('locked');
    // Should not have called debugAuth (bailed out before fb usage)
    expect(mockDebugAuth).not.toHaveBeenCalled();
  });

  it('skips posts for a platform whose token is invalid (valid: false)', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce({ valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 });

    // Queue a due post for the platform with the invalid token
    const post = makePost('p1');
    kv.store.set(`post:queued:${post.scheduledAtEpoch}:${post.id}`, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: `post:queued:${post.scheduledAtEpoch}:${post.id}` }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(0);
    expect((body.tokenExpiresInDays as Record<string, number>).facebook).toBe(0);
    // Platform with invalid auth must not be invoked
    expect(mockPublishPost).not.toHaveBeenCalled();
    // Lock must be released
    expect(kv.delete).toHaveBeenCalledWith('cron-lock:publish');
  });

  it('skips posts for a platform whose token expires today (daysUntilExpiry <= 0)', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce({ valid: true, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 });

    const post = makePost('p1');
    kv.store.set(`post:queued:${post.scheduledAtEpoch}:${post.id}`, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: `post:queued:${post.scheduledAtEpoch}:${post.id}` }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(0);
    expect((body.tokenExpiresInDays as Record<string, number>).facebook).toBe(0);
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('processes due posts oldest-first, max 5 from 7 queued', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValue({ success: true, platformPostId: 'fb_post_id', isTransient: false, isAuthError: false });

    // Create 7 queued posts with distinct epochs (oldest first = smallest epoch)
    const posts = Array.from({ length: 7 }, (_, i) => makePost(`p${i + 1}`, -(i + 1) * 1000));
    const keys = posts.map(p => ({ name: `post:queued:${p.scheduledAtEpoch}:${p.id}` }));

    for (const p of posts) {
      kv.store.set(`post:queued:${p.scheduledAtEpoch}:${p.id}`, JSON.stringify(p));
    }

    kv.list.mockResolvedValueOnce({ keys, list_complete: true });
    // Subsequent list calls (none expected in main flow, but guard against any)
    kv.list.mockResolvedValue({ keys: [], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(5);
    expect(body.remaining).toBe(2);
    expect(mockPublishPost).toHaveBeenCalledTimes(5);
  });

  it('skips posts with existing idempotency records and cleans queued key', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);

    const post = makePost('already-published');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.store.set(`idempotent:${post.id}`, JSON.stringify({
      key: post.id, status: 'published', platformPostId: 'fb_123',
      completedAt: new Date().toISOString(), error: null,
    }));

    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(0);
    // Stale queued key should be deleted
    expect(kv.delete).toHaveBeenCalledWith(queueKey);
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('writes post:publishing: key before calling publishPost', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);

    const publishingKeysSeen: string[] = [];
    mockPublishPost.mockImplementation(async () => {
      // At the time publishPost is called, the publishing key should already exist
      for (const [key] of kv.store) {
        if (key.startsWith('post:publishing:')) publishingKeysSeen.push(key);
      }
      return { success: true, platformPostId: 'fb_ok', isTransient: false, isAuthError: false };
    });

    const post = makePost('state-test');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    // At least one publishing key was written before publishPost returned
    expect(publishingKeysSeen.length).toBeGreaterThan(0);
    expect(publishingKeysSeen[0]).toContain('post:publishing:');
    // After success, publishing key should be cleaned up
    expect(kv.store.has(publishingKeysSeen[0])).toBe(false);
  });

  it('halts on auth error, reverts post to queued, returns 503', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValueOnce({
      success: false, error: 'Token expired', isTransient: false, isAuthError: true,
    });

    const post = makePost('auth-fail-post');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toContain('Token invalid');

    // Post should be reverted to queued
    const revertedRaw = kv.store.get(queueKey);
    expect(revertedRaw).toBeTruthy();
    const reverted = JSON.parse(revertedRaw!) as SocialPost;
    expect(reverted.status).toBe('queued');

    // publishing key should be deleted
    expect(kv.store.has(`post:publishing:${post.scheduledAtEpoch}:${post.id}`)).toBe(false);

    // Cron lock released in finally
    expect(kv.delete).toHaveBeenCalledWith('cron-lock:publish');
  });

  it('breaks loop on transient error, reverts post to queued, does not process remaining', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    // First post: transient error; second post should not be processed
    mockPublishPost.mockResolvedValueOnce({
      success: false, error: 'Timeout', isTransient: true, isAuthError: false,
    });

    const posts = [makePost('transient-post', -2000), makePost('second-post', -1000)];
    const keys = posts.map(p => ({ name: `post:queued:${p.scheduledAtEpoch}:${p.id}` }));
    for (const p of posts) kv.store.set(`post:queued:${p.scheduledAtEpoch}:${p.id}`, JSON.stringify(p));
    kv.list.mockResolvedValueOnce({ keys, list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(0);
    // Only one call — loop broke after transient
    expect(mockPublishPost).toHaveBeenCalledTimes(1);

    // Transient post should be reverted to queued
    const transientKey = `post:queued:${posts[0].scheduledAtEpoch}:${posts[0].id}`;
    const revertedRaw = kv.store.get(transientKey);
    expect(revertedRaw).toBeTruthy();

    // Second post untouched (publishPost never called for it)
    const secondRaw = kv.store.get(`post:queued:${posts[1].scheduledAtEpoch}:${posts[1].id}`);
    expect(secondRaw).toBeTruthy();
  });

  it('marks permanent failures with post:failed: and idempotent: keys', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValueOnce({
      success: false, error: 'Permission denied', isTransient: false, isAuthError: false,
    });

    const post = makePost('perm-fail-post');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.failed).toBe(1);
    expect(body.published).toBe(0);

    // post:failed: record created
    const failedRaw = kv.store.get(`post:failed:${post.id}`);
    expect(failedRaw).toBeTruthy();
    const failedPost = JSON.parse(failedRaw!) as SocialPost;
    expect(failedPost.status).toBe('failed');
    expect(failedPost.error).toBe('Permission denied');

    // idempotent: record created
    const idempotentRaw = kv.store.get(`idempotent:${post.id}`);
    expect(idempotentRaw).toBeTruthy();
    const idempotent = JSON.parse(idempotentRaw!) as { status: string; error: string };
    expect(idempotent.status).toBe('failed');
    expect(idempotent.error).toBe('Permission denied');

    // publishing key cleaned up
    expect(kv.store.has(`post:publishing:${post.scheduledAtEpoch}:${post.id}`)).toBe(false);
  });

  it('releases cron lock in finally block even on unexpected error', async () => {
    const kv = mockKV();
    // debugAuth throws unexpectedly
    mockDebugAuth.mockRejectedValueOnce(new Error('Unexpected KV failure'));

    // We need list to not interfere, but debugAuth throws before list is called
    // so list mock doesn't matter

    let errorThrown = false;
    try {
      await app.fetch(cronRequest(), makeEnv(kv));
    } catch {
      errorThrown = true;
    }

    // Whether the error propagates or is caught, the cron lock delete should be called
    // (The Hono framework may catch and return 500, or propagate — either way finally runs)
    expect(kv.delete).toHaveBeenCalledWith('cron-lock:publish');
    // The lock itself should be cleared from the store
    expect(kv.store.has('cron-lock:publish')).toBe(false);
  });

});
