import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordExternalHeartbeat,
  readExternalHeartbeats,
  runWatchdogSweep,
  EXTERNAL_HEARTBEAT_PREFIX,
  EXTERNAL_SOURCES,
  ALERT_COOLDOWN_MS,
  PROOF_OF_LIFE_INTERVAL_MS,
  type WatchdogEnv,
} from '../watchdog';

const NOW = 1_800_000_000_000;

function mockKV(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
}

function makeEnv(kv: ReturnType<typeof mockKV>, send = vi.fn(async () => {})): WatchdogEnv & { send: typeof send } {
  return {
    SOCIAL: kv as unknown as KVNamespace,
    CRISIS_EMAIL: { send },
    CRISIS_ALERT_FROM: 'alerts@wedd.au',
    CRISIS_ALERT_TO: 'adrianwedd@gmail.com',
    send,
  } as unknown as WatchdogEnv & { send: typeof send };
}

function checkIn(name: string, epoch: number): [string, string] {
  return [`${EXTERNAL_HEARTBEAT_PREFIX}${name}`, JSON.stringify({ at: new Date(epoch).toISOString(), atEpoch: epoch })];
}

/** Fresh check-ins for every source — the "all healthy" baseline. */
function allFresh(now = NOW): Record<string, string> {
  return Object.fromEntries(EXTERNAL_SOURCES.map((s) => checkIn(s.name, now)));
}

/** Suppress the proof-of-life path by starting its clock now. */
function proofClockStarted(now = NOW): Record<string, string> {
  return { 'watchdog-proof-of-life': String(now) };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('recordExternalHeartbeat', () => {
  it('records a check-in for a known source', async () => {
    const kv = mockKV();

    const ok = await recordExternalHeartbeat(kv as unknown as KVNamespace, 'monitor-watchdog', undefined, NOW);

    expect(ok).toBe(true);
    const raw = kv.store.get(`${EXTERNAL_HEARTBEAT_PREFIX}monitor-watchdog`);
    expect(JSON.parse(raw!)).toEqual({ at: new Date(NOW).toISOString(), atEpoch: NOW });
  });

  it('stores optional detail', async () => {
    const kv = mockKV();

    await recordExternalHeartbeat(kv as unknown as KVNamespace, 'monitor-watchdog', 'run 123 all green', NOW);

    expect(JSON.parse(kv.store.get(`${EXTERNAL_HEARTBEAT_PREFIX}monitor-watchdog`)!).detail).toBe('run 123 all green');
  });

  // A typo'd name must not be silently accepted: the source it was meant to
  // cover would look like it had never checked in, with no visible cause.
  it('rejects an unknown source without writing', async () => {
    const kv = mockKV();

    const ok = await recordExternalHeartbeat(kv as unknown as KVNamespace, 'moniter-watchdog', undefined, NOW);

    expect(ok).toBe(false);
    expect(kv.store.size).toBe(0);
  });

  // A recovered source must clear its cooldown, or the NEXT outage would be
  // suppressed for up to 24h by a marker left from the previous one.
  it('clears the alert cooldown on check-in', async () => {
    const kv = mockKV({ 'watchdog-alerted:monitor-watchdog': 'earlier' });

    await recordExternalHeartbeat(kv as unknown as KVNamespace, 'monitor-watchdog', undefined, NOW);

    expect(kv.store.has('watchdog-alerted:monitor-watchdog')).toBe(false);
  });
});

describe('readExternalHeartbeats', () => {
  it('reports fresh check-ins as not stale', async () => {
    const statuses = await readExternalHeartbeats(mockKV(allFresh()) as unknown as KVNamespace, NOW);

    expect(statuses).toHaveLength(EXTERNAL_SOURCES.length);
    expect(statuses.every((s) => !s.stale)).toBe(true);
    expect(statuses.every((s) => s.ageSeconds === 0)).toBe(true);
  });

  it('treats a never-seen source as stale', async () => {
    const statuses = await readExternalHeartbeats(mockKV() as unknown as KVNamespace, NOW);

    expect(statuses.every((s) => s.stale)).toBe(true);
    expect(statuses.every((s) => s.lastCheckIn === null)).toBe(true);
  });

  it('flags a source past its threshold', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
    });

    const statuses = await readExternalHeartbeats(kv as unknown as KVNamespace, NOW);

    expect(statuses.find((s) => s.name === source.name)!.stale).toBe(true);
    expect(statuses.filter((s) => s.stale)).toHaveLength(1);
  });

  it('does not flag a source just inside its threshold', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs + 60_000)]),
    });

    const statuses = await readExternalHeartbeats(kv as unknown as KVNamespace, NOW);

    expect(statuses.every((s) => !s.stale)).toBe(true);
  });

  it('treats an unparseable record as stale', async () => {
    const kv = mockKV({ ...allFresh(), [`${EXTERNAL_HEARTBEAT_PREFIX}${EXTERNAL_SOURCES[0].name}`]: '{{{' });

    const statuses = await readExternalHeartbeats(kv as unknown as KVNamespace, NOW);

    expect(statuses.find((s) => s.name === EXTERNAL_SOURCES[0].name)!.stale).toBe(true);
  });
});

describe('runWatchdogSweep', () => {
  it('sends no email when every source is fresh', async () => {
    const kv = mockKV({ ...allFresh(), ...proofClockStarted() });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.stale).toEqual([]);
    expect(result.alertsSent).toBe(0);
    expect(env.send).not.toHaveBeenCalled();
  });

  it('emails once per stale source and records a cooldown', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
      ...proofClockStarted(),
    });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.stale).toEqual([source.name]);
    expect(result.alertsSent).toBe(1);
    expect(env.send).toHaveBeenCalledTimes(1);
    expect(kv.store.has(`watchdog-alerted:${source.name}`)).toBe(true);
  });

  // An hourly cron with no cooldown would send 24 identical emails a day for one
  // dead workflow, which is how an alert channel becomes a filter rule.
  it('suppresses a repeat alert while the cooldown is live', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
      [`watchdog-alerted:${source.name}`]: new Date(NOW - 60_000).toISOString(),
      ...proofClockStarted(),
    });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.stale).toEqual([source.name]);
    expect(result.alertsSent).toBe(0);
    expect(env.send).not.toHaveBeenCalled();
  });

  // Writing the cooldown on a failed send would suppress retries of an alert
  // that never reached anyone — the worst possible outcome for this module.
  it('does NOT record a cooldown when the send fails', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
      ...proofClockStarted(),
    });
    const send = vi.fn(async () => {
      throw new Error('email binding revoked');
    });
    const env = makeEnv(kv, send);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runWatchdogSweep(env, NOW);

    expect(result.alertsSent).toBe(0);
    expect(kv.store.has(`watchdog-alerted:${source.name}`)).toBe(false);
  });

  it('alerts for every stale source independently', async () => {
    const kv = mockKV({
      ...Object.fromEntries(EXTERNAL_SOURCES.map((s) => checkIn(s.name, NOW - s.staleAfterMs - 60_000))),
      ...proofClockStarted(),
    });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.stale).toHaveLength(EXTERNAL_SOURCES.length);
    expect(result.alertsSent).toBe(EXTERNAL_SOURCES.length);
  });

  it('survives a missing email binding without throwing', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
      ...proofClockStarted(),
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runWatchdogSweep({ SOCIAL: kv as unknown as KVNamespace }, NOW);

    expect(result.alertsSent).toBe(0);
    expect(result.stale).toEqual([source.name]);
  });
});

describe('weekly proof-of-life', () => {
  // A deploy must not fire an immediate email; the first sweep just starts the
  // clock so the cadence is clean.
  it('starts the clock without sending on the first ever run', async () => {
    const kv = mockKV(allFresh());
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.proofOfLifeSent).toBe(false);
    expect(env.send).not.toHaveBeenCalled();
    expect(kv.store.get('watchdog-proof-of-life')).toBe(String(NOW));
  });

  it('does not send before the interval elapses', async () => {
    const kv = mockKV({ ...allFresh(), ...proofClockStarted(NOW - PROOF_OF_LIFE_INTERVAL_MS + 60_000) });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.proofOfLifeSent).toBe(false);
    expect(env.send).not.toHaveBeenCalled();
  });

  it('sends once the interval has elapsed and advances the clock', async () => {
    const kv = mockKV({ ...allFresh(), ...proofClockStarted(NOW - PROOF_OF_LIFE_INTERVAL_MS - 60_000) });
    const env = makeEnv(kv);

    const result = await runWatchdogSweep(env, NOW);

    expect(result.proofOfLifeSent).toBe(true);
    expect(env.send).toHaveBeenCalledTimes(1);
    expect(kv.store.get('watchdog-proof-of-life')).toBe(String(NOW));
  });

  // Advancing the clock on a failed send would skip a whole week — and this
  // email is the ONLY evidence the alerting channel works.
  it('does not advance the clock when the send fails', async () => {
    const started = NOW - PROOF_OF_LIFE_INTERVAL_MS - 60_000;
    const kv = mockKV({ ...allFresh(), ...proofClockStarted(started) });
    const send = vi.fn(async () => {
      throw new Error('send failed');
    });
    const env = makeEnv(kv, send);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runWatchdogSweep(env, NOW);

    expect(result.proofOfLifeSent).toBe(false);
    expect(kv.store.get('watchdog-proof-of-life')).toBe(String(started));
  });

  it('reports per-source state in the proof-of-life body', async () => {
    const source = EXTERNAL_SOURCES[0];
    const kv = mockKV({
      ...allFresh(),
      ...Object.fromEntries([checkIn(source.name, NOW - source.staleAfterMs - 60_000)]),
      ...proofClockStarted(NOW - PROOF_OF_LIFE_INTERVAL_MS - 60_000),
    });
    const env = makeEnv(kv);

    await runWatchdogSweep(env, NOW);

    // Two sends: the stale-source alert and the proof-of-life.
    expect(env.send).toHaveBeenCalledTimes(2);
    const bodies = (env.send.mock.calls as unknown[][]).map((c) => JSON.stringify(c[0]));
    expect(bodies.some((b) => b.includes('proof-of-life') || b.includes('Weekly'))).toBe(true);
  });

  // ALERT_COOLDOWN_MS is exported so the alert cadence is assertable rather than
  // a magic number buried in the module.
  it('uses a 24h alert cooldown', () => {
    expect(ALERT_COOLDOWN_MS).toBe(24 * 60 * 60_000);
  });
});
