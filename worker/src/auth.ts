import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

export async function verifyBearer(
  authHeader: string | null,
  expectedSecret: string,
): Promise<boolean> {
  if (!authHeader || !expectedSecret) return false;
  if (!authHeader.startsWith('Bearer ')) return false;

  const expected = `Bearer ${expectedSecret}`;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(authHeader, 'utf8');

  if (expectedBuf.byteLength !== actualBuf.byteLength) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
