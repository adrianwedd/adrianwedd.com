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

export function isAllowedMediaUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (IPV4_LITERAL.test(parsed.hostname) || parsed.hostname.includes(':')) return false;
  return MEDIA_HOST_ALLOWLIST.has(parsed.hostname);
}

// Looser check for federated endpoints (e.g. AT Protocol PDS) where we cannot
// allowlist the host but still want to refuse IP literals and non-HTTPS.
export function isSafeHttpsUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (IPV4_LITERAL.test(parsed.hostname) || parsed.hostname.includes(':')) return false;
  return true;
}
