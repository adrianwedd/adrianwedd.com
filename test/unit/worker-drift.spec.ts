import { describe, it, expect } from 'vitest';
import { parseDeployedSha, classifyDrift } from '../../scripts/worker-drift.mjs';

describe('parseDeployedSha', () => {
  it('extracts the sha from a gitsha: message', () => {
    expect(parseDeployedSha('gitsha:e43d57a0f1c2b3a4d5e6f7a8b9c0d1e2f3a4b5c6')).toBe(
      'e43d57a0f1c2b3a4d5e6f7a8b9c0d1e2f3a4b5c6',
    );
  });
  it('returns null for an unstamped message', () => {
    expect(parseDeployedSha('Manual deploy')).toBeNull();
    expect(parseDeployedSha('')).toBeNull();
    expect(parseDeployedSha(null)).toBeNull();
  });
});

describe('classifyDrift', () => {
  it('unstamped → drift', () => {
    expect(classifyDrift({ sha: null }).drift).toBe(true);
  });
  it('sha absent from repo → drift', () => {
    expect(classifyDrift({ sha: 'deadbeef', shaExists: false }).drift).toBe(true);
  });
  it('sha not an ancestor → drift', () => {
    expect(classifyDrift({ sha: 'abc', shaExists: true, isAncestor: false }).drift).toBe(true);
  });
  it('undeployed commits touch the worker → drift', () => {
    expect(classifyDrift({ sha: 'abc', shaExists: true, isAncestor: true, undeployedCount: 2 }).drift).toBe(true);
  });
  it('in sync → no drift', () => {
    const r = classifyDrift({ sha: 'abc', shaExists: true, isAncestor: true, undeployedCount: 0 });
    expect(r.drift).toBe(false);
    expect(r.reason).toMatch(/in sync/);
  });
});
