import { describe, it, expect } from 'vitest';
import worker, { resolveTarget } from '../src/index';

const get = (host: string, method = 'GET') =>
  worker.fetch(new Request(`https://${host}/`, { method }));

describe('resolveTarget', () => {
  it('maps each platform subdomain to its profile', () => {
    expect(resolveTarget('spotify.adrianwedd.com')).toBe(
      'https://open.spotify.com/show/033SDw0Swsx8u32z6uoqP1',
    );
    expect(resolveTarget('youtube.adrianwedd.com')).toBe('https://www.youtube.com/@adrianwedd');
    expect(resolveTarget('github.adrianwedd.com')).toBe('https://github.com/adrianwedd');
  });

  it('resolves aliases to the same target as their canonical name', () => {
    expect(resolveTarget('twitter.adrianwedd.com')).toBe(resolveTarget('x.adrianwedd.com'));
    expect(resolveTarget('bsky.adrianwedd.com')).toBe(resolveTarget('bluesky.adrianwedd.com'));
    expect(resolveTarget('apple.adrianwedd.com')).toBe(resolveTarget('podcasts.adrianwedd.com'));
  });

  it('is case-insensitive (DNS is)', () => {
    expect(resolveTarget('SPOTIFY.adrianwedd.com')).toBe(resolveTarget('spotify.adrianwedd.com'));
  });

  it('returns null for unknown subdomains', () => {
    expect(resolveTarget('nope.adrianwedd.com')).toBeNull();
  });

  it('never resolves the apex or www — those belong to the site, not this worker', () => {
    expect(resolveTarget('adrianwedd.com')).toBeNull();
    expect(resolveTarget('www.adrianwedd.com')).toBeNull();
  });

  it('every wrangler route has a matching target', async () => {
    // Guards the real failure mode: adding a route but forgetting the mapping,
    // which silently bounces that hostname to the homepage.
    const toml = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'),
    );
    const hosts = [...toml.matchAll(/pattern = "([^/]+)\/\*"/g)].map((m) => m[1]);
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
      expect(resolveTarget(host), `no target for route ${host}`).not.toBeNull();
    }
  });
});

describe('fetch handler', () => {
  it('302s to the platform with a Location header', async () => {
    const res = await get('spotify.adrianwedd.com');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'https://open.spotify.com/show/033SDw0Swsx8u32z6uoqP1',
    );
  });

  it('sends unknown hosts to the homepage rather than erroring', async () => {
    const res = await get('nope.adrianwedd.com');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://adrianwedd.com/');
  });

  it('refuses non-GET/HEAD instead of forwarding a body to a third party', async () => {
    const res = await get('spotify.adrianwedd.com', 'POST');
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });

  it('does not cache the redirect for long, so a wrong target is recoverable', async () => {
    const res = await get('github.adrianwedd.com');
    expect(res.headers.get('cache-control')).toMatch(/max-age=300/);
  });
});
