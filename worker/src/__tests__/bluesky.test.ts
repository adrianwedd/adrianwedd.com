import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBlueskyPlatform, detectFacets } from '../platforms/bluesky';
import type { SocialPost } from '../platforms/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const SESSION_RESPONSE = {
  ok: true,
  json: async () => ({ did: 'did:plc:abc123', accessJwt: 'jwt-token-123' }),
};

const basePost: SocialPost = {
  id: 'test-001',
  platform: 'bluesky',
  type: 'text',
  message: 'Hello Bluesky',
  scheduledAt: '2026-04-01T09:00:00+10:00',
  scheduledAtEpoch: 1774850400000,
  status: 'queued',
  publishedId: null,
  publishedAt: null,
  error: null,
};

// ---------------------------------------------------------------------------
// detectFacets
// ---------------------------------------------------------------------------
describe('detectFacets', () => {
  it('detects a URL with correct byte offsets', () => {
    const text = 'Check https://example.com out';
    const facets = detectFacets(text);
    expect(facets).toHaveLength(1);

    const encoder = new TextEncoder();
    const byteStart = encoder.encode('Check ').byteLength;
    const byteEnd = byteStart + encoder.encode('https://example.com').byteLength;

    expect(facets[0].index.byteStart).toBe(byteStart);
    expect(facets[0].index.byteEnd).toBe(byteEnd);
    expect(facets[0].features[0].$type).toBe('app.bsky.richtext.facet#link');
    expect(facets[0].features[0].uri).toBe('https://example.com');
  });

  it('returns empty array for text without URLs', () => {
    expect(detectFacets('Just some plain text')).toHaveLength(0);
  });

  it('detects multiple URLs', () => {
    const text = 'Visit https://a.com and http://b.com today';
    const facets = detectFacets(text);
    expect(facets).toHaveLength(2);
    expect(facets[0].features[0].uri).toBe('https://a.com');
    expect(facets[1].features[0].uri).toBe('http://b.com');
  });

  it('handles Unicode text before URL with correct byte offsets', () => {
    // Emoji is multi-byte: 4 bytes for a simple emoji
    const text = '🎉 https://example.com';
    const facets = detectFacets(text);
    expect(facets).toHaveLength(1);

    const encoder = new TextEncoder();
    const byteStart = encoder.encode('🎉 ').byteLength;
    expect(facets[0].index.byteStart).toBe(byteStart);
  });
});

// ---------------------------------------------------------------------------
// publishPost
// ---------------------------------------------------------------------------
describe('Bluesky publishPost', () => {
  const bsky = createBlueskyPlatform('adrian.bsky.social', 'app-password-123');

  it('publishes a text post', async () => {
    // Login
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    // createRecord
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: 'at://did:plc:abc123/app.bsky.feed.post/abc', cid: 'cid123' }),
    });

    const result = await bsky.publishPost(basePost);
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('at://did:plc:abc123/app.bsky.feed.post/abc');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify login call
    const [loginUrl, loginOpts] = mockFetch.mock.calls[0];
    expect(loginUrl).toContain('com.atproto.server.createSession');
    expect(loginOpts.method).toBe('POST');
    const loginBody = JSON.parse(loginOpts.body as string);
    expect(loginBody.identifier).toBe('adrian.bsky.social');
    expect(loginBody.password).toBe('app-password-123');

    // Verify createRecord call
    const [createUrl, createOpts] = mockFetch.mock.calls[1];
    expect(createUrl).toContain('com.atproto.repo.createRecord');
    expect(createOpts.headers['Authorization']).toBe('Bearer jwt-token-123');
    const createBody = JSON.parse(createOpts.body as string);
    expect(createBody.repo).toBe('did:plc:abc123');
    expect(createBody.collection).toBe('app.bsky.feed.post');
    expect(createBody.record.$type).toBe('app.bsky.feed.post');
    expect(createBody.record.text).toBe('Hello Bluesky');
  });

  it('publishes a link post with external embed', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: 'at://did:plc:abc123/app.bsky.feed.post/def', cid: 'cid456' }),
    });

    const linkPost: SocialPost = {
      ...basePost,
      type: 'link',
      link: 'https://adrianwedd.com/blog/test/',
    };
    const result = await bsky.publishPost(linkPost);
    expect(result.success).toBe(true);

    const createBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(createBody.record.embed).toEqual({
      $type: 'app.bsky.embed.external',
      external: {
        uri: 'https://adrianwedd.com/blog/test/',
        title: '',
        description: '',
      },
    });
  });

  it('handles auth failure (401)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'AuthenticationRequired', message: 'Invalid identifier or password' }),
    });

    const result = await bsky.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
    expect(result.isTransient).toBe(false);
  });

  it('truncates posts over 300 graphemes', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ uri: 'at://did:plc:abc123/app.bsky.feed.post/trunc', cid: 'cid789' }),
    });

    const longPost: SocialPost = {
      ...basePost,
      message: 'A'.repeat(350),
    };
    const result = await bsky.publishPost(longPost);
    expect(result.success).toBe(true);

    const createBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    // [...text] spread gives grapheme count
    expect([...createBody.record.text].length).toBe(300);
  });

  it('treats HTTP 5xx from createRecord as transient', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => 'Bad Gateway',
    });

    const result = await bsky.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
  });

  it('treats HTTP 429 as transient', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate Limit Exceeded',
    });

    const result = await bsky.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
  });

  it('handles network errors as transient', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const result = await bsky.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.error).toContain('Network timeout');
  });
});

// ---------------------------------------------------------------------------
// debugAuth
// ---------------------------------------------------------------------------
describe('Bluesky debugAuth', () => {
  const bsky = createBlueskyPlatform('adrian.bsky.social', 'app-password-123');

  it('returns valid when login succeeds', async () => {
    mockFetch.mockResolvedValueOnce({ ...SESSION_RESPONSE });

    const status = await bsky.debugAuth();
    expect(status.valid).toBe(true);
    expect(status.platform).toBe('bluesky');
    expect(status.daysUntilExpiry).toBe(999);
  });

  it('returns invalid when login fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'AuthenticationRequired', message: 'Invalid identifier or password' }),
    });

    const status = await bsky.debugAuth();
    expect(status.valid).toBe(false);
    expect(status.platform).toBe('bluesky');
    expect(status.daysUntilExpiry).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getPageIdentity
// ---------------------------------------------------------------------------
describe('Bluesky getPageIdentity', () => {
  const bsky = createBlueskyPlatform('adrian.bsky.social', 'app-password-123');

  it('returns the handle', () => {
    expect(bsky.getPageIdentity()).toBe('adrian.bsky.social');
  });
});
