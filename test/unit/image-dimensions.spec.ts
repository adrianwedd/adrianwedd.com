import { describe, it, expect } from 'vitest';
import { parseDimensions } from '../../src/lib/image-dimensions';

/** PNG: 8-byte signature, 4-byte IHDR length, "IHDR", width/height BE uint32. */
function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buf.writeUInt32BE(13, 8); // IHDR chunk length
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/** GIF: "GIF89a", then width/height LE uint16 at offsets 6/8. */
function gif(width: number, height: number): Buffer {
  const buf = Buffer.alloc(10);
  buf.write('GIF89a', 0, 'ascii');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  return buf;
}

/** RIFF/WEBP container wrapping a single chunk with the given fourcc + data. */
function webp(fourcc: string, data: Buffer): Buffer {
  const chunkSize = data.length;
  const padded = chunkSize + (chunkSize & 1);
  const buf = Buffer.alloc(12 + 8 + padded);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(4 + 8 + padded, 4); // file size minus RIFF header
  buf.write('WEBP', 8, 'ascii');
  buf.write(fourcc, 12, 'ascii');
  buf.writeUInt32LE(chunkSize, 16);
  data.copy(buf, 20);
  return buf;
}

/** VP8 lossy: 10-byte data, dimensions LE uint16 (14-bit) at data offsets 6/8. */
function vp8Data(width: number, height: number): Buffer {
  const d = Buffer.alloc(10);
  d.writeUInt16LE(width & 0x3fff, 6);
  d.writeUInt16LE(height & 0x3fff, 8);
  return d;
}

/** VP8X extended: signature/flags byte, 3 reserved, then 24-bit (w-1),(h-1). */
function vp8xData(width: number, height: number): Buffer {
  const d = Buffer.alloc(10);
  const w = width - 1;
  const h = height - 1;
  d[4] = w & 0xff;
  d[5] = (w >> 8) & 0xff;
  d[6] = (w >> 16) & 0xff;
  d[7] = h & 0xff;
  d[8] = (h >> 8) & 0xff;
  d[9] = (h >> 16) & 0xff;
  return d;
}

/** JPEG: SOI, an APP0 segment (skipped by length), then an SOF0 carrying dims. */
function jpeg(width: number, height: number): Buffer {
  const parts: number[] = [0xff, 0xd8]; // SOI
  // APP0 segment: marker + length(16) + 4 bytes payload — must be skipped.
  parts.push(0xff, 0xe0, 0x00, 0x06, 0x01, 0x02, 0x03, 0x04);
  // SOF0: marker, length(0x0011), precision, height(BE16), width(BE16), ...
  parts.push(0xff, 0xc0, 0x00, 0x11, 0x08);
  parts.push((height >> 8) & 0xff, height & 0xff);
  parts.push((width >> 8) & 0xff, width & 0xff);
  parts.push(0x03, 0x01, 0x22, 0x00); // components (partial, not read)
  return Buffer.from(parts);
}

describe('parseDimensions — PNG', () => {
  it('reads width and height', () => {
    expect(parseDimensions(png(1200, 630))).toEqual({ width: 1200, height: 630 });
  });

  it('rejects a valid signature with a non-IHDR first chunk', () => {
    const buf = png(10, 10);
    buf.write('IDAT', 12, 'ascii'); // corrupt the chunk type
    expect(parseDimensions(buf)).toBeNull();
  });
});

describe('parseDimensions — GIF', () => {
  it('reads little-endian width and height', () => {
    expect(parseDimensions(gif(640, 480))).toEqual({ width: 640, height: 480 });
  });
});

describe('parseDimensions — WebP', () => {
  it('reads a VP8 lossy chunk', () => {
    expect(parseDimensions(webp('VP8 ', vp8Data(800, 600)))).toEqual({ width: 800, height: 600 });
  });

  it('reads a VP8X extended chunk', () => {
    expect(parseDimensions(webp('VP8X', vp8xData(1536, 2752)))).toEqual({
      width: 1536,
      height: 2752,
    });
  });

  it('reads a VP8L lossless chunk', () => {
    // VP8L encodes (w-1) in 14 bits and (h-1) in the next 14 bits, LSB-first,
    // behind a 0x2F signature byte. Build the field for 300x200.
    const w = 300;
    const h = 200;
    const bits = ((h - 1) << 14) | (w - 1); // 28-bit little-endian field
    // Pad past the parser's `buf.length >= 30` WebP guard (real VP8L chunks
    // carry the entropy-coded stream after this 5-byte header).
    const d = Buffer.alloc(18);
    d[0] = 0x2f;
    d[1] = bits & 0xff;
    d[2] = (bits >> 8) & 0xff;
    d[3] = (bits >> 16) & 0xff;
    d[4] = (bits >> 24) & 0xff;
    expect(parseDimensions(webp('VP8L', d))).toEqual({ width: 300, height: 200 });
  });

  it('rejects a VP8L chunk with a bad signature byte', () => {
    const d = Buffer.alloc(5);
    d[0] = 0x00; // not 0x2f
    expect(parseDimensions(webp('VP8L', d))).toBeNull();
  });

  it('skips a leading ALPHA chunk to find VP8 dimensions', () => {
    // Extended files can carry ALPH before the dimension-bearing chunk. Build
    // RIFF/WEBP with ALPH(2 bytes) then VP8 (10 bytes).
    const alph = Buffer.from([0xaa, 0xbb]);
    const vp8 = vp8Data(320, 240);
    const inner = Buffer.concat([
      Buffer.from('ALPH'),
      leU32(alph.length),
      alph,
      Buffer.from('VP8 '),
      leU32(vp8.length),
      vp8,
    ]);
    const buf = Buffer.concat([Buffer.from('RIFF'), leU32(4 + inner.length), Buffer.from('WEBP'), inner]);
    expect(parseDimensions(buf)).toEqual({ width: 320, height: 240 });
  });
});

describe('parseDimensions — JPEG', () => {
  it('reads dimensions from SOF0, skipping the APP0 segment', () => {
    expect(parseDimensions(jpeg(1920, 1080))).toEqual({ width: 1920, height: 1080 });
  });

  it('returns null when SOS is reached before any SOF', () => {
    // SOI then straight to SOS (0xFFDA) — no frame header.
    expect(parseDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xda]))).toBeNull();
  });
});

describe('parseDimensions — unknown / truncated', () => {
  it('returns null for unrecognised bytes', () => {
    expect(parseDimensions(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it('returns null for an empty buffer', () => {
    expect(parseDimensions(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for a too-short PNG', () => {
    expect(parseDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

function leU32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}
