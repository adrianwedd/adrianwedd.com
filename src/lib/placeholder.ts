import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, string>();

/**
 * Generate a tiny base64-encoded blurred placeholder for a local image.
 * Expects a public-dir path like "/notebook-assets/foo/infographic.webp".
 * Returns empty string if image can't be processed.
 */
export async function getPlaceholder(src: string): Promise<string> {
  if (cache.has(src)) return cache.get(src)!;

  try {
    const imagePath = resolve(
      process.cwd(),
      src.startsWith('/') ? `public${src}` : src,
    );

    const buffer = readFileSync(imagePath);
    const placeholder = await sharp(buffer)
      .resize(20, undefined, { fit: 'inside' })
      .blur(3)
      .toFormat('webp', { quality: 20 })
      .toBuffer();

    const dataUri = `data:image/webp;base64,${placeholder.toString('base64')}`;
    cache.set(src, dataUri);
    return dataUri;
  } catch {
    return '';
  }
}
