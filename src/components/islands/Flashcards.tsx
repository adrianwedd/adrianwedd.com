import { useState, useEffect } from 'preact/hooks';

interface Card {
  front: string;
  back: string;
}

interface Props {
  src: string;
}

export default function Flashcards({ src }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(src)
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : data.cards || []))
      .catch(() => setError('Failed to load flashcards.'));
  }, [src]);

  if (error) return <p class="text-text-muted text-sm">{error}</p>;
  if (!cards.length) return <p class="text-text-muted text-sm">Loading...</p>;

  const card = cards[current];

  return (
    <div class="border-border bg-surface-alt rounded-xl border p-6">
      <p class="text-text-muted mb-3 text-xs">
        Card {current + 1} of {cards.length}
      </p>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        class="hover:border-accent/50 border-border flex min-h-[8rem] w-full cursor-pointer items-center justify-center rounded-lg border p-6 transition-colors"
        aria-label={flipped ? 'Click to show question' : 'Click to reveal answer'}
      >
        <p class="text-text text-center text-sm" aria-live="polite">
          {flipped ? card.back : card.front}
        </p>
      </button>

      <p class="text-text-muted mt-2 text-center text-xs" aria-live="polite">
        {flipped ? 'Answer' : 'Click to reveal'}
      </p>

      <div class="mt-4 flex justify-between">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => {
            setCurrent((c) => c - 1);
            setFlipped(false);
          }}
          class="hover:border-accent/50 border-border text-text-muted hover:text-text rounded border px-3 py-1 text-sm transition-colors disabled:opacity-30"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={current === cards.length - 1}
          onClick={() => {
            setCurrent((c) => c + 1);
            setFlipped(false);
          }}
          class="hover:border-accent/50 border-border text-text-muted hover:text-text rounded border px-3 py-1 text-sm transition-colors disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
