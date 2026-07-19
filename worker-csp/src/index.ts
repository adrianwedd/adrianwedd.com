/**
 * adrianwedd-csp — per-request CSP nonce injection.
 *
 * Pipeline:
 *  1. Fetch the underlying response (GitHub Pages origin via Cloudflare).
 *  2. Generate a 128-bit cryptographically random nonce, base64-encoded.
 *  3. HTMLRewriter:
 *     - Add `nonce="<value>"` to every <script> tag.
 *     - Strip the existing `<meta http-equiv="Content-Security-Policy">` tag —
 *       the real header is stronger and the meta would otherwise stack with it.
 *  4. Set a real `Content-Security-Policy` response header (no `'unsafe-inline'`).
 *  5. Add defense-in-depth headers (`X-Frame-Options`, `X-Content-Type-Options`,
 *     `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`).
 *
 * Only HTML responses are rewritten. Static assets (JS/CSS/images) pass through
 * untouched so cacheability is preserved.
 *
 * The worker is bound at the route level (see wrangler.toml). Until a route is
 * bound, this module exports a fetch handler that just proxies the request —
 * effectively a no-op.
 */

import { buildCsp } from './csp.js';
import { generateNonce } from './nonce.js';

export interface Env {
  STRICT_DYNAMIC: string;
  // Hostname (or host:port) of the origin to fetch from. Decoupling the
  // upstream host from the inbound request hostname avoids self-recursion
  // when both apex and www routes are bound, and lets local integration
  // tests point the worker at a localhost http server.
  //
  // Production: "adrianwedd.com" — same zone, but resolveOverride bypasses
  // CF routing so the request goes directly to GitHub Pages IPs and doesn't
  // re-invoke this Worker.
  // Local test: "localhost:8000" with ORIGIN_PROTOCOL="http".
  ORIGIN_HOST: string;
  // Protocol for upstream fetches. Defaults to "https" if unset/empty.
  ORIGIN_PROTOCOL?: string;
  // Optional hostname for DNS override via resolveOverride. Points to a
  // DNS-only (grey-cloud) CNAME within the zone that resolves to the real
  // origin, bypassing Cloudflare routing so the subrequest doesn't re-enter
  // this Worker. Production: "pages-origin.adrianwedd.com" (CNAME to
  // adrianwedd.github.io). Local test: unset.
  ORIGIN_RESOLVE_HOSTNAME?: string;
  // Workers rate-limiting binding ([[ratelimits]] in wrangler.toml) guarding
  // the unauthenticated /__csp-report collector. Optional: absent in tests
  // and any environment without the binding, in which case the collector
  // fails open (mirrors the social worker's API_RATE_LIMITER pattern).
  CSP_REPORT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

// The apex is canonical. Requests arriving on www 301 there, preserving path
// and query, before any origin fetch (the ORIGIN_HOST design already assumed
// a www route would be bound — see wrangler.toml).
const WWW_HOST = 'www.adrianwedd.com';
const CANONICAL_HOST = 'adrianwedd.com';

const HTML_CONTENT_TYPE = /^text\/html\b/i;

// Same-origin CSP violation collector. Browsers POST reports here out-of-band
// (no CORS, no fetch from page JS), so it must be public/unauthenticated. The
// double-underscore prefix keeps it clear of any real Astro route.
const CSP_REPORT_PATH = '/__csp-report';
// Group name shared by the `Reporting-Endpoints` header and the CSP
// `report-to` directive — they must match for modern browsers to route here.
const CSP_REPORT_GROUP = 'csp';
// Reports are small (a few KB). Cap the read so the public endpoint can't be
// used to push large bodies through the worker. 64 KB is generous headroom.
const MAX_REPORT_BYTES = 64 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle violation reports before proxying — this path doesn't exist at the
    // GitHub Pages origin, so it must terminate here.
    const inboundUrl = new URL(request.url);

    // Canonicalise www → apex before anything else touches the origin.
    if (inboundUrl.hostname === WWW_HOST) {
      const target = `https://${CANONICAL_HOST}${inboundUrl.pathname}${inboundUrl.search}`;
      return Response.redirect(target, 301);
    }

    // Canonicalise tag archive URLs: historic mixed-case / spaced tags
    // (e.g. /blog/tag/AI%20safety/) 301 to the lowercase-hyphenated slug the
    // site now generates. Permalinks must never 404 — see the 2026-07-19 spec.
    const tagMatch = inboundUrl.pathname.match(/^\/(blog|projects|audio|gallery)\/tag\/([^/]+)(\/.*)?$/);
    if (tagMatch) {
      let raw: string | null;
      try {
        raw = decodeURIComponent(tagMatch[2]);
      } catch {
        // Malformed percent-encoding (e.g. /blog/tag/%ZZ/) — not a historic
        // URL; skip canonicalisation and let the origin 404 it rather than
        // 500 here or redirect to a mangled slug.
        raw = null;
      }
      if (raw !== null) {
        const canonical = raw
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (canonical !== raw) {
          const rest = tagMatch[3] ?? '/';
          return Response.redirect(
            `https://${CANONICAL_HOST}/${tagMatch[1]}/tag/${encodeURIComponent(canonical)}${rest}${inboundUrl.search}`,
            301,
          );
        }
      }
    }

    if (inboundUrl.pathname === CSP_REPORT_PATH) {
      return handleCspReport(request, env);
    }

    const fetchInit: RequestInit & { cf?: { resolveOverride?: string } } = {};
    if (env.ORIGIN_RESOLVE_HOSTNAME) fetchInit.cf = { resolveOverride: env.ORIGIN_RESOLVE_HOSTNAME };
    // A failed origin fetch (DNS, connect reset, GitHub Pages outage) would
    // otherwise surface as an unhandled exception — Cloudflare error 1101 —
    // instead of an honest gateway error.
    let upstream: Response;
    try {
      upstream = await fetch(originRequest(request, env), fetchInit);
    } catch (err) {
      console.error(`Origin fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return new Response('Bad Gateway', { status: 502, headers: { 'Content-Type': 'text/plain' } });
    }
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!HTML_CONTENT_TYPE.test(contentType)) {
      // Pass-through, but with nosniff so assets can't be MIME-confused.
      // Clone headers and keep the (possibly streamed) body untouched.
      const passHeaders = new Headers(upstream.headers);
      passHeaders.set('X-Content-Type-Options', 'nosniff');
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: passHeaders,
      });
    }

    const nonce = generateNonce();
    const strictDynamic = env.STRICT_DYNAMIC === '1';
    // Enforced policy: unchanged, no reporting directives. We add reporting via
    // a parallel Report-Only header first (see below) so the collector can be
    // validated in production without any risk to the live, enforcing policy.
    const csp = buildCsp({ nonce, strictDynamic });
    // Report-Only mirror of the SAME policy (same nonce, same allowlist) with
    // reporting wired in. Because it mirrors the enforced policy exactly, it
    // surfaces precisely what the enforced policy is (silently) blocking in
    // production — without itself blocking anything. Collector is same-origin so
    // it works on both the apex and www routes the worker is bound to.
    const reportUri = `${inboundUrl.origin}${CSP_REPORT_PATH}`;
    const cspReportOnly = buildCsp({
      nonce,
      strictDynamic,
      reporting: { group: CSP_REPORT_GROUP, uri: reportUri },
    });

    // Clone headers so we can modify them without mutating the upstream Response.
    const headers = new Headers(upstream.headers);
    headers.set('Content-Security-Policy', csp);
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), xr-spatial-tracking=()');
    // HSTS: 2-year max-age + includeSubDomains (cdn./social./www. are all
    // HTTPS via Cloudflare). No `preload` — that's a one-way commitment that
    // binds every current and future subdomain to HTTPS-only in browsers'
    // hardcoded list. Set on HTML responses; the browser only needs to see
    // HSTS once per host to apply the policy site-wide.
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    // Cross-origin isolation (defence against XS-Leaks / cross-window attacks).
    // COOP severs window.opener for cross-origin popups so a malicious opener
    // can't reach into our context. 'same-origin-allow-popups' keeps popups WE
    // open (ad/analytics scripts occasionally do) functional, unlike the
    // stricter 'same-origin'. CORP 'same-origin' stops other origins embedding
    // our HTML as a no-cors subresource; OG scrapers do plain top-level fetches,
    // which CORP doesn't govern, so social previews are unaffected.
    headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    // Declare the reporting group, then attach our Report-Only mirror. This
    // overwrites any upstream Report-Only header (we own the policy here).
    headers.set('Reporting-Endpoints', `${CSP_REPORT_GROUP}="${reportUri}"`);
    headers.set('Content-Security-Policy-Report-Only', cspReportOnly);
    // Body is mutated by HTMLRewriter (nonce injection + meta-CSP strip), so
    // upstream entity validators no longer match. Cloudflare strips Content-
    // Length transparently, but ETag/Last-Modified can produce stale 304s.
    headers.delete('ETag');
    headers.delete('Last-Modified');
    headers.delete('Content-Length');

    const rewritten = new HTMLRewriter()
      // Add nonce to every <script> tag.
      .on('script', new NonceInjector(nonce))
      // Remove the build-time meta CSP — the response header replaces it.
      .on('meta[http-equiv="Content-Security-Policy"]', new ElementRemover())
      // Be explicit: spreading a Response copies own enumerable props only,
      // which loses status/statusText (those are prototype getters). Without
      // this, a 404/301 from origin would silently become 200 OK.
      .transform(new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      }));

    return rewritten;
  },
} satisfies ExportedHandler<Env>;

function originRequest(request: Request, env: Env): Request {
  const host = env.ORIGIN_HOST;
  // Defensive: if ORIGIN_HOST isn't set we'd self-recurse on multi-route
  // bindings. Surface the misconfiguration instead of silently looping.
  if (!host) throw new Error('ORIGIN_HOST is not configured');
  const protocol = env.ORIGIN_PROTOCOL || 'https';
  const inbound = new URL(request.url);
  const upstream = new URL(`${protocol}://${host}${inbound.pathname}${inbound.search}`);
  // Preserve method/body/headers; just retarget the URL. GitHub Pages serves
  // the right site by Host header — passing the upstream host (adrianwedd.github.io)
  // returns the same content as the custom domain.
  // Build headers explicitly so we can drop Range before the upstream fetch.
  // Mutating headers on a Request cloned from an incoming request is unreliable
  // in the Workers runtime — incoming request headers may be immutable.
  // Stripping Range prevents GitHub Pages from returning 206 Partial Content,
  // which would give HTMLRewriter truncated HTML and OG scrapers missing meta tags.
  const headers = new Headers(request.headers);
  headers.delete('Range');
  return new Request(upstream, { method: request.method, headers, body: request.body, redirect: request.redirect });
}

// Collect a CSP violation report and log it for Workers observability
// (wrangler tail + dashboard Logs, since [observability] is enabled). The
// endpoint never stores anything, so it can't amplify load against KV/origin.
async function handleCspReport(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }
  // The collector is unauthenticated by necessity (browsers POST here
  // out-of-band), so cap it per IP via the ratelimits binding. Fails open
  // when the binding is absent — losing reports must not break the site.
  if (env.CSP_REPORT_RATE_LIMITER) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.CSP_REPORT_RATE_LIMITER.limit({ key: ip });
    if (!success) return new Response(null, { status: 429 });
  }
  // Reject oversized bodies up front when the length is declared.
  const declaredLen = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLen) && declaredLen > MAX_REPORT_BYTES) {
    return new Response(null, { status: 413 });
  }
  try {
    // Read as bytes, not text: report bodies carry Content-Type
    // `application/csp-report` / `application/reports+json`, and calling .text()
    // on those makes the Workers runtime warn about possible corruption.
    // byteLength is also the accurate guard against a missing/lying Content-Length.
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_REPORT_BYTES) return new Response(null, { status: 413 });
    const raw = new TextDecoder().decode(buf);
    // report-uri sends `{"csp-report": {...}}`; the Reporting API (report-to)
    // sends `[{ "type": "csp-violation", "body": {...} }]`. Log whatever shape.
    const report: unknown = raw ? JSON.parse(raw) : null;
    console.log(
      JSON.stringify({
        msg: 'csp-violation',
        ua: request.headers.get('user-agent'),
        report,
      }),
    );
  } catch (err) {
    console.warn(
      JSON.stringify({
        msg: 'csp-violation-parse-error',
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
  // 204: the browser ignores any response body for a report submission.
  return new Response(null, { status: 204 });
}

class NonceInjector {
  constructor(private readonly nonce: string) {}
  element(el: Element): void {
    // Always replace any existing nonce. The CSP header only contains the
    // nonce we generated this request — preserving a foreign nonce would
    // silently CSP-block the script under enforcement.
    el.setAttribute('nonce', this.nonce);
  }
}

class ElementRemover {
  element(el: Element): void {
    el.remove();
  }
}
