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

/** Generate a URL-safe slug from image alt text. */
export function imageSlug(alt: string): string {
  const result = alt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return result || 'image';
}
