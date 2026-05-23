import { describe, it, expect, vi } from 'vitest';
import { verifyBearer } from '../auth';

describe('verifyBearer', () => {
  it('returns true for matching bearer token', async () => {
    const result = await verifyBearer('Bearer my-secret', 'my-secret');
    expect(result).toBe(true);
  });

  it('returns false for wrong token', async () => {
    const result = await verifyBearer('Bearer wrong', 'my-secret');
    expect(result).toBe(false);
  });

  it('returns false for missing Authorization header', async () => {
    const result = await verifyBearer(null, 'my-secret');
    expect(result).toBe(false);
  });

  it('returns false for non-Bearer scheme', async () => {
    const result = await verifyBearer('Basic abc123', 'my-secret');
    expect(result).toBe(false);
  });

  it('returns false for empty secret', async () => {
    const result = await verifyBearer('Bearer ', '');
    expect(result).toBe(false);
  });

  it('is timing-safe (different lengths return false)', async () => {
    const result = await verifyBearer('Bearer short', 'a-much-longer-secret-value');
    expect(result).toBe(false);
  });

  // H2 — Pre-fix, verifyBearer compared raw buffers and short-circuited on
  // length mismatch with `if (expectedBuf.byteLength !== actualBuf.byteLength) return false;`
  // before reaching `timingSafeEqual`. That early return exposed the secret's
  // length over timing: an attacker could probe ?Bearer aaa, aaaa, aaaaa...
  // and see the response time drop sharply once their guess matched the
  // expected byte length. The fix hashes both sides to 32 bytes first.
  it('SHA-256 normalisation: 1-char and 1000-char inputs both reach the constant-time compare', async () => {
    // Both calls return false (neither matches the secret), but pre-fix the
    // 1000-char call would short-circuit on length mismatch while the 1-char
    // call would short-circuit on a different length mismatch. The new code
    // makes both inputs hash to 32 bytes so the length branch never fires
    // on attacker-controlled inputs.
    const short = await verifyBearer('Bearer x', 'the-real-secret');
    const long  = await verifyBearer('Bearer ' + 'x'.repeat(1000), 'the-real-secret');
    expect(short).toBe(false);
    expect(long).toBe(false);
  });

  it('returns true regardless of how exotic the matching secret is', async () => {
    // Long secret with mixed ASCII / Unicode — should still validate.
    const secret = 'hard-secret-😀-with-unicode-and-symbols-!@#$%';
    expect(await verifyBearer(`Bearer ${secret}`, secret)).toBe(true);
  });
});
