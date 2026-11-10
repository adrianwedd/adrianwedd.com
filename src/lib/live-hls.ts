/**
 * Minimal live HLS playback for a single fMP4/AAC audio rendition.
 *
 * Mirrors the approach of Undertow's own `/listen/` page (undertow-radio
 * `station/web/listen/listen.js`): native HLS where the browser has it
 * (Safari, iOS), otherwise a small MediaSource pipeline that seeds the last few
 * segments of the live edge and appends whatever the playlist rotates in. No
 * third-party HLS library: the stream is one audio rendition with no variants,
 * encryption or discontinuities to negotiate.
 */

export interface Playlist {
  sequence: number;
  target: number;
  init: string | null;
  segments: string[];
}

export const MSE_MIME = 'audio/mp4; codecs="mp4a.40.2"';
const MEDIA_SEQUENCE_TAG = '#EXT-X-MEDIA-SEQUENCE:';
const TARGET_DURATION_TAG = '#EXT-X-TARGETDURATION:';
const MAX_SEED_SEGMENTS = 3;
const PRUNE_SEGMENTS_BEHIND = 2;
const POLL_MS = 3000;

export function parsePlaylist(text: string): Playlist {
  if (!text.startsWith('#EXTM3U')) throw new Error('Not an HLS playlist');
  let sequence = 0;
  let target = 2;
  let init: string | null = null;
  const segments: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(MEDIA_SEQUENCE_TAG)) sequence = Number(line.slice(MEDIA_SEQUENCE_TAG.length)) || 0;
    else if (line.startsWith(TARGET_DURATION_TAG)) target = Number(line.slice(TARGET_DURATION_TAG.length)) || target;
    else if (line.startsWith('#EXT-X-MAP:')) {
      const match = /URI="([^"]+)"/.exec(line);
      if (match) init = match[1];
    } else if (!line.startsWith('#')) segments.push(line);
  }
  return { sequence, target, init, segments };
}

export function canPlayNativeHls(audio: HTMLAudioElement): boolean {
  return audio.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export function canPlayMse(): boolean {
  return typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(MSE_MIME);
}

async function get(url: string, signal: AbortSignal): Promise<Response> {
  // Credential-free: the embed never needs, and the station never grants, cookies.
  const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

/**
 * Feeds one <audio> element from a live playlist through MediaSource. Every
 * fetch and append drains through a single serial chain: `appendBuffer`
 * rejects concurrent appends.
 */
export class MsePipeline {
  readonly source = new MediaSource();
  readonly objectURL: string;
  private chain: Promise<unknown> = Promise.resolve();
  private next = 0;
  private initAppended = false;
  private seeded = false;
  private target = 6;
  private buffer: SourceBuffer | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private readonly abort = new AbortController();

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly playlistUrl: string,
    private readonly onFailure: () => void,
  ) {
    this.objectURL = URL.createObjectURL(this.source);
  }

  /** Attach first (a MediaSource stays closed until attached), then seed. */
  async start(): Promise<void> {
    this.audio.src = this.objectURL;
    await new Promise<void>((resolve, reject) => {
      this.source.addEventListener('sourceopen', () => resolve(), { once: true });
      this.source.addEventListener('error', () => reject(new Error('MediaSource failed')), { once: true });
    });
    this.buffer = this.source.addSourceBuffer(MSE_MIME);
    this.buffer.mode = 'sequence';
    await this.refresh();
    this.poll = setInterval(() => {
      this.refresh().catch(() => {
        if (!this.abort.signal.aborted) this.onFailure();
      });
    }, POLL_MS);
  }

  stop(): void {
    this.abort.abort();
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
    try {
      if (this.source.readyState === 'open') this.source.endOfStream();
    } catch {
      /* already closed */
    }
    URL.revokeObjectURL(this.objectURL);
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const drained = this.chain.then(work);
    this.chain = drained.catch(() => {});
    return drained;
  }

  private async append(chunk: ArrayBuffer): Promise<void> {
    const buffer = this.buffer!;
    await new Promise<void>((resolve, reject) => {
      buffer.addEventListener('updateend', () => resolve(), { once: true });
      buffer.addEventListener('error', () => reject(new Error('Append failed')), { once: true });
      buffer.appendBuffer(chunk);
    });
  }

  /** Keep the SourceBuffer bounded to the live edge plus a little history. */
  private async prune(): Promise<void> {
    const buffer = this.buffer!;
    const ranges = buffer.buffered;
    if (!ranges.length || buffer.updating) return;
    const cutoff = Math.min(
      ranges.end(ranges.length - 1) - PRUNE_SEGMENTS_BEHIND * this.target,
      this.audio.currentTime - this.target,
    );
    if (cutoff <= ranges.start(0)) return;
    try {
      await new Promise<void>((resolve) => {
        buffer.addEventListener('updateend', () => resolve(), { once: true });
        buffer.remove(0, cutoff);
      });
    } catch {
      /* the browser may refuse a range it is still using; next pass */
    }
  }

  private async refresh(): Promise<void> {
    const signal = this.abort.signal;
    const playlist = parsePlaylist(await (await get(this.playlistUrl, signal)).text());
    this.target = playlist.target;
    if (this.seeded && playlist.sequence + playlist.segments.length <= this.next) return;
    await this.enqueue(async () => {
      if (!this.initAppended && playlist.init) {
        await this.append(await (await get(new URL(playlist.init, this.playlistUrl).href, signal)).arrayBuffer());
        this.initAppended = true;
      }
      const first = this.seeded
        ? this.next
        : Math.max(this.next, playlist.sequence + Math.max(0, playlist.segments.length - MAX_SEED_SEGMENTS));
      for (let i = 0; i < playlist.segments.length; i++) {
        const sequence = playlist.sequence + i;
        if (sequence < first) continue;
        const url = new URL(playlist.segments[i], this.playlistUrl).href;
        await this.append(await (await get(url, signal)).arrayBuffer());
        await this.prune();
        this.next = sequence + 1;
      }
    });
    if (signal.aborted) return;
    // An fMP4 init segment declares duration 0; a live stream has none.
    if (this.source.readyState === 'open' && this.source.duration === 0) this.source.duration = Infinity;
    if (this.seeded) return;
    this.seeded = true;
    // Start a little inside the newest buffered range so the next segment
    // arrives before the buffer runs dry.
    const ranges = this.audio.buffered;
    if (ranges.length) {
      const last = ranges.length - 1;
      this.audio.currentTime =
        Math.max(ranges.start(last), ranges.end(last) - PRUNE_SEGMENTS_BEHIND * this.target) + 0.05;
    }
  }
}
