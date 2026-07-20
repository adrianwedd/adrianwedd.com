import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFileSize, clearEnclosureSizeCache } from '../../src/lib/enclosure-size';

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

const ok = (headers: Record<string, string>) => ({
  ok: true,
  status: 200,
  headers: new Headers(headers),
});
const status = (code: number) => ({ ok: false, status: code, headers: new Headers() });

// Unique per test so the module-level memo never bleeds between cases.
let n = 0;
const url = () => `https://cdn.example.com/a${++n}.m4a`;

beforeEach(() => clearEnclosureSizeCache());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getFileSize — remote enclosures', () => {
  it('issues a HEAD (not a GET) and returns the content-length', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ 'content-length': '56097519' }));
    vi.stubGlobal('fetch', fetchMock);
    const u = url();

    await expect(getFileSize(u)).resolves.toBe(56097519);
    // Pin the method: a silent switch to GET would download gigabytes of audio
    // at build time and still pass a value-only assertion.
    expect(fetchMock).toHaveBeenCalledWith(u, expect.objectContaining({ method: 'HEAD' }));
  });

  it('retries a transient network failure rather than shipping a zero', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(ok({ 'content-length': '42' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize(url())).resolves.toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize(url())).rejects.toThrow(/ECONNRESET/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries a 5xx, which may be transient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize(url())).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry a 404 — a permanent answer costs nothing to re-ask', async () => {
    const fetchMock = vi.fn().mockResolvedValue(status(404));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize(url())).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when a 200 carries no content-length', async () => {
    // The dangerous case: the request "succeeded", so a naive implementation
    // reads a missing header as 0 and emits it as though it were measured.
    const fetchMock = vi.fn().mockResolvedValue(ok({}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getFileSize(url())).rejects.toThrow(/no content-length/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['0', '-1'])('rejects implausible content-length %s', async (len) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ 'content-length': len })));
    await expect(getFileSize(url())).rejects.toThrow(/implausible|malformed/);
  });

  it.each(['not-a-number', '42bytes', '1.5', '12e3'])('rejects malformed content-length %s', async (len) => {
    // parseInt would read '42bytes' as 42 and '1.5' as 1 — a plausible-looking
    // wrong number is worse than an error, because it ships.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ 'content-length': len })));
    await expect(getFileSize(url())).rejects.toThrow(/malformed/);
  });

  it('memoises by URL so the two feeds share one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ 'content-length': '99' }));
    vi.stubGlobal('fetch', fetchMock);
    const u = url();

    const [a, b] = await Promise.all([getFileSize(u), getFileSize(u)]);
    expect([a, b]).toEqual([99, 99]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not memoise a failure, so one blip cannot poison later lookups', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue(ok({ 'content-length': '7' }));
    vi.stubGlobal('fetch', fetchMock);
    const u = url();

    await expect(getFileSize(u)).rejects.toThrow();
    await expect(getFileSize(u)).resolves.toBe(7);
  });
});

describe('getFileSize — local enclosures', () => {
  it('stats a real file in public/', async () => {
    await expect(getFileSize('/favicon.svg')).resolves.toBeGreaterThan(0);
  });

  it('throws for a missing file, naming the path it looked in', async () => {
    await expect(getFileSize('/no/such/file.m4a')).rejects.toThrow(/missing on disk.*looked in/s);
  });

  it('throws for a real but empty file rather than reporting 0 bytes', async () => {
    const { mkdtempSync, writeFileSync, mkdirSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'enc-'));
    mkdirSync(join(dir, 'public'), { recursive: true });
    writeFileSync(join(dir, 'public', 'empty.m4a'), '');
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(dir);

    await expect(getFileSize('/empty.m4a')).rejects.toThrow(/empty on disk/);
    cwd.mockRestore();
  });
});
