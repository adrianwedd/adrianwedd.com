// src/lib/github-activity.ts

export const USERNAME = 'adrianwedd';
export const EVENTS_URL = `https://api.github.com/users/${USERNAME}/events/public`;
export const REPOS_URL = `https://api.github.com/users/${USERNAME}/repos`;
export const CACHE_KEY = 'adrianwedd_gh_activity';
export const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface GitHubEvent {
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

export interface ProcessedActivity {
  id: string;
  type: string;
  repo: string;
  time: string;
  description: string;
  url?: string;
}

export interface RepoStat {
  name: string;
  commits: number;
  lastActive: string;
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  language: string | null;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  description: string | null;
  fork: boolean;
  archived: boolean;
}

export function relativeTime(dateStr: string): string {
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

export function processEvents(events: GitHubEvent[]): {
  activities: ProcessedActivity[];
  repos: RepoStat[];
  commitCount: number;
} {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const repoMap = new Map<string, RepoStat>();
  let commitCount = 0;
  const activities: ProcessedActivity[] = [];

  for (const event of events) {
    const repoShort = event.repo.name.replace(`${USERNAME}/`, '');
    const time = relativeTime(event.created_at);
    const eventTime = new Date(event.created_at).getTime();

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

  const repos = Array.from(repoMap.values()).sort((a, b) => b.commits - a.commits);
  return { activities, repos, commitCount };
}

/**
 * Convenience wrapper with caps — used by the compact /now/ page widget.
 * The full ActivityDashboard uses processEvents() directly for uncapped results.
 */
export function processEventsCompact(events: GitHubEvent[]): {
  activities: ProcessedActivity[];
  repos: RepoStat[];
  commitCount: number;
} {
  const result = processEvents(events);
  return {
    activities: result.activities.slice(0, 12),
    repos: result.repos.slice(0, 6),
    commitCount: result.commitCount,
  };
}

export function eventIcon(type: string): string {
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

export function getCached(): GitHubEvent[] | null {
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

export function setCache(events: GitHubEvent[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ events, timestamp: Date.now() }));
  } catch {
    // storage full or unavailable
  }
}

export async function fetchEvents(): Promise<GitHubEvent[]> {
  const cached = getCached();
  if (cached) return cached;

  const res = await fetch(`${EVENTS_URL}?per_page=100`);
  if (res.status === 403) throw new Error('rate-limit');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const events: GitHubEvent[] = await res.json();
  setCache(events);
  return events;
}

export async function fetchAllRepos(): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  const maxPages = 5;
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${REPOS_URL}?per_page=100&sort=updated&page=${page}`);
    if (!res.ok) break;
    const repos: GitHubRepo[] = await res.json();
    allRepos.push(...repos);
    if (repos.length < 100) break;
  }
  return allRepos;
}
