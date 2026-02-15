/**
 * Strip file extension from content collection IDs.
 * Astro 5 uses filenames (including .md/.mdx) as collection entry IDs.
 */
export function slug(id: string): string {
  return id.replace(/\.mdx?$/, '');
}

/** Generate a URL-safe slug from image alt text. */
export function imageSlug(alt: string): string {
  return alt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
