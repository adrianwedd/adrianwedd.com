import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Per-episode artwork for a media URL under `/notebook-assets/`.
 *
 * NotebookLM kits ship a `cover.*` beside each `audio.*`/`video.*`, so the
 * media URL's own directory identifies the right image. Returns a site-root
 * path, or undefined when no cover is committed — callers must fall back
 * rather than substituting a generic card.
 *
 * Google requires a video's thumbnail be "a URL pointing to the video's unique
 * thumbnail image file"; pointing every video at one site-wide OG card
 * satisfies the property's presence while failing that requirement.
 * https://developers.google.com/search/docs/appearance/structured-data/video
 *
 * Prefers .jpg over .webp: this value is also used as an og:image, and several
 * scrapers do not render WebP.
 *
 * Build-time only — uses node:fs. Never import into a Worker.
 */
export function episodeCover(mediaUrl: string | undefined): string | undefined {
  if (!mediaUrl || !mediaUrl.includes('/notebook-assets/')) return undefined;
  const dir = mediaUrl
    .split('/notebook-assets/')[1]
    ?.split('?')[0]
    .replace(/\/[^/]*$/, '');
  if (!dir) return undefined;
  for (const ext of ['jpg', 'png', 'webp']) {
    const rel = `/notebook-assets/${dir}/cover.${ext}`;
    if (existsSync(join(process.cwd(), 'public', rel))) return rel;
  }
  return undefined;
}

/**
 * Container formats that contradict their file extension.
 *
 * Three published files are named `.mp3` but are AAC in an MP4 container —
 * confirmed by their leading bytes on the CDN (`ftypdash` rather than `ID3`),
 * and corroborated by the CDN serving them as `application/octet-stream` while
 * genuine MP3s are served `audio/mpeg`. Extension-derived MIME types are
 * therefore false for these three.
 *
 * The URLs are permanent (see the permalink strategy), so renaming the files is
 * not an option and this override map is the fix. Keyed by path suffix so it
 * matches regardless of CDN host.
 */
const CONTAINER_OVERRIDES: ReadonlyArray<readonly [string, string]> = [
  ['/notebook-assets/tanda-pizza/audio.mp3', 'audio/mp4'],
  ['/notebook-assets/failure-first/jailbreak-archaeology/audio.mp3', 'audio/mp4'],
  ['/notebook-assets/failure-first/moltbook/audio.mp3', 'audio/mp4'],
];

/** The corrected MIME type for a URL whose extension lies, if any. */
export function containerOverride(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const path = url.split('?')[0];
  return CONTAINER_OVERRIDES.find(([suffix]) => path.endsWith(suffix))?.[1];
}
