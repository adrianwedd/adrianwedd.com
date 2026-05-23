import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTwitterPlatform } from '../platforms/twitter';
import type { SocialPost } from '../platforms/types';

const creds = {
  apiKey: 'k', apiKeySecret: 'ks',
  accessToken: 'at', accessTokenSecret: 'ats',
};

function makePost(): SocialPost {
  return {
    id: 'tw-test',
    platform: 'twitter',
    type: 'text',
    message: 'Hello world',
    scheduledAt: new Date().toISOString(),
    scheduledAtEpoch: Date.now(),
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('Twitter publishPost — response classification', () => {
  it('treats 401 as an auth error (cron halts and re-queues)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
    expect(result.isTransient).toBe(false);
  });

  // C5 — Twitter v2 returns 403 for content violations (duplicate tweet, blocked
  // target, content moderation, missing scope, etc.). Classifying those as
  // isAuthError causes the cron to halt the run AND re-queue the post — next
  // tick the same 403 fires again, creating an infinite poison pill that
  // permanently blocks all subsequent posts. 403 must be a per-post permanent
  // failure so the cron continues and the post moves to post:failed:.
  it('treats 403 as permanent non-auth failure (not a poison pill)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ title: 'Forbidden', detail: 'Duplicate content' }),
      { status: 403 },
    ));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(false); // <-- the critical assertion
    expect(result.isTransient).toBe(false);
    expect(result.error).toContain('403');
  });

  it('treats 429 as transient (retry on next tick)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Rate limited', { status: 429 }));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.isAuthError).toBe(false);
  });

  it('treats 5xx as transient', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Server error', { status: 503 }));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.isAuthError).toBe(false);
  });

  it('returns success on 201 with the tweet id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ data: { id: '1234567890' } }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    ));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('1234567890');
  });
});

describe('Twitter debugAuth', () => {
  it('reports valid when /users/me returns 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ data: { id: 'u1' } }), { status: 200 },
    ));
    const status = await createTwitterPlatform(creds).debugAuth();
    expect(status.valid).toBe(true);
  });

  it('reports invalid on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('nope', { status: 401 }));
    const status = await createTwitterPlatform(creds).debugAuth();
    expect(status.valid).toBe(false);
  });
});
