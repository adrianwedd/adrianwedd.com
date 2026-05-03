/**
 * Build the Content-Security-Policy header string.
 *
 * script-src uses a per-request nonce (worker injects it into every <script>)
 * plus 'strict-dynamic'. strict-dynamic lets nonce-trusted scripts (including
 * Astro's ClientRouter) create child scripts that inherit trust — required for
 * View Transitions, which dynamically injects inline scripts per navigation.
 * The host allowlist is kept for browsers that don't support strict-dynamic.
 *
 * style-src uses 'unsafe-inline' throughout: Astro's ClientRouter injects
 * <style> elements dynamically during view transitions and per CSP3, a nonce
 * in style-src-elem suppresses 'unsafe-inline', so we can't mix them.
 */
export function buildCsp(opts: { nonce: string; strictDynamic: boolean }): string {
  const { nonce, strictDynamic } = opts;

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'wasm-unsafe-eval'", // Pagefind WASM
    // Cloudflare Turnstile creates srcdoc iframes in the page context; those
    // documents inherit our script-src CSP but lack the per-request nonce.
    // 'strict-dynamic' doesn't cover inline scripts in srcdoc parsing contexts,
    // so we hash the one stable inline script that Turnstile embeds.
    "'sha256-eJGI0Ik4oYe/PKLDOt4wcN76wYs8h+Ew05pMzdY6xG8='",
    // Host allowlist: honoured by browsers that don't support strict-dynamic.
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
  if (strictDynamic) scriptSrc.push("'strict-dynamic'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // 'unsafe-inline' for all style directives: Astro ClientRouter injects
    // <style> elements dynamically during view transitions. Per CSP3, a
    // nonce-source in style-src-elem suppresses 'unsafe-inline', so the only
    // workable option is to use 'unsafe-inline' without a nonce here.
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    // GA4 audience pixels use country-specific google TLDs (e.g. google.com.au).
    // ep1/ep2.adtrafficquality.google serve the sodar tracking pixel as an image.
    "img-src 'self' data: https://cdn.adrianwedd.com https://www.google-analytics.com https://*.google-analytics.com https://px.ads.linkedin.com https://www.googletagmanager.com https://*.tile.openstreetmap.org https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://www.linkedin.com https://www.google.com.au https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google",
    "connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.g.doubleclick.net https://adservice.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://snap.licdn.com https://px.ads.linkedin.com https://pagead2.googlesyndication.com https://api.book.adrianwedd.com https://api.github.com https://cdn.adrianwedd.com https://ops.adrianwedd.com https://challenges.cloudflare.com",
    "media-src 'self' https://cdn.adrianwedd.com",
    'frame-src https://www.openstreetmap.org https://challenges.cloudflare.com https://www.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google',
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // api.book.adrianwedd.com handles booking form submissions.
    "form-action 'self' https://api.book.adrianwedd.com",
    "frame-ancestors 'none'", // only enforceable via header, not meta
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}
