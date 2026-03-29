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
});
