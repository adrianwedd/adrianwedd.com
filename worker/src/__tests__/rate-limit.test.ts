import { describe, expect, it, vi } from 'vitest';
import app from '../index';
import type { RateLimiter } from '../env';

// The /api/* rate-limiting middleware (#473): 30 req/min per IP+path via the
// Workers ratelimit binding. Keyed on CF-Connecting-IP + pathname; fails open
// when the binding is absent so tests and misconfigured environments keep
// working (auth remains the primary control).

function makeEnv(limiter?: RateLimiter) {
  return {
    SOCIAL: { get: vi.fn(), put: vi.fn(), delete: vi.fn(), list: vi.fn() } as unknown as KVNamespace,
    CRON_LOCK: {} as unknown as DurableObjectNamespace,
    FACEBOOK_PAGE_ID: 'page_123',
    GRAPH_API_VERSION: 'v21.0',
    CRON_SECRET: 'test-cron-secret',
    PUBLISH_SECRET: 'test-publish-secret',
    CLI_SECRET: 'test-cli-secret',
    ...(limiter ? { API_RATE_LIMITER: limiter } : {}),
  };
}

function request(path = '/api/publish', ip = '203.0.113.9') {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer wrong-secret',
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
    },
    body: JSON.stringify({}),
  });
}

describe('/api/* rate limiting', () => {
  it('returns 429 with a JSON body when the limiter denies', async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const res = await app.fetch(request(), makeEnv({ limit }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited' });
  });

  it('rejects before auth runs — abusive traffic never reaches handlers', async () => {
    // Wrong bearer would normally 401; a denying limiter must win with 429.
    const limit = vi.fn().mockResolvedValue({ success: false });
    const res = await app.fetch(request(), makeEnv({ limit }));
    expect(res.status).toBe(429);
  });

  it('keys the budget on IP + path independently', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const env = makeEnv({ limit });
    await app.fetch(request('/api/publish', '203.0.113.9'), env);
    await app.fetch(request('/api/health', '203.0.113.9'), env);
    await app.fetch(request('/api/publish', '198.51.100.4'), env);
    expect(limit.mock.calls.map((c) => c[0].key)).toEqual([
      '203.0.113.9:/api/publish',
      '203.0.113.9:/api/health',
      '198.51.100.4:/api/publish',
    ]);
  });

  it('passes through to the route when the limiter allows', async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const res = await app.fetch(request(), makeEnv({ limit }));
    // Wrong bearer → the request reached the handler's auth check, not 429.
    expect(res.status).toBe(401);
  });

  it('fails open when the binding is absent', async () => {
    const res = await app.fetch(request(), makeEnv());
    expect(res.status).toBe(401);
  });
});
