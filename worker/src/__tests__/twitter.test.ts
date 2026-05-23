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
  // target, content moderation). Those must be per-post permanent failures so
  // the cron continues — marking them isAuthError would halt the run and
  // re-queue the post, creating an infinite poison-pill loop.
  it('treats 403 content/duplicate as permanent non-auth failure', async () => {
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

  // Codex/gemini/hermes High follow-up to C5: blanket "403 = permanent" loses
  // the operator signal for missing-scope / locked-account cases. The classifier
  // parses the v2 problem body and flags auth-shaped 403s as isAuthError so
  // the cron halts for manual attention.
  it.each([
    ['oauth1-permissions',          'https://api.twitter.com/2/problems/oauth1-permissions'],
    ['client-not-enrolled',         'https://api.twitter.com/2/problems/client-not-enrolled'],
    ['unsupported authentication',  'Unsupported Authentication: cannot use OAuth1 with this endpoint'],
    ['write permissions',           'Your app does not have write permissions'],
    ['not permitted to perform',    'You are not permitted to perform this action'],
    ['your account is temporarily', 'Your account is temporarily locked'],
    ['app is suspended',            'This app is suspended'],
  ])('classifies 403 mentioning %s as auth/scope (halts cron)', async (_label, body) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(body, { status: 403 }));
    const result = await createTwitterPlatform(creds).publishPost(makePost());
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
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
