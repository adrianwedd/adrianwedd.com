/**
 * Test-only shim for the `cloudflare:workers` module. Vitest runs outside
 * the Workers runtime, so the real module isn't resolvable.
 *
 * `DurableObject` is exposed as a plain base class with the same `ctx`/`env`
 * fields the production runtime would inject. Production builds use Wrangler,
 * which resolves the real import.
 */
export class DurableObject<Env = unknown> {
  ctx: DurableObjectState;
  env: Env;
  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
