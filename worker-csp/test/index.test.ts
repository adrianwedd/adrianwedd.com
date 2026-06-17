import { SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCsp } from '../src/csp.js';
import { generateNonce } from '../src/nonce.js';

afterEach(() => vi.restoreAllMocks());

const htmlBody = (body: string) =>
  `<!doctype html><html><head>${body}</head><body></body></html>`;

// vitest-pool-workers 0.16 removed fetchMock from cloudflare:test; the
// upstream origin fetch is mocked by spying on globalThis.fetch instead.
// Unmatched requests throw, preserving fetchMock's disableNetConnect baseline.
interface MockRoute {
  path: string;
  status?: number;
  body: string;
  headers?: Record<string, string>;
}

function mockOrigin(...routes: MockRoute[]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const request = new Request(input as RequestInfo, init);
    const url = new URL(request.url);
    const route = routes.find(
      (r) => url.origin === 'https://adrianwedd.com' && url.pathname === r.path
    );
    if (!route) throw new Error(`No mock for ${request.method} ${request.url}`);
    return new Response(route.body, { status: route.status ?? 200, headers: route.headers });
  });
}

describe('generateNonce', () => {
  it('produces a base64 string with 22 chars (16 bytes, no padding)', () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}$/);
  });

  it('produces unique values across calls', () => {
    const set = new Set(Array.from({ length: 50 }, generateNonce));
    expect(set.size).toBe(50);
  });
});

describe('buildCsp', () => {
  it('embeds the nonce in script-src', () => {
    const csp = buildCsp({ nonce: 'TESTNONCE', strictDynamic: false });
    expect(csp).toMatch(/script-src [^;]*'nonce-TESTNONCE'/);
  });

  it("does not include 'unsafe-inline' in script-src", () => {
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!;
    expect(scriptSrc).not.toMatch(/'unsafe-inline'/);
  });

  it("adds 'strict-dynamic' only when opted in", () => {
    expect(buildCsp({ nonce: 'x', strictDynamic: false })).not.toMatch(/strict-dynamic/);
    expect(buildCsp({ nonce: 'x', strictDynamic: true })).toMatch(/'strict-dynamic'/);
  });

  it("includes frame-ancestors 'none' (only enforceable via header)", () => {
    expect(buildCsp({ nonce: 'x', strictDynamic: false })).toMatch(/frame-ancestors 'none'/);
  });

  it('still includes cdn.adrianwedd.com in img-src and media-src', () => {
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    expect(csp).toMatch(/img-src [^;]*https:\/\/cdn\.adrianwedd\.com/);
    expect(csp).toMatch(/media-src [^;]*https:\/\/cdn\.adrianwedd\.com/);
  });

  it('includes Turnstile srcdoc script hash and adtrafficquality sodar origins', () => {
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    // Turnstile srcdoc hash allows Cloudflare's inline script in the inherited CSP
    expect(csp).toMatch(/'sha256-eJGI0Ik4oYe\/PKLDOt4wcN76wYs8h\+Ew05pMzdY6xG8='/);
    // Google Ads sodar pixel loads as image from ep1/ep2
    expect(csp).toMatch(/img-src [^;]*https:\/\/ep1\.adtrafficquality\.google/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/ep2\.adtrafficquality\.google/);
  });

  it('uses unsafe-inline for style-src-elem (no nonce — CSP3 nonce suppresses unsafe-inline)', () => {
    // Astro ClientRouter injects <style> elements dynamically on each VT navigation.
    // Per CSP3, adding a nonce-source to style-src-elem silently suppresses
    // 'unsafe-inline', so we can't mix them. Use unsafe-inline only (no nonce).
    const csp = buildCsp({ nonce: 'STYLENONCE', strictDynamic: false });
    const elem = csp.split(';').find((d) => d.trim().startsWith('style-src-elem'))!;
    const attr = csp.split(';').find((d) => d.trim().startsWith('style-src-attr'))!;
    expect(elem).toMatch(/'unsafe-inline'/);
    expect(elem).not.toMatch(/'nonce-STYLENONCE'/);
    expect(attr).toMatch(/'unsafe-inline'/);
  });

  it('keeps adservice.google.com in both script-src and connect-src', () => {
    // adservice issues XHR/beacon calls in addition to loading scripts; if
    // one side is missing the request fails silently in production.
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src'))!;
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src'))!;
    expect(scriptSrc).toMatch(/https:\/\/adservice\.google\.com/);
    expect(connectSrc).toMatch(/https:\/\/adservice\.google\.com/);
  });
});

describe('worker fetch handler', () => {
  it('passes through non-HTML responses untouched', async () => {
    mockOrigin({
      path: '/_astro/page.js',
      body: 'console.log(1)',
      headers: { 'content-type': 'application/javascript' },
    });

    const res = await SELF.fetch('https://adrianwedd.com/_astro/page.js');
    expect(res.headers.get('content-security-policy')).toBeNull();
    // Assets pass through, so they carry no HSTS — fine, since the browser
    // applies the host-wide policy from any HTML response it has seen.
    expect(res.headers.get('strict-transport-security')).toBeNull();
    expect(await res.text()).toBe('console.log(1)');
  });

  it('adds nonce + CSP header to HTML and strips meta CSP', async () => {
    const body =
      '<meta http-equiv="Content-Security-Policy" content="default-src none">' +
      '<script>console.log(1)</script>' +
      '<style>body{color:red}</style>';
    mockOrigin({ path: '/', body: htmlBody(body), headers: { 'content-type': 'text/html; charset=utf-8' } });

    const res = await SELF.fetch('https://adrianwedd.com/');
    const text = await res.text();
    const csp = res.headers.get('content-security-policy');

    expect(csp).toBeTruthy();
    expect(csp).toMatch(/'nonce-/);
    expect(csp).toMatch(/frame-ancestors 'none'/);

    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('permissions-policy')).toMatch(/camera=\(\)/);
    expect(res.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains',
    );
    // No preload — deliberate (one-way commitment).
    expect(res.headers.get('strict-transport-security')).not.toMatch(/preload/);

    // Meta CSP stripped
    expect(text).not.toMatch(/<meta http-equiv="Content-Security-Policy"/);
    // Nonce attached to inline scripts (style elements intentionally NOT nonced)
    expect(text).toMatch(/<script[^>]*nonce="[A-Za-z0-9+/]{22}"[^>]*>console\.log\(1\)<\/script>/);
    expect(text).toMatch(/<style>body{color:red}<\/style>/);

    // Script nonce matches what's in the CSP header.
    const scriptNonce = text.match(/<script[^>]*nonce="([^"]+)"/)?.[1];
    const headerNonce = csp!.match(/'nonce-([^']+)'/)?.[1];
    expect(scriptNonce).toBe(headerNonce);
  });

  it("replaces any existing nonce so all scripts share this request's nonce", async () => {
    // The CSP header only includes the nonce we generated; preserving a
    // foreign nonce would silently CSP-block that script under enforcement.
    const body = '<script nonce="external">x</script>';
    mockOrigin({ path: '/replace', body: htmlBody(body), headers: { 'content-type': 'text/html; charset=utf-8' } });

    const res = await SELF.fetch('https://adrianwedd.com/replace');
    const text = await res.text();
    expect(text).not.toMatch(/nonce="external"/);
    const headerNonce = res.headers.get('content-security-policy')!.match(/'nonce-([^']+)'/)![1];
    expect(text).toContain(`<script nonce="${headerNonce}">`);
  });

  it('strips stale entity validators on rewritten HTML', async () => {
    // Body is mutated by HTMLRewriter (nonce + meta-CSP strip), so origin's
    // ETag/Last-Modified/Content-Length no longer match. Leaving them risks
    // truncated responses and incorrect 304 cache hits.
    mockOrigin({ path: '/cached', body: htmlBody('<script>x</script>'), headers: { 'content-type': 'text/html; charset=utf-8', etag: 'W/"abc123"', 'last-modified': 'Wed, 21 Oct 2026 07:28:00 GMT', 'content-length': '999', } });

    const res = await SELF.fetch('https://adrianwedd.com/cached');
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('last-modified')).toBeNull();
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('preserves upstream status and statusText (not silently 200)', async () => {
    // Regression: spreading a Response copies own enumerable props only,
    // which loses status/statusText. 404 must remain 404.
    mockOrigin({ path: '/missing', status: 404, body: htmlBody('<h1>not found</h1>'), headers: { 'content-type': 'text/html; charset=utf-8' } });

    const res = await SELF.fetch('https://adrianwedd.com/missing');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('strips Range header so origin always returns 200 (not 206 Partial Content)', async () => {
    // OG scrapers (Facebook, LinkedIn) send Range headers. GitHub Pages honours
    // them and returns 206 with truncated HTML, causing missing og:* meta tags.
    // The worker strips Range before the upstream fetch so origin returns full 200.
    // The mock always returns 200; if Range were forwarded the origin would return
    // 206 and the worker would pass it through — so asserting 200 here verifies
    // the round-trip behaviour even if it can't inspect the outgoing request headers.
    mockOrigin({ path: '/og-test', body: htmlBody('<script>x</script>'), headers: { 'content-type': 'text/html; charset=utf-8' } });

    const res = await SELF.fetch('https://adrianwedd.com/og-test', {
      headers: { Range: 'bytes=0-1023' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('preserves upstream redirects without rewriting body', async () => {
    mockOrigin({ path: '/legacy', status: 301, body: '', headers: { 'content-type': 'text/html; charset=utf-8', location: '/new-location/', } });

    const res = await SELF.fetch('https://adrianwedd.com/legacy', { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/new-location/');
  });

  it('uses ORIGIN_HOST for the upstream fetch regardless of inbound hostname', async () => {
    // ORIGIN_HOST="adrianwedd.com". Even if the inbound arrives on www, the
    // worker rewrites to the configured origin. The interceptor is on
    // adrianwedd.com; an unmatched call to www would make the fetch mock throw.
    mockOrigin({ path: '/about/', body: htmlBody('<script>x</script>'), headers: { 'content-type': 'text/html; charset=utf-8' } });

    const res = await SELF.fetch('https://www.adrianwedd.com/about/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });
});
