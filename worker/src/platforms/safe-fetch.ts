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
//
// Currently has no production callers (bluesky.ts pins its PDS instead of
// validating dynamically) — kept as the documented `validator` option for
// safeFetch on non-media URLs, and covered by unit tests.
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

// Header names that MUST NOT survive a cross-origin redirect. Mirrors how
// well-behaved HTTP clients (curl --location, browser fetch) handle the
// redirect chain: the credential is scoped to the originally-targeted host.
// Critical for federated endpoint callers that pass an Authorization header.
const SENSITIVE_REDIRECT_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization']);

function stripSensitiveHeaders(init: RequestInit): RequestInit {
  if (!init.headers) return init;
  // Normalise to a Headers instance so we hit the same case-insensitive lookup
  // semantics regardless of which form the caller supplied.
  const headers = new Headers(init.headers);
  for (const name of SENSITIVE_REDIRECT_HEADERS) {
    headers.delete(name);
  }
  return { ...init, headers };
}

// Drain an intermediate 3xx response so Workers' subrequest accounting can
// reclaim the connection. Without this, a malicious origin can return huge
// bodies on the redirect responses themselves and stall the worker.
async function discardBody(res: Response): Promise<void> {
  if (!res.body) return;
  try {
    await res.body.cancel();
  } catch {
    /* body may already be locked or consumed — nothing useful to do */
  }
}

export async function safeFetch(
  url: string,
  init: RequestInit,
  validator: (url: string) => boolean,
): Promise<SafeFetchResult> {
  let current = url;
  let currentInit = init;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!validator(current)) {
      return { response: null, finalUrl: current, blockedReason: `validator rejected ${current}` };
    }
    const res = await fetch(current, { ...currentInit, redirect: 'manual' });
    // 3xx with Location: walk the redirect ourselves; refuse opaque redirects (no Location)
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      // Drain the 3xx body before continuing — a malicious origin can return
      // a huge body on the redirect response itself to stall the worker.
      await discardBody(res);
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
      // Cross-origin redirect: strip sensitive headers so an allowlisted CDN
      // hop can't smuggle a bearer token to a different host (even a different
      // allowlisted one). Same origin: keep the original init so e.g. Range
      // headers survive.
      try {
        const currentOrigin = new URL(current).origin;
        const nextOrigin = new URL(nextUrl).origin;
        if (currentOrigin !== nextOrigin) {
          currentInit = stripSensitiveHeaders(currentInit);
        }
      } catch {
        // The new URL parse already passed above; this is defensive.
      }
      current = nextUrl;
      continue;
    }
    return { response: res, finalUrl: current };
  }
  return { response: null, finalUrl: current, blockedReason: `exceeded ${MAX_REDIRECT_HOPS} redirect hops` };
}

// Stream a response body and abort once `maxBytes` is exceeded. Returns null
// if the cap is breached. HEAD-then-GET TOCTOU defence: even if an origin lied
// about Content-Length on HEAD, the GET cannot inflate the worker beyond cap.
//
// Previously inline in bluesky.ts AND duplicated in twitter.ts. Hoisted here
// because the cap semantics are part of the safe-fetch contract.
export async function readBoundedArrayBuffer(res: Response, maxBytes: number): Promise<ArrayBuffer | null> {
  if (!res.body) {
    // No streamable body (HEAD response, etc.) — fall back to arrayBuffer with
    // a hard length check. Still bounded; just less efficient.
    const buf = await res.arrayBuffer();
    return buf.byteLength <= maxBytes ? buf : null;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}
