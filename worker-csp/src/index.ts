/**
 * adrianwedd-csp — per-request CSP nonce injection.
 *
 * Pipeline:
 *  1. Fetch the underlying response (GitHub Pages origin via Cloudflare).
 *  2. Generate a 128-bit cryptographically random nonce, base64-encoded.
 *  3. HTMLRewriter:
 *     - Add `nonce="<value>"` to every <script> and <style> tag.
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
}

const HTML_CONTENT_TYPE = /^text\/html\b/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const upstream = await fetch(request);
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
    // Don't ship the meta CSP downstream — header is stronger and the meta
    // would force the browser to intersect both policies.
    headers.delete('Content-Security-Policy-Report-Only');

    const rewritten = new HTMLRewriter()
      // Add nonce to every <script> tag.
      .on('script', new NonceInjector(nonce))
      // Add nonce to every <style> tag.
      .on('style', new NonceInjector(nonce))
      // Remove the build-time meta CSP — the response header replaces it.
      .on('meta[http-equiv="Content-Security-Policy"]', new ElementRemover())
      .transform(new Response(upstream.body, { ...upstream, headers }));

    return rewritten;
  },
} satisfies ExportedHandler<Env>;

class NonceInjector {
  constructor(private readonly nonce: string) {}
  element(el: Element): void {
    // Don't override an existing nonce (e.g. from a sibling worker).
    if (el.getAttribute('nonce')) return;
    el.setAttribute('nonce', this.nonce);
  }
}

class ElementRemover {
  element(el: Element): void {
    el.remove();
  }
}
