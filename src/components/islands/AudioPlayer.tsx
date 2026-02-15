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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
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
    <div class="rounded-xl border border-border bg-surface-alt p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-surface transition-colors hover:bg-accent-hover"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg class="ml-0.5 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(-15)}
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:text-text"
          aria-label="Skip back 15 seconds"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => skip(30)}
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:text-text"
          aria-label="Skip forward 30 seconds"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>

        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-text">{title}</div>
          <div class="mt-1 flex items-center gap-2">
            <span class="text-xs tabular-nums text-text-muted">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onInput={seek}
              class="h-1 flex-1 cursor-pointer accent-accent"
              aria-label="Seek"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            <span class="text-xs tabular-nums text-text-muted">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          class="rounded border border-border px-2 py-1 text-xs tabular-nums text-text-muted transition-colors hover:border-accent hover:text-text"
          aria-label={`Playback speed: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
