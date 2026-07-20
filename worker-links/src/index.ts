/**
 * Vanity subdomain redirects: <platform>.adrianwedd.com -> that platform's profile.
 *
 * Why a Worker and not a DNS record: DNS maps names to addresses, it cannot
 * redirect to a URL path. A CNAME straight at the platform would send the wrong
 * Host header and fail TLS. So each subdomain gets a proxied placeholder record
 * (AAAA 100::, the documented Cloudflare "discard" address) and this Worker
 * answers on the route.
 *
 * 302, not 301: platform profile URLs do change (handle changes, Spotify show
 * re-issues), and a 301 is cached by browsers ~forever with no way to recall it.
 * These are convenience links, not canonical content URLs — there is no SEO
 * consolidation to win here that justifies an irreversible client-side cache.
 */

const TARGETS: Record<string, string> = {
  spotify: 'https://open.spotify.com/show/033SDw0Swsx8u32z6uoqP1',
  youtube: 'https://www.youtube.com/@adrianwedd',
  github: 'https://github.com/adrianwedd',
  linkedin: 'https://www.linkedin.com/in/adrianwedd/',
  facebook: 'https://www.facebook.com/AdrianWeddDotCom',
  instagram: 'https://www.instagram.com/adrianwedd/',
  x: 'https://x.com/adrianwedd',
  bluesky: 'https://bsky.app/profile/adrianwedd.com',
  podcasts: 'https://podcasts.apple.com/au/podcast/adrian-wedd/id1896173572',
};

// Aliases for the names people actually type.
const ALIASES: Record<string, string> = {
  twitter: 'x',
  bsky: 'bluesky',
  apple: 'podcasts',
  podcast: 'podcasts',
  yt: 'youtube',
  fb: 'facebook',
  ig: 'instagram',
  gh: 'github',
};

export function resolveTarget(hostname: string): string | null {
  const label = hostname.toLowerCase().split('.')[0];
  const key = ALIASES[label] ?? label;
  return TARGETS[key] ?? null;
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    const target = resolveTarget(url.hostname);

    if (!target) {
      // Unknown subdomain: send people somewhere useful rather than erroring.
      return Response.redirect('https://adrianwedd.com/', 302);
    }

    // Only GET/HEAD make sense for a redirector. Anything else is a mistake or a
    // probe; refuse it rather than bouncing a POST body to a third party.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        // Short cache: these are hand-maintained and may be corrected.
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};
