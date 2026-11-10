import { useEffect, useRef, useState } from 'preact/hooks';
import { MsePipeline, canPlayMse, canPlayNativeHls } from '../../lib/live-hls';

interface Props {
  label: string;
  streamUrl: string;
  nowPlayingUrl?: string;
  entryUrl: string;
  /** The station's own lightweight player, offered when this one can't play. */
  fallbackUrl?: string;
}

type State = 'idle' | 'connecting' | 'live' | 'buffering' | 'reconnecting' | 'offline' | 'unsupported';

interface NowPlaying {
  title: string;
  artist: string;
}

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const MAX_RECONNECTS = 8;
const STALL_MS = 15000;
const NOW_PLAYING_MS = 20000;
const NOW_PLAYING_TIMEOUT_MS = 10000;

const BADGE: Record<State, string> = {
  idle: '',
  connecting: 'Tuning',
  live: 'Live',
  buffering: 'Buffering',
  reconnecting: 'Reconnecting',
  offline: 'Off air',
  unsupported: 'Unsupported',
};

const STATUS: Record<State, string> = {
  idle: '',
  connecting: 'Connecting to the live stream…',
  live: 'Playing live.',
  buffering: 'Buffering…',
  reconnecting: 'Can’t reach the stream. Retrying…',
  offline: 'The live stream is unavailable right now. Press play to try again.',
  unsupported: 'This browser can’t play the live stream here.',
};

/**
 * Live player for an HLS radio stream. Playback starts only from a press;
 * "pause" stops the stream so the next play rejoins the live edge rather than
 * resuming stale audio. Now-playing text is shown only as the station supplies it.
 */
export default function LiveRadio({ label, streamUrl, nowPlayingUrl, entryUrl, fallbackUrl }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>('idle');
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [quiet, setQuiet] = useState(false);
  const [notice, setNotice] = useState('');

  // Mutable session state that event handlers read without re-rendering.
  const session = useRef({
    intended: false,
    pipeline: null as MsePipeline | null,
    reconnectTimer: null as ReturnType<typeof setTimeout> | null,
    attempts: 0,
    delay: RECONNECT_BASE_MS,
    progressAt: 0,
    progressTime: 0,
    mode: '' as '' | 'native' | 'mse',
    // canPlayType() only says "maybe": once native HLS has refused this stream's
    // format, later attempts use the MediaSource pipeline where it exists.
    nativeRefused: false,
  });

  const playing = state === 'connecting' || state === 'live' || state === 'buffering' || state === 'reconnecting';

  function teardown() {
    const s = session.current;
    s.pipeline?.stop();
    s.pipeline = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }

  function scheduleReconnect() {
    const s = session.current;
    if (!s.intended || s.reconnectTimer) return;
    teardown();
    if (s.attempts >= MAX_RECONNECTS) {
      s.intended = false;
      setState('offline');
      return;
    }
    s.attempts++;
    setState('reconnecting');
    s.reconnectTimer = setTimeout(() => {
      s.reconnectTimer = null;
      void connect();
    }, s.delay);
    s.delay = Math.min(s.delay * 2, RECONNECT_MAX_MS);
  }

  async function connect() {
    const s = session.current;
    const audio = audioRef.current;
    if (!audio || !s.intended) return;
    setState('connecting');
    s.progressAt = performance.now();
    s.progressTime = audio.currentTime;
    try {
      if (canPlayNativeHls(audio) && !(s.nativeRefused && canPlayMse())) {
        s.mode = 'native';
        audio.src = streamUrl;
        // play() must follow the press directly (iOS): nothing is awaited first.
        await audio.play();
      } else if (canPlayMse()) {
        s.mode = 'mse';
        const pipeline = new MsePipeline(audio, streamUrl, scheduleReconnect);
        s.pipeline = pipeline;
        const started = pipeline.start();
        // Calling play() inside the gesture keeps the activation; it resolves once data arrives.
        const play = audio.play();
        play.catch(() => {});
        await started;
        await play;
      } else {
        s.intended = false;
        setState('unsupported');
        return;
      }
    } catch (failure) {
      if (!s.intended) return;
      if ((failure as DOMException)?.name === 'NotAllowedError') {
        // The browser refused playback without a fresh press.
        s.intended = false;
        teardown();
        setState('idle');
        setNotice('Press play to start listening.');
        return;
      }
      if (s.mode === 'native' && (failure as DOMException)?.name === 'NotSupportedError') s.nativeRefused = true;
      scheduleReconnect();
    }
  }

  function start() {
    const s = session.current;
    s.intended = true;
    s.attempts = 0;
    s.delay = RECONNECT_BASE_MS;
    setNotice('');
    if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
    s.reconnectTimer = null;
    void connect();
  }

  function stop() {
    const s = session.current;
    s.intended = false;
    if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
    s.reconnectTimer = null;
    teardown();
    setState('idle');
  }

  // Media element events drive the visible state while a session is wanted.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const s = session.current;
    const onPlaying = () => {
      if (!s.intended) return;
      s.attempts = 0;
      s.delay = RECONNECT_BASE_MS;
      setState('live');
    };
    const onWaiting = () => {
      if (s.intended && !s.reconnectTimer) setState((current) => (current === 'live' ? 'buffering' : current));
    };
    const onError = () => {
      if (!s.intended) return;
      // A format or decode refusal (not a network failure) rules out native HLS here.
      const code = audio.error?.code;
      if (
        s.mode === 'native' &&
        (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || code === MediaError.MEDIA_ERR_DECODE)
      )
        s.nativeRefused = true;
      scheduleReconnect();
    };
    // A pause from outside the button (headset, OS media controls) stops the stream too.
    const onPause = () => {
      if (s.intended && !s.reconnectTimer && !audio.ended && audio.getAttribute('src')) stop();
    };
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    audio.addEventListener('pause', onPause);
    // Recover only once playback has genuinely stopped advancing: native HLS
    // reports `stalled` between ordinary playlist refreshes.
    const watchdog = setInterval(() => {
      if (!s.intended || s.reconnectTimer) return;
      if (audio.currentTime > s.progressTime + 0.05) s.progressAt = performance.now();
      s.progressTime = audio.currentTime;
      if (performance.now() - s.progressAt > STALL_MS) scheduleReconnect();
    }, 1000);
    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('pause', onPause);
      clearInterval(watchdog);
      s.intended = false;
      if (s.reconnectTimer) clearTimeout(s.reconnectTimer);
      teardown();
    };
  }, []);

  // Now playing: read only once the visitor has pressed Play (no request to the
  // station on page view), then a slow poll while listening; the last answer
  // stays shown after a stop.
  useEffect(() => {
    if (!nowPlayingUrl || !playing) return;
    let cancelled = false;
    let pending = false;
    const abort = new AbortController();
    const read = async () => {
      // One read at a time: a slow answer must not land after a newer one.
      if (pending) return;
      pending = true;
      // Each read has a deadline, so one stalled request can't block later polls.
      const request = new AbortController();
      const cancel = () => request.abort();
      abort.signal.addEventListener('abort', cancel);
      const deadline = setTimeout(cancel, NOW_PLAYING_TIMEOUT_MS);
      try {
        const response = await fetch(nowPlayingUrl, {
          cache: 'no-store',
          credentials: 'omit',
          signal: request.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const report = await response.json();
        if (cancelled) return;
        const now = report?.now;
        if (now === null) {
          setNowPlaying(null);
          setQuiet(true);
        } else if (now && typeof now.title === 'string' && typeof now.artist === 'string') {
          const title = now.title.trim();
          const artist = now.artist.trim();
          // The station sends empty strings for facts it doesn't have: show nothing.
          setNowPlaying(title || artist ? { title, artist } : null);
          setQuiet(false);
        } else throw new Error('malformed');
      } catch {
        // Unknown is shown as nothing, never as a guess.
        if (!cancelled) {
          setNowPlaying(null);
          setQuiet(false);
        }
      } finally {
        clearTimeout(deadline);
        abort.signal.removeEventListener('abort', cancel);
        pending = false;
      }
    };
    void read();
    const timer = setInterval(read, NOW_PLAYING_MS);
    return () => {
      cancelled = true;
      abort.abort();
      clearInterval(timer);
    };
  }, [nowPlayingUrl, playing]);

  // Lock-screen / headset controls and metadata, held only while this player is
  // playing. On stop or unmount (e.g. a View Transition away) they are released,
  // unless another player has since taken the session.
  useEffect(() => {
    if (!playing || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    let metadata: MediaMetadata | null = null;
    const handler = () => stop();
    try {
      metadata = new MediaMetadata({
        title: nowPlaying?.title || label,
        artist: nowPlaying?.artist || label,
        album: label,
      });
      session.metadata = metadata;
      session.setActionHandler('pause', handler);
      session.setActionHandler('stop', handler);
    } catch {
      /* partial Media Session support */
    }
    return () => {
      if (!metadata || session.metadata !== metadata) return;
      try {
        session.metadata = null;
        session.setActionHandler('pause', null);
        session.setActionHandler('stop', null);
      } catch {
        /* partial Media Session support */
      }
    };
  }, [playing, nowPlaying, label]);

  const status = notice || STATUS[state];
  const live = state === 'live';

  return (
    <div class="border-border bg-surface-alt rounded-xl border p-4" data-live-radio data-state={state}>
      <audio ref={audioRef} preload="none" />
      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? stop() : start())}
          class="bg-accent text-surface hover:bg-accent-hover flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors"
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        >
          {playing ? (
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg class="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-text text-sm font-medium">{label}</span>
            {BADGE[state] && (
              <span
                class={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-medium tracking-wide uppercase ${
                  live ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-text-muted'
                }`}
              >
                <span
                  class={`h-1.5 w-1.5 rounded-full ${live ? 'bg-accent motion-safe:animate-pulse' : 'bg-text-muted'}`}
                  aria-hidden="true"
                />
                {BADGE[state]}
              </span>
            )}
          </div>
          {nowPlaying ? (
            <p class="text-text-muted mt-1 truncate text-xs" title={`${nowPlaying.artist} — ${nowPlaying.title}`}>
              <span class="sr-only">Now playing: </span>
              {nowPlaying.artist && <span class="text-text">{nowPlaying.artist}</span>}
              {nowPlaying.artist && nowPlaying.title && ' — '}
              {nowPlaying.title}
            </p>
          ) : (
            quiet && <p class="text-text-muted mt-1 text-xs">The station is quiet.</p>
          )}
        </div>
      </div>

      <div class="mt-2 flex items-center justify-between gap-3">
        <p role="status" aria-live="polite" class="text-text-muted min-h-4 text-xs">
          {status}
        </p>
        {fallbackUrl && (state === 'offline' || state === 'unsupported') ? (
          <a
            href={fallbackUrl}
            class="text-text-muted hover:text-accent flex-shrink-0 text-xs transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try the station’s player ↗
          </a>
        ) : (
          <a
            href={entryUrl}
            class="text-text-muted hover:text-accent flex-shrink-0 text-xs transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Enter the room ↗
          </a>
        )}
      </div>
    </div>
  );
}
