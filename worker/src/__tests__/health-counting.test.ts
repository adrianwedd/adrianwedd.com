import { describe, it, expect, vi } from 'vitest';
import {
  countKeysCapped,
  HEALTH_MAX_LIST_PAGES,
  scanQueuedKeys,
  isQueueStalled,
  expectedDrainMs,
  STUCK_QUEUE_GRACE_MS,
  CRON_PUBLISH_BATCH_CAP,
  CRON_PUBLISH_INTERVAL_MS,
} from '../index';

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
describe('scanQueuedKeys', () => {
  const now = 1_800_000_000_000;

  function queuedKey(epoch: number, id = 'p1') {
    return { name: `post:queued:${epoch}:${id}` };
  }

  it('counts due posts and tracks the oldest', () => {
    const keys = [
      queuedKey(now - 600_000, 'mid'),
      queuedKey(now - 3_600_000, 'oldest'),
      queuedKey(now - 60_000, 'newest'),
    ];

    expect(scanQueuedKeys(keys, now)).toEqual({ due: 3, oldestDueEpoch: now - 3_600_000 });
  });

  it('treats a post scheduled exactly now as due', () => {
    expect(scanQueuedKeys([queuedKey(now, 'boundary')], now)).toEqual({ due: 1, oldestDueEpoch: now });
  });

  it('ignores posts scheduled in the future', () => {
    const keys = [queuedKey(now + 3_600_000, 'later'), queuedKey(now + 86_400_000, 'tomorrow')];

    expect(scanQueuedKeys(keys, now)).toEqual({ due: 0, oldestDueEpoch: null });
  });

  // Accumulates across pages, since /api/health calls this once per KV list page.
  it('accumulates across pages, keeping the global oldest', () => {
    const acc = scanQueuedKeys([queuedKey(now - 600_000, 'p1')], now);
    scanQueuedKeys([queuedKey(now - 7_200_000, 'p2'), queuedKey(now + 60_000, 'future')], now, acc);
    scanQueuedKeys([queuedKey(now - 300_000, 'p3')], now, acc);

    expect(acc).toEqual({ due: 3, oldestDueEpoch: now - 7_200_000 });
  });

  // A malformed key is a bug to investigate, not evidence of a stuck post —
  // counting it would page the operator with something unactionable.
  it('skips keys whose epoch segment is not a positive run of digits', () => {
    const keys = [
      { name: 'post:queued:notanumber:p1' },
      { name: 'post:queued::p2' }, // Number('') === 0 — must not read as "due since the epoch"
      { name: 'post:queued:' },
      { name: 'post:queued:NaN:p3' },
      { name: 'post:queued:Infinity:p4' },
      { name: 'post:queued:-1:p5' },
      queuedKey(now - 1000, 'genuinely-due'),
    ];

    expect(scanQueuedKeys(keys, now)).toEqual({ due: 1, oldestDueEpoch: now - 1000 });
  });

  it('returns an empty state for an empty page', () => {
    expect(scanQueuedKeys([], now)).toEqual({ due: 0, oldestDueEpoch: null });
  });
});

// The queue drains at CRON_PUBLISH_BATCH_CAP per tick, so a large burst of
// simultaneously-due posts is SUPPOSED to sit there for a while. A flat grace
// period would page the operator for the system working correctly.
describe('expectedDrainMs', () => {
  it('allows nothing for a backlog within one batch', () => {
    expect(expectedDrainMs(0)).toBe(0);
    expect(expectedDrainMs(1)).toBe(0);
    expect(expectedDrainMs(CRON_PUBLISH_BATCH_CAP)).toBe(0);
  });

  it('allows one interval per extra batch', () => {
    expect(expectedDrainMs(CRON_PUBLISH_BATCH_CAP + 1)).toBe(CRON_PUBLISH_INTERVAL_MS);
    expect(expectedDrainMs(CRON_PUBLISH_BATCH_CAP * 2)).toBe(CRON_PUBLISH_INTERVAL_MS);
    expect(expectedDrainMs(CRON_PUBLISH_BATCH_CAP * 5)).toBe(4 * CRON_PUBLISH_INTERVAL_MS);
  });

  // The concrete regression this replaced: with a flat 45-minute grace, a
  // legitimate 61-post burst tripped the alert at minute 45 and then self-cleared.
  it('covers the 61-post burst that a flat grace would have falsely flagged', () => {
    const drainMinutes = expectedDrainMs(61) / 60_000;
    expect(drainMinutes).toBe(50);
    expect(STUCK_QUEUE_GRACE_MS / 60_000 + drainMinutes).toBeGreaterThan(50);
  });
});

describe('isQueueStalled', () => {
  const now = 1_800_000_000_000;

  it('is not stalled when nothing is due', () => {
    expect(isQueueStalled({ due: 0, oldestDueEpoch: null }, now)).toBe(false);
  });

  it('is not stalled inside the grace window', () => {
    expect(isQueueStalled({ due: 1, oldestDueEpoch: now - 60_000 }, now)).toBe(false);
  });

  it('is stalled past grace for a small backlog', () => {
    expect(isQueueStalled({ due: 1, oldestDueEpoch: now - STUCK_QUEUE_GRACE_MS - 60_000 }, now)).toBe(true);
  });

  it('is not stalled at the exact grace boundary', () => {
    expect(isQueueStalled({ due: 1, oldestDueEpoch: now - STUCK_QUEUE_GRACE_MS }, now)).toBe(false);
  });

  // The false-alarm case that motivated the drain allowance.
  it('does NOT flag a large burst that is still legitimately draining', () => {
    const age = STUCK_QUEUE_GRACE_MS + 20 * 60_000; // 65 min for a 120-post backlog
    expect(isQueueStalled({ due: 120, oldestDueEpoch: now - age }, now)).toBe(false);
    // …but the same age with a one-post backlog IS stalled: nothing to drain.
    expect(isQueueStalled({ due: 1, oldestDueEpoch: now - age }, now)).toBe(true);
  });

  it('still flags a large backlog once it exceeds grace plus its drain time', () => {
    const age = STUCK_QUEUE_GRACE_MS + expectedDrainMs(120) + 60_000;
    expect(isQueueStalled({ due: 120, oldestDueEpoch: now - age }, now)).toBe(true);
  });
});
