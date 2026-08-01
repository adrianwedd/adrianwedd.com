import { useState, useRef, useEffect } from 'preact/hooks';

interface Props {
  src: string;
  title: string;
}

export default function AudioPlayer({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => {
      setDuration(audio.duration);
      setError(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    const onError = () => {
      setError(true);
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        // Autoplay policy blocked playback
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (e: Event) => {
    const audio = audioRef.current;
    const input = e.target as HTMLInputElement;
    if (!audio) return;
    audio.currentTime = parseFloat(input.value);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  };

  const cycleRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div class="border-border bg-surface-alt rounded-xl border p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          class="bg-accent text-surface hover:bg-accent-hover flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
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

        <button
          type="button"
          onClick={() => skip(-15)}
          class="text-text-muted hover:text-text flex h-11 w-11 flex-shrink-0 items-center justify-center rounded transition-colors"
          aria-label="Skip back 15 seconds"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => skip(30)}
          class="text-text-muted hover:text-text flex h-11 w-11 flex-shrink-0 items-center justify-center rounded transition-colors"
          aria-label="Skip forward 30 seconds"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"
            />
          </svg>
        </button>

        <div class="min-w-0 flex-1">
          <div class="text-text truncate text-sm font-medium">{title}</div>
          <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-text-muted text-xs tabular-nums">{formatTime(currentTime)}</span>
            {/* `min-w-24` is a floor, not `min-w-0`: the range input's ~129px
                intrinsic min-width used to widen the whole row on mobile, but
                letting it shrink freely lets the transport buttons squeeze it to
                0px at 320px. The floor plus `flex-wrap` above drops it onto its
                own full-width line instead of collapsing it. */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="5"
              value={currentTime}
              onInput={seek}
              class="accent-accent h-1 min-w-24 flex-1 cursor-pointer"
              aria-label="Seek"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            <span class="text-text-muted text-xs tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          class="border-border text-text-muted hover:border-accent hover:text-text min-h-11 rounded border px-3 text-xs tabular-nums transition-colors"
          aria-label={`Playback speed: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
      </div>

      {error && (
        <p role="alert" class="text-status-error mt-3 text-sm">
          Couldn't load this audio.{' '}
          <a href={src} class="hover:text-text underline">
            Open it directly
          </a>
          .
        </p>
      )}
    </div>
  );
}
