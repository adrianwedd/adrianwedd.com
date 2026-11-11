import { describe, expect, it } from 'vitest';
import { parsePlaylist } from '../../src/lib/live-hls';

// Shape copied from the live https://undertow.wtf/live/stream.m3u8 (2026-11-10).
const LIVE = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:243075
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.994667,
#EXT-X-PROGRAM-DATE-TIME:2026-11-10T00:02:39.097+0000
seg-00243075.m4s
#EXTINF:5.994667,
seg-00243076.m4s
`;

describe('parsePlaylist', () => {
  it('reads sequence, target duration, init map and segments', () => {
    expect(parsePlaylist(LIVE)).toEqual({
      sequence: 243075,
      target: 6,
      init: 'init.mp4',
      segments: ['seg-00243075.m4s', 'seg-00243076.m4s'],
    });
  });

  it('tolerates CRLF line endings', () => {
    expect(parsePlaylist(LIVE.replace(/\n/g, '\r\n')).segments).toHaveLength(2);
  });

  it('refuses a body that is not a playlist (an error page, JSON)', () => {
    expect(() => parsePlaylist('{"error":"offline"}')).toThrow();
  });
});
