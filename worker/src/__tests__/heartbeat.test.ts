import { describe, it, expect, vi } from 'vitest';
import {
  recordHeartbeat,
  readHeartbeats,
  HEARTBEAT_PREFIX,
  HEARTBEAT_GRACE_MS,
  CRON_SPECS,
} from '../heartbeat';

function mockKV(initial: Record<string, string> = {}): KVNamespace & {
  store: Map<string, string>;
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  } as unknown as KVNamespace & {
    store: Map<string, string>;
    get: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
}

const NOW = 1_800_000_000_000;

function heartbeatAt(epoch: number): string {
  return JSON.stringify({ at: new Date(epoch).toISOString(), atEpoch: epoch });
}

/** A record for every spec, all fresh — the "everything healthy" baseline. */
function allFresh(now = NOW): Record<string, string> {
  return Object.fromEntries(CRON_SPECS.map((s) => [`${HEARTBEAT_PREFIX}${s.name}`, heartbeatAt(now)]));
}

describe('recordHeartbeat', () => {
  it('writes an ISO timestamp and epoch under the cron name', async () => {
    const kv = mockKV();

    await recordHeartbeat(kv, 'publish', NOW);

    const raw = kv.store.get(`${HEARTBEAT_PREFIX}publish`);
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!)).toEqual({ at: new Date(NOW).toISOString(), atEpoch: NOW });
  });

  // A heartbeat is telemetry. Throwing here would turn a successful publish run
  // into a failed one, which is strictly worse than losing the heartbeat (a
  // missing heartbeat reads as stale, which alerts anyway).
  it('swallows a KV write failure instead of throwing', async () => {
    const kv = mockKV();
    (kv.put as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('KV down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordHeartbeat(kv, 'publish', NOW)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("cron 'publish'"));

    consoleError.mockRestore();
  });
});

describe('readHeartbeats', () => {
  it('reports fresh heartbeats as not stale', async () => {
    const { crons, anyStale } = await readHeartbeats(mockKV(allFresh()), NOW);

    expect(anyStale).toBe(false);
    for (const spec of CRON_SPECS) {
      expect(crons[spec.name].stale).toBe(false);
      expect(crons[spec.name].ageSeconds).toBe(0);
      expect(crons[spec.name].lastRunAt).toBe(new Date(NOW).toISOString());
    }
  });

  // The core case: a cron that has never recorded a successful run is exactly
  // the outage being detected, so absence must not read as healthy.
  it('treats a missing record as stale', async () => {
    const { crons, anyStale } = await readHeartbeats(mockKV(), NOW);

    expect(anyStale).toBe(true);
    for (const spec of CRON_SPECS) {
      expect(crons[spec.name].stale).toBe(true);
      expect(crons[spec.name].lastRunAt).toBeNull();
      expect(crons[spec.name].ageSeconds).toBeNull();
    }
  });

  it('treats an unparseable record as stale', async () => {
    const kv = mockKV({ [`${HEARTBEAT_PREFIX}publish`]: 'not json' });

    const { crons } = await readHeartbeats(kv, NOW);

    expect(crons.publish.stale).toBe(true);
    expect(crons.publish.lastRunAt).toBeNull();
  });

  it('treats a record with a non-finite epoch as stale', async () => {
    const kv = mockKV({ [`${HEARTBEAT_PREFIX}publish`]: JSON.stringify({ at: 'whenever', atEpoch: 'soon' }) });

    const { crons } = await readHeartbeats(kv, NOW);

    expect(crons.publish.stale).toBe(true);
  });

  // Staleness threshold is 2x interval + grace: one missed run plus scheduler
  // drift is tolerated, two is not.
  it('tolerates one missed run plus grace but flags beyond the threshold', async () => {
    const spec = CRON_SPECS.find((s) => s.name === 'publish')!;
    const limitMs = spec.intervalMs * 2 + HEARTBEAT_GRACE_MS;

    const justInside = await readHeartbeats(
      mockKV({ ...allFresh(), [`${HEARTBEAT_PREFIX}publish`]: heartbeatAt(NOW - (limitMs - 1_000)) }),
      NOW,
    );
    expect(justInside.crons.publish.stale).toBe(false);
    expect(justInside.anyStale).toBe(false);

    const justOutside = await readHeartbeats(
      mockKV({ ...allFresh(), [`${HEARTBEAT_PREFIX}publish`]: heartbeatAt(NOW - (limitMs + 1_000)) }),
      NOW,
    );
    expect(justOutside.crons.publish.stale).toBe(true);
    expect(justOutside.anyStale).toBe(true);
  });

  // Each cron carries its own cadence: the 2-hourly comments cron must not be
  // judged against the 10-minute publish threshold.
  it('applies each cron its own interval', async () => {
    const oneHourAgo = NOW - 60 * 60_000;
    const kv = mockKV({
      [`${HEARTBEAT_PREFIX}publish`]: heartbeatAt(oneHourAgo),
      [`${HEARTBEAT_PREFIX}comments`]: heartbeatAt(oneHourAgo),
    });

    const { crons } = await readHeartbeats(kv, NOW);

    expect(crons.publish.stale).toBe(true); // 60 min >> 35 min threshold
    expect(crons.comments.stale).toBe(false); // 60 min << 4h15m threshold
  });

  it('clamps a future-dated heartbeat to age 0 rather than reporting negative age', async () => {
    const kv = mockKV({ ...allFresh(), [`${HEARTBEAT_PREFIX}publish`]: heartbeatAt(NOW + 30_000) });

    const { crons } = await readHeartbeats(kv, NOW);

    expect(crons.publish.ageSeconds).toBe(0);
    expect(crons.publish.stale).toBe(false);
  });

  // The health endpoint's job is to report degradation; a KV read failure must
  // not 500 it and lose the other checks in the response.
  it('survives a KV read failure by leaving the entry stale', async () => {
    const kv = mockKV(allFresh());
    (kv.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('KV down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { crons, anyStale } = await readHeartbeats(kv, NOW);

    expect(anyStale).toBe(true);
    expect(Object.values(crons).filter((c) => c.stale)).toHaveLength(1);

    consoleError.mockRestore();
  });

  it('exposes the staleness threshold so a reader can interpret the age', async () => {
    const { crons } = await readHeartbeats(mockKV(allFresh()), NOW);

    for (const spec of CRON_SPECS) {
      expect(crons[spec.name].staleAfterSeconds).toBe(Math.round((spec.intervalMs * 2 + HEARTBEAT_GRACE_MS) / 1000));
      expect(crons[spec.name].schedule).toBe(spec.schedule);
    }
  });
});
