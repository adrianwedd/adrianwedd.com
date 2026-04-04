import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../index';

// ── Mock platform factory so the router import doesn't need real tokens ───────
vi.mock('../platforms/factory', () => ({
  createPlatform: vi.fn(() => ({
    platform: 'facebook',
    publishPost: vi.fn(),
    listRecentPosts: vi.fn().mockResolvedValue([]),
    getComments: vi.fn().mockResolvedValue([]),
    getCommentReplies: vi.fn().mockResolvedValue([]),
    replyToComment: vi.fn(),
    getPageIdentity: vi.fn().mockReturnValue('page_123'),
    debugAuth: vi.fn().mockResolvedValue({ valid: true, daysUntilExpiry: 60, dataAccessExpiresAt: '' }),
  })),
  CONFIGURED_PLATFORMS: ['facebook'],
}));

// ── KV mock factory ────────────────────────────────────────────────────────────

type KVStore = Map<string, string>;

function makeMockKV(initial: Record<string, string> = {}): {
  store: KVStore;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
} {
  const store: KVStore = new Map(Object.entries(initial));

  const get = vi.fn(async (key: string) => store.get(key) ?? null);
  const put = vi.fn(async (key: string, value: string) => { store.set(key, value); });
  const del = vi.fn(async (key: string) => { store.delete(key); });
  const list = vi.fn(async ({ prefix }: { prefix: string; limit?: number; cursor?: string }) => {
    const keys = [...store.keys()]
      .filter(k => k.startsWith(prefix))
      .map(name => ({ name }));
    return { keys, list_complete: true, cursor: undefined };
  });

  return { store, get, put, delete: del, list };
}

// ── Env factory ────────────────────────────────────────────────────────────────

function makeEnv(kv: ReturnType<typeof makeMockKV>) {
  return {
    SOCIAL: kv as unknown as KVNamespace,
    FACEBOOK_PAGE_ID: 'fake-page-id',
    FACEBOOK_PAGE_TOKEN: 'fake-page-token',
    FACEBOOK_APP_TOKEN: 'fake-app-token',
    GRAPH_API_VERSION: 'v21.0',
    PUBLISH_SECRET: 'publish-secret',
    CLI_SECRET: 'cli-secret',
    CRON_SECRET: 'cron-secret',
  };
}

// ── Helper to call the sync endpoint ─────────────────────────────────────────

async function callSync(
  body: { hash: string; posts: unknown[] },
  env: ReturnType<typeof makeEnv>,
  secret = 'publish-secret',
) {
  const req = new Request('http://localhost/api/queue/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  return app.fetch(req, env);
}

// ── Sample post factories ──────────────────────────────────────────────────────

function makeIncomingPost(id: string, overrides: Partial<{
  message: string;
  scheduledAtEpoch: number;
}> = {}) {
  const epoch = overrides.scheduledAtEpoch ?? 1_800_000_000_000 + Math.random() * 1_000_000;
  return {
    id,
    type: 'text',
    message: overrides.message ?? `Post ${id}`,
    scheduledAt: new Date(epoch).toISOString(),
    scheduledAtEpoch: epoch,
  };
}

function makeQueuedPost(id: string, epoch: number, message = `Post ${id}`) {
  return JSON.stringify({
    id,
    platform: 'facebook',
    type: 'text',
    message,
    scheduledAt: new Date(epoch).toISOString(),
    scheduledAtEpoch: epoch,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/queue/sync', () => {
  it('returns 401 for missing auth', async () => {
    const kv = makeMockKV();
    const env = makeEnv(kv);
    const req = new Request('http://localhost/api/queue/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: 'abc', posts: [] }),
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(401);
  });

  it('skips sync when hash is unchanged', async () => {
    const kv = makeMockKV({ 'queue-hash': 'abc123' });
    const env = makeEnv(kv);
    const res = await callSync({ hash: 'abc123', posts: [] }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.unchanged).toBe(true);
    expect(body.hash).toBe('abc123');
    // No KV writes should occur
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('creates new posts from incoming JSON when KV is empty', async () => {
    const kv = makeMockKV();
    const env = makeEnv(kv);

    const posts = [
      makeIncomingPost('post-a'),
      makeIncomingPost('post-b'),
      makeIncomingPost('post-c'),
    ];

    const res = await callSync({ hash: 'new-hash', posts }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.created).toBe(3);
    expect(body.updated).toBe(0);
    expect(body.cancelled).toBe(0);

    // Verify the 3 queued keys + the hash key were written
    const putCalls = kv.put.mock.calls.map((c: unknown[]) => c[0] as string);
    const queuedPuts = putCalls.filter((k: string) => k.startsWith('post:queued:'));
    expect(queuedPuts).toHaveLength(3);
    expect(kv.store.get('queue-hash')).toBe('new-hash');
  });

  it('updates a queued post when its message changes', async () => {
    const epoch = 1_800_001_000_000;
    const kv = makeMockKV({
      [`post:queued:${epoch}:post-x`]: makeQueuedPost('post-x', epoch, 'Old message'),
    });
    const env = makeEnv(kv);

    const posts = [{ ...makeIncomingPost('post-x', { scheduledAtEpoch: epoch }), message: 'New message' }];
    const res = await callSync({ hash: 'hash-v2', posts }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.updated).toBe(1);
    expect(body.created).toBe(0);

    // The KV value should contain the updated message
    const stored = kv.store.get(`post:queued:${epoch}:post-x`);
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!).message).toBe('New message');
  });

  it('moves KV key when scheduledAtEpoch changes', async () => {
    const oldEpoch = 1_800_002_000_000;
    const newEpoch = 1_800_003_000_000;
    const kv = makeMockKV({
      [`post:queued:${oldEpoch}:post-y`]: makeQueuedPost('post-y', oldEpoch),
    });
    const env = makeEnv(kv);

    const posts = [makeIncomingPost('post-y', { scheduledAtEpoch: newEpoch })];
    const res = await callSync({ hash: 'hash-moved', posts }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.updated).toBe(1);

    // Old key must be deleted
    expect(kv.store.has(`post:queued:${oldEpoch}:post-y`)).toBe(false);
    // New key must exist
    expect(kv.store.has(`post:queued:${newEpoch}:post-y`)).toBe(true);
  });

  it('cancels queued posts that are missing from incoming', async () => {
    const epochs = [1_800_010_000_000, 1_800_020_000_000, 1_800_030_000_000];
    const initial: Record<string, string> = {};
    for (const [i, epoch] of epochs.entries()) {
      initial[`post:queued:${epoch}:post-${i}`] = makeQueuedPost(`post-${i}`, epoch);
    }
    const kv = makeMockKV(initial);
    const env = makeEnv(kv);

    // Only send 2 of the 3 posts
    const posts = [
      makeIncomingPost('post-0', { scheduledAtEpoch: epochs[0] }),
      makeIncomingPost('post-1', { scheduledAtEpoch: epochs[1] }),
    ];

    const res = await callSync({ hash: 'hash-cancel', posts }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.cancelled).toBe(1);

    // post-2 should have been deleted
    expect(kv.store.has(`post:queued:${epochs[2]}:post-2`)).toBe(false);
    // post-0 and post-1 should still exist
    expect(kv.store.has(`post:queued:${epochs[0]}:post-0`)).toBe(true);
    expect(kv.store.has(`post:queued:${epochs[1]}:post-1`)).toBe(true);
  });

  it('skips terminal posts and does not create them', async () => {
    const epoch = 1_800_040_000_000;
    // No queued entry, but idempotency record exists (post already published)
    const kv = makeMockKV({
      'idempotent:post-done': JSON.stringify({
        key: 'post-done',
        status: 'published',
        platformPostId: 'fb_999',
        completedAt: new Date().toISOString(),
        error: null,
      }),
    });
    const env = makeEnv(kv);

    const posts = [makeIncomingPost('post-done', { scheduledAtEpoch: epoch })];
    const res = await callSync({ hash: 'hash-terminal', posts }, env);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.skippedTerminal).toBe(1);
    expect(body.created).toBe(0);

    // No queued key should have been created
    const queuedKeys = [...kv.store.keys()].filter(k => k.startsWith('post:queued:'));
    expect(queuedKeys).toHaveLength(0);
  });

  it('accepts PUBLISH_SECRET for auth', async () => {
    const kv = makeMockKV();
    const env = makeEnv(kv);
    const res = await callSync({ hash: 'hash-pub', posts: [] }, env, 'publish-secret');
    expect(res.status).toBe(200);
  });

  it('accepts CLI_SECRET for auth', async () => {
    const kv = makeMockKV();
    const env = makeEnv(kv);
    const res = await callSync({ hash: 'hash-cli', posts: [] }, env, 'cli-secret');
    expect(res.status).toBe(200);
  });

  it('rejects a wrong secret', async () => {
    const kv = makeMockKV();
    const env = makeEnv(kv);
    const res = await callSync({ hash: 'hash-bad', posts: [] }, env, 'wrong-secret');
    expect(res.status).toBe(401);
  });
});
