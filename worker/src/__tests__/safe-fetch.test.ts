import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAllowedMediaUrl, isSafeHttpsUrl, safeFetch } from '../platforms/safe-fetch';

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
});
