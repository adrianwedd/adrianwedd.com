import { useState, useEffect } from 'preact/hooks';

const USERNAME = 'adrianwedd';
const API_URL = `https://api.github.com/users/${USERNAME}/events/public`;
const CACHE_KEY = 'adrianwedd_gh_activity';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: {
    commits?: { message: string; sha: string }[];
    action?: string;
    pull_request?: { title: string; html_url: string; number: number };
    issue?: { title: string; html_url: string; number: number };
    ref?: string;
    ref_type?: string;
  };
}

interface ProcessedActivity {
  id: string;
  type: string;
  repo: string;
  time: string;
  description: string;
  url?: string;
}

interface RepoStat {
  name: string;
  commits: number;
  lastActive: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function processEvents(events: GitHubEvent[]): { activities: ProcessedActivity[]; repos: RepoStat[]; commitCount: number } {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const repoMap = new Map<string, RepoStat>();
  let commitCount = 0;
  const activities: ProcessedActivity[] = [];

  for (const event of events) {
    const repoShort = event.repo.name.replace(`${USERNAME}/`, '');
    const time = relativeTime(event.created_at);
    const eventTime = new Date(event.created_at).getTime();

    // Count commits in last 30 days
    if (event.type === 'PushEvent' && event.payload.commits && eventTime > thirtyDaysAgo) {
      const count = event.payload.commits.length;
      commitCount += count;
      const existing = repoMap.get(repoShort);
      if (existing) {
        existing.commits += count;
      } else {
        repoMap.set(repoShort, { name: repoShort, commits: count, lastActive: time });
      }
    }

    // Build activity stream (limit to 12)
    if (activities.length >= 12) continue;

    let description = '';
    let url: string | undefined;

    switch (event.type) {
      case 'PushEvent': {
        const commits = event.payload.commits ?? [];
        const msg = commits[0]?.message?.split('\n')[0] ?? 'pushed code';
        const count = commits.length;
        description = count > 1 ? `${count} commits: ${msg}` : msg;
        url = `https://github.com/${event.repo.name}`;
        break;
      }
      case 'PullRequestEvent':
        description = `${event.payload.action} PR #${event.payload.pull_request?.number}: ${event.payload.pull_request?.title}`;
        url = event.payload.pull_request?.html_url;
        break;
      case 'IssuesEvent':
        description = `${event.payload.action} issue #${event.payload.issue?.number}: ${event.payload.issue?.title}`;
        url = event.payload.issue?.html_url;
        break;
      case 'CreateEvent':
        description = `created ${event.payload.ref_type}${event.payload.ref ? ` ${event.payload.ref}` : ''}`;
        url = `https://github.com/${event.repo.name}`;
        break;
      case 'DeleteEvent':
        description = `deleted ${event.payload.ref_type} ${event.payload.ref ?? ''}`;
        break;
      case 'WatchEvent':
        description = 'starred repo';
        url = `https://github.com/${event.repo.name}`;
        break;
      case 'ForkEvent':
        description = 'forked repo';
        url = `https://github.com/${event.repo.name}`;
        break;
      case 'IssueCommentEvent':
        description = `commented on #${event.payload.issue?.number}`;
        url = event.payload.issue?.html_url;
        break;
      default:
        description = event.type.replace('Event', '').toLowerCase();
    }

    activities.push({ id: event.id, type: event.type, repo: repoShort, time, description, url });
  }

  const repos = Array.from(repoMap.values()).sort((a, b) => b.commits - a.commits).slice(0, 6);
  return { activities, repos, commitCount };
}

function eventIcon(type: string): string {
  switch (type) {
    case 'PushEvent': return '⬆';
    case 'PullRequestEvent': return '⤴';
    case 'IssuesEvent': return '◉';
    case 'CreateEvent': return '+';
    case 'DeleteEvent': return '×';
    case 'WatchEvent': return '★';
    case 'ForkEvent': return '⑂';
    case 'IssueCommentEvent': return '💬';
    default: return '·';
  }
}

type CacheData = { events: GitHubEvent[]; timestamp: number };

function getCached(): GitHubEvent[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data: CacheData = JSON.parse(raw);
    if (Date.now() - data.timestamp > CACHE_TTL) return null;
    return data.events;
  } catch {
    return null;
  }
}

function setCache(events: GitHubEvent[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: Date.now() }));
  } catch {
    // storage full or unavailable
  }
}

export default function GitHubActivity() {
  const [activities, setActivities] = useState<ProcessedActivity[]>([]);
  const [repos, setRepos] = useState<RepoStat[]>([]);
  const [commitCount, setCommitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      // Check cache first
      const cached = getCached();
      if (cached) {
        const result = processEvents(cached);
        if (!cancelled) {
          setActivities(result.activities);
          setRepos(result.repos);
          setCommitCount(result.commitCount);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${API_URL}?per_page=100`);
        if (res.status === 403) {
          if (!cancelled) setError('rate-limit');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const events: GitHubEvent[] = await res.json();
        setCache(events);
        const result = processEvents(events);

        if (!cancelled) {
          setActivities(result.activities);
          setRepos(result.repos);
          setCommitCount(result.commitCount);
        }
      } catch {
        if (!cancelled) setError('fetch-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchActivity();
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
                  rel="noopener"
                  class="font-mono text-xs text-accent hover:underline"
                >
                  {a.repo}
                </a>
                <span class="text-text"> — </span>
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener" class="text-text hover:text-accent truncate">
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
                rel="noopener"
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
        Live from{' '}
        <a
          href={`https://github.com/${USERNAME}`}
          target="_blank"
          rel="noopener"
          class="text-accent hover:underline"
        >
          GitHub
        </a>
        . Updates every few minutes.
      </p>
    </div>
  );
}
