import { statSync } from 'node:fs';
import { join } from 'node:path';

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
 */
export async function getFileSize(url: string): Promise<number> {
  if (!url.startsWith('http')) {
    const filePath = join(process.cwd(), 'public', url);
    try {
      return statSync(filePath).size;
    } catch (err) {
      throw new Error(`Enclosure missing on disk: ${url} (looked in ${filePath})`, { cause: err });
    }
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const len = res.headers.get('content-length');
      // A 200 with no content-length is still unusable: don't paper over it
      // with a 0, which is indistinguishable from a real measurement.
      if (!len) throw new Error('200 response carried no content-length header');
      const size = Number.parseInt(len, 10);
      if (!Number.isFinite(size) || size <= 0) throw new Error(`implausible content-length: ${len}`);
      return size;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
  throw new Error(`Could not determine enclosure size for ${url} after 3 attempts: ${String(lastError)}`, {
    cause: lastError,
  });
}
