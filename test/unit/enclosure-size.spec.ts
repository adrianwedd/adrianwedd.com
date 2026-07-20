import { describe, it, expect, vi, afterEach } from 'vitest';
import { getFileSize } from '../../src/lib/enclosure-size';

/**
 * These all guard one property: an enclosure size that cannot be determined
 * must throw, never resolve to 0.
 *
 * RSS enclosure/@length is not decorative — clients use it for download
 * progress and pre-flight size checks. The previous implementation swallowed
 * every failure and returned 0, so a transient blip during a build issuing
 * 200+ HEADs would ship a silently broken feed. A build failure is the cheap
 * outcome; a deployed feed lying about its sizes is the expensive one.
 */

const head = (headers: Record<string, string>, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({ ok, status, headers: new Headers(headers) });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getFileSize — remote enclosures', () => {
  it('returns the content-length from a HEAD request', async () => {
    vi.stubGlobal('fetch', head({ 'content-length': '56097519' }));
    await expect(getFileSize('https://cdn.example.com/a.m4a')).resolves.toBe(56097519);
  });

  it('retries a transient failure rather than shipping a zero', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-length': '42' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize('https://cdn.example.com/a.m4a')).resolves.toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize('https://cdn.example.com/a.m4a')).rejects.toThrow(/after 3 attempts/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws on a non-2xx response instead of returning 0', async () => {
    vi.stubGlobal('fetch', head({}, false, 404));
    await expect(getFileSize('https://cdn.example.com/gone.m4a')).rejects.toThrow(/404/);
  });

  it('throws when a 200 carries no content-length', async () => {
    // The dangerous case: the request "succeeded", so a naive implementation
    // reads a missing header as 0 and emits it as though it were measured.
    vi.stubGlobal('fetch', head({}));
    await expect(getFileSize('https://cdn.example.com/a.m4a')).rejects.toThrow(/no content-length/);
  });

  it.each(['0', '-1', 'not-a-number'])('throws on implausible content-length %s', async (len) => {
    vi.stubGlobal('fetch', head({ 'content-length': len }));
    await expect(getFileSize('https://cdn.example.com/a.m4a')).rejects.toThrow(/implausible|no content-length/);
  });
});

describe('getFileSize — local enclosures', () => {
  it('stats a real file in public/', async () => {
    await expect(getFileSize('/favicon.svg')).resolves.toBeGreaterThan(0);
  });

  it('throws for a missing file, naming the path it looked in', async () => {
    await expect(getFileSize('/no/such/file.m4a')).rejects.toThrow(/missing on disk.*looked in/s);
  });
});
