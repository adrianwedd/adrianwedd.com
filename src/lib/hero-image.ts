import type { ImageMetadata } from 'astro';

// Keep public URLs in content: notebook downloads, audio artwork, and social
// JPG twins use them too. Imported hero sources enable real Astro transforms.
const heroes = import.meta.glob<ImageMetadata>('../assets/generated-heroes/notebook-assets/**/*.{webp,jpg,jpeg,png}', {
  eager: true,
  import: 'default',
});

export function resolveHeroImage(src: string | undefined): ImageMetadata | string | undefined {
  if (!src) return undefined;
  return heroes[`../assets/generated-heroes${src}`] ?? src;
}
