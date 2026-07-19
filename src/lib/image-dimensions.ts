import { openSync, readSync, closeSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ImageDimensions {
  width: number;
  height: number;
}

const cache = new Map<string, ImageDimensions | null>();

// Astro runs SSG with the project root as cwd, so this resolves to public/.
const PUBLIC_DIR = resolve(process.cwd(), 'public');

// 256 KB header window covers JPEGs with multi-segment EXIF + ICC profiles
// (real-world cameras rarely exceed ~64 KB, but ICC profiles can push past it).
const HEADER_BYTES = 256 * 1024;

/**
 * Read pixel dimensions of an image referenced by a site-rooted path (e.g.
 * `/notebook-assets/foo/infographic.jpg`). Returns null if the file is
 * missing or the format isn't recognised.
 *
 * **Build-time only.** Uses `node:fs` and `process.cwd()`. Importing into
 * a Cloudflare Worker (or anything other than the Astro SSG build) will
 * fail at module load.
 *
 * Supports JPEG, PNG, WebP (VP8/VP8L/VP8X), and GIF. Reads only the first
 * 256 KB of the file, never the whole image.
 */
export function getImageDimensions(publicPath: string): ImageDimensions | null {
  if (cache.has(publicPath)) return cache.get(publicPath) ?? null;

  const trimmed = publicPath.replace(/^\//, '');
  const fsPath = resolve(PUBLIC_DIR, trimmed);

  if (!existsSync(fsPath)) {
    cache.set(publicPath, null);
    return null;
  }

  let fd: number | null = null;
  try {
    const size = statSync(fsPath).size;
    const want = Math.min(size, HEADER_BYTES);
    const buf = Buffer.alloc(want);
    fd = openSync(fsPath, 'r');
    readSync(fd, buf, 0, want, 0);
    const dims = parseDimensions(buf);
    cache.set(publicPath, dims);
    return dims;
  } catch {
    cache.set(publicPath, null);
    return null;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore close errors */
      }
    }
  }
}

/**
 * Parse pixel dimensions from an image file's leading bytes. Exported for unit
 * testing; production callers should use {@link getImageDimensions}, which
 * handles the file I/O and caching.
 */
export function parseDimensions(buf: Buffer): ImageDimensions | null {
  // PNG: signature, then 4-byte length, then "IHDR", then width/height (BE uint32).
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    // Validate that bytes 12–15 are actually "IHDR" — otherwise the file has
    // a valid PNG signature but a corrupt chunk layout.
    buf[12] === 0x49 &&
    buf[13] === 0x48 &&
    buf[14] === 0x44 &&
    buf[15] === 0x52
  ) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // GIF87a / GIF89a: width/height little-endian uint16 at offsets 6/8.
  if (buf.length >= 10 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WebP: "RIFF" .... "WEBP" then variable chunks. Scan for the dimension-
  // bearing chunk (VP8, VP8L, VP8X) rather than assuming a fixed offset,
  // because extended files can have ALPHA/ANIM chunks before VP8/VP8L.
  if (
    buf.length >= 30 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    let off = 12;
    while (off + 8 <= buf.length) {
      const fourcc = buf.toString('ascii', off, off + 4);
      const chunkSize = buf.readUInt32LE(off + 4);
      const dataStart = off + 8;
      if (fourcc === 'VP8 ' && dataStart + 10 <= buf.length) {
        // Lossy: width/height (LE uint16, 14-bit) at offset dataStart+6/8.
        return {
          width: buf.readUInt16LE(dataStart + 6) & 0x3fff,
          height: buf.readUInt16LE(dataStart + 8) & 0x3fff,
        };
      }
      if (fourcc === 'VP8L' && dataStart + 5 <= buf.length) {
        // Signature byte 0x2F validates we're really at a VP8L chunk.
        if (buf[dataStart] !== 0x2f) return null;
        const b0 = buf[dataStart + 1];
        const b1 = buf[dataStart + 2];
        const b2 = buf[dataStart + 3];
        const b3 = buf[dataStart + 4];
        const w = 1 + (((b1 & 0x3f) << 8) | b0);
        const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width: w, height: h };
      }
      if (fourcc === 'VP8X' && dataStart + 10 <= buf.length) {
        // Extended: 24-bit (width-1, height-1) starting at dataStart+4 / +7.
        const w = 1 + (buf[dataStart + 4] | (buf[dataStart + 5] << 8) | (buf[dataStart + 6] << 16));
        const h = 1 + (buf[dataStart + 7] | (buf[dataStart + 8] << 8) | (buf[dataStart + 9] << 16));
        return { width: w, height: h };
      }
      // RIFF chunks are word-aligned: bump odd sizes up by 1.
      off = dataStart + chunkSize + (chunkSize & 1);
    }
    return null;
  }

  // JPEG: scan markers, skipping segments by declared length. Stop at SOS
  // (0xFFDA) — past that point is entropy-coded data. Handles 0xFF fill bytes
  // (valid padding per ITU-T T.81 §B.1.1.2) and standalone markers that
  // carry no length field (RSTn 0xD0-0xD7, TEM 0x01, SOI 0xD8, EOI 0xD9).
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      // Skip 0xFF fill bytes to find the actual marker type byte.
      let j = i + 1;
      while (j < buf.length && buf[j] === 0xff) j++;
      if (j >= buf.length) return null;
      const marker = buf[j];
      if (marker === 0xda) return null; // SOS: no SOF found before scan data
      // SOFn markers: 0xC0–0xCF except 0xC4 (DHT), 0xC8 (JPG), 0xCC (DAC).
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        if (j + 7 >= buf.length) return null;
        return { width: buf.readUInt16BE(j + 6), height: buf.readUInt16BE(j + 4) };
      }
      // Standalone markers (no length field): TEM (0x01), RSTn (0xD0-0xD7),
      // SOI (0xD8), EOI (0xD9).
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        i = j + 1;
        continue;
      }
      if (j + 2 >= buf.length) return null;
      const segmentLength = buf.readUInt16BE(j + 1);
      i = j + 1 + segmentLength;
    }
  }

  return null;
}
