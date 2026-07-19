/**
 * Convert a collection entry ID to a URL slug.
 *
 * Astro 6's glob loader strips file extensions from IDs (e.g. `foo-post`),
 * but Astro 5 included them (`foo-post.md`). The trailing `.mdx?` strip is
 * defensive in case an old ID ever leaks through. The `-post` strip enforces
 * the blog/projects naming convention where `foo-post.md` → `/blog/foo/`.
 */
export function slug(id: string): string {
  return id.replace(/-post(\.mdx?)?$/, '').replace(/\.mdx?$/, '');
}

/** Canonical URL slug for a tag: lowercase, whitespace → hyphen. */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Generate a URL-safe slug from image alt text. */
export function imageSlug(alt: string): string {
  const result = alt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return result || 'image';
}

/**
 * Extract the 11-char YouTube video ID from any of the canonical URL forms:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 *   - https://www.youtube.com/live/ID
 * Returns null for non-YouTube hosts, malformed URLs, or any "id" that doesn't
 * match the canonical `[A-Za-z0-9_-]{11}` shape. The regex anchor is what
 * prevents `?v=foo<script>` from reaching the JSON-LD embedUrl.
 */
export function youtubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const idRe = /^[A-Za-z0-9_-]{11}$/;
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return idRe.test(id) ? id : null;
  }
  if (
    host === 'youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com'
  ) {
    const v = u.searchParams.get('v');
    if (v && idRe.test(v)) return v;
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})(?:[/?].*)?$/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Swap a `.webp` extension to `.jpg` for og:image / VideoObject.thumbnailUrl
 * fields. Facebook, X, LinkedIn, iMessage and Google's video crawler still
 * don't reliably handle WebP for OG/thumbnail scrapes, so we emit JPG twins
 * (generated alongside .webp at content-build time) and point social/SEO
 * metadata at those. Non-webp paths pass through unchanged.
 */
export function ogSafeImage(path: string): string {
  return path.replace(/\.webp(?=[?#]|$)/i, '.jpg');
}

/**
 * Resolve descriptive alt text for a blog/project hero image.
 *
 * Bare page titles make useless alt text — a screen reader just re-reads the
 * visible `<h1>`. Most heroes here are generated infographics, so when no
 * authored `heroAlt` is given we describe the image as an infographic summary
 * of the piece rather than echoing the title. Authors override via `heroAlt`.
 */
export function heroAltText(opts: {
  heroAlt?: string;
  heroImage?: string;
  title: string;
  kind: 'article' | 'project';
}): string {
  if (opts.heroAlt) return opts.heroAlt;
  const isInfographic = !!opts.heroImage && /infographic|notebook-assets/i.test(opts.heroImage);
  if (isInfographic) {
    const noun = opts.kind === 'project' ? 'project' : 'article';
    return `Infographic summarising the ${noun}: “${opts.title}”`;
  }
  // No authored description and not an infographic: echoing the visible <h1>
  // title just makes a screen reader read it twice. Mark the hero decorative
  // (alt="") so it's skipped rather than announced redundantly.
  return '';
}
