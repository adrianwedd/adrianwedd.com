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
 *     `Referrer-Policy`).
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
}

const HTML_CONTENT_TYPE = /^text\/html\b/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const fetchInit: RequestInit & { cf?: { resolveOverride?: string } } = {};
    if (env.ORIGIN_RESOLVE_HOSTNAME) fetchInit.cf = { resolveOverride: env.ORIGIN_RESOLVE_HOSTNAME };
    const upstream = await fetch(originRequest(request, env), fetchInit);
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!HTML_CONTENT_TYPE.test(contentType)) return upstream;

    const nonce = generateNonce();
    const strictDynamic = env.STRICT_DYNAMIC === '1';
    const csp = buildCsp({ nonce, strictDynamic });

    // Clone headers so we can modify them without mutating the upstream Response.
    const headers = new Headers(upstream.headers);
    headers.set('Content-Security-Policy', csp);
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), xr-spatial-tracking=()');
    // Don't ship the meta CSP downstream — header is stronger and the meta
    // would force the browser to intersect both policies.
    headers.delete('Content-Security-Policy-Report-Only');
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
