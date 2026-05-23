// SSRF defense for outbound fetches against user-controlled URLs.
//
// Queue payloads carry `videoUrl`, `imageUrl`, and `youtubeUrl` fields that
// are fetched by the Worker before re-uploading the bytes to the destination
// platform (Bluesky / Twitter). Without an allowlist a caller with access to
// the publish/queue endpoints can turn the Worker into an SSRF primitive.

const MEDIA_HOST_ALLOWLIST: ReadonlySet<string> = new Set([
  'cdn.adrianwedd.com',
  'adrianwedd.com',
  'img.youtube.com',
]);

const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/;
// Hex-encoded IPv4 (0x7f.0.0.1) and decimal-encoded IPv4 (2130706433) bypasses.
const IPV4_HEX_OR_OCTAL = /^0[xX]?[0-9a-fA-F]+(\.0[xX]?[0-9a-fA-F]+){0,3}$/;
const IPV4_PURE_DECIMAL = /^\d{8,10}$/;

function hasIpLikeHostname(hostname: string): boolean {
  if (IPV4_LITERAL.test(hostname)) return true;
  if (hostname.includes(':')) return true; // IPv6 (incl. bracketed)
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true;
  if (IPV4_HEX_OR_OCTAL.test(hostname)) return true;
  if (IPV4_PURE_DECIMAL.test(hostname)) return true;
  return false;
}

export function isAllowedMediaUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (hasIpLikeHostname(parsed.hostname)) return false;
  return MEDIA_HOST_ALLOWLIST.has(parsed.hostname);
}

// Looser check for federated endpoints (e.g. AT Protocol PDS) where we cannot
// allowlist the host but still want to refuse IP literals and non-HTTPS.
//
// NOTE: hostname-only validation does NOT prevent DNS-rebinding to private IPs.
// Callers that pass attacker-controlled hostnames here must additionally pin
// the destination or use a maintained allowlist — see bluesky.ts where the
// federated PDS endpoint is intentionally pinned to bsky.social.
export function isSafeHttpsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (hasIpLikeHostname(parsed.hostname)) return false;
  return true;
}

// ── Redirect-aware fetch ────────────────────────────────────────────────────
//
// Default `fetch()` follows redirects transparently, so an attacker-controlled
// origin (or a poisoned CDN response) returning `302 Location: https://169.254.169.254/...`
// turns an allowlisted source URL into an SSRF primitive. `safeFetch` does the
// redirect walk itself and re-runs `validator` on each hop, capping at MAX_HOPS.
//
// `validator` should be `isAllowedMediaUrl` for media bytes and `isSafeHttpsUrl`
// for federated endpoints. The initial URL is also validated by the caller
// before invoking this function.

const MAX_REDIRECT_HOPS = 3;

export interface SafeFetchResult {
  response: Response | null;
  finalUrl: string;
  // Non-null when the fetch was aborted because a redirect target failed validation
  // or the hop limit was exceeded. Used by callers to surface debugging info.
  blockedReason?: string;
}

export async function safeFetch(
  url: string,
  init: RequestInit,
  validator: (url: string) => boolean,
): Promise<SafeFetchResult> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!validator(current)) {
      return { response: null, finalUrl: current, blockedReason: `validator rejected ${current}` };
    }
    const res = await fetch(current, { ...init, redirect: 'manual' });
    // 3xx with Location: walk the redirect ourselves; refuse opaque redirects (no Location)
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        return { response: null, finalUrl: current, blockedReason: 'redirect without Location header' };
      }
      // Resolve relative redirects against the current URL.
      let nextUrl: string;
      try {
        nextUrl = new URL(location, current).href;
      } catch {
        return { response: null, finalUrl: current, blockedReason: `invalid redirect Location: ${location}` };
      }
      current = nextUrl;
      continue;
    }
    return { response: res, finalUrl: current };
  }
  return { response: null, finalUrl: current, blockedReason: `exceeded ${MAX_REDIRECT_HOPS} redirect hops` };
}
