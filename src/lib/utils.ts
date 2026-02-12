/**
 * Strip file extension from content collection IDs.
 * Astro 5 uses filenames (including .md/.mdx) as collection entry IDs.
 */
export function slug(id: string): string {
  return id.replace(/\.mdx?$/, '');
}
