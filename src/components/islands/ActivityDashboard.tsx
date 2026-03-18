// src/components/islands/ActivityDashboard.tsx

import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import {
  type GitHubEvent,
  type GitHubRepo,
  type ProcessedActivity,
  fetchEvents,
  fetchAllRepos,
  processEvents,
  eventIcon,
  relativeTime,
  USERNAME,
} from '../../lib/github-activity';

type TimeRange = '24h' | '7d' | '30d' | 'all';
type ViewMode = 'grid' | 'list';

function filterByTimeRange(activities: ProcessedActivity[], events: GitHubEvent[], range: TimeRange): ProcessedActivity[] {
  if (range === 'all') return activities;
  const now = Date.now();
  const cutoffs: Record<TimeRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    all: Infinity,
  };
  const cutoff = now - cutoffs[range];
  const validIds = new Set(
    events.filter((e) => new Date(e.created_at).getTime() > cutoff).map((e) => e.id)
  );
  return activities.filter((a) => validIds.has(a.id));
}

export default function ActivityDashboard() {
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [repoFilter, setRepoFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedActivity, setSelectedActivity] = useState<ProcessedActivity | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and Escape handler for modal
  useEffect(() => {
    if (!selectedActivity) return;
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedActivity(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedActivity]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [evts, rps] = await Promise.all([fetchEvents(), fetchAllRepos()]);
        if (!cancelled) {
          setEvents(evts);
          setRepos(rps.filter((r) => !r.fork && !r.archived));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'fetch-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 120_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const processed = useMemo(() => processEvents(events), [events]);

  const activeDays = useMemo(() => {
    const days = new Set(
      events
        .filter((e) => new Date(e.created_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000)
        .map((e) => new Date(e.created_at).toDateString())
    );
    return days.size;
  }, [events]);

  const languages = useMemo(() => {
    const langSet = new Set(repos.map((r) => r.language).filter(Boolean));
    return langSet.size;
  }, [repos]);

  const filteredActivities = useMemo(() => {
    let items = filterByTimeRange(processed.activities, events, timeRange);
    if (typeFilter !== 'all') items = items.filter((a) => a.type === typeFilter);
    if (repoFilter !== 'all') items = items.filter((a) => a.repo === repoFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a) => a.description.toLowerCase().includes(q) || a.repo.toLowerCase().includes(q));
    }
    return items;
  }, [processed.activities, events, typeFilter, timeRange, repoFilter, search]);

  const eventTypes = useMemo(() => {
    const types = new Set(processed.activities.map((a) => a.type));
    return Array.from(types).sort();
  }, [processed.activities]);

  const repoNames = useMemo(() => {
    const names = new Set(processed.activities.map((a) => a.repo));
    return Array.from(names).sort();
  }, [processed.activities]);

  if (loading) {
    return (
      <div class="space-y-6 animate-pulse" role="status" aria-label="Loading activity dashboard">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} class="h-20 rounded-lg bg-surface-alt" />)}
        </div>
        <div class="h-10 rounded bg-surface-alt" />
        {[1, 2, 3, 4, 5].map((i) => <div key={i} class="h-12 rounded bg-surface-alt" />)}
      </div>
    );
  }

  if (error === 'rate-limit') {
    return (
      <div class="rounded-lg border border-border bg-surface-alt p-8 text-center">
        <p class="text-text-muted">GitHub API rate limit reached. Updates hourly.</p>
        <p class="mt-2 text-xs text-text-muted">Try refreshing in a few minutes.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div class="rounded-lg border border-border bg-surface-alt p-8 text-center">
        <p class="text-text-muted">Unable to load activity right now.</p>
      </div>
    );
  }

  return (
    <div class="space-y-8">
      {/* Metrics bar */}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Commits (30d)', value: processed.commitCount },
          { label: 'Active days', value: activeDays },
          { label: 'Repositories', value: repos.length },
          { label: 'Languages', value: languages },
        ].map((m) => (
          <div key={m.label} class="rounded-lg border border-border bg-surface-raised p-4 text-center">
            <div class="text-2xl font-semibold text-accent">{m.value}</div>
            <div class="mt-1 text-xs text-text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div class="flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e: Event) => setTypeFilter((e.target as HTMLSelectElement).value)}
          class="rounded border border-border bg-surface-alt px-3 py-1.5 text-sm text-text"
          aria-label="Filter by event type"
        >
          <option value="all">All types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t.replace('Event', '')}</option>
          ))}
        </select>

        <select
          value={timeRange}
          onChange={(e: Event) => setTimeRange((e.target as HTMLSelectElement).value as TimeRange)}
          class="rounded border border-border bg-surface-alt px-3 py-1.5 text-sm text-text"
          aria-label="Filter by time range"
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>

        <select
          value={repoFilter}
          onChange={(e: Event) => setRepoFilter((e.target as HTMLSelectElement).value)}
          class="rounded border border-border bg-surface-alt px-3 py-1.5 text-sm text-text"
          aria-label="Filter by repository"
        >
          <option value="all">All repos</option>
          {repoNames.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search..."
          value={search}
          onInput={(e: Event) => setSearch((e.target as HTMLInputElement).value)}
          class="rounded border border-border bg-surface-alt px-3 py-1.5 text-sm text-text placeholder:text-text-muted"
          aria-label="Search activity"
        />
      </div>

      {/* Activity stream */}
      <div>
        <h2 class="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">Activity</h2>
        {filteredActivities.length === 0 ? (
          <p class="text-sm text-text-muted italic">No matching activity.</p>
        ) : (
          <ul aria-live="polite">
            {filteredActivities.map((a) => (
              <li key={a.id} class="flex items-start gap-3 border-b border-border py-3 last:border-0">
                <span class="mt-0.5 w-5 shrink-0 text-center text-text-muted" aria-hidden="true">
                  {eventIcon(a.type)}
                </span>
                <button
                  class="min-w-0 flex-1 text-left"
                  onClick={() => setSelectedActivity(a)}
                  aria-label={`View details: ${a.description}`}
                >
                  <span class="font-mono text-xs text-accent">{a.repo}</span>
                  <span class="text-text"> — </span>
                  <span class="text-sm text-text">{a.description}</span>
                </button>
                <span class="shrink-0 text-xs text-text-muted whitespace-nowrap">{a.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Repository grid */}
      <div>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-sm font-medium uppercase tracking-wider text-text-muted">Repositories</h2>
          <div class="flex gap-1">
            {(['grid', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                class={`rounded px-2 py-1 text-xs ${viewMode === mode ? 'bg-accent text-surface' : 'text-text-muted hover:text-text'}`}
                aria-label={`${mode} view`}
                aria-pressed={viewMode === mode}
              >
                {mode === 'grid' ? '▦' : '☰'}
              </button>
            ))}
          </div>
        </div>
        <div class={viewMode === 'grid' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'}>
          {repos.slice(0, 18).map((r) => (
            <a
              key={r.full_name}
              href={`https://github.com/${r.full_name}`}
              target="_blank"
              rel="noopener noreferrer"
              class="block rounded-lg border border-border bg-surface-alt p-4 transition-colors hover:border-accent"
            >
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm text-accent">{r.name}</span>
                {r.language && <span class="text-xs text-text-muted">{r.language}</span>}
              </div>
              {r.description && (
                <p class="mt-1 text-xs text-text-muted line-clamp-2">{r.description}</p>
              )}
              <div class="mt-2 flex items-center gap-3 text-xs text-text-muted">
                {r.stargazers_count > 0 && <span>★ {r.stargazers_count}</span>}
                <span>{relativeTime(r.pushed_at)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {selectedActivity && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e: Event) => { if (e.target === e.currentTarget) setSelectedActivity(null); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-modal-title"
        >
          <div
            class="w-full max-w-md rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
            onClick={(e: Event) => e.stopPropagation()}
          >
            <div class="mb-4 flex items-center justify-between">
              <h3 id="activity-modal-title" class="text-sm font-medium text-text">Activity Detail</h3>
              <button ref={closeButtonRef} onClick={() => setSelectedActivity(null)} class="text-text-muted hover:text-text" aria-label="Close">✕</button>
            </div>
            <dl class="space-y-2 text-sm">
              <div><dt class="text-text-muted">Type</dt><dd class="text-text">{selectedActivity.type.replace('Event', '')}</dd></div>
              <div><dt class="text-text-muted">Repository</dt><dd><a href={`https://github.com/${USERNAME}/${selectedActivity.repo}`} target="_blank" rel="noopener noreferrer" class="font-mono text-accent hover:underline">{selectedActivity.repo}</a></dd></div>
              <div><dt class="text-text-muted">Description</dt><dd class="text-text">{selectedActivity.description}</dd></div>
              <div><dt class="text-text-muted">Time</dt><dd class="text-text">{selectedActivity.time}</dd></div>
              {selectedActivity.url && (
                <div><dt class="text-text-muted">Link</dt><dd><a href={selectedActivity.url} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">View on GitHub</a></dd></div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Footer */}
      <p class="text-xs text-text-muted">
        Live from{' '}
        <a href={`https://github.com/${USERNAME}`} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">
          GitHub
        </a>
        . Refreshes every 2 minutes. Rate limit: 60 requests/hour.
      </p>
    </div>
  );
}
