import { useState, useMemo, useRef } from 'preact/hooks';

export type TrendPoint = {
  date: string;
  pageviews: number;
  users: number;
  engagedSessions: number;
};

type MetricKey = 'pageviews' | 'users' | 'engagedSessions';

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: 'pageviews', label: 'Pageviews' },
  { key: 'users', label: 'Visitors' },
  { key: 'engagedSessions', label: 'Engaged sessions' },
];

// Fixed drawing space; the SVG scales to its container via CSS. Strokes use
// vector-effect="non-scaling-stroke" so they stay hairline at any width.
const W = 720;
const H = 240;
const PAD = { top: 16, right: 8, bottom: 28, left: 40 };

/** Centred 7-day moving average. Endpoints average over whatever window exists. */
function movingAverage(values: number[], window = 7): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length, i + half + 1);
    const slice = values.slice(lo, hi);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function niceCeil(n: number): number {
  if (n <= 0) return 10;
  const mag = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / mag) * mag;
}

export default function TrendChart({ series }: { series: TrendPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>('pageviews');
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const model = useMemo(() => {
    const values = series.map((p) => p[metric]);
    const avg = movingAverage(values);
    const yMax = niceCeil(Math.max(...values, 1));
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    // Guard the single-point case: dividing by (n-1) would be NaN.
    const x = (i: number) => PAD.left + (series.length < 2 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

    const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    const area = `${line} L${x(values.length - 1).toFixed(2)},${(PAD.top + plotH).toFixed(2)} L${x(0).toFixed(2)},${(PAD.top + plotH).toFixed(2)} Z`;
    const avgLine = avg.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

    const total = values.reduce((a, b) => a + b, 0);
    const peakIdx = values.indexOf(Math.max(...values));

    // Month boundaries make better gridlines than evenly-spaced ticks.
    const monthTicks = series
      .map((p, i) => ({ i, day: p.date.slice(8, 10), label: p.date.slice(0, 7) }))
      .filter((t) => t.day === '01');

    return { values, yMax, line, area, avgLine, total, peakIdx, x, y, plotH, monthTicks };
  }, [series, metric]);

  if (!series.length) {
    return <p class="text-text-muted text-sm">No trend data available yet.</p>;
  }

  const active = hover ?? model.values.length - 1;
  const activePoint = series[active];

  function onMove(e: PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const plotRatio = (ratio * W - PAD.left) / (W - PAD.left - PAD.right);
    const idx = Math.round(plotRatio * (series.length - 1));
    setHover(Math.min(series.length - 1, Math.max(0, idx)));
  }

  const fmtDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      {/* Metric switcher */}
      <div class="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose metric">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            aria-pressed={metric === m.key}
            class={`rounded-full px-3 py-1 text-xs transition-colors ${
              metric === m.key
                ? 'bg-accent/15 text-accent font-medium'
                : 'bg-surface-raised text-text-muted hover:text-accent'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Readout — reflects the hovered day, or the latest when not hovering */}
      <div class="mb-2 flex items-baseline gap-3">
        <span class="text-accent text-3xl font-semibold tabular-nums">{activePoint[metric].toLocaleString()}</span>
        <span class="text-text-muted font-mono text-xs">{fmtDate(activePoint.date)}</span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        class="h-auto w-full touch-none"
        role="img"
        aria-label={`${METRICS.find((m) => m.key === metric)?.label} per day from ${fmtDate(series[0].date)} to ${fmtDate(series[series.length - 1].date)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines + y labels */}
        {[0, 0.5, 1].map((f) => {
          const v = model.yMax * f;
          const yy = model.y(v);
          return (
            <g key={f}>
              <line
                x1={PAD.left}
                y1={yy}
                x2={W - PAD.right}
                y2={yy}
                stroke="var(--color-border)"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
              <text x={PAD.left - 8} y={yy + 4} text-anchor="end" font-size="10" fill="var(--color-text-muted)">
                {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : v}
              </text>
            </g>
          );
        })}

        {/* Month boundaries */}
        {model.monthTicks.map((t) => (
          <g key={t.i}>
            <line
              x1={model.x(t.i)}
              y1={PAD.top}
              x2={model.x(t.i)}
              y2={PAD.top + model.plotH}
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2 4"
              vector-effect="non-scaling-stroke"
            />
            <text x={model.x(t.i)} y={H - 8} text-anchor="middle" font-size="10" fill="var(--color-text-muted)">
              {new Date(`${t.label}-01T00:00:00`).toLocaleDateString('en-AU', { month: 'short' })}
            </text>
          </g>
        ))}

        <path d={model.area} fill="url(#trend-fill)" />
        <path
          d={model.line}
          fill="none"
          stroke="var(--color-accent)"
          stroke-width="1.5"
          stroke-opacity="0.55"
          vector-effect="non-scaling-stroke"
        />
        {/* 7-day moving average — the actual trend line through the daily noise */}
        <path
          d={model.avgLine}
          fill="none"
          stroke="var(--color-accent)"
          stroke-width="2.25"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />

        {/* Hover crosshair */}
        {hover !== null && (
          <g>
            <line
              x1={model.x(hover)}
              y1={PAD.top}
              x2={model.x(hover)}
              y2={PAD.top + model.plotH}
              stroke="var(--color-accent)"
              stroke-width="1"
              stroke-opacity="0.5"
              vector-effect="non-scaling-stroke"
            />
            <circle
              cx={model.x(hover)}
              cy={model.y(model.values[hover])}
              r="3.5"
              fill="var(--color-accent)"
              stroke="var(--color-surface)"
              stroke-width="1.5"
            />
          </g>
        )}
      </svg>

      {/* Summary strip */}
      <dl class="border-border mt-4 grid grid-cols-3 gap-4 border-t pt-4">
        <div>
          <dt class="text-text-muted text-xs">Total</dt>
          <dd class="text-text font-semibold tabular-nums">{model.total.toLocaleString()}</dd>
        </div>
        <div>
          <dt class="text-text-muted text-xs">Daily average</dt>
          <dd class="text-text font-semibold tabular-nums">
            {Math.round(model.total / model.values.length).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt class="text-text-muted text-xs">Peak day</dt>
          <dd class="text-text font-semibold tabular-nums">
            {model.values[model.peakIdx].toLocaleString()}
            <span class="text-text-muted ml-1 font-mono text-xs">{series[model.peakIdx].date.slice(5)}</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
