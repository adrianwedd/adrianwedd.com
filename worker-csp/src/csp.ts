/**
 * Build the Content-Security-Policy header string.
 *
 * Mirrors the directive set in src/components/SEOHead.astro (the build-time
 * meta) but replaces 'unsafe-inline' on script-src with a per-request nonce,
 * adds frame-ancestors, and uses a real header instead of a meta tag.
 *
 * style-src keeps 'unsafe-inline' for now. Astro emits style=".." attributes
 * dynamically, which require style-src-attr 'unsafe-inline' under CSP3. We
 * can split style-src-elem (nonce-only) and style-src-attr ('unsafe-inline')
 * in a follow-up; for the first pass, keep both relaxed.
 */
export function buildCsp(opts: { nonce: string; strictDynamic: boolean }): string {
  const { nonce, strictDynamic } = opts;

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'wasm-unsafe-eval'", // Pagefind WASM
    'https://www.googletagmanager.com',
    'https://www.google.com',
    'https://www.google-analytics.com',
    'https://snap.licdn.com',
    'https://px.ads.linkedin.com',
    'https://pagead2.googlesyndication.com',
    'https://tpc.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://adservice.google.com',
    'https://challenges.cloudflare.com',
  ];
  // strict-dynamic disables the host allowlist above and lets the nonce-loaded
  // scripts grant trust transitively. Powerful, but the failure mode in #241
  // shipped strict-dynamic without nonces on Astro module scripts and broke
  // hydration. Gated behind an env var until a soak window confirms safety.
  if (strictDynamic) scriptSrc.push("'strict-dynamic'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://cdn.adrianwedd.com https://www.google-analytics.com https://*.google-analytics.com https://px.ads.linkedin.com https://www.googletagmanager.com https://*.tile.openstreetmap.org https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://www.linkedin.com",
    "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.g.doubleclick.net https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://snap.licdn.com https://px.ads.linkedin.com https://pagead2.googlesyndication.com https://api.book.adrianwedd.com https://api.github.com https://cdn.adrianwedd.com https://ops.adrianwedd.com https://challenges.cloudflare.com",
    "media-src 'self' https://cdn.adrianwedd.com",
    'frame-src https://www.openstreetmap.org https://challenges.cloudflare.com https://www.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net',
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // only enforceable via header, not meta
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}
