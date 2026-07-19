import { describe, it, expect } from 'vitest';
import { extractDeployMessage, currentVersionId } from '../../scripts/wrangler-deployments.mjs';

const sample = [
  { annotations: { 'workers/message': 'gitsha:aaa' }, versions: [{ version_id: 'v-old', percentage: 100 }] },
  {
    annotations: { 'workers/message': 'gitsha:bbb1111111111111111111111111111111111111' },
    versions: [
      { version_id: 'v-new', percentage: 100 },
      { version_id: 'v-canary', percentage: 0 },
    ],
  },
];

describe('extractDeployMessage', () => {
  it('reads the newest deployment message (last element)', () => {
    expect(extractDeployMessage(sample)).toBe('gitsha:bbb1111111111111111111111111111111111111');
  });
  it('returns empty string when there is no message', () => {
    expect(extractDeployMessage([{ versions: [] }])).toBe('');
    expect(extractDeployMessage([])).toBe('');
  });
});

describe('currentVersionId', () => {
  it('picks the 100%-traffic version of the newest deployment', () => {
    expect(currentVersionId(sample)).toBe('v-new');
  });
  it('falls back to the last version when none is at 100%', () => {
    expect(
      currentVersionId([
        {
          versions: [
            { version_id: 'a', percentage: 50 },
            { version_id: 'b', percentage: 50 },
          ],
        },
      ]),
    ).toBe('b');
  });
  it('returns null when there are no versions', () => {
    expect(currentVersionId([{ versions: [] }])).toBeNull();
    expect(currentVersionId([])).toBeNull();
  });
});
