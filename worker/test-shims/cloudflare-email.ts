/**
 * Test-only shim for the `cloudflare:email` module (see cloudflare-workers.ts
 * for the pattern). Production builds use Wrangler, which resolves the real
 * module; vitest runs in plain Node.
 */
export class EmailMessage {
  from: string;
  to: string;
  raw: string;
  constructor(from: string, to: string, raw: string) {
    this.from = from;
    this.to = to;
    this.raw = raw;
  }
}
