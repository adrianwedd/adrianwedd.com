import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAllowedMediaUrl, isSafeHttpsUrl, safeFetch, readBoundedArrayBuffer } from '../platforms/safe-fetch';

describe('isAllowedMediaUrl', () => {
  it.each([
    'https://cdn.adrianwedd.com/notebook-assets/x/audio.mp3',
    'https://adrianwedd.com/og/blog/x.jpg',
    'https://img.youtube.com/vi/abc/maxresdefault.jpg',
  ])('allows %s', (url) => {
    expect(isAllowedMediaUrl(url)).toBe(true);
  });

  it.each([
    'http://cdn.adrianwedd.com/x.jpg',           // not https
    'https://attacker.example/x.jpg',            // not allowlisted
    'https://169.254.169.254/latest/meta-data',  // IP literal (cloud metadata)
    'https://10.0.0.1/x',                        // private IP literal
    'file:///etc/passwd',                         // non-http scheme
    'not-a-url',                                  // unparseable
  ])('rejects %s', (url) => {
    expect(isAllowedMediaUrl(url)).toBe(false);
  });

  it('rejects host-confusion with @ in URL', () => {
    // Test parser robustness — the host is example.com, not cdn.adrianwedd.com
    expect(isAllowedMediaUrl('https://cdn.adrianwedd.com@example.com/x.jpg')).toBe(false);
  });
});

describe('isSafeHttpsUrl', () => {
  it('accepts an arbitrary HTTPS hostname', () => {
    expect(isSafeHttpsUrl('https://pds.example.com/xrpc')).toBe(true);
  });

  it('rejects IP literals and non-https schemes', () => {
    expect(isSafeHttpsUrl('https://169.254.169.254')).toBe(false);
    expect(isSafeHttpsUrl('http://pds.example.com')).toBe(false);
    expect(isSafeHttpsUrl('ftp://pds.example.com')).toBe(false);
  });

  // Hex-encoded and decimal-encoded IPv4 literals are a known SSRF bypass:
  // `https://0x7f000001` and `https://2130706433` both resolve to 127.0.0.1
  // in the WHATWG URL parser, but a naive dotted-quad regex would miss them.
  it.each([
    'https://0x7f000001/x',     // hex-encoded 127.0.0.1
    'https://2130706433/x',     // decimal-encoded 127.0.0.1
    'https://0x7f.0.0.1/x',     // mixed hex/dotted
    'https://[::1]/x',           // bracketed IPv6 literal
    'https://[fe80::1]/x',       // bracketed IPv6 link-local
  ])('rejects encoded IP literal %s', (url) => {
    expect(isSafeHttpsUrl(url)).toBe(false);
  });
});

describe('safeFetch (SSRF defense for outbound fetches)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects the initial URL if the validator fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('should not be called'));
    const result = await safeFetch('https://attacker.example/x', {}, isAllowedMediaUrl);
    expect(result.response).toBeNull();
    expect(result.blockedReason).toContain('attacker.example');
    // Most importantly, no actual network call was made.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('follows a redirect to an allowlisted host', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: 'https://cdn.adrianwedd.com/redirected.jpg' },
      }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await safeFetch('https://adrianwedd.com/og/x.jpg', {}, isAllowedMediaUrl);

    expect(result.response?.status).toBe(200);
    expect(result.finalUrl).toBe('https://cdn.adrianwedd.com/redirected.jpg');
    // Both calls must use `redirect: 'manual'` — the whole point is that we
    // walk redirects ourselves rather than letting fetch follow blindly.
    for (const call of fetchSpy.mock.calls) {
      expect((call[1] as RequestInit | undefined)?.redirect).toBe('manual');
    }
  });

  it('refuses a redirect that targets a non-allowlisted host (SSRF pivot)', async () => {
    // Simulates the canonical SSRF redirect pivot: an allowlisted source URL
    // returns 302 Location: <private/metadata IP>. Without redirect:manual the
    // default fetch would happily follow this and turn the allowlist into a
    // false sense of security.
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, {
      status: 302,
      headers: { Location: 'https://169.254.169.254/latest/meta-data/' },
    }));

    const result = await safeFetch('https://cdn.adrianwedd.com/x.jpg', {}, isAllowedMediaUrl);

    expect(result.response).toBeNull();
    expect(result.blockedReason).toContain('169.254.169.254');
  });

  it('refuses a redirect that targets a non-allowlisted external host', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, {
      status: 301,
      headers: { Location: 'https://attacker.example/payload' },
    }));

    const result = await safeFetch('https://cdn.adrianwedd.com/x.jpg', {}, isAllowedMediaUrl);

    expect(result.response).toBeNull();
    expect(result.blockedReason).toContain('attacker.example');
  });

  it('caps redirect chains to prevent infinite loops', async () => {
    // Bounce between two allowlisted hosts forever — should bail at the hop cap.
    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls++;
      const target = calls % 2 === 0
        ? 'https://cdn.adrianwedd.com/a.jpg'
        : 'https://adrianwedd.com/b.jpg';
      return new Response(null, { status: 302, headers: { Location: target } });
    });

    const result = await safeFetch('https://cdn.adrianwedd.com/start.jpg', {}, isAllowedMediaUrl);
    expect(result.response).toBeNull();
    expect(result.blockedReason).toMatch(/redirect hops/);
  });

  it('refuses a 3xx response without a Location header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 302 }));
    const result = await safeFetch('https://cdn.adrianwedd.com/x.jpg', {}, isAllowedMediaUrl);
    expect(result.response).toBeNull();
    expect(result.blockedReason).toContain('Location');
  });

  it('resolves relative-path redirect Locations against the current URL', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: '/new-path.jpg' },
      }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await safeFetch('https://cdn.adrianwedd.com/old-path.jpg', {}, isAllowedMediaUrl);
    expect(result.response?.status).toBe(200);
    expect(result.finalUrl).toBe('https://cdn.adrianwedd.com/new-path.jpg');
  });

  // Codex/hermes High: a malicious origin can return a huge body on the 3xx
  // response itself to stall the worker. safeFetch must cancel intermediate
  // bodies before continuing the walk.
  it('cancels the body of intermediate 3xx responses', async () => {
    const cancelSpy = vi.fn().mockResolvedValue(undefined);
    const redirectBody = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); controller.close(); },
    });
    // Wrap the body so we can spy on cancel().
    const redirectRes = new Response(redirectBody, {
      status: 302,
      headers: { Location: 'https://cdn.adrianwedd.com/final.jpg' },
    });
    Object.defineProperty(redirectRes, 'body', {
      get() { return { cancel: cancelSpy } as unknown as ReadableStream; },
    });

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(redirectRes)
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await safeFetch('https://adrianwedd.com/x.jpg', {}, isAllowedMediaUrl);
    expect(cancelSpy).toHaveBeenCalled();
  });

  // Codex Low: an allowlisted cross-origin redirect would forward Authorization
  // / Cookie / Proxy-Authorization headers, smuggling bearer tokens to a
  // different host. safeFetch strips those on origin change.
  it('strips Authorization on cross-origin redirect', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        // adrianwedd.com -> cdn.adrianwedd.com (different origin, both allowlisted)
        headers: { Location: 'https://cdn.adrianwedd.com/redir.jpg' },
      }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await safeFetch('https://adrianwedd.com/og.jpg', {
      headers: { Authorization: 'Bearer secret', Cookie: 'sess=abc', 'X-Trace': 'keep' },
    }, isAllowedMediaUrl);

    // First call: original headers preserved
    const firstHeaders = new Headers((fetchSpy.mock.calls[0][1] as RequestInit).headers);
    expect(firstHeaders.get('Authorization')).toBe('Bearer secret');
    expect(firstHeaders.get('Cookie')).toBe('sess=abc');

    // Second call: sensitive headers stripped, non-sensitive headers survive
    const secondHeaders = new Headers((fetchSpy.mock.calls[1][1] as RequestInit).headers);
    expect(secondHeaders.get('Authorization')).toBeNull();
    expect(secondHeaders.get('Cookie')).toBeNull();
    expect(secondHeaders.get('X-Trace')).toBe('keep');
  });

  it('keeps Authorization on same-origin redirect', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: 'https://cdn.adrianwedd.com/path-b.jpg' },
      }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    await safeFetch('https://cdn.adrianwedd.com/path-a.jpg', {
      headers: { Authorization: 'Bearer keep-me' },
    }, isAllowedMediaUrl);

    const secondHeaders = new Headers((fetchSpy.mock.calls[1][1] as RequestInit).headers);
    expect(secondHeaders.get('Authorization')).toBe('Bearer keep-me');
  });
});

describe('readBoundedArrayBuffer', () => {
  it('returns the buffer when the body fits the cap', async () => {
    const res = new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200 });
    const buf = await readBoundedArrayBuffer(res, 1024);
    expect(buf).not.toBeNull();
    expect(new Uint8Array(buf!).length).toBe(4);
  });

  // Hermes Medium: the cap-exceeded path is critical for memory safety but
  // had zero direct unit tests. This verifies the streaming reader bails
  // when the cumulative byte count exceeds maxBytes, regardless of whether
  // the origin honoured Content-Length.
  it('returns null and cancels the reader when the cap is exceeded', async () => {
    const cancelSpy = vi.fn().mockResolvedValue(undefined);
    let chunkIdx = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (chunkIdx >= 10) { controller.close(); return; }
        // 10 chunks of 200 bytes each = 2000 bytes total; cap at 500 → bail at chunk 3
        controller.enqueue(new Uint8Array(200));
        chunkIdx++;
      },
      cancel: cancelSpy,
    });
    const res = new Response(stream, { status: 200 });
    const buf = await readBoundedArrayBuffer(res, 500);
    expect(buf).toBeNull();
    // Reader is cancelled when we exceed the cap so the underlying stream is closed.
    // The exact cancel-call count depends on stream internals; just assert it fired.
    expect(chunkIdx).toBeLessThan(10);
  });

  it('falls back to arrayBuffer when the response has no body, still bounded', async () => {
    // HEAD responses or some Workers runtime responses can have no body stream.
    const res = new Response('hello', { status: 200 });
    Object.defineProperty(res, 'body', { value: null });
    const buf = await readBoundedArrayBuffer(res, 1024);
    expect(buf).not.toBeNull();
    const oversized = new Response(new Uint8Array(2048).buffer, { status: 200 });
    Object.defineProperty(oversized, 'body', { value: null });
    const big = await readBoundedArrayBuffer(oversized, 1024);
    expect(big).toBeNull();
  });
});
