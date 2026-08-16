import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';
import type { SocialPost, AuthStatus } from '../platforms/types';
import { CRON_SPECS, HEARTBEAT_PREFIX, HEARTBEAT_GRACE_MS } from '../heartbeat';
import { STUCK_QUEUE_GRACE_MS } from '../index';
import { EXTERNAL_HEARTBEAT_PREFIX, EXTERNAL_SOURCES } from '../watchdog';

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

/**
 * Seed a fresh heartbeat for every cron so /api/health reads as live.
 *
 * Absence of a heartbeat is a degradation signal (see heartbeat.ts), so any
 * health test that expects 200 has to establish proof of life first.
 */
function seedHeartbeats(kv: ReturnType<typeof mockKV>, at: number = Date.now()): void {
  for (const spec of CRON_SPECS) {
    kv.store.set(`${HEARTBEAT_PREFIX}${spec.name}`, JSON.stringify({ at: new Date(at).toISOString(), atEpoch: at }));
  }
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
    // A skipped run is not proof of life — the lock holder writes its own.
    expect(kv.store.get(`${HEARTBEAT_PREFIX}comments`)).toBeUndefined();
  });

  it('records a comments heartbeat after a successful run', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(commentsRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const raw = kv.store.get(`${HEARTBEAT_PREFIX}comments`);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).atEpoch).toBeGreaterThan(Date.now() - 60_000);
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
    seedHeartbeats(kv);
    mockDebugAuth.mockResolvedValue({ ...healthyToken, valid: false });

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      platforms: Record<string, { tokenValid: boolean }>;
      degraded: string[];
    };
    expect(body.platforms.facebook.tokenValid).toBe(false);
    expect(body.degraded).toContain('invalid platform token: facebook');
  });

  it('returns 200 with fresh heartbeats and valid tokens', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { degraded?: string[] };
    expect(body.degraded).toBeUndefined();
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
// Cron liveness. A worker whose scheduled caller has died keeps serving 200s on
// every other check, so heartbeat staleness has to be its own 503 reason.
describe('GET /api/health cron heartbeats', () => {
  it('returns 503 when a cron heartbeat is missing entirely', async () => {
    const kv = mockKV(); // no heartbeats seeded
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      crons: Record<string, { stale: boolean; lastRunAt: string | null }>;
      degraded: string[];
    };
    expect(body.crons.publish.stale).toBe(true);
    expect(body.crons.publish.lastRunAt).toBeNull();
    expect(body.degraded.some((d) => d.startsWith('stale cron heartbeat:'))).toBe(true);
  });

  it('returns 503 naming only the stale cron when another is fresh', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    // Age out publish alone, past 2x its 10-minute interval plus grace.
    const stalePublish = Date.now() - (2 * 10 * 60_000 + HEARTBEAT_GRACE_MS + 60_000);
    kv.store.set(
      `${HEARTBEAT_PREFIX}publish`,
      JSON.stringify({ at: new Date(stalePublish).toISOString(), atEpoch: stalePublish }),
    );
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );

    expect(res.status).toBe(503);
    const body = (await res.json()) as {
      crons: Record<string, { stale: boolean }>;
      degraded: string[];
    };
    expect(body.crons.publish.stale).toBe(true);
    expect(body.crons.comments.stale).toBe(false);
    expect(body.degraded).toContain('stale cron heartbeat: publish');
  });

  it('reports every configured cron in the body', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(
      new Request('http://localhost/api/health', {
        headers: { Authorization: 'Bearer test-cron-secret' },
      }),
      makeEnv(kv),
    );

    const body = (await res.json()) as { crons: Record<string, unknown> };
    expect(Object.keys(body.crons).sort()).toEqual(CRON_SPECS.map((s) => s.name).sort());
  });
});

// A successful cron run records proof of life; a failed or skipped one must not.
describe('cron heartbeat writes', () => {
  it('records a publish heartbeat after a successful run', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(cronRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const raw = kv.store.get(`${HEARTBEAT_PREFIX}publish`);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).atEpoch).toBeGreaterThan(Date.now() - 60_000);
  });

  // A cron that fails every run must not read as alive. This is the semantic
  // that keeps the heartbeat honest, and it is only enforced by the ORDER of the
  // 500 return and the recordHeartbeat call — a refactor that hoists the write
  // above the check would silently make a permanently broken cron look healthy.
  it('does NOT record a heartbeat when the run returns 500', async () => {
    const kv = mockKV();
    mockDebugAuth.mockResolvedValueOnce(healthyToken);
    mockPublishPost.mockResolvedValueOnce({
      success: true, platformPostId: 'fb_external_id', isTransient: false, isAuthError: false,
    });

    const post = makePost('post-500-no-heartbeat');
    const queueKey = `post:queued:${post.scheduledAtEpoch}:${post.id}`;
    kv.store.set(queueKey, JSON.stringify(post));
    kv.list.mockResolvedValueOnce({ keys: [{ name: queueKey }], list_complete: true });
    // Terminal KV write throws → orphanedAfterSuccess → 500.
    kv.put.mockImplementation(async (key: string, value: string) => {
      if (key.startsWith('post:published:')) throw new Error('KV unavailable');
      kv.store.set(key, value);
    });

    const res = await app.fetch(cronRequest(), makeEnv(kv));

    expect(res.status).toBe(500);
    expect(kv.store.get(`${HEARTBEAT_PREFIX}publish`)).toBeUndefined();
  });

  it('does NOT record a heartbeat when the cron lock is already held', async () => {
    const kv = mockKV();
    const lock = mockCronLock();
    lock.tryAcquire.mockResolvedValue({ acquired: false, token: null });
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(cronRequest(), makeEnv(kv, lock));

    expect(res.status).toBe(200);
    expect((await res.json() as { skipped: boolean }).skipped).toBe(true);
    expect(kv.store.get(`${HEARTBEAT_PREFIX}publish`)).toBeUndefined();
  });
});

describe('GET /api/health crisisFlags', () => {
  /** Make kv.list serve from the store so prefix counting works. */
  function listFromStore(kv: ReturnType<typeof mockKV>) {
    kv.list.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      keys: [...kv.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }));
  }

  function healthRequest() {
    return new Request('http://localhost/api/health', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    });
  }

  it('reports the flag-crisis: key count alongside flaggedComments', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    kv.store.set('flag-crisis:c1', '{}');
    kv.store.set('flag-crisis:c2', '{}');
    kv.store.set('fb-flag:c3', '{}');
    // Both crisis comments were successfully emailed, so the operator has
    // already been told — counts are informational, not a degradation.
    kv.store.set('crisis-emailed:c1', 'ts');
    kv.store.set('crisis-emailed:c2', 'ts');
    listFromStore(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const body = await res.json() as {
      recentActivity: { flaggedComments: number; crisisFlags: number; crisisFlagsUnnotified: number };
    };
    expect(body.recentActivity.crisisFlags).toBe(2);
    expect(body.recentActivity.flaggedComments).toBe(1);
    expect(body.recentActivity.crisisFlagsUnnotified).toBe(0);
  });

  // The gap this closes: crisis email is best-effort (email.ts swallows send
  // failures so they can't fail the comments cron), so a crisis nobody could be
  // told about has to surface as a status code — Upptime cannot read the body.
  it('returns 503 when a crisis flag has never been emailed', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    kv.store.set('flag-crisis:c1', '{}');
    kv.store.set('flag-crisis:c2', '{}');
    kv.store.set('crisis-emailed:c1', 'ts'); // c2 never reached anyone
    listFromStore(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    // Email IS configured here, so this is the send-failure case, not the
    // no-channel-at-all case (covered separately below).
    const res = await app.fetch(healthRequest(), {
      ...makeEnv(kv),
      CRISIS_EMAIL: { send: vi.fn(async () => {}) },
      CRISIS_ALERT_FROM: 'alerts@wedd.au',
      CRISIS_ALERT_TO: 'adrianwedd@gmail.com',
    });

    expect(res.status).toBe(503);
    const body = await res.json() as {
      recentActivity: { crisisFlags: number; crisisFlagsUnnotified: number };
      degraded: string[];
    };
    expect(body.recentActivity.crisisFlags).toBe(2);
    expect(body.recentActivity.crisisFlagsUnnotified).toBe(1);
    expect(body.degraded).toContain('unnotified crisis flags: 1');
  });

  // Nothing deletes a crisis flag on acknowledgement (90-day TTL), so alerting
  // on the raw count would hold the check red for three months and train the
  // operator to ignore it. Emailing must clear the alert.
  it('clears the 503 once the flag has been emailed, without deleting the flag', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    kv.store.set('flag-crisis:c1', '{}');
    listFromStore(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const before = await app.fetch(healthRequest(), makeEnv(kv));
    expect(before.status).toBe(503);

    kv.store.set('crisis-emailed:c1', 'ts');

    const after = await app.fetch(healthRequest(), makeEnv(kv));
    expect(after.status).toBe(200);
    const body = await after.json() as { recentActivity: { crisisFlags: number } };
    expect(body.recentActivity.crisisFlags).toBe(1); // flag still there for review
  });

  // countUnnotifiedCrisisFlags catches KV errors so a KV incident can't 500 the
  // health endpoint. The trap is that its fallback is `count: 0`, which reads as
  // "nothing unnotified" — and `countsTruncated` in the body is invisible to
  // Upptime, which only sees status codes. A transient failure on the
  // `crisis-emailed:` marker reads would have turned a live crisis green.
  it('returns 503 when the unnotified-crisis count could not be measured', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    kv.store.set('flag-crisis:c1', '{}');
    kv.store.set('crisis-emailed:c1', 'ts'); // would count as 0 unnotified if readable
    listFromStore(kv);
    mockDebugAuth.mockResolvedValue(healthyToken);

    // Fail ONLY the marker reads: heartbeats and the queued-key lookup still
    // work, so this is the narrow partial-KV case, not a total outage (which
    // surfaces as a 500 from countKeysCapped and needs no special handling).
    kv.get.mockImplementation(async (key: string) => {
      if (key.startsWith('crisis-emailed:')) throw new Error('KV read failed');
      return kv.store.get(key) ?? null;
    });

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(503);
    const body = await res.json() as { degraded: string[]; countsTruncated?: boolean };
    expect(body.degraded).toContain('unverifiable crisis flag count (KV read failed)');
    expect(body.countsTruncated).toBe(true);
  });
});

// A cron that runs, returns 2xx and beats its heartbeat can still be failing to
// drain the queue (stuck per-post lock, posts failing back to queued, blocked
// platform). Overdue-by-more-than-grace is the signal for that.
describe('GET /api/health stuck queue', () => {
  function queuedKeysKV(epochs: number[]) {
    const kv = mockKV();
    seedHeartbeats(kv);
    epochs.forEach((e, i) => kv.store.set(`post:queued:${e}:p${i}`, JSON.stringify(makePost(`p${i}`))));
    kv.list.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      keys: [...kv.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }));
    return kv;
  }

  function healthRequest() {
    return new Request('http://localhost/api/health', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    });
  }

  it('returns 503 when the oldest due post exceeds grace plus drain time', async () => {
    const kv = queuedKeysKV([Date.now() - STUCK_QUEUE_GRACE_MS - 60_000]);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(503);
    const body = await res.json() as {
      queue: { facebook: { due: number; stalled: boolean; oldestDueMinutes: number } };
      degraded: string[];
    };
    expect(body.queue.facebook.due).toBe(1);
    expect(body.queue.facebook.stalled).toBe(true);
    expect(body.queue.facebook.oldestDueMinutes).toBeGreaterThanOrEqual(46);
    expect(body.degraded.some((d) => d.startsWith('queue stalled:'))).toBe(true);
  });

  // Between a post falling due and the next cron tick it is legitimately
  // waiting. Alerting there would flap every ten minutes.
  it('stays 200 for a post that is due but inside the grace window', async () => {
    const kv = queuedKeysKV([Date.now() - 60_000]);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const body = await res.json() as { queue: { facebook: { due: number; stalled: boolean } } };
    expect(body.queue.facebook.due).toBe(1);
    expect(body.queue.facebook.stalled).toBe(false);
  });

  it('stays 200 for posts scheduled in the future', async () => {
    const kv = queuedKeysKV([Date.now() + 3_600_000, Date.now() + 86_400_000]);
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const body = await res.json() as {
      queue: { facebook: { queued: number; due: number; oldestDueMinutes: number | null } };
    };
    expect(body.queue.facebook.queued).toBe(2);
    expect(body.queue.facebook.due).toBe(0);
    expect(body.queue.facebook.oldestDueMinutes).toBeNull();
  });

  // One root cause, one fix, one alert — but only when the tokens FULLY explain
  // the stall. With every configured platform blocked, the cron skips every post,
  // so the stall is entirely accounted for by the token reason.
  it('suppresses the stall reason when every platform is blocked, keeping it in the body', async () => {
    const kv = queuedKeysKV([Date.now() - STUCK_QUEUE_GRACE_MS - 60_000]);
    mockDebugAuth.mockResolvedValue({ ...healthyToken, valid: false });

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(503);
    const body = await res.json() as {
      queue: { facebook: { stalled: boolean } };
      degraded: string[];
    };
    expect(body.degraded).toContain('invalid platform token: facebook');
    expect(body.degraded.some((d) => d.startsWith('queue stalled:'))).toBe(false);
    // Still reported as state — suppressed as a REASON, not hidden.
    expect(body.queue.facebook.stalled).toBe(true);
  });

  // The suppression must NOT extend to a partially-blocked estate: a dead
  // Facebook token masking an unrelated Twitter stall would hide the second
  // fault until the first was fixed.
  it('still reports the stall when only SOME platforms are blocked', async () => {
    const kv = queuedKeysKV([Date.now() - STUCK_QUEUE_GRACE_MS - 60_000]);
    setConfiguredPlatforms(['facebook', 'twitter']);
    getPlatformMocks('facebook').debugAuth.mockResolvedValue({ ...healthyToken, valid: false });
    getPlatformMocks('twitter').debugAuth.mockResolvedValue({
      ...healthyToken,
      platform: 'twitter',
      valid: true,
    });

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(503);
    const body = await res.json() as { degraded: string[] };
    expect(body.degraded).toContain('invalid platform token: facebook');
    // Both reasons: the stall is not fully explained by the dead token.
    expect(body.degraded.some((d) => d.startsWith('queue stalled:'))).toBe(true);
  });

  // The regression the drain allowance exists to prevent: a legitimate burst
  // larger than the batch cap must not page anyone while it is still draining.
  it('stays 200 for a large burst that is still draining', async () => {
    const age = STUCK_QUEUE_GRACE_MS + 20 * 60_000;
    const kv = queuedKeysKV(Array.from({ length: 120 }, (_, i) => Date.now() - age + i * 100));
    mockDebugAuth.mockResolvedValue(healthyToken);

    const res = await app.fetch(healthRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const body = await res.json() as { queue: { facebook: { due: number; stalled: boolean } } };
    expect(body.queue.facebook.due).toBe(120);
    expect(body.queue.facebook.stalled).toBe(false);
  });
});

// Two distinct causes of an un-notified crisis need two distinct fixes, so the
// reason string has to tell them apart.
describe('GET /api/health with no alerting channel configured', () => {
  it('names the missing binding rather than implying a send failure', async () => {
    const kv = mockKV();
    seedHeartbeats(kv);
    kv.store.set('flag-crisis:c1', '{}');
    kv.list.mockImplementation(async ({ prefix }: { prefix: string }) => ({
      keys: [...kv.store.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })),
      list_complete: true,
    }));
    mockDebugAuth.mockResolvedValue(healthyToken);

    // makeEnv provides no CRISIS_EMAIL binding.
    const res = await app.fetch(
      new Request('http://localhost/api/health', { headers: { Authorization: 'Bearer test-cron-secret' } }),
      makeEnv(kv),
    );

    expect(res.status).toBe(503);
    const body = await res.json() as { degraded: string[] };
    expect(body.degraded.some((d) => d.includes('NO alerting channel configured'))).toBe(true);
  });
});

// ── Watchdog HTTP surface ─────────────────────────────────────────────────────
//
// The unit tests in watchdog.test.ts cover the sweep logic; these cover the
// route wiring — auth, validation, and the status codes Upptime keys on.
describe('POST /api/watchdog/heartbeat', () => {
  function checkInRequest(body: unknown, token = 'test-cron-secret') {
    return new Request('http://localhost/api/watchdog/heartbeat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('records a check-in for a known source', async () => {
    const kv = mockKV();

    const res = await app.fetch(checkInRequest({ name: 'monitor-watchdog' }), makeEnv(kv));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, name: 'monitor-watchdog' });
    expect(kv.store.has(`${EXTERNAL_HEARTBEAT_PREFIX}monitor-watchdog`)).toBe(true);
  });

  it('rejects a bad bearer token with 401 and writes nothing', async () => {
    const kv = mockKV();

    const res = await app.fetch(checkInRequest({ name: 'monitor-watchdog' }, 'wrong'), makeEnv(kv));

    expect(res.status).toBe(401);
    expect(kv.store.size).toBe(0);
  });

  it('rejects invalid JSON with 400', async () => {
    const res = await app.fetch(checkInRequest('{not json'), makeEnv(mockKV()));
    expect(res.status).toBe(400);
  });

  it.each([[{}], [{ name: '' }], [{ name: 42 }]])('rejects a missing or empty name with 400 (%j)', async (body) => {
    const res = await app.fetch(checkInRequest(body), makeEnv(mockKV()));
    expect(res.status).toBe(400);
  });

  // A typo'd name must not be accepted: the source it was meant to cover would
  // look like it had never checked in, with no visible cause on either side.
  it('rejects an unknown source name with 400 and a pointer to the fix', async () => {
    const kv = mockKV();

    const res = await app.fetch(checkInRequest({ name: 'moniter-watchdog' }), makeEnv(kv));

    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toContain('EXTERNAL_SOURCES');
    expect(kv.store.size).toBe(0);
  });

  it('truncates an oversized detail rather than storing it whole', async () => {
    const kv = mockKV();

    const res = await app.fetch(
      checkInRequest({ name: 'monitor-watchdog', detail: 'x'.repeat(5000) }),
      makeEnv(kv),
    );

    expect(res.status).toBe(200);
    const record = JSON.parse(kv.store.get(`${EXTERNAL_HEARTBEAT_PREFIX}monitor-watchdog`)!);
    expect(record.detail).toHaveLength(500);
  });
});

describe('POST /api/watchdog/undelivered', () => {
  function undeliveredRequest(body: unknown, token = 'test-cron-secret') {
    return new Request('http://localhost/api/watchdog/undelivered', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  function emailEnv(kv: ReturnType<typeof mockKV>, send = vi.fn(async () => {})) {
    return { ...makeEnv(kv), CRISIS_EMAIL: { send }, CRISIS_ALERT_FROM: 'alerts@wedd.au', CRISIS_ALERT_TO: 'adrianwedd@gmail.com', send };
  }

  it('emails findings the caller could not file', async () => {
    const kv = mockKV();
    const env = emailEnv(kv);

    const res = await app.fetch(
      undeliveredRequest({ source: 'monitor-watchdog', findings: '- uptime.yml disabled', runId: '99' }),
      env as never,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, source: 'monitor-watchdog', emailed: true, suppressed: false });
    expect(env.send).toHaveBeenCalledTimes(1);
  });

  it('rejects a bad bearer token with 401 and sends nothing', async () => {
    const env = emailEnv(mockKV());

    const res = await app.fetch(
      undeliveredRequest({ source: 'monitor-watchdog', findings: '- x' }, 'wrong'),
      env as never,
    );

    expect(res.status).toBe(401);
    expect(env.send).not.toHaveBeenCalled();
  });

  // An escalation carrying no findings would email "your findings were lost"
  // while carrying none — worse than silence, because it reads as delivery.
  it.each([[{ source: 'monitor-watchdog' }], [{ source: 'monitor-watchdog', findings: '' }], [{ findings: '- x' }]])(
    'rejects an incomplete payload with 400 (%j)',
    async (body) => {
      const env = emailEnv(mockKV());
      const res = await app.fetch(undeliveredRequest(body), env as never);
      expect(res.status).toBe(400);
      expect(env.send).not.toHaveBeenCalled();
    },
  );

  // The caller still holds the text at this point, so a failed send has to be
  // visible to it — otherwise both paths are down and nothing says so.
  it('returns 502 when the email cannot be sent', async () => {
    const env = emailEnv(mockKV(), vi.fn(async () => {
      throw new Error('binding down');
    }));

    const res = await app.fetch(
      undeliveredRequest({ source: 'monitor-watchdog', findings: '- lost' }),
      env as never,
    );

    expect(res.status).toBe(502);
  });

  it('reports a cooldown-suppressed escalation as delivered', async () => {
    const kv = mockKV();
    kv.store.set('watchdog-undelivered:monitor-watchdog', 'earlier');
    const env = emailEnv(kv);

    const res = await app.fetch(
      undeliveredRequest({ source: 'monitor-watchdog', findings: '- still broken' }),
      env as never,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, emailed: false, suppressed: true });
  });
});

describe('GET /api/watchdog/status', () => {
  function statusRequest(authed = true) {
    return new Request(
      'http://localhost/api/watchdog/status',
      authed ? { headers: { Authorization: 'Bearer test-cron-secret' } } : undefined,
    );
  }

  it('returns 200 {ok:true} unauthenticated, leaking no state', async () => {
    const res = await app.fetch(statusRequest(false), makeEnv(mockKV()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 503 when a source has gone stale', async () => {
    const kv = mockKV(); // nothing has ever checked in

    const res = await app.fetch(statusRequest(), makeEnv(kv));

    expect(res.status).toBe(503);
    const body = await res.json() as { sources: { name: string; stale: boolean }[]; stale: string[] };
    expect(body.stale.length).toBeGreaterThan(0);
    expect(body.sources.every((s) => s.stale)).toBe(true);
  });

  it('returns 200 once every source has checked in', async () => {
    const kv = mockKV();
    const now = Date.now();
    for (const source of EXTERNAL_SOURCES) {
      kv.store.set(
        `${EXTERNAL_HEARTBEAT_PREFIX}${source.name}`,
        JSON.stringify({ at: new Date(now).toISOString(), atEpoch: now }),
      );
    }

    const res = await app.fetch(statusRequest(), makeEnv(kv));

    expect(res.status).toBe(200);
    const body = await res.json() as { sources: { stale: boolean }[]; stale?: string[] };
    expect(body.stale).toBeUndefined();
    expect(body.sources.every((s) => !s.stale)).toBe(true);
  });
});
