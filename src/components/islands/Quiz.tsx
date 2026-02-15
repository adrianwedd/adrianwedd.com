import { useState, useEffect } from 'preact/hooks';

interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface Props {
  src: string;
}

export default function Quiz({ src }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(src)
      .then((r) => r.json())
      .then((data) => setQuestions(Array.isArray(data) ? data : data.questions || []))
      .catch(() => setError('Failed to load quiz.'));
  }, [src]);

  if (error) return <p class="text-sm text-text-muted">{error}</p>;
  if (!questions.length) return <p class="text-sm text-text-muted">Loading...</p>;

  if (finished) {
    return (
      <div class="rounded-xl border border-border bg-surface-alt p-6 text-center">
        <p class="text-lg font-semibold text-text">
          {score} / {questions.length} correct
        </p>
        <button
          type="button"
          onClick={() => {
            setCurrent(0);
            setSelected(null);
            setScore(0);
            setFinished(false);
          }}
          class="hover:border-accent/50 mt-4 rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:text-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  const q = questions[current];
  const revealed = selected !== null;

  return (
    <div class="rounded-xl border border-border bg-surface-alt p-6">
      <p class="mb-3 text-xs text-text-muted">
        Question {current + 1} of {questions.length}
      </p>
      <p class="mb-4 text-sm font-medium text-text">{q.question}</p>
      <div class="space-y-2">
        {q.options.map((opt, i) => {
          let style = 'border-border text-text-muted';
          if (revealed) {
            if (i === q.answer) style = 'border-green-500 text-green-400';
            else if (i === selected) style = 'border-red-500 text-red-400';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => {
                setSelected(i);
                if (i === q.answer) setScore((s) => s + 1);
              }}
              class={`w-full rounded-lg border px-4 py-2 text-left text-sm transition-colors ${style} ${
                !revealed ? 'hover:border-accent/50 cursor-pointer hover:text-text' : ''
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {revealed && q.explanation && <p class="mt-3 text-xs text-text-muted">{q.explanation}</p>}
      {revealed && (
        <button
          type="button"
          onClick={() => {
            if (current + 1 >= questions.length) {
              setFinished(true);
            } else {
              setCurrent((c) => c + 1);
              setSelected(null);
            }
          }}
          class="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-hover"
        >
          {current + 1 >= questions.length ? 'See results' : 'Next'}
        </button>
      )}
    </div>
  );
}
