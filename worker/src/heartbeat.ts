// ── Cron heartbeats ───────────────────────────────────────────────────────────
//
// Liveness monitoring answers "did this URL return 200?". It cannot answer
// "is the cron still firing?" — a worker whose scheduled caller has stopped
// keeps serving 200s forever. That is not hypothetical here: a July-2026
// deploy run sat unapproved in GitHub's `waiting` state for five days, held
// its concurrency group, and the only symptom was a red nightly drift check
// nobody was watching. GitHub also disables scheduled workflows outright
// after 60 days of repository inactivity.
//
// So each cron records a heartbeat in KV on successful completion, and
// /api/health turns a missing or stale heartbeat into a 503 that Upptime
// alerts on from the status code alone.
//
// Semantics deliberately chosen:
//
//   * Only a SUCCESSFUL run writes a heartbeat. A lock-skip ("another run
//     holds it") writes nothing — the holder will write its own. A run that
//     returns 5xx writes nothing, because the 5xx is itself the alert.
//   * A MISSING heartbeat is stale, not "unknown". A cron that has never
//     recorded a successful run is exactly the outage we are trying to
//     detect, so it must not read as healthy. The cost is that a freshly
//     deployed worker reports stale until the first successful run of each
//     cron — seed it by dispatching both crons after deploy.
//   * The heartbeat write must never fail the cron. It is telemetry; losing
//     it degrades to a stale reading (which alerts), whereas throwing would
//     turn a healthy publish run into a failed one.

/** KV key prefix for heartbeat records. */
export const HEARTBEAT_PREFIX = 'heartbeat:cron:';

/**
 * Extra tolerance on top of 2x the nominal interval before a heartbeat is
 * considered stale.
 *
 * These crons are driven by GitHub Actions `schedule:`, which is best-effort
 * and routinely runs several minutes late under platform load — a bare 2x
 * interval on the 10-minute publish cron would flap. 15 minutes of grace
 * absorbs normal scheduler drift while still catching a genuinely dead cron
 * within roughly half an hour.
 */
export const HEARTBEAT_GRACE_MS = 15 * 60_000;

export interface CronSpec {
  /** Heartbeat name, also the KV key suffix. */
  name: string;
  /** Nominal interval between runs, in ms. */
  intervalMs: number;
  /** Human-readable schedule, echoed in the health body for context. */
  schedule: string;
}

/**
 * The crons whose liveness /api/health asserts. Must stay in step with the
 * `schedule:` block in .github/workflows/social-cron.yml — if a cadence
 * changes there and not here, the heartbeat either flaps (interval shortened)
 * or stops catching a dead cron promptly (interval lengthened).
 */
export const CRON_SPECS: CronSpec[] = [
  { name: 'publish', intervalMs: 10 * 60_000, schedule: 'every 10 minutes' },
  { name: 'comments', intervalMs: 2 * 60 * 60_000, schedule: 'every 2 hours' },
];

export interface HeartbeatRecord {
  /** ISO 8601 timestamp of the last successful run. */
  at: string;
  /** Same instant in epoch ms — the field staleness is computed from. */
  atEpoch: number;
}

export interface HeartbeatStatus {
  schedule: string;
  lastRunAt: string | null;
  ageSeconds: number | null;
  /** Age beyond which this heartbeat reads as stale, for interpreting the above. */
  staleAfterSeconds: number;
  stale: boolean;
}

function staleAfterMs(spec: CronSpec): number {
  return spec.intervalMs * 2 + HEARTBEAT_GRACE_MS;
}

/**
 * Record a successful cron run. Never throws — a failed heartbeat write is
 * logged and swallowed so it cannot fail an otherwise-successful cron.
 */
export async function recordHeartbeat(kv: KVNamespace, name: string, now: number = Date.now()): Promise<void> {
  const record: HeartbeatRecord = { at: new Date(now).toISOString(), atEpoch: now };
  try {
    await kv.put(`${HEARTBEAT_PREFIX}${name}`, JSON.stringify(record));
  } catch (err) {
    console.error(`Heartbeat write failed for cron '${name}': ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Read every heartbeat in CRON_SPECS and classify staleness.
 *
 * Returns the per-cron statuses plus `anyStale`, which the caller maps to a
 * 503. A record that is missing, unparseable, or carries a non-finite epoch is
 * treated as stale: all three mean "no trustworthy evidence of a recent run".
 */
export async function readHeartbeats(
  kv: KVNamespace,
  now: number = Date.now(),
): Promise<{ crons: Record<string, HeartbeatStatus>; anyStale: boolean }> {
  const crons: Record<string, HeartbeatStatus> = {};
  let anyStale = false;

  for (const spec of CRON_SPECS) {
    const limitMs = staleAfterMs(spec);
    const status: HeartbeatStatus = {
      schedule: spec.schedule,
      lastRunAt: null,
      ageSeconds: null,
      staleAfterSeconds: Math.round(limitMs / 1000),
      stale: true,
    };

    // A KV read failure must not 500 the health endpoint — the whole point of
    // the endpoint is to report degradation. Leave the entry stale (which
    // alerts) rather than losing the other checks in the response.
    let raw: string | null = null;
    try {
      raw = await kv.get(`${HEARTBEAT_PREFIX}${spec.name}`);
    } catch (err) {
      console.error(`Heartbeat read failed for cron '${spec.name}': ${err instanceof Error ? err.message : String(err)}`);
    }

    if (raw) {
      try {
        const record = JSON.parse(raw) as Partial<HeartbeatRecord>;
        if (typeof record.atEpoch === 'number' && Number.isFinite(record.atEpoch)) {
          // Clamp at 0: a clock skew that puts the heartbeat slightly in the
          // future should read as "just ran", not as a negative age.
          const ageMs = Math.max(0, now - record.atEpoch);
          status.lastRunAt = typeof record.at === 'string' ? record.at : new Date(record.atEpoch).toISOString();
          status.ageSeconds = Math.round(ageMs / 1000);
          status.stale = ageMs > limitMs;
        }
      } catch {
        // Unparseable record — leave stale.
      }
    }

    if (status.stale) anyStale = true;
    crons[spec.name] = status;
  }

  return { crons, anyStale };
}
