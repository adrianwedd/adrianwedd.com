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
    <div class="rounded-xl bg-surface-alt border border-border p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div class="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-accent text-surface hover:bg-accent-hover transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-text truncate">{title}</div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-text-muted tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onInput={seek}
              class="flex-1 h-1 accent-accent cursor-pointer"
              aria-label="Seek"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            />
            <span class="text-xs text-text-muted tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleRate}
          class="text-xs px-2 py-1 rounded border border-border text-text-muted hover:text-text hover:border-accent transition-colors tabular-nums"
          aria-label={`Playback speed: ${playbackRate}x`}
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
