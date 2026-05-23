import { Hono } from 'hono';
import type { Env } from './env';
import { verifyBearer } from './auth';
import { createPlatform, getConfiguredPlatforms } from './platforms/factory';
import type { SocialPost, IdempotencyRecord, Platform } from './platforms/types';
import { processComments } from './cron/comments';
import { CronLock } from './cron-lock';

export { CronLock };

const app = new Hono<{ Bindings: Env }>();

// ── Auth helpers ──────────────────────────────────────────────────────────────

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_PLATFORMS = new Set<string>(['facebook', 'instagram', 'bluesky', 'twitter']);

function validatePlatform(raw: string | undefined, fallback = 'facebook'): Platform | null {
  const name = raw ?? fallback;
  return VALID_PLATFORMS.has(name) ? name as Platform : null;
}

// CronLock DO stub shape. The cast lived in three places before; extracted
// here so an interface change is a one-line edit.
type CronLockStub = DurableObjectStub & {
  tryAcquire(name: string, ttlMs: number): Promise<{ acquired: boolean; token: string | null }>;
  release(name: string, token: string): Promise<void>;
};

function lockStubFor(env: Env, name: string): CronLockStub {
  return env.CRON_LOCK.get(env.CRON_LOCK.idFromName(name)) as CronLockStub;
}

// H7 — idempotencyKey is typed as required but had no runtime check. Missing
// or empty values yielded shared lock/KV names like `publish:undefined` and
// `idempotent:undefined`, so unrelated authenticated publishes could collide
// or suppress each other. Reject anything that isn't a non-empty string under
// 256 bytes (KV keys cap at 512 incl. the prefix, leave headroom for the
// `idempotent:` prefix + future suffixes).
function validateIdempotencyKey(key: unknown): string | null {
  if (typeof key !== 'string') return null;
  if (key.length === 0 || key.length > 256) return null;
  // URL-safe alphabet plus common separators (commit hashes, ISO dates, paths
  // like "blog/foo"). Excludes spaces, control chars, and `..` (the latter is
  // not exploitable against KV but signals a malformed key — better to reject
  // and surface the bug than accept a footgun).
  if (!/^[A-Za-z0-9._:/-]+$/.test(key)) return null;
  if (key.includes('..')) return null;
  return key;
}

// ── POST /api/publish ─────────────────────────────────────────────────────────

app.post('/api/publish', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform?: string;
    type: string;
    message: string;
    link?: string;
    imageUrl?: string;
    videoUrl?: string;
    youtubeUrl?: string;
    backdatedTime?: string;
    idempotencyKey: string;
    forceRetry?: boolean;
  }>();

  const platform = validatePlatform(body.platform);
  if (!platform) return json({ error: `Unsupported platform: ${body.platform}` }, 400);

  const idempotencyKey = validateIdempotencyKey(body.idempotencyKey);
  if (!idempotencyKey) {
    return json({ error: 'idempotencyKey must be a non-empty string under 256 chars, URL-safe alphabet' }, 400);
  }

  // Serialise the read-decide-publish sequence per idempotency key via the
  // CronLock DO. Without this, two concurrent forceRetry calls for the same
  // key can both observe the failed record, both delete it, and both publish.
  //
  // TTL: 300s (5 minutes). Bluesky video pipeline polls up to 25s + media
  // fetch + encoding can push close to a minute. The earlier 60s TTL gave a
  // realistic race window where the lock expired mid-publish and a concurrent
  // forceRetry could re-enter. Matches the cron-wide lock TTL.
  const publishLockName = `publish:${idempotencyKey}`;
  const publishLockStub = lockStubFor(env, publishLockName);
  const { acquired: publishAcquired, token: publishToken } = await publishLockStub.tryAcquire(publishLockName, 300_000);
  if (!publishAcquired || !publishToken) {
    return json({ error: 'A publish is already in progress for this idempotencyKey' }, 409);
  }

  try {
    // Check durable idempotency record. `published` records always block a
    // retry (prevents double-posting); `failed` records can be bypassed with
    // forceRetry.
    const existingRaw = await env.SOCIAL.get(`idempotent:${idempotencyKey}`);
    if (existingRaw) {
      const existing: IdempotencyRecord = JSON.parse(existingRaw);
      if (existing.status === 'published') {
        return json({ alreadyPublished: true, platformPostId: existing.platformPostId });
      }
      if (!body.forceRetry) {
        return json({ alreadyFailed: true, error: existing.error });
      }
      // forceRetry: clear the failed record so the publish below can proceed
      // and write a fresh idempotency entry on completion.
      await env.SOCIAL.delete(`idempotent:${idempotencyKey}`);
    }

    const adapter = createPlatform(platform, env);

    const post: SocialPost = {
      id: idempotencyKey,
      platform,
      type: body.type as SocialPost['type'],
      message: body.message,
      link: body.link,
      imageUrl: body.imageUrl,
      videoUrl: body.videoUrl,
      youtubeUrl: body.youtubeUrl,
      backdatedTime: body.backdatedTime,
      scheduledAt: new Date().toISOString(),
      scheduledAtEpoch: Date.now(),
      status: 'queued',
      publishedId: null,
      publishedAt: null,
      error: null,
    };

    const result = await adapter.publishPost(post);

    // Write durable idempotency record. H5: failed records carry a shorter
    // (7d) TTL than published (30d) so a misclassified transient error
    // auto-expires instead of blocking the post for a month.
    const record: IdempotencyRecord = {
      key: idempotencyKey,
      status: result.success ? 'published' : 'failed',
      platformPostId: result.platformPostId ?? null,
      completedAt: new Date().toISOString(),
      error: result.error ?? null,
    };
    await env.SOCIAL.put(`idempotent:${idempotencyKey}`, JSON.stringify(record), {
      expirationTtl: result.success ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    });

    if (result.success) {
      return json({ published: true, platformPostId: result.platformPostId });
    }

    const status = result.isAuthError ? 503 : result.isTransient ? 502 : 422;
    return json({ published: false, error: result.error, isTransient: result.isTransient }, status);
  } finally {
    await publishLockStub.release(publishLockName, publishToken).catch(e =>
      console.error(`Publish lock release failed for ${idempotencyKey}: ${e instanceof Error ? e.message : String(e)}`),
    );
  }
});

// ── POST /api/queue ───────────────────────────────────────────────────────────

app.post('/api/queue', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform?: string;
    type: string;
    message: string;
    scheduledAt: string;
    link?: string;
    imageUrl?: string;
    videoUrl?: string;
    youtubeUrl?: string;
  }>();

  const platform = validatePlatform(body.platform);
  if (!platform) return json({ error: `Unsupported platform: ${body.platform}` }, 400);

  const epoch = new Date(body.scheduledAt).getTime();
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return json({ error: 'Invalid scheduledAt — must be valid ISO 8601 datetime' }, 400);
  }
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const id = `adhoc-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

  const post: SocialPost = {
    id,
    platform,
    type: body.type as SocialPost['type'],
    message: body.message,
    link: body.link,
    imageUrl: body.imageUrl,
    videoUrl: body.videoUrl,
    youtubeUrl: body.youtubeUrl,
    scheduledAt: body.scheduledAt,
    scheduledAtEpoch: epoch,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  const kvKey = `post:queued:${epoch}:${id}`;
  await env.SOCIAL.put(kvKey, JSON.stringify(post));

  return json({ id, scheduledAt: body.scheduledAt, kvKey });
});

// ── POST /api/queue/sync ──────────────────────────────────────────────────────

app.post('/api/queue/sync', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    hash: string;
    posts: Array<{
      id: string;
      platform?: string;
      type: string;
      message: string;
      link?: string;
      imageUrl?: string;
      videoUrl?: string;
    youtubeUrl?: string;
      scheduledAt: string;
      scheduledAtEpoch: number;
    }>;
  }>();

  // Validate platforms in incoming posts
  for (const p of body.posts) {
    if (p.platform && !validatePlatform(p.platform)) {
      return json({ error: `Unsupported platform: ${p.platform}` }, 400);
    }
  }

  const existingHash = await env.SOCIAL.get('queue-hash');
  if (existingHash === body.hash) {
    return json({ unchanged: true, hash: body.hash });
  }

  // Build map of incoming posts by ID
  const incomingById = new Map(body.posts.map(p => [p.id, p]));

  // Scan all queued posts in KV
  const kvQueued = new Map<string, { key: string; post: SocialPost }>();
  let cursor: string | undefined;
  do {
    const list = await env.SOCIAL.list({ prefix: 'post:queued:', limit: 100, ...(cursor ? { cursor } : {}) });
    for (const key of list.keys) {
      const raw = await env.SOCIAL.get(key.name);
      if (!raw) continue;
      try {
        const post: SocialPost = JSON.parse(raw);
        kvQueued.set(post.id, { key: key.name, post });
      } catch { /* skip corrupt */ }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  let created = 0;
  let updated = 0;
  let cancelled = 0;
  let skippedTerminal = 0;

  // Create or update from incoming
  for (const [id, incoming] of incomingById) {
    const existing = kvQueued.get(id);

    if (!existing) {
      // Check if this post already reached terminal state
      const idempotent = await env.SOCIAL.get(`idempotent:${id}`);
      if (idempotent) {
        skippedTerminal++;
        continue;
      }
      // Create new queued post
      const post: SocialPost = {
        id,
        platform: validatePlatform(incoming.platform) ?? ('facebook' as Platform),
        type: incoming.type as SocialPost['type'],
        message: incoming.message,
        link: incoming.link,
        imageUrl: incoming.imageUrl,
        videoUrl: incoming.videoUrl,
        youtubeUrl: incoming.youtubeUrl,
        scheduledAt: incoming.scheduledAt,
        scheduledAtEpoch: incoming.scheduledAtEpoch,
        status: 'queued',
        publishedId: null,
        publishedAt: null,
        error: null,
      };
      await env.SOCIAL.put(`post:queued:${incoming.scheduledAtEpoch}:${id}`, JSON.stringify(post));
      created++;
    } else {
      // Update queued post (only if still queued)
      const updatedPost: SocialPost = {
        ...existing.post,
        message: incoming.message,
        type: incoming.type as SocialPost['type'],
        link: incoming.link,
        imageUrl: incoming.imageUrl,
        videoUrl: incoming.videoUrl,
        youtubeUrl: incoming.youtubeUrl,
        scheduledAt: incoming.scheduledAt,
        scheduledAtEpoch: incoming.scheduledAtEpoch,
      };
      // If epoch changed, need to move the key
      const newKey = `post:queued:${incoming.scheduledAtEpoch}:${id}`;
      if (newKey !== existing.key) {
        await env.SOCIAL.delete(existing.key);
      }
      await env.SOCIAL.put(newKey, JSON.stringify(updatedPost));
      updated++;
    }
  }

  // Cancel queued posts missing from incoming
  for (const [id, { key }] of kvQueued) {
    if (!incomingById.has(id)) {
      await env.SOCIAL.delete(key);
      cancelled++;
    }
  }

  await env.SOCIAL.put('queue-hash', body.hash);

  return json({ created, updated, cancelled, skippedTerminal, hash: body.hash });
});

// ── POST /api/cron/publish ────────────────────────────────────────────────────

app.post('/api/cron/publish', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET);
  if (!authOk) return unauthorized();

  // Cron lock — atomic via Durable Object (prevents KV TOCTOU race)
  const lockStub = lockStubFor(env, 'publish');
  const { acquired, token: lockToken } = await lockStub.tryAcquire('publish', 300_000);
  if (!acquired || !lockToken) return json({ skipped: true, reason: 'locked' });

  try {
    // Token health — check all configured platforms; skip unhealthy ones rather than halting all
    const tokenExpiryByPlatform: Record<string, number> = {};
    const blockedPlatforms = new Set<Platform>();
    for (const platformName of getConfiguredPlatforms(env)) {
      const adapter = createPlatform(platformName, env);
      const tokenHealth = await adapter.debugAuth();
      tokenExpiryByPlatform[platformName] = tokenHealth.daysUntilExpiry;
      if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
        console.error(`${platformName} auth invalid — skipping posts for this platform`);
        blockedPlatforms.add(platformName);
      } else if (tokenHealth.daysUntilExpiry <= 7) {
        console.error(`${platformName} token expires in ${tokenHealth.daysUntilExpiry} days — URGENT`);
      } else if (tokenHealth.daysUntilExpiry <= 14) {
        console.warn(`${platformName} token expires in ${tokenHealth.daysUntilExpiry} days`);
      }
    }

    // Discover queued posts
    const duePosts: Array<{ key: string; post: SocialPost }> = [];
    let cursor: string | undefined;
    do {
      const list = await env.SOCIAL.list({ prefix: 'post:queued:', limit: 100, ...(cursor ? { cursor } : {}) });
      for (const key of list.keys) {
        const raw = await env.SOCIAL.get(key.name);
        if (!raw) continue;
        try {
          const post: SocialPost = JSON.parse(raw);
          if (post.scheduledAtEpoch <= Date.now()) {
            duePosts.push({ key: key.name, post });
          }
        } catch { continue; }
      }
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    duePosts.sort((a, b) => a.post.scheduledAtEpoch - b.post.scheduledAtEpoch);

    // Filter out posts for blocked platforms BEFORE applying the 5-post batch cap, so a
    // single expired platform can't starve healthy ones out of their share of the batch.
    const skippedBlocked = duePosts.filter(({ post }) => blockedPlatforms.has(post.platform));
    for (const { post } of skippedBlocked) {
      console.warn(`Skipping post ${post.id} — ${post.platform} auth is invalid`);
    }
    const processable = duePosts.filter(({ post }) => !blockedPlatforms.has(post.platform));

    let published = 0;
    let failed = 0;
    // Set when the catch block fails to restore queue state. Forces a non-2xx
    // response so monitoring catches the KV outage instead of seeing 'healthy cron'.
    let restoreFailures = 0;
    // Set when a post-success KV write fails. We intentionally leave the
    // `post:publishing:` orphan in place rather than risk double-publishing.
    let orphanedAfterSuccess = 0;

    for (const { key, post } of processable.slice(0, 5)) {
      // C1 — Per-post publish lock. The cron run and an ad-hoc /api/publish call
      // can race on the same post.id (e.g. a manual retry triggered while cron
      // is mid-run). /api/publish takes `publish:<idempotencyKey>` where the
      // caller is REQUIRED to use the post's id as the key when retrying queued
      // posts (the social-autopublish workflow and CLI `fb-post.sh` both do).
      // Cron takes `publish:${post.id}`, so both paths serialise on the same DO
      // instance. If the lock is held, skip — the holder is publishing it.
      //
      // TTL: 5 minutes. Bluesky's video pipeline alone polls for up to 25s
      // (bluesky.ts uploadVideo deadline) plus media fetch + encoding. 60s
      // gave a realistic race window where the lock could expire mid-publish
      // and let a concurrent forceRetry double-post. 300s comfortably covers
      // the worst case and matches the cron-wide lock TTL.
      const perPostLockName = `publish:${post.id}`;
      const perPostLockStub = lockStubFor(env, perPostLockName);
      const { acquired: perPostAcquired, token: perPostToken } = await perPostLockStub.tryAcquire(perPostLockName, 300_000);
      if (!perPostAcquired || !perPostToken) {
        console.warn(`Skipping post ${post.id} — concurrent publisher holds per-post lock`);
        continue;
      }

      // C2 — Phase-tracked orphan recovery. The catch below restores `post:queued:`
      // ONLY if the external publish hasn't yet succeeded. Without phase tracking,
      // a post-success KV write failure (e.g. transient KV outage between
      // platform.publishPost returning success and `post:published:` write)
      // would restore the queued key and the next cron tick would re-publish
      // the same content to the platform — exactly the duplicate the lock was
      // supposed to prevent. Cross-confirmed by codex/gemini/hermes.
      let externalPublishSucceeded = false;
      try {
        // Check idempotency
        const existing = await env.SOCIAL.get(`idempotent:${post.id}`);
        if (existing) {
          await env.SOCIAL.delete(key); // Clean up stale queued key
          continue;
        }

        // Move to publishing state (optimistic lock)
        await env.SOCIAL.put(`post:publishing:${post.scheduledAtEpoch}:${post.id}`, JSON.stringify({ ...post, status: 'publishing' }));
        await env.SOCIAL.delete(key);

        const postAdapter = createPlatform(post.platform, env);
        const result = await postAdapter.publishPost(post);
        externalPublishSucceeded = result.success;

        if (result.success) {
          // Write the durable `idempotent:` record FIRST so that even if the
          // `post:published:` write or the `post:publishing:` cleanup throws,
          // any subsequent retry sees `alreadyPublished` and bails out.
          await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
            key: post.id, status: 'published',
            platformPostId: result.platformPostId ?? null,
            completedAt: new Date().toISOString(), error: null,
          }), { expirationTtl: 30 * 24 * 60 * 60 });
          const publishedPost: SocialPost = {
            ...post,
            status: 'published',
            publishedId: result.platformPostId ?? null,
            publishedAt: new Date().toISOString(),
          };
          await env.SOCIAL.put(
            `post:published:${post.scheduledAtEpoch}:${post.id}`,
            JSON.stringify(publishedPost),
            { expirationTtl: 180 * 24 * 60 * 60 },
          );
          await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
          published++;
        } else if (result.isAuthError) {
          // Revert to queued
          await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
          await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
          console.error(`${post.platform} token invalid — halting run`);
          return json({ error: 'Token invalid', published, failed, tokenExpiresInDays: tokenExpiryByPlatform }, 503);
        } else if (result.isTransient) {
          // Revert to queued
          await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
          await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
          console.warn(`Transient error for ${post.id}: ${result.error} — skipping remaining`);
          break; // Spec: skip remaining posts on transient error
        } else {
          const failedPost: SocialPost = { ...post, status: 'failed', error: result.error ?? 'Unknown' };
          await env.SOCIAL.put(`post:failed:${post.id}`, JSON.stringify(failedPost));
          // H5 — Failed records previously held the queue for 30 days (same TTL
          // as published records). A misclassified transient error (e.g.
          // worker treated a rate-limit-adjacent 422 as permanent) blocked any
          // re-publish for a month without forceRetry. 7d is long enough to
          // catch the obvious retry attempts but short enough to auto-expire.
          await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
            key: post.id, status: 'failed',
            platformPostId: null,
            completedAt: new Date().toISOString(), error: result.error ?? 'Unknown',
          }), { expirationTtl: 7 * 24 * 60 * 60 });
          await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
          failed++;
        }
      } catch (err) {
        console.error(`Unhandled error publishing ${post.id}: ${err instanceof Error ? err.message : String(err)}`);
        if (externalPublishSucceeded) {
          // The external publish ALREADY HAPPENED. Restoring the queued key
          // would cause the next cron tick to publish the same content again
          // (the `idempotent:` write may also have failed, so we can't rely on
          // that to dedupe). Leave the `post:publishing:` key as an orphan;
          // a future recovery sweep can reconcile it from the platform's API.
          // Bumping `orphanedAfterSuccess` flips the response to 500 so this
          // doesn't silently look like a healthy cron run.
          orphanedAfterSuccess++;
          console.error(`Post ${post.id} published externally but state persistence failed — leaving publishing key for manual reconciliation`);
        } else {
          // Pre-publish failure — safe to restore queued state for retry.
          try {
            await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
            await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
          } catch (restoreErr) {
            restoreFailures++;
            console.error(`Post-restore failed for ${post.id}: ${restoreErr instanceof Error ? restoreErr.message : String(restoreErr)}`);
          }
        }
        // Don't rethrow — let the loop continue with subsequent posts. The
        // outer try/finally will still release the cron-wide lock.
      } finally {
        await perPostLockStub.release(perPostLockName, perPostToken).catch(e =>
          console.error(`Per-post lock release failed for ${post.id}: ${e instanceof Error ? e.message : String(e)}`),
        );
      }
    }

    const remaining = Math.max(0, processable.length - 5) + skippedBlocked.length;
    if (remaining > 10) console.error(`Post queue backlog: ${remaining}`);
    else if (remaining > 0) console.warn(`${remaining} posts still queued`);

    // Surface infrastructure failures as 5xx so monitoring catches them.
    // restoreFailures = catch-path KV write failed (post is lost).
    // orphanedAfterSuccess = external publish succeeded but state persistence
    // failed (intentionally not retried to avoid double-publish; needs
    // manual reconciliation of the `post:publishing:` orphan).
    const responseBody = { published, failed, remaining, tokenExpiresInDays: tokenExpiryByPlatform, restoreFailures, orphanedAfterSuccess };
    if (restoreFailures > 0 || orphanedAfterSuccess > 0) {
      return json(responseBody, 500);
    }
    return json(responseBody);
  } finally {
    await lockStub.release('publish', lockToken).catch(e =>
      console.error(`Cron publish lock release failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }
});

// ── POST /api/cron/comments ───────────────────────────────────────────────────

app.post('/api/cron/comments', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET);
  if (!authOk) return unauthorized();

  const commentsLockStub = lockStubFor(env, 'comments');
  const { acquired: commentsAcquired, token: commentsToken } = await commentsLockStub.tryAcquire('comments', 300_000);
  if (!commentsAcquired || !commentsToken) return json({ skipped: true, reason: 'locked' });

  try {
    // Process comments for each configured platform
    const platformResults: Record<string, unknown> = {};

    for (const platformName of getConfiguredPlatforms(env)) {
      const adapter = createPlatform(platformName, env);
      const tokenHealth = await adapter.debugAuth();
      if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
        // Mirror the publish-cron behaviour: skip the bad platform and continue with others.
        console.error(`${platformName} data access expired — skipping comments for this platform`);
        platformResults[platformName] = { error: 'data access expired', tokenExpiresInDays: tokenHealth.daysUntilExpiry };
        continue;
      }

      const result = await processComments(adapter, env.SOCIAL);
      platformResults[platformName] = { ...result, tokenExpiresInDays: tokenHealth.daysUntilExpiry };
    }

    // For backward compatibility, spread Facebook results at the top level
    const fbResult = platformResults.facebook as Record<string, unknown> | undefined;
    return json({ ...fbResult, platforms: platformResults });
  } finally {
    await commentsLockStub.release('comments', commentsToken).catch(e =>
      console.error(`Cron comments lock release failed: ${e instanceof Error ? e.message : String(e)}`),
    );
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);

  if (!authOk) return json({ ok: true });

  // Check auth status for each configured platform
  const platformsHealth: Record<string, unknown> = {};
  for (const platformName of getConfiguredPlatforms(env)) {
    const adapter = createPlatform(platformName, env);
    const authStatus = await adapter.debugAuth();
    platformsHealth[platformName] = {
      tokenValid: authStatus.valid,
      dataAccessExpiresAt: authStatus.dataAccessExpiresAt,
      daysUntilExpiry: authStatus.daysUntilExpiry,
    };
  }

  // Count posts by status
  let queued = 0;
  let published = 0;
  let failed = 0;
  let nextScheduled: string | null = null;

  for (const prefix of ['post:queued:', 'post:published:', 'post:failed:']) {
    let listCursor: string | undefined;
    do {
      const list = await env.SOCIAL.list({ prefix, limit: 100, ...(listCursor ? { cursor: listCursor } : {}) });
      if (prefix === 'post:queued:') {
        queued += list.keys.length;
        // Find next scheduled (keys are time-ordered)
        if (!nextScheduled && list.keys.length > 0) {
          const raw = await env.SOCIAL.get(list.keys[0].name);
          if (raw) {
            try { nextScheduled = JSON.parse(raw).scheduledAt; } catch {}
          }
        }
      }
      else if (prefix === 'post:published:') published += list.keys.length;
      else failed += list.keys.length;
      listCursor = list.list_complete ? undefined : list.cursor;
    } while (listCursor);
  }

  // Count flagged comments
  let flaggedComments = 0;
  let flagCursor: string | undefined;
  do {
    const list = await env.SOCIAL.list({ prefix: 'fb-flag:', limit: 100, ...(flagCursor ? { cursor: flagCursor } : {}) });
    flaggedComments += list.keys.length;
    flagCursor = list.list_complete ? undefined : list.cursor;
  } while (flagCursor);

  return json({
    platforms: platformsHealth,
    queue: { facebook: { queued, published, failed, nextScheduled } },
    recentActivity: { flaggedComments },
  });
});

export default app;
