import { describe, it, expect, vi } from 'vitest';
import { countKeysCapped, HEALTH_MAX_LIST_PAGES } from '../index';

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

  it('invokes onFirstPage with the first page only', async () => {
    const names = Array.from({ length: 30 }, (_, i) => `post:queued:${i}`);
    const kv = makePaginatingKV(names, 10);
    const onFirstPage = vi.fn();

    await countKeysCapped(kv, 'post:queued:', onFirstPage);

    expect(onFirstPage).toHaveBeenCalledTimes(1);
    expect(onFirstPage.mock.calls[0][0]).toHaveLength(10);
    expect(onFirstPage.mock.calls[0][0][0]).toEqual({ name: 'post:queued:0' });
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
