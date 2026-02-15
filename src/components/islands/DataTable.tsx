import { useState, useEffect } from 'preact/hooks';

interface Props {
  src: string;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.trim().split('\n')) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

export default function DataTable({ src }: Props) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(src)
      .then((r) => r.text())
      .then((text) => {
        const parsed = parseCSV(text);
        if (parsed.length > 0) {
          setHeaders(parsed[0]);
          setRows(parsed.slice(1));
        }
      })
      .catch(() => setError('Failed to load data.'));
  }, [src]);

  if (error) return <p class="text-sm text-text-muted">{error}</p>;
  if (!headers.length) return <p class="text-sm text-text-muted">Loading...</p>;

  const sorted =
    sortCol !== null
      ? [...rows].sort((a, b) => {
          const va = a[sortCol] ?? '';
          const vb = b[sortCol] ?? '';
          const na = parseFloat(va);
          const nb = parseFloat(vb);
          if (!isNaN(na) && !isNaN(nb)) return sortAsc ? na - nb : nb - na;
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        })
      : rows;

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div class="max-h-[28rem] overflow-auto rounded-xl border border-border bg-surface-alt">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-surface-alt">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => handleSort(i)}
                class="cursor-pointer select-none border-b border-border px-3 py-2 text-left text-xs font-medium text-text-muted transition-colors hover:text-accent"
              >
                {h}
                {sortCol === i && <span class="ml-1">{sortAsc ? '\u25b2' : '\u25bc'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri} class="border-border/50 border-b transition-colors hover:bg-surface">
              {row.map((cell, ci) => (
                <td key={ci} class="px-3 py-2 text-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
