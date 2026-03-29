import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyGraphError,
  createFacebookPlatform,
  type GraphErrorBody,
} from '../platforms/facebook';
import type { SocialPost } from '../platforms/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('classifyGraphError', () => {
  it('classifies code 190 as auth error', () => {
    const result = classifyGraphError({ code: 190, message: 'Invalid token' });
    expect(result).toEqual({ isTransient: false, isAuthError: true });
  });

  it('classifies code 4 as transient (rate limit)', () => {
    const result = classifyGraphError({ code: 4, message: 'Rate limit' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 1 as transient', () => {
    const result = classifyGraphError({ code: 1, message: 'Unknown' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 2 as transient', () => {
    const result = classifyGraphError({ code: 2, message: 'Temporary' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 17 as transient', () => {
    const result = classifyGraphError({ code: 17, message: 'User rate limit' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 10 as permanent', () => {
    const result = classifyGraphError({ code: 10, message: 'Permission denied' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });

  it('classifies code 200 as permanent', () => {
    const result = classifyGraphError({ code: 200, message: 'Permissions error' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });

  it('classifies code 240 as permanent', () => {
    const result = classifyGraphError({ code: 240, message: 'Blocked' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });
});

describe('publishPost', () => {
  const fb = createFacebookPlatform('213409802761321', 'fake-token', 'fake-app-token', 'v21.0');

  const basePost: SocialPost = {
    id: 'test-001',
    platform: 'facebook',
    type: 'text',
    message: 'Hello world',
    scheduledAt: '2026-03-28T09:00:00+10:00',
    scheduledAtEpoch: 1774850400000,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  it('publishes a text post with Bearer auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '213409802761321_123456' }),
    });

    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('213409802761321_123456');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/213409802761321/feed');
    expect(options.headers['Authorization']).toBe('Bearer fake-token');
    expect(options.body).not.toContain('access_token');
  });

  it('publishes a photo post to /photos endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'photo_123', post_id: '213409802761321_789' }),
    });

    const photoPost: SocialPost = { ...basePost, type: 'photo', imageUrl: 'https://example.com/img.png' };
    const result = await fb.publishPost(photoPost);
    expect(result.success).toBe(true);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/213409802761321/photos');
    expect(options.body).toContain('caption=');
  });

  it('returns validation error for photo post without imageUrl', async () => {
    const photoPost: SocialPost = { ...basePost, type: 'photo' };
    const result = await fb.publishPost(photoPost);
    expect(result.success).toBe(false);
    expect(result.error).toContain('imageUrl');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('publishes a link post with link param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '213409802761321_456' }),
    });

    const linkPost: SocialPost = { ...basePost, type: 'link', link: 'https://adrianwedd.com/blog/test/' };
    const result = await fb.publishPost(linkPost);
    expect(result.success).toBe(true);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toContain('link=');
  });

  it('classifies auth errors from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 190, message: 'Invalid token' } }),
    });
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
  });

  it('treats HTTP 5xx as transient', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
  });

  it('handles fetch exceptions as transient', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.error).toContain('Network timeout');
  });
});
