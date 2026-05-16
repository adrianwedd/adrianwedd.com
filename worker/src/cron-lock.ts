/**
 * Atomic named locks via a single-instance Durable Object.
 *
 * KV-based locks have a TOCTOU window between get and put. DO instances are
 * single-threaded, but `await` between get and put still yields the input
 * gate — two concurrent fetches can interleave there. `blockConcurrencyWhile`
 * holds the gate closed for the entire read-check-write sequence.
 *
 * Each successful acquire returns a fencing token. `release()` is a no-op
 * unless the caller's token matches the stored token, so a slow run that
 * exceeds its TTL cannot release the lock that the next acquirer holds.
 */
interface LockState {
  expiresAt: number;
  token: string;
}

export class CronLock {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
  }

  async tryAcquire(name: string, ttlMs: number): Promise<{ acquired: boolean; token: string | null }> {
    return this.state.blockConcurrencyWhile(async () => {
      const key = `lock:${name}`;
      const now = Date.now();
      const existing = await this.state.storage.get<LockState>(key);
      if (existing && existing.expiresAt > now) {
        return { acquired: false, token: null };
      }
      const token = crypto.randomUUID();
      await this.state.storage.put(key, { expiresAt: now + ttlMs, token });
      return { acquired: true, token };
    });
  }

  async release(name: string, token: string): Promise<void> {
    return this.state.blockConcurrencyWhile(async () => {
      const key = `lock:${name}`;
      const existing = await this.state.storage.get<LockState>(key);
      if (existing && existing.token === token) {
        await this.state.storage.delete(key);
      }
      // Mismatched token = our run exceeded its TTL and someone else now holds
      // the lock. Silently no-op so we don't release the new owner's lock.
    });
  }
}
