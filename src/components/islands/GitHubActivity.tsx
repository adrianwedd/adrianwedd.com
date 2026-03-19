import { useState, useEffect } from 'preact/hooks';
import {
  type ProcessedActivity,
  type RepoStat,
  fetchEvents,
  processEventsCompact,
  eventIcon,
  USERNAME,
} from '../../lib/github-activity';

export default function GitHubActivity() {
  const [activities, setActivities] = useState<ProcessedActivity[]>([]);
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [commitCount, setCommitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const events = await fetchEvents();
        const result = processEventsCompact(events);
        if (!cancelled) {
          setActivities(result.activities);
          setRepos(result.repos);
          setCommitCount(result.commitCount);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error && err.message === 'rate-limit' ? 'rate-limit' : 'fetch-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div class="space-y-3 animate-pulse" aria-label="Loading GitHub activity" role="status">
        <div class="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} class="h-16 flex-1 rounded bg-surface-alt" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} class="h-10 rounded bg-surface-alt" />
        ))}
      </div>
    );
  }

  if (error === 'rate-limit') {
    return (
      <p class="text-sm text-text-muted italic">
        GitHub activity updates hourly. Check back soon.
      </p>
    );
  }

  if (error || activities.length === 0) {
    return (
      <p class="text-sm text-text-muted italic">
        Unable to load GitHub activity right now.
      </p>
    );
  }

  return (
    <div class="space-y-6" aria-live="polite">
      {/* Stats bar */}
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="rounded bg-surface-alt px-3 py-3 border border-border">
          <div class="text-xl font-semibold text-accent">{commitCount}</div>
          <div class="text-xs text-text-muted">commits (30d)</div>
        </div>
        <div class="rounded bg-surface-alt px-3 py-3 border border-border">
          <div class="text-xl font-semibold text-accent">{repos.length}</div>
          <div class="text-xs text-text-muted">active repos</div>
        </div>
        <div class="rounded bg-surface-alt px-3 py-3 border border-border">
          <div class="text-xl font-semibold text-accent">{activities.length}</div>
          <div class="text-xs text-text-muted">recent events</div>
        </div>
      </div>

      {/* Activity stream */}
      <div>
        <h3 class="text-sm font-medium text-text-muted mb-3">Activity</h3>
        <ul class="space-y-1">
          {activities.map((a) => (
            <li key={a.id} class="flex items-start gap-2 py-1.5 text-sm border-b border-border last:border-0">
              <span class="w-4 shrink-0 text-center text-text-muted" aria-hidden="true">
                {eventIcon(a.type)}
              </span>
              <span class="min-w-0 flex-1">
                <a
                  href={`https://github.com/${USERNAME}/${a.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-mono text-xs text-accent hover:underline"
                >
                  {a.repo}
                </a>
                <span class="text-text"> — </span>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" class="text-text hover:text-accent truncate">
                    {a.description}
                  </a>
                ) : (
                  <span class="text-text">{a.description}</span>
                )}
              </span>
              <span class="shrink-0 text-xs text-text-muted whitespace-nowrap">{a.time}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Active repos */}
      {repos.length > 0 && (
        <div>
          <h3 class="text-sm font-medium text-text-muted mb-3">Active repos (30d)</h3>
          <div class="flex flex-wrap gap-2">
            {repos.map((r) => (
              <a
                key={r.name}
                href={`https://github.com/${USERNAME}/${r.name}`}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 rounded bg-surface-alt px-2.5 py-1 text-xs border border-border hover:border-accent transition-colors"
              >
                <span class="font-mono text-accent">{r.name}</span>
                <span class="text-text-muted">{r.commits} commits</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Loaded from{' '}
        <a
          href={`https://github.com/${USERNAME}`}
          target="_blank"
          rel="noopener noreferrer"
          class="text-accent hover:underline"
        >
          GitHub
        </a>
        . Refreshes on page load.
      </p>
    </div>
  );
}
