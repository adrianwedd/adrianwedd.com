import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ImageDimensions {
  width: number;
  height: number;
}

const cache = new Map<string, ImageDimensions | null>();

// Astro runs SSG with the project root as cwd, so this resolves to public/.
const PUBLIC_DIR = resolve(process.cwd(), 'public');

/**
 * Read pixel dimensions of an image referenced by a site-rooted path (e.g.
 * `/notebook-assets/foo/infographic.jpg`). Returns null if the file is
 * missing or the format isn't recognised. Build-time only — runs at SSG
 * time when Astro renders the page.
 *
 * Supports JPEG, PNG, WebP, and GIF — the formats this site actually ships
 * for OG images. Reads only the header bytes, not the full file.
 */
export function getImageDimensions(publicPath: string): ImageDimensions | null {
  if (cache.has(publicPath)) return cache.get(publicPath) ?? null;

  const trimmed = publicPath.replace(/^\//, '');
  const fsPath = resolve(PUBLIC_DIR, trimmed);

  if (!existsSync(fsPath)) {
    cache.set(publicPath, null);
    return null;
  }

  try {
    // 64 KB is plenty for SOF markers in even very large JPEGs.
    const buf = readFileSync(fsPath, { flag: 'r' }).subarray(0, 65536);
    const dims = parseDimensions(buf);
    cache.set(publicPath, dims);
    return dims;
  } catch {
    cache.set(publicPath, null);
    return null;
  }
}

function parseDimensions(buf: Buffer): ImageDimensions | null {
  // PNG: 8-byte signature, then IHDR at offset 16 (width) and 20 (height), big-endian uint32.
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF: "GIF87a" or "GIF89a", then width/height little-endian uint16 at offsets 6/8.
  if (
    buf.length >= 10 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46
  ) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: "RIFF" .... "WEBP" header at offset 8.
  if (
    buf.length >= 30 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      // Lossy: width/height are 14-bit values at offset 26/28 (little-endian), minus reserved bits.
      const w = buf.readUInt16LE(26) & 0x3fff;
      const h = buf.readUInt16LE(28) & 0x3fff;
      return { width: w, height: h };
    }
    if (chunk === 'VP8L') {
      // Lossless: dimensions packed into bytes 21–24.
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width: w, height: h };
    }
    if (chunk === 'VP8X') {
      // Extended: 24-bit width-1, height-1 at offsets 24 and 27.
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { width: w, height: h };
    }
  }

  // JPEG: scan for SOFn markers (0xFFC0–0xFFC3, 0xFFC5–0xFFC7, 0xFFC9–0xFFCB, 0xFFCD–0xFFCF).
  // Skip APP/COM segments by their declared length.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        // SOFn: height at offset i+5 (big-endian uint16), width at i+7.
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
      const segmentLength = buf.readUInt16BE(i + 2);
      i += 2 + segmentLength;
    }
  }

  return null;
}
