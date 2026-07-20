import { statSync } from 'node:fs';
import { join } from 'node:path';

/** Per-attempt ceiling. A stalled socket must not hold the build open. */
const HEAD_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

/** Thrown for a definitive answer that won't improve on retry (4xx, bad header). */
class PermanentEnclosureError extends Error {}

/**
 * In-process memo, keyed by URL.
 *
 * /audio/feed.xml and /audio/podcast.xml are the same show, so a build resolves
 * the same ~93 URLs twice. Caching the *promise* (not the value) also collapses
 * the two feeds' concurrent requests for a URL into one in-flight HEAD.
 */
const cache = new Map<string, Promise<number>>();

/**
 * Byte size for an RSS enclosure, from the CDN (HEAD) or the local file.
 *
 * Build-time only — uses node:fs. Never import into a Worker.
 *
 * RSS requires enclosure/@length and podcast clients use it for download
 * progress and pre-flight size checks; a zero is a silently *wrong* feed rather
 * than an obviously missing one. This used to `return 0` on any failure, so a
 * single transient CDN blip during a build issuing 200+ HEADs would ship a
 * broken enclosure with nothing in the logs. It now retries, then throws — a
 * feed that can't state its own sizes should fail the build, not deploy quietly.
 *
 * The tradeoff that buys: a deploy now depends on CDN availability at build
 * time. That is the intended direction (a wrong feed outlives a failed build),
 * but it is a real dependency — if it ever bites, the fix is a committed cache
 * of last-known-good sizes to fall back on, not a return to silent zeros.
 */
export function getFileSize(url: string): Promise<number> {
  const hit = cache.get(url);
  if (hit) return hit;
  const pending = resolveSize(url);
  cache.set(url, pending);
  // Don't memoise failures: a transient outage shouldn't poison the rest of
  // the build, and an unhandled rejection here would crash the process.
  pending.catch(() => cache.delete(url));
  return pending;
}

/** Test seam — the memo is process-lifetime otherwise. */
export function clearEnclosureSizeCache(): void {
  cache.clear();
}

async function resolveSize(url: string): Promise<number> {
  if (!url.startsWith('http')) return localSize(url);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await headSize(url);
    } catch (err) {
      lastError = err;
      // A 404 or a malformed header is the server's final answer. Retrying it
      // just spends ~750ms per broken enclosure to be told the same thing.
      if (err instanceof PermanentEnclosureError) break;
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  throw new Error(`Could not determine enclosure size for ${url}: ${String(lastError)}`, {
    cause: lastError,
  });
}

async function headSize(url: string): Promise<number> {
  const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(HEAD_TIMEOUT_MS) });
  // 5xx may be transient; 4xx will not be.
  if (!res.ok) {
    const msg = `HTTP ${res.status}`;
    throw res.status >= 500 ? new Error(msg) : new PermanentEnclosureError(msg);
  }
  const len = res.headers.get('content-length');
  // A 200 with no content-length is still unusable: don't paper over it with a
  // 0, which is indistinguishable from a real measurement.
  if (!len) throw new PermanentEnclosureError('200 response carried no content-length header');
  return parseLength(len);
}

/**
 * Strict on purpose. `Number.parseInt` would read '42bytes' as 42, '1.5' as 1
 * and '12e3' as 12 — each a plausible-looking wrong answer written into a feed.
 */
function parseLength(raw: string): number {
  const len = raw.trim();
  if (!/^\d+$/.test(len)) throw new PermanentEnclosureError(`malformed content-length: ${raw}`);
  const size = Number(len);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new PermanentEnclosureError(`implausible content-length: ${raw}`);
  }
  return size;
}

function localSize(url: string): number {
  const filePath = join(process.cwd(), 'public', url);
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch (err) {
    throw new Error(`Enclosure missing on disk: ${url} (looked in ${filePath})`, { cause: err });
  }
  // A real but empty file would otherwise sail through as a legitimate 0.
  if (size <= 0) throw new Error(`Enclosure is empty on disk: ${url} (${filePath})`);
  return size;
}
