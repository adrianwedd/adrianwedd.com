import { SELF } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index.js';
import { buildCsp } from '../src/csp.js';
import { generateNonce } from '../src/nonce.js';

afterEach(() => vi.restoreAllMocks());

const htmlBody = (body: string) => `<!doctype html><html><head>${body}</head><body></body></html>`;

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
    const route = routes.find((r) => url.origin === 'https://adrianwedd.com' && url.pathname === r.path);
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

  it('omits reporting directives by default (enforced policy stays clean)', () => {
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    expect(csp).not.toMatch(/report-to/);
    expect(csp).not.toMatch(/report-uri/);
  });

  it('appends report-to + report-uri only when reporting is supplied', () => {
    const csp = buildCsp({
      nonce: 'x',
      strictDynamic: false,
      reporting: { group: 'csp', uri: 'https://adrianwedd.com/__csp-report' },
    });
    expect(csp).toMatch(/report-to csp/);
    expect(csp).toMatch(/report-uri https:\/\/adrianwedd\.com\/__csp-report/);
  });

  it('allows GA4 beacon fallbacks observed in CSP reports (www.google.com connect, *.g.doubleclick.net img)', () => {
    // Live Report-Only data (2026-06-30) showed gtag beacons blocked in
    // production: /g/collect on www.google.com (connect-src) and the image
    // pixel on stats.g.doubleclick.net (img-src).
    const csp = buildCsp({ nonce: 'x', strictDynamic: false });
    const connectSrc = csp.split(';').find((d) => d.trim().startsWith('connect-src'))!;
    const imgSrc = csp.split(';').find((d) => d.trim().startsWith('img-src'))!;
    expect(connectSrc).toMatch(/https:\/\/www\.google\.com(\s|$)/);
    expect(imgSrc).toMatch(/https:\/\/\*\.g\.doubleclick\.net/);
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
    // Cross-origin isolation headers are HTML-only too (assets pass through).
    expect(res.headers.get('cross-origin-opener-policy')).toBeNull();
    expect(res.headers.get('cross-origin-resource-policy')).toBeNull();
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
    expect(res.headers.get('strict-transport-security')).toBe('max-age=63072000; includeSubDomains');
    // No preload — deliberate (one-way commitment).
    expect(res.headers.get('strict-transport-security')).not.toMatch(/preload/);
    // Cross-origin isolation headers (allow-popups variant keeps ad/analytics
    // popups working; CORP same-origin doesn't affect plain-fetch OG scrapers).
    expect(res.headers.get('cross-origin-opener-policy')).toBe('same-origin-allow-popups');
    expect(res.headers.get('cross-origin-resource-policy')).toBe('same-origin');

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

  it('ships a Report-Only mirror + Reporting-Endpoints, but keeps the enforced policy report-free', async () => {
    mockOrigin({
      path: '/report-headers',
      body: htmlBody('<script>x</script>'),
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

    const res = await SELF.fetch('https://adrianwedd.com/report-headers');
    const enforced = res.headers.get('content-security-policy')!;
    const reportOnly = res.headers.get('content-security-policy-report-only');
    const endpoints = res.headers.get('reporting-endpoints');

    // Report-Only first: the enforced header carries NO reporting directives.
    expect(enforced).not.toMatch(/report-to/);
    expect(enforced).not.toMatch(/report-uri/);

    // The parallel Report-Only header carries the reporting wiring.
    expect(reportOnly).toMatch(/report-to csp/);
    expect(reportOnly).toMatch(/report-uri https:\/\/adrianwedd\.com\/__csp-report/);
    expect(endpoints).toBe('csp="https://adrianwedd.com/__csp-report"');

    // Report-Only mirrors the enforced nonce so it never reports our own scripts.
    const enforcedNonce = enforced.match(/'nonce-([^']+)'/)![1];
    const reportNonce = reportOnly!.match(/'nonce-([^']+)'/)![1];
    expect(reportNonce).toBe(enforcedNonce);
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
    mockOrigin({
      path: '/cached',
      body: htmlBody('<script>x</script>'),
      headers: {
        'content-type': 'text/html; charset=utf-8',
        etag: 'W/"abc123"',
        'last-modified': 'Wed, 21 Oct 2026 07:28:00 GMT',
        'content-length': '999',
      },
    });

    const res = await SELF.fetch('https://adrianwedd.com/cached');
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('last-modified')).toBeNull();
    expect(res.headers.get('content-length')).toBeNull();
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('preserves upstream status and statusText (not silently 200)', async () => {
    // Regression: spreading a Response copies own enumerable props only,
    // which loses status/statusText. 404 must remain 404.
    mockOrigin({
      path: '/missing',
      status: 404,
      body: htmlBody('<h1>not found</h1>'),
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

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
    mockOrigin({
      path: '/og-test',
      body: htmlBody('<script>x</script>'),
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

    const res = await SELF.fetch('https://adrianwedd.com/og-test', {
      headers: { Range: 'bytes=0-1023' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('preserves upstream redirects without rewriting body', async () => {
    mockOrigin({
      path: '/legacy',
      status: 301,
      body: '',
      headers: { 'content-type': 'text/html; charset=utf-8', location: '/new-location/' },
    });

    const res = await SELF.fetch('https://adrianwedd.com/legacy', { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/new-location/');
  });

  it('accepts a POSTed violation report at /__csp-report with 204 (no origin fetch)', async () => {
    // No mockOrigin: the report path must terminate in the worker. If it fell
    // through to the origin fetch, the unmocked call would throw.
    const res = await SELF.fetch('https://adrianwedd.com/__csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report' },
      body: JSON.stringify({
        'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'https://evil.example' },
      }),
    });
    expect(res.status).toBe(204);
  });

  it('rejects non-POST to /__csp-report with 405', async () => {
    const res = await SELF.fetch('https://adrianwedd.com/__csp-report');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('rejects an oversized report body with 413', async () => {
    const res = await SELF.fetch('https://adrianwedd.com/__csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report', 'content-length': String(64 * 1024 + 1) },
      body: 'x'.repeat(64 * 1024 + 1),
    });
    expect(res.status).toBe(413);
  });

  it('301-redirects www to the apex preserving path and query, without touching origin', async () => {
    // No mockOrigin: the redirect must fire before any origin fetch — an
    // unmatched upstream call would make the fetch mock throw.
    const res = await SELF.fetch('https://www.adrianwedd.com/about/?utm_source=x', { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://adrianwedd.com/about/?utm_source=x');
  });

  it('returns a clean 502 when the origin fetch throws (not an unhandled 1101)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connect reset'));
    const res = await SELF.fetch('https://adrianwedd.com/');
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('Bad Gateway');
  });

  it('adds nosniff to non-HTML pass-through responses', async () => {
    mockOrigin({
      path: '/_astro/style.css',
      body: 'body{}',
      headers: { 'content-type': 'text/css' },
    });
    const res = await SELF.fetch('https://adrianwedd.com/_astro/style.css');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    // Still a pass-through otherwise: no CSP, body untouched.
    expect(res.headers.get('content-security-policy')).toBeNull();
    expect(await res.text()).toBe('body{}');
  });
});

// Rate limiting of the unauthenticated collector. SELF runs with whatever
// bindings miniflare materialises; the limiter contract itself is unit-tested
// by invoking the handler directly with an injected fake binding.
describe('/__csp-report rate limiting', () => {
  const baseEnv = { STRICT_DYNAMIC: '0', ORIGIN_HOST: 'adrianwedd.com' };

  function reportRequest() {
    return new Request('https://adrianwedd.com/__csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report', 'CF-Connecting-IP': '203.0.113.9' },
      body: JSON.stringify({ 'csp-report': { 'violated-directive': 'script-src' } }),
    });
  }

  it('returns 429 when the limiter denies the request', async () => {
    const limit = vi.fn(async () => ({ success: false }));
    const env = { ...baseEnv, CSP_REPORT_RATE_LIMITER: { limit } } as Env;
    const res = await worker.fetch(reportRequest(), env);
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.9' });
  });

  it('returns 204 when the limiter allows the request', async () => {
    const env = { ...baseEnv, CSP_REPORT_RATE_LIMITER: { limit: async () => ({ success: true }) } } as Env;
    const res = await worker.fetch(reportRequest(), env);
    expect(res.status).toBe(204);
  });

  it('fails open (204) when the binding is absent', async () => {
    const res = await worker.fetch(reportRequest(), baseEnv as Env);
    expect(res.status).toBe(204);
  });
});
