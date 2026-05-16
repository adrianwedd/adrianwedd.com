/**
 * Atomic named locks via a single-instance Durable Object.
 *
 * KV-based locks have a TOCTOU window between get and put: two concurrent
 * invocations can both observe an empty value and both write '1'. DO methods
 * are serialized per-instance, so acquire/release runs without interleaving.
 */
export class CronLock {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: unknown) {
    this.state = state;
  }

  async tryAcquire(name: string, ttlMs: number): Promise<{ acquired: boolean }> {
    const key = `lock:${name}`;
    const now = Date.now();
    const existing = await this.state.storage.get<number>(key);
    if (existing && existing > now) {
      return { acquired: false };
    }
    await this.state.storage.put(key, now + ttlMs);
    return { acquired: true };
  }

  async release(name: string): Promise<void> {
    await this.state.storage.delete(`lock:${name}`);
  }
}
