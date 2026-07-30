import { describe, it, expect, vi } from 'vitest';
import { countKeysCapped, HEALTH_MAX_LIST_PAGES, countOverdueQueuedKeys, STUCK_QUEUE_GRACE_MS } from '../index';

// Cursor-paginating KV mock. Ignores the requested `limit` and paginates with a
// fixed `pageSize` so we can exercise the page-count cap without allocating tens
// of thousands of keys (the cap is about page count, not key count).
function makePaginatingKV(names: string[], pageSize: number): KVNamespace {
  return {
    list: vi.fn(async ({ prefix, cursor }: { prefix: string; limit?: number; cursor?: string }) => {
      const matching = names.filter((n) => n.startsWith(prefix));
      const start = cursor ? parseInt(cursor, 10) : 0;
      const page = matching.slice(start, start + pageSize);
      const nextStart = start + pageSize;
      const complete = nextStart >= matching.length;
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete ? undefined : String(nextStart),
      };
    }),
  } as unknown as KVNamespace;
}

describe('countKeysCapped', () => {
  it('counts every key when the scan completes under the page cap', async () => {
    const names = Array.from({ length: 50 }, (_, i) => `post:queued:${i}`);
    const kv = makePaginatingKV(names, 10); // 5 pages

    const result = await countKeysCapped(kv, 'post:queued:');

    expect(result.count).toBe(50);
    expect(result.truncated).toBe(false);
  });

  it('filters by prefix', async () => {
    const names = [
      ...Array.from({ length: 7 }, (_, i) => `post:queued:${i}`),
      ...Array.from({ length: 3 }, (_, i) => `post:failed:${i}`),
    ];
    const kv = makePaginatingKV(names, 100);

    expect((await countKeysCapped(kv, 'post:queued:')).count).toBe(7);
    expect((await countKeysCapped(kv, 'post:failed:')).count).toBe(3);
  });

  // onPage fires for EVERY page with its index, so a caller can both do
  // first-page-only work (capture the next-scheduled key) and accumulate across
  // the whole scan (count overdue posts) without a second pass over KV.
  it('invokes onPage for every page with the page index', async () => {
    const names = Array.from({ length: 30 }, (_, i) => `post:queued:${i}`);
    const kv = makePaginatingKV(names, 10);
    const onPage = vi.fn();

    await countKeysCapped(kv, 'post:queued:', onPage);

    expect(onPage).toHaveBeenCalledTimes(3);
    expect(onPage.mock.calls.map((c) => c[1])).toEqual([0, 1, 2]);
    expect(onPage.mock.calls[0][0]).toHaveLength(10);
    expect(onPage.mock.calls[0][0][0]).toEqual({ name: 'post:queued:0' });
    expect(onPage.mock.calls[2][0][9]).toEqual({ name: 'post:queued:29' });
  });

  it('reports a truncated floor and stops at the page cap', async () => {
    const pageSize = 10;
    // One page beyond the cap — the helper must NOT scan it.
    const names = Array.from({ length: (HEALTH_MAX_LIST_PAGES + 1) * pageSize }, (_, i) => `post:published:${i}`);
    const kv = makePaginatingKV(names, pageSize);

    const result = await countKeysCapped(kv, 'post:published:');

    expect(result.count).toBe(HEALTH_MAX_LIST_PAGES * pageSize); // floor, not the full set
    expect(result.truncated).toBe(true);
    expect((kv.list as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(HEALTH_MAX_LIST_PAGES);
  });

  it('does not truncate when the set ends exactly on the cap', async () => {
    const pageSize = 10;
    const names = Array.from({ length: HEALTH_MAX_LIST_PAGES * pageSize }, (_, i) => `fb-flag:${i}`);
    const kv = makePaginatingKV(names, pageSize);

    const result = await countKeysCapped(kv, 'fb-flag:');

    expect(result.count).toBe(HEALTH_MAX_LIST_PAGES * pageSize);
    expect(result.truncated).toBe(false);
  });
});

// Stuck-queue detection: posts still queued well after their scheduled time
// mean the cron is alive but not draining. The scheduled epoch is read out of
// the key name so this costs no extra KV reads.
describe('countOverdueQueuedKeys', () => {
  const now = 1_800_000_000_000;
  const cutoff = now - STUCK_QUEUE_GRACE_MS;

  function queuedKey(epoch: number, id = 'p1') {
    return { name: `post:queued:${epoch}:${id}` };
  }

  it('counts keys scheduled before the cutoff', () => {
    const keys = [
      queuedKey(cutoff - 60_000, 'old1'),
      queuedKey(cutoff - 1, 'old2'),
      queuedKey(cutoff, 'exactly-at-cutoff'),
    ];

    expect(countOverdueQueuedKeys(keys, cutoff)).toBe(3);
  });

  // The whole point of the grace window: a post that just fell due is waiting
  // for the next cron tick, not stuck.
  it('ignores posts that are due but still inside the grace window', () => {
    const keys = [queuedKey(now - 60_000, 'just-due'), queuedKey(now, 'due-now')];

    expect(countOverdueQueuedKeys(keys, cutoff)).toBe(0);
  });

  it('ignores posts scheduled in the future', () => {
    const keys = [queuedKey(now + 3_600_000, 'later'), queuedKey(now + 86_400_000, 'tomorrow')];

    expect(countOverdueQueuedKeys(keys, cutoff)).toBe(0);
  });

  it('counts only the overdue subset of a mixed page', () => {
    const keys = [
      queuedKey(cutoff - 600_000, 'stuck1'),
      queuedKey(cutoff - 300_000, 'stuck2'),
      queuedKey(now - 60_000, 'just-due'),
      queuedKey(now + 3_600_000, 'later'),
    ];

    expect(countOverdueQueuedKeys(keys, cutoff)).toBe(2);
  });

  // A malformed key is a bug to investigate, not evidence of a stuck post —
  // counting it would page the operator with an unactionable alert.
  it('skips keys whose epoch segment is not a finite number', () => {
    const keys = [
      { name: 'post:queued:notanumber:p1' },
      { name: 'post:queued::p2' },
      { name: 'post:queued:' },
      { name: 'post:queued:NaN:p3' },
      { name: 'post:queued:Infinity:p4' },
      queuedKey(cutoff - 1000, 'genuinely-stuck'),
    ];

    expect(countOverdueQueuedKeys(keys, cutoff)).toBe(1);
  });

  it('returns 0 for an empty page', () => {
    expect(countOverdueQueuedKeys([], cutoff)).toBe(0);
  });
});
