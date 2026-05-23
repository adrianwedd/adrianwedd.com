// Constant-time bearer-token verification.
//
// The expected/actual values are SHA-256 hashed BEFORE comparison. This:
//   1. Defeats the timing-side-channel on byte-length (an early-return on
//      length mismatch would let an attacker probe the secret's length).
//   2. Equalises compare cost regardless of input length.
//   3. Keeps the constant-time guarantee of `timingSafeEqual`.
//
// Both inputs end up as 32-byte digests, so the length-mismatch branch can
// no longer fire on attacker-controlled input.

import { timingSafeEqual } from 'node:crypto';

export async function verifyBearer(
  authHeader: string | null,
  expectedSecret: string,
): Promise<boolean> {
  if (!authHeader || !expectedSecret) return false;
  if (!authHeader.startsWith('Bearer ')) return false;

  const enc = new TextEncoder();
  const [expectedDigest, actualDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(`Bearer ${expectedSecret}`)),
    crypto.subtle.digest('SHA-256', enc.encode(authHeader)),
  ]);

  return timingSafeEqual(new Uint8Array(expectedDigest), new Uint8Array(actualDigest));
}
