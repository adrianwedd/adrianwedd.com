import { Hono } from 'hono';
import type { Env } from './env';
import { verifyBearer } from './auth';
import { createFacebookPlatform } from './platforms/facebook';
import type { SocialPost, IdempotencyRecord } from './platforms/types';
import { processComments } from './cron/comments';

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

// ── POST /api/publish ─────────────────────────────────────────────────────────

app.post('/api/publish', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform: string;
    type: string;
    message: string;
    link?: string;
    imageUrl?: string;
    backdatedTime?: string;
    idempotencyKey: string;
  }>();

  // Check durable idempotency record
  const existingRaw = await env.SOCIAL.get(`idempotent:${body.idempotencyKey}`);
  if (existingRaw) {
    const existing: IdempotencyRecord = JSON.parse(existingRaw);
    if (existing.status === 'published') {
      return json({ alreadyPublished: true, platformPostId: existing.platformPostId });
    }
    return json({ alreadyFailed: true, error: existing.error });
  }

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  const post: SocialPost = {
    id: body.idempotencyKey,
    platform: 'facebook',
    type: body.type as SocialPost['type'],
    message: body.message,
    link: body.link,
    imageUrl: body.imageUrl,
    backdatedTime: body.backdatedTime,
    scheduledAt: new Date().toISOString(),
    scheduledAtEpoch: Date.now(),
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  const result = await fb.publishPost(post);

  // Write durable idempotency record (30-day TTL)
  const record: IdempotencyRecord = {
    key: body.idempotencyKey,
    status: result.success ? 'published' : 'failed',
    platformPostId: result.platformPostId ?? null,
    completedAt: new Date().toISOString(),
    error: result.error ?? null,
  };
  await env.SOCIAL.put(`idempotent:${body.idempotencyKey}`, JSON.stringify(record), {
    expirationTtl: 30 * 24 * 60 * 60,
  });

  if (result.success) {
    return json({ published: true, platformPostId: result.platformPostId });
  }

  const status = result.isAuthError ? 503 : result.isTransient ? 502 : 422;
  return json({ published: false, error: result.error, isTransient: result.isTransient }, status);
});

// ── POST /api/queue ───────────────────────────────────────────────────────────

app.post('/api/queue', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform: string;
    type: string;
    message: string;
    scheduledAt: string;
    link?: string;
    imageUrl?: string;
  }>();

  const epoch = new Date(body.scheduledAt).getTime();
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return json({ error: 'Invalid scheduledAt — must be valid ISO 8601 datetime' }, 400);
  }
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const id = `adhoc-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

  const post: SocialPost = {
    id,
    platform: 'facebook',
    type: body.type as SocialPost['type'],
    message: body.message,
    link: body.link,
    imageUrl: body.imageUrl,
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
      type: string;
      message: string;
      link?: string;
      imageUrl?: string;
      scheduledAt: string;
      scheduledAtEpoch: number;
    }>;
  }>();

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
        platform: 'facebook',
        type: incoming.type as SocialPost['type'],
        message: incoming.message,
        link: incoming.link,
        imageUrl: incoming.imageUrl,
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

  // Cron lock
  const cronLock = await env.SOCIAL.get('cron-lock:publish');
  if (cronLock) return json({ skipped: true, reason: 'locked' });
  await env.SOCIAL.put('cron-lock:publish', '1', { expirationTtl: 300 });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  try {
    // Token health
    const tokenHealth = await fb.debugAuth();
    if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
      console.error('Facebook data access has expired');
      return json({ error: 'Facebook data access expired' }, 503);
    }
    if (tokenHealth.daysUntilExpiry <= 7) {
      console.error(`Facebook data access expires in ${tokenHealth.daysUntilExpiry} days — URGENT`);
    } else if (tokenHealth.daysUntilExpiry <= 14) {
      console.warn(`Facebook data access expires in ${tokenHealth.daysUntilExpiry} days`);
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

    let published = 0;
    let failed = 0;

    for (const { key, post } of duePosts.slice(0, 5)) {
      // Check idempotency
      const existing = await env.SOCIAL.get(`idempotent:${post.id}`);
      if (existing) {
        await env.SOCIAL.delete(key); // Clean up stale queued key
        continue;
      }

      // Move to publishing state (optimistic lock)
      await env.SOCIAL.put(`post:publishing:${post.scheduledAtEpoch}:${post.id}`, JSON.stringify({ ...post, status: 'publishing' }));
      await env.SOCIAL.delete(key);

      const result = await fb.publishPost(post);

      if (result.success) {
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
        await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
          key: post.id, status: 'published',
          platformPostId: result.platformPostId ?? null,
          completedAt: new Date().toISOString(), error: null,
        }), { expirationTtl: 30 * 24 * 60 * 60 });
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        published++;
      } else if (result.isAuthError) {
        // Revert to queued
        await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        console.error(`Facebook token invalid — halting run`);
        return json({ error: 'Token invalid', published, failed, tokenExpiresInDays: tokenHealth.daysUntilExpiry }, 503);
      } else if (result.isTransient) {
        // Revert to queued
        await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        console.warn(`Transient error for ${post.id}: ${result.error} — skipping remaining`);
        break; // Spec: skip remaining posts on transient error
      } else {
        const failedPost: SocialPost = { ...post, status: 'failed', error: result.error ?? 'Unknown' };
        await env.SOCIAL.put(`post:failed:${post.id}`, JSON.stringify(failedPost));
        await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
          key: post.id, status: 'failed',
          platformPostId: null,
          completedAt: new Date().toISOString(), error: result.error ?? 'Unknown',
        }), { expirationTtl: 30 * 24 * 60 * 60 });
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        failed++;
      }
    }

    const remaining = Math.max(0, duePosts.length - 5);
    if (remaining > 10) console.error(`Post queue backlog: ${remaining}`);
    else if (remaining > 0) console.warn(`${remaining} posts still queued`);

    return json({ published, failed, remaining, tokenExpiresInDays: tokenHealth.daysUntilExpiry });
  } finally {
    await env.SOCIAL.delete('cron-lock:publish');
  }
});

// ── POST /api/cron/comments ───────────────────────────────────────────────────

app.post('/api/cron/comments', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET);
  if (!authOk) return unauthorized();

  const cronLock = await env.SOCIAL.get('cron-lock:comments');
  if (cronLock) return json({ skipped: true, reason: 'locked' });
  await env.SOCIAL.put('cron-lock:comments', '1', { expirationTtl: 300 });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  try {
    const tokenHealth = await fb.debugAuth();
    if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
      return json({ error: 'Facebook data access expired' }, 503);
    }

    const result = await processComments(fb, env.SOCIAL);

    return json({ ...result, tokenExpiresInDays: tokenHealth.daysUntilExpiry });
  } finally {
    await env.SOCIAL.delete('cron-lock:comments');
  }
});

// ── GET /api/health ───────────────────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);

  if (!authOk) return json({ ok: true });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);
  const authStatus = await fb.debugAuth();

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
    platforms: {
      facebook: {
        tokenValid: authStatus.valid,
        dataAccessExpiresAt: authStatus.dataAccessExpiresAt,
        daysUntilExpiry: authStatus.daysUntilExpiry,
      },
    },
    queue: { facebook: { queued, published, failed, nextScheduled } },
    recentActivity: { flaggedComments },
  });
});

export default app;
