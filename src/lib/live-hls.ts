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
const MAX_POLL_FAILURES = 3;

class NeedsReseed extends Error {
  constructor() {
    super('Pipeline must reseed at the live edge');
  }
}

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
  private poll: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
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
    const signal = this.abort.signal;
    await new Promise<void>((resolve, reject) => {
      const settle = (error?: Error) => {
        this.source.removeEventListener('sourceopen', opened);
        this.source.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error);
        else resolve();
      };
      const opened = () => settle();
      const failed = () => settle(new Error('MediaSource failed'));
      // stop() before the source opens must settle this wait, not strand it.
      const aborted = () => settle(new DOMException('Stopped', 'AbortError'));
      this.source.addEventListener('sourceopen', opened);
      this.source.addEventListener('error', failed);
      signal.addEventListener('abort', aborted);
    });
    this.buffer = this.source.addSourceBuffer(MSE_MIME);
    this.buffer.mode = 'sequence';
    await this.refresh();
    this.schedule();
  }

  // One refresh at a time, rescheduled after the previous one settles. A single
  // failed poll is tolerated (the buffer holds several segments); repeated
  // failures hand recovery to the caller, as does the player's stall watchdog.
  private schedule(): void {
    if (this.abort.signal.aborted) return;
    this.poll = setTimeout(async () => {
      try {
        await this.refresh();
        this.failures = 0;
      } catch (error) {
        if (this.abort.signal.aborted) return;
        if (error instanceof NeedsReseed || ++this.failures >= MAX_POLL_FAILURES) {
          this.onFailure();
          return;
        }
      }
      this.schedule();
    }, POLL_MS);
  }

  stop(): void {
    this.abort.abort();
    if (this.poll) clearTimeout(this.poll);
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
      // Both listeners go on either outcome: a long session appends thousands of segments.
      const done = () => {
        buffer.removeEventListener('updateend', done);
        buffer.removeEventListener('error', failed);
        resolve();
      };
      const failed = () => {
        buffer.removeEventListener('updateend', done);
        buffer.removeEventListener('error', failed);
        reject(new Error('Append failed'));
      };
      buffer.addEventListener('updateend', done);
      buffer.addEventListener('error', failed);
      try {
        buffer.appendBuffer(chunk);
      } catch (error) {
        buffer.removeEventListener('updateend', done);
        buffer.removeEventListener('error', failed);
        reject(error);
      }
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
    // The producer restarted and renumbered: this pipeline's position is meaningless.
    // Failing the poll lets the caller reconnect with a fresh seed.
    if (this.seeded && playlist.sequence + playlist.segments.length < this.next - playlist.segments.length)
      throw new NeedsReseed();
    if (this.seeded && playlist.sequence + playlist.segments.length <= this.next) return;
    // The playlist has moved past what this pipeline holds (a suspended tab, a long
    // stall): appending the oldest retained segments would play stale audio under a
    // Live badge. Hand recovery to the caller, which reseeds at the live edge.
    if (this.seeded && playlist.sequence > this.next) throw new NeedsReseed();
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
    // The element can lag the SourceBuffer, so seek once a range exists.
    const goLive = () => {
      const ranges = this.audio.buffered;
      if (!ranges.length) return;
      const last = ranges.length - 1;
      this.audio.currentTime =
        Math.max(ranges.start(last), ranges.end(last) - PRUNE_SEGMENTS_BEHIND * this.target) + 0.05;
    };
    if (this.audio.buffered.length) goLive();
    else this.buffer?.addEventListener('updateend', goLive, { once: true });
  }
}
