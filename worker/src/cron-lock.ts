import { DurableObject } from 'cloudflare:workers';

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
 *
 * Must extend DurableObject from `cloudflare:workers` so its methods are
 * callable via RPC on the stub returned by `env.CRON_LOCK.get(...)`.
 */
interface LockState {
  expiresAt: number;
  token: string;
}

export class CronLock extends DurableObject {
  async tryAcquire(name: string, ttlMs: number): Promise<{ acquired: boolean; token: string | null }> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const key = `lock:${name}`;
      const now = Date.now();
      const existing = await this.ctx.storage.get<unknown>(key);
      if (isLockState(existing) && existing.expiresAt > now) {
        return { acquired: false, token: null };
      }
      const token = crypto.randomUUID();
      await this.ctx.storage.put(key, { expiresAt: now + ttlMs, token });
      return { acquired: true, token };
    });
  }

  async release(name: string, token: string): Promise<void> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const key = `lock:${name}`;
      const existing = await this.ctx.storage.get<unknown>(key);
      if (isLockState(existing) && existing.token === token) {
        await this.ctx.storage.delete(key);
      }
      // Mismatched / malformed entry = our run exceeded its TTL and someone
      // else (or no one) now holds the lock. Silently no-op so we don't
      // release the new owner's lock or corrupt their state.
    });
  }
}

function isLockState(v: unknown): v is LockState {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as LockState).expiresAt === 'number' &&
    typeof (v as LockState).token === 'string'
  );
}
