import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import type { SocialPost, AuthStatus } from '../platforms/types';

// ── Mock createPlatform factory ──────────────────────────────────────────────
//
// Registry pattern: each platform gets its own publishPost/debugAuth pair, so
// tests can independently script per-platform behaviour (e.g. facebook healthy,
// bluesky expired). `mockPublishPost` and `mockDebugAuth` remain bound to the
// default platform ('facebook') for backward compatibility with existing tests.

interface PlatformMocks {
  publishPost: ReturnType<typeof vi.fn>;
  replyToComment: ReturnType<typeof vi.fn>;
  debugAuth: ReturnType<typeof vi.fn>;
  getPageIdentity: ReturnType<typeof vi.fn>;
}

const platformRegistry = new Map<string, PlatformMocks>();
let configuredPlatformsList: string[] = ['facebook'];

function getPlatformMocks(platform: string): PlatformMocks {
  let mocks = platformRegistry.get(platform);
  if (!mocks) {
    mocks = {
      publishPost: vi.fn(),
      replyToComment: vi.fn(),
      debugAuth: vi.fn(),
      getPageIdentity: vi.fn().mockReturnValue(`${platform}_identity`),
    };
    platformRegistry.set(platform, mocks);
  }
  return mocks;
}

// Default platform mocks (preserves existing test ergonomics)
const mockPublishPost = getPlatformMocks('facebook').publishPost;
const mockDebugAuth = getPlatformMocks('facebook').debugAuth;

vi.mock('../platforms/factory', () => ({
  createPlatform: (platform: string) => {
    const m = getPlatformMocks(platform);
    return {
      platform,
      publishPost: m.publishPost,
      listRecentPosts: vi.fn().mockResolvedValue([]),
      getComments: vi.fn().mockResolvedValue([]),
      getCommentReplies: vi.fn().mockResolvedValue([]),
      replyToComment: m.replyToComment,
      getPageIdentity: m.getPageIdentity,
      debugAuth: m.debugAuth,
    };
  },
  getConfiguredPlatforms: () => configuredPlatformsList,
  get CONFIGURED_PLATFORMS() { return configuredPlatformsList; },
}));

function setConfiguredPlatforms(platforms: string[]) {
  configuredPlatformsList = platforms;
}

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

function mockCronLock(initialHeldNames: string[] = []) {
  // Each entry stores { expiresAt, token } — mirrors the real DO's state.
  const held = new Map<string, { expiresAt: number; token: string }>();
  const now = Date.now();
  for (const name of initialHeldNames) {
    held.set(name, { expiresAt: now + 300_000, token: `pre-held-${name}` });
  }
  let tokenCounter = 0;
  const tryAcquire = vi.fn(async (name: string, ttlMs: number) => {
    const existing = held.get(name);
    if (existing && existing.expiresAt > Date.now()) {
      return { acquired: false, token: null };
    }
    const token = `tok-${++tokenCounter}`;
    held.set(name, { expiresAt: Date.now() + ttlMs, token });
    return { acquired: true, token };
  });
  const release = vi.fn(async (name: string, token: string) => {
    const existing = held.get(name);
    if (existing && existing.token === token) held.delete(name);
  });
  const stub = { tryAcquire, release };
  return {
    held,
    tryAcquire,
    release,
    get: vi.fn(() => stub),
    idFromName: vi.fn((n: string) => n),
  };
}

function makeEnv(kv: ReturnType<typeof mockKV>, cronLock: ReturnType<typeof mockCronLock> = mockCronLock()) {
  return {
    SOCIAL: kv as unknown as KVNamespace,
    CRON_LOCK: cronLock as unknown as DurableObjectNamespace,
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
  for (const mocks of platformRegistry.values()) {
    mocks.publishPost.mockReset();
    mocks.debugAuth.mockReset();
  }
  setConfiguredPlatforms(['facebook']);
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
    const cronLock = mockCronLock(['publish']);

    const res = await app.fetch(cronRequest(), makeEnv(kv, cronLock));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('locked');
    expect(cronLock.tryAcquire).toHaveBeenCalledWith('publish', 300_000);
    // Should not have called debugAuth (bailed out before fb usage)
    expect(mockDebugAuth).not.toHaveBeenCalled();
    // Release must NOT be called when acquire failed (we never held it)
    expect(cronLock.release).not.toHaveBeenCalled();
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

  it('processes due posts oldest-first, max 12 from 14 queued', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValue({ success: true, platformPostId: 'fb_post_id', isTransient: false, isAuthError: false });

    // Create 14 queued posts with distinct epochs (oldest first = smallest epoch)
    const posts = Array.from({ length: 14 }, (_, i) => makePost(`p${i + 1}`, -(i + 1) * 1000));
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
    expect(body.published).toBe(12);
    expect(body.remaining).toBe(2);
    expect(mockPublishPost).toHaveBeenCalledTimes(12);
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

    const cronLock = mockCronLock();
    const res = await app.fetch(cronRequest(), makeEnv(kv, cronLock));
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

    // Cron lock released in finally (with the fencing token the run acquired)
    expect(cronLock.release).toHaveBeenCalledWith('publish', expect.any(String));
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
    const cronLock = mockCronLock();
    // debugAuth throws unexpectedly
    mockDebugAuth.mockRejectedValueOnce(new Error('Unexpected KV failure'));

    // We need list to not interfere, but debugAuth throws before list is called
    // so list mock doesn't matter

    try {
      await app.fetch(cronRequest(), makeEnv(kv, cronLock));
    } catch { /* swallow — finally is what we're testing */ }

    // Lock must be released regardless of how the error surfaced
    expect(cronLock.release).toHaveBeenCalledWith('publish', expect.any(String));
    expect(cronLock.held.has('publish')).toBe(false);
  });

  it('release with a mismatched fencing token does NOT clear another holder\'s lock', async () => {
    // Simulates: run A acquires, exceeds TTL, lock entry expires, run B acquires
    // a fresh lock with a new token, then run A finally fires release.
    const cronLock = mockCronLock();
    const a = await cronLock.tryAcquire('publish', 1);     // acquire then "expire"
    expect(a.acquired).toBe(true);
    cronLock.held.get('publish')!.expiresAt = Date.now() - 1; // force-expire
    const b = await cronLock.tryAcquire('publish', 300_000);
    expect(b.acquired).toBe(true);
    expect(b.token).not.toBe(a.token);

    // Run A's stale release: must be a no-op
    await cronLock.release('publish', a.token!);
    expect(cronLock.held.has('publish')).toBe(true);
    expect(cronLock.held.get('publish')!.token).toBe(b.token);

    // Run B's release should actually clear
    await cronLock.release('publish', b.token!);
    expect(cronLock.held.has('publish')).toBe(false);
  });

  // C1 — Per-post publish lock in the cron. /api/publish takes
  // `publish:<idempotencyKey>`, and the cron must take the same lock per post
  // so an ad-hoc retry mid-cron-run cannot race the cron and double-publish.
  it('skips a post whose per-post publish lock is held by /api/publish', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);

    const post = makePost('contested-post');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    // Pre-hold the per-post lock AND the cron lock — both share the same DO mock.
    const cronLock = mockCronLock([`publish:${post.id}`]);

    const res = await app.fetch(cronRequest(), makeEnv(kv, cronLock));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    // Cron didn't publish (the other holder is publishing it)
    expect(body.published).toBe(0);
    expect(mockPublishPost).not.toHaveBeenCalled();
    // Crucially, the queue key was NOT consumed — the other publisher will write
    // the terminal state and the next cron tick will clean up the stale queued key.
    expect(kv.store.has(queueKey)).toBe(true);
  });

  // Codex/gemini/hermes High follow-up to C2: phase-tracked orphan recovery.
  // If publishPost SUCCEEDS but the terminal KV writes throw (transient KV
  // outage), the old blanket restore would re-queue the post and the next
  // cron tick would publish to the platform AGAIN — exactly the duplicate
  // the lock was supposed to prevent. The fix tracks `externalPublishSucceeded`
  // and refuses to restore in that case, surfacing it via `orphanedAfterSuccess`
  // and a 500 response so monitoring catches the KV outage.
  it('does NOT requeue when publishPost succeeded but post:published: KV write throws (no double-publish)', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_external_id', isTransient: false, isAuthError: false,
    });

    const post = makePost('post-success-kv-fail');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    // Make the `post:published:` write throw — the kind of transient KV failure
    // that previously triggered the bug.
    kv.put.mockImplementation(async (key: string, value: string) => {
      if (key.startsWith('post:published:')) {
        throw new Error('KV unavailable');
      }
      kv.store.set(key, value);
    });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    // The cron should surface the infrastructure failure as 500, not pretend
    // everything was fine.
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.orphanedAfterSuccess).toBe(1);

    // CRITICALLY: the queued key must NOT be restored — otherwise the next
    // cron tick would call publishPost again on a post that already published.
    expect(kv.store.has(queueKey)).toBe(false);
  });

  // C2 — Orphan recovery. Without the try/catch around the per-post body, an
  // unhandled exception (network blip, JSON parse failure, etc.) after the
  // queued key is deleted but before the terminal state is written would
  // silently drop the post: queued key gone, publishing key with no recovery
  // sweep, post invisible to future cron runs.
  it('restores queued key when publishPost throws unexpectedly', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockRejectedValueOnce(new Error('JSON.parse failed on truncated response'));

    const post = makePost('crash-post');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);

    // The queued key must be restored so the next cron tick can retry the post.
    const restoredRaw = kv.store.get(queueKey);
    expect(restoredRaw).toBeTruthy();
    const restored = JSON.parse(restoredRaw!) as SocialPost;
    expect(restored.status).toBe('queued');
    expect(restored.id).toBe(post.id);

    // The transient publishing key must be cleaned up so a later sweep doesn't
    // see it as a duplicate.
    expect(kv.store.has(`post:publishing:${post.scheduledAtEpoch}:${post.id}`)).toBe(false);
  });

  it('releases the per-post lock after a successful cron publish', async () => {
    const kv = mockKV();
    const cronLock = mockCronLock();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_ok', isTransient: false, isAuthError: false,
    });

    const post = makePost('lock-release-test');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    const res = await app.fetch(cronRequest(), makeEnv(kv, cronLock));
    expect(res.status).toBe(200);
    // Both the cron-wide lock AND the per-post lock must be released.
    expect(cronLock.release).toHaveBeenCalledWith('publish', expect.any(String));
    expect(cronLock.release).toHaveBeenCalledWith(`publish:${post.id}`, expect.any(String));
    expect(cronLock.held.has(`publish:${post.id}`)).toBe(false);
  });

  it('releases the per-post lock even when publishPost throws (orphan recovery)', async () => {
    const kv = mockKV();
    const cronLock = mockCronLock();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockRejectedValueOnce(new Error('boom'));

    const post = makePost('lock-finally-test');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });

    await app.fetch(cronRequest(), makeEnv(kv, cronLock));
    expect(cronLock.release).toHaveBeenCalledWith(`publish:${post.id}`, expect.any(String));
    expect(cronLock.held.has(`publish:${post.id}`)).toBe(false);
  });

  it('skips posts only for the platform with expired auth, publishes the healthy platform', async () => {
    const kv = mockKV();
    setConfiguredPlatforms(['facebook', 'bluesky']);

    const fbMocks = getPlatformMocks('facebook');
    const bskyMocks = getPlatformMocks('bluesky');

    fbMocks.debugAuth.mockResolvedValueOnce(healthyToken);
    bskyMocks.debugAuth.mockResolvedValueOnce({
      valid: false, platform: 'bluesky', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0,
    });
    fbMocks.publishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_ok', isTransient: false, isAuthError: false,
    });

    const fbPost: SocialPost = { ...makePost('fb-1'), platform: 'facebook' };
    const bskyPost: SocialPost = { ...makePost('bsky-1'), platform: 'bluesky' };
    const fbKey = `post:queued:${fbPost.scheduledAtEpoch}:${fbPost.id}`;
    const bskyKey = `post:queued:${bskyPost.scheduledAtEpoch}:${bskyPost.id}`;
    kv.store.set(fbKey, JSON.stringify(fbPost));
    kv.store.set(bskyKey, JSON.stringify(bskyPost));
    kv.list.mockResolvedValueOnce({
      keys: [{ name: fbKey }, { name: bskyKey }],
      list_complete: true,
    });

    const res = await app.fetch(cronRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(1);

    // Healthy platform was invoked; expired platform was not
    expect(fbMocks.publishPost).toHaveBeenCalledOnce();
    expect(bskyMocks.publishPost).not.toHaveBeenCalled();

    // Bluesky post remains queued for next run (not consumed)
    expect(kv.store.has(bskyKey)).toBe(true);
  });

});

describe('POST /api/publish forceRetry', () => {
  function publishRequest(body: Record<string, unknown>) {
    return new Request('http://localhost/api/publish', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-publish-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  it('returns alreadyFailed when failed idempotency record exists and forceRetry is absent', async () => {
    const kv = mockKV();
    kv.store.set('idempotent:key-1', JSON.stringify({
      key: 'key-1', status: 'failed', platformPostId: null,
      completedAt: new Date().toISOString(), error: 'Original failure',
    }));

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'key-1' }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.alreadyFailed).toBe(true);
    expect(body.error).toBe('Original failure');
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('bypasses failed idempotency record when forceRetry: true', async () => {
    const kv = mockKV();
    kv.store.set('idempotent:key-2', JSON.stringify({
      key: 'key-2', status: 'failed', platformPostId: null,
      completedAt: new Date().toISOString(), error: 'Original failure',
    }));
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_retry_ok', isTransient: false, isAuthError: false,
    });

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'key-2', forceRetry: true }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(true);
    expect(body.platformPostId).toBe('fb_retry_ok');
    expect(mockPublishPost).toHaveBeenCalledOnce();

    // Idempotency record replaced with new published entry
    const newRecord = JSON.parse(kv.store.get('idempotent:key-2')!);
    expect(newRecord.status).toBe('published');
    expect(newRecord.platformPostId).toBe('fb_retry_ok');
  });

  it('routes to replyToComment when replyTo is provided', async () => {
    const kv = mockKV();
    setConfiguredPlatforms(['bluesky']);
    const blueskyMocks = getPlatformMocks('bluesky');
    blueskyMocks.replyToComment.mockResolvedValueOnce({
      success: true, platformPostId: 'bsky_reply_1', isTransient: false, isAuthError: false,
    });

    const res = await app.fetch(
      publishRequest({
        platform: 'bluesky', type: 'text', message: 'A reply text',
        idempotencyKey: 'reply-1', replyTo: 'at://did:plc:abc/app.bsky.feed.post/xyz',
      }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.published).toBe(true);
    expect(body.platformPostId).toBe('bsky_reply_1');
    expect(blueskyMocks.replyToComment).toHaveBeenCalledWith(
      'at://did:plc:abc/app.bsky.feed.post/xyz', 'A reply text',
    );
    expect(blueskyMocks.publishPost).not.toHaveBeenCalled();
  });

  it('publishes via the platform named in the request body, not the default', async () => {
    const kv = mockKV();
    setConfiguredPlatforms(['facebook', 'bluesky']);
    const blueskyMocks = getPlatformMocks('bluesky');
    blueskyMocks.publishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'bsky_post_1', isTransient: false, isAuthError: false,
    });

    const res = await app.fetch(
      publishRequest({ platform: 'bluesky', type: 'text', message: 'hi', idempotencyKey: 'multi-1' }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.platformPostId).toBe('bsky_post_1');
    // Bluesky was called, facebook was not
    expect(blueskyMocks.publishPost).toHaveBeenCalledOnce();
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('forceRetry does NOT bypass a published idempotency record', async () => {
    const kv = mockKV();
    kv.store.set('idempotent:key-3', JSON.stringify({
      key: 'key-3', status: 'published', platformPostId: 'fb_already',
      completedAt: new Date().toISOString(), error: null,
    }));

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'key-3', forceRetry: true }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.alreadyPublished).toBe(true);
    expect(body.platformPostId).toBe('fb_already');
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('returns 409 when a concurrent publish holds the per-key lock', async () => {
    const kv = mockKV();
    // Simulate concurrent publish: pre-populate the held set with this key's lock name.
    const cronLock = mockCronLock(['publish:concurrent-key']);

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'concurrent-key' }),
      makeEnv(kv, cronLock),
    );
    expect(res.status).toBe(409);
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('releases the per-key lock after a successful publish', async () => {
    const kv = mockKV();
    const cronLock = mockCronLock();
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_ok', isTransient: false, isAuthError: false,
    });

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'release-test' }),
      makeEnv(kv, cronLock),
    );
    expect(res.status).toBe(200);
    expect(cronLock.release).toHaveBeenCalledWith('publish:release-test', expect.any(String));
    expect(cronLock.held.has('publish:release-test')).toBe(false);
  });

  // H7 — Without runtime validation, missing/empty/malicious idempotencyKeys
  // produced shared lock and KV names (publish:undefined, idempotent:undefined)
  // that let unrelated authenticated publishes collide or suppress each other.
  it.each([
    ['missing',     {}],
    ['empty',       { idempotencyKey: '' }],
    ['null',        { idempotencyKey: null }],
    ['number',      { idempotencyKey: 12345 }],
    ['too long',    { idempotencyKey: 'a'.repeat(257) }],
    ['unsafe char', { idempotencyKey: 'has space' }],
    ['path-trav',   { idempotencyKey: '../../system' }],
  ])('rejects %s idempotencyKey with 400', async (_label, override) => {
    const kv = mockKV();
    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', ...override }),
      makeEnv(kv),
    );
    expect(res.status).toBe(400);
    expect(mockPublishPost).not.toHaveBeenCalled();
  });

  it('accepts a typical commit-hash idempotencyKey', async () => {
    const kv = mockKV();
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'ok', isTransient: false, isAuthError: false,
    });
    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'commit-3ae25f2c-blog/foo' }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
  });
});

// H9 — /api/cron/comments had zero route-level test coverage. These tests
// exercise the lock-held skip, per-platform expired-token skip, multi-platform
// iteration, and lock release on throw.
describe('POST /api/cron/comments', () => {
  function commentsRequest() {
    return new Request('http://localhost/api/cron/comments', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-cron-secret' },
    });
  }

  it('returns 401 without valid cron auth', async () => {
    const kv = mockKV();
    const req = new Request('http://localhost/api/cron/comments', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
    });
    const res = await app.fetch(req, makeEnv(kv));
    expect(res.status).toBe(401);
  });

  it('skips when the comments lock is held', async () => {
    const kv = mockKV();
    const cronLock = mockCronLock(['comments']);
    const res = await app.fetch(commentsRequest(), makeEnv(kv, cronLock));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.skipped).toBe(true);
    expect(body.reason).toBe('locked');
    // Token health should not have been checked
    expect(mockDebugAuth).not.toHaveBeenCalled();
    // Release must NOT fire when acquire failed
    expect(cronLock.release).not.toHaveBeenCalled();
  });

  it('iterates configured platforms and reports per-platform results', async () => {
    const kv = mockKV();
    setConfiguredPlatforms(['facebook', 'bluesky']);
    getPlatformMocks('facebook').debugAuth.mockResolvedValueOnce(healthyToken);
    getPlatformMocks('bluesky').debugAuth.mockResolvedValueOnce({
      valid: true, platform: 'bluesky', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 60,
    });
    const res = await app.fetch(commentsRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const platforms = body.platforms as Record<string, unknown>;
    expect(platforms.facebook).toBeDefined();
    expect(platforms.bluesky).toBeDefined();
  });

  it('skips a platform with expired data access and continues with others', async () => {
    const kv = mockKV();
    setConfiguredPlatforms(['facebook', 'bluesky']);
    getPlatformMocks('facebook').debugAuth.mockResolvedValueOnce({
      valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0,
    });
    getPlatformMocks('bluesky').debugAuth.mockResolvedValueOnce(healthyToken);

    const res = await app.fetch(commentsRequest(), makeEnv(kv));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    const platforms = body.platforms as Record<string, { error?: string }>;
    expect(platforms.facebook.error).toBe('data access expired');
    expect(platforms.bluesky).toBeDefined();
  });

  it('releases the comments lock in finally even on unexpected error', async () => {
    const kv = mockKV();
    const cronLock = mockCronLock();
    mockDebugAuth.mockRejectedValueOnce(new Error('boom'));
    try {
      await app.fetch(commentsRequest(), makeEnv(kv, cronLock));
    } catch { /* swallow — testing finally */ }
    expect(cronLock.release).toHaveBeenCalledWith('comments', expect.any(String));
    expect(cronLock.held.has('comments')).toBe(false);
  });
});

// Fix — forceRetry deletes the failed idempotency record before calling the
// platform adapter. If the adapter THREW (network error, adapter bug), the
// 500 propagated with no record left behind, so a later non-forceRetry
// publish of the same key would sail through and double-post. The adapter
// call is now wrapped: a throw (re)writes a failed record before propagating.
describe('POST /api/publish — adapter throw preserves idempotency record', () => {
  function publishRequest(body: Record<string, unknown>) {
    return new Request('http://localhost/api/publish', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-publish-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  it('rewrites a failed record when the adapter throws during a forceRetry', async () => {
    const kv = mockKV();
    kv.store.set('idempotent:throw-key', JSON.stringify({
      key: 'throw-key', status: 'failed', platformPostId: null,
      completedAt: new Date().toISOString(), error: 'Original failure',
    }));
    mockPublishPost.mockRejectedValueOnce(new Error('socket hang up'));

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'throw-key', forceRetry: true }),
      makeEnv(kv),
    );
    expect(res.status).toBe(500);

    // The failed record must exist again — NOT be absent.
    const recordRaw = kv.store.get('idempotent:throw-key');
    expect(recordRaw).toBeTruthy();
    const record = JSON.parse(recordRaw!) as { status: string; error: string };
    expect(record.status).toBe('failed');
    expect(record.error).toBe('socket hang up');
  });

  it('a subsequent non-forceRetry publish is blocked by the rewritten record', async () => {
    const kv = mockKV();
    kv.store.set('idempotent:throw-key-2', JSON.stringify({
      key: 'throw-key-2', status: 'failed', platformPostId: null,
      completedAt: new Date().toISOString(), error: 'Original failure',
    }));
    mockPublishPost.mockRejectedValueOnce(new Error('boom'));

    await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'throw-key-2', forceRetry: true }),
      makeEnv(kv),
    );

    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'throw-key-2' }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.alreadyFailed).toBe(true);
    // The adapter was only invoked once (the throwing forceRetry attempt).
    expect(mockPublishPost).toHaveBeenCalledTimes(1);
  });

  it('writes a failed record when the adapter throws on a first-time publish', async () => {
    const kv = mockKV();
    mockPublishPost.mockRejectedValueOnce(new Error('first-time boom'));
    const res = await app.fetch(
      publishRequest({ type: 'text', message: 'hi', idempotencyKey: 'fresh-throw' }),
      makeEnv(kv),
    );
    expect(res.status).toBe(500);
    const record = JSON.parse(kv.store.get('idempotent:fresh-throw')!) as { status: string };
    expect(record.status).toBe('failed');
  });
});

// Fix — body.type was cast to PostType unvalidated; arbitrary strings flowed
// into the platform adapters. Both /api/publish and /api/queue now 400 on
// anything outside text|photo|link.
describe('post type validation', () => {
  function bodyRequest(path: string, body: Record<string, unknown>) {
    return new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-publish-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  it.each([['video'], ['story'], [''], [undefined]])(
    '/api/publish rejects type %s with 400',
    async (type) => {
      const kv = mockKV();
      const res = await app.fetch(
        bodyRequest('/api/publish', { type, message: 'hi', idempotencyKey: 'type-check' }),
        makeEnv(kv),
      );
      expect(res.status).toBe(400);
      expect(mockPublishPost).not.toHaveBeenCalled();
    },
  );

  it('/api/queue rejects an invalid type with 400', async () => {
    const kv = mockKV();
    const res = await app.fetch(
      bodyRequest('/api/queue', { type: 'video', message: 'hi', scheduledAt: new Date().toISOString() }),
      makeEnv(kv),
    );
    expect(res.status).toBe(400);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('/api/queue accepts a valid type', async () => {
    const kv = mockKV();
    const res = await app.fetch(
      bodyRequest('/api/queue', { type: 'link', message: 'hi', link: 'https://adrianwedd.com/', scheduledAt: new Date(Date.now() + 3600_000).toISOString() }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
  });
});

// An invalid platform token must surface as a 503 on the authenticated
// /api/health so uptime monitoring alerts on it (body unchanged).
describe('GET /api/health token status', () => {
  it('returns 503 when any configured platform reports an invalid token', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValue({ ...healthyToken, valid: false });

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { platforms: Record<string, { tokenValid: boolean }> };
    expect(body.platforms.facebook.tokenValid).toBe(false);
  });

  it('still returns 200 unauthenticated regardless of token state', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValue({ ...healthyToken, valid: false });

    const res = await app.fetch(new Request('http://localhost/api/health'), makeEnv(kv));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

// Crisis flags are surfaced separately in /api/health (flag-crisis: prefix,
// written by cron/comments.ts) so monitoring can alert on a non-zero count.
describe('GET /api/health crisisFlags', () => {
  it('reports the flag-crisis: key count alongside flaggedComments', async () => {
    const kv = mockKV();
    kv.store.set('flag-crisis:c1', '{}');
    kv.store.set('flag-crisis:c2', '{}');
    kv.store.set('fb-flag:c3', '{}');
    kv.list.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      keys: [...kv.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }));
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { recentActivity: { flaggedComments: number; crisisFlags: number } };
    expect(body.recentActivity.crisisFlags).toBe(2);
    expect(body.recentActivity.flaggedComments).toBe(1);
  });
});
