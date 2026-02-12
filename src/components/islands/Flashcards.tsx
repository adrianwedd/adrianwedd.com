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
      .then(r => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : data.cards || []))
      .catch(() => setError('Failed to load flashcards.'));
  }, [src]);

  if (error) return <p class="text-sm text-text-muted">{error}</p>;
  if (!cards.length) return <p class="text-sm text-text-muted">Loading...</p>;

  const card = cards[current];

  return (
    <div class="rounded-xl bg-surface-alt border border-border p-6">
      <p class="text-xs text-text-muted mb-3">
        Card {current + 1} of {cards.length}
      </p>

      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        class="w-full min-h-[8rem] flex items-center justify-center p-6 rounded-lg border border-border hover:border-accent/50 transition-colors cursor-pointer"
      >
        <p class="text-sm text-text text-center">
          {flipped ? card.back : card.front}
        </p>
      </button>

      <p class="text-xs text-text-muted text-center mt-2">
        {flipped ? 'Answer' : 'Click to reveal'}
      </p>

      <div class="flex justify-between mt-4">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => { setCurrent(c => c - 1); setFlipped(false); }}
          class="px-3 py-1 rounded border border-border text-sm text-text-muted hover:text-text hover:border-accent/50 transition-colors disabled:opacity-30"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={current === cards.length - 1}
          onClick={() => { setCurrent(c => c + 1); setFlipped(false); }}
          class="px-3 py-1 rounded border border-border text-sm text-text-muted hover:text-text hover:border-accent/50 transition-colors disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
