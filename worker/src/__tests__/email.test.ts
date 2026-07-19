import { describe, it, expect, vi } from 'vitest';
import { sendCrisisAlert, buildCrisisAlertRaw } from '../email';

function mockKV() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    delete: vi.fn(),
  };
}

const comment = { commentId: 'c1', postId: 'p1', message: 'I cannot go on' };

describe('sendCrisisAlert', () => {
  it('sends exactly one email and records the dedupe key', async () => {
    const kv = mockKV();
    const send = vi.fn().mockResolvedValue(undefined);
    const env = {
      SOCIAL: kv as unknown as KVNamespace,
      CRISIS_EMAIL: { send },
      CRISIS_ALERT_FROM: 'alerts@adrianwedd.com',
      CRISIS_ALERT_TO: 'adrian@adrianwedd.com',
    };
    await sendCrisisAlert(env, comment);
    expect(send).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith('crisis-emailed:c1', expect.any(String), {
      expirationTtl: 90 * 24 * 60 * 60,
    });
  });

  it('does not re-send for an already-emailed comment', async () => {
    const kv = mockKV();
    kv.get.mockImplementation(async (key: string) => (key === 'crisis-emailed:c1' ? 'sent' : null));
    const send = vi.fn();
    await sendCrisisAlert(
      {
        SOCIAL: kv as unknown as KVNamespace,
        CRISIS_EMAIL: { send },
        CRISIS_ALERT_FROM: 'a@x.com',
        CRISIS_ALERT_TO: 'b@x.com',
      },
      comment,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('never throws when the send fails, and does not record the dedupe key', async () => {
    const kv = mockKV();
    const send = vi.fn().mockRejectedValue(new Error('smtp down'));
    await expect(
      sendCrisisAlert(
        {
          SOCIAL: kv as unknown as KVNamespace,
          CRISIS_EMAIL: { send },
          CRISIS_ALERT_FROM: 'a@x.com',
          CRISIS_ALERT_TO: 'b@x.com',
        },
        comment,
      ),
    ).resolves.toBeUndefined();
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('degrades silently when the binding or vars are missing', async () => {
    const kv = mockKV();
    await expect(sendCrisisAlert({ SOCIAL: kv as unknown as KVNamespace }, comment)).resolves.toBeUndefined();
    expect(kv.put).not.toHaveBeenCalled();
  });
});

describe('buildCrisisAlertRaw', () => {
  it('includes headers, ids, and truncates long messages', () => {
    const raw = buildCrisisAlertRaw('a@x.com', 'b@x.com', {
      commentId: 'c9',
      postId: 'p9',
      message: 'x'.repeat(600),
    });
    expect(raw).toContain('Subject: [CRISIS] Flagged comment c9');
    expect(raw).toContain('Post ID:    p9');
    expect(raw).toContain('…');
    expect(raw).not.toContain('x'.repeat(501));
  });
});
