import { describe, it, expect, vi } from 'vitest';
import { sendCrisisAlert, sweepCrisisAlerts, buildCrisisAlertRaw } from '../email';

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
    ).resolves.toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('degrades silently when the binding or vars are missing', async () => {
    const kv = mockKV();
    await expect(sendCrisisAlert({ SOCIAL: kv as unknown as KVNamespace }, comment)).resolves.toBe(false);
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

describe('sweepCrisisAlerts', () => {
  const envFor = (kv: ReturnType<typeof mockKV>, send = vi.fn().mockResolvedValue(undefined)) => ({
    SOCIAL: kv as unknown as KVNamespace,
    CRISIS_EMAIL: { send },
    CRISIS_ALERT_FROM: 'a@x.com',
    CRISIS_ALERT_TO: 'b@x.com',
    send,
  });

  it('re-sends for a flag with no crisis-emailed marker', async () => {
    const kv = mockKV();
    kv.list.mockResolvedValue({ keys: [{ name: 'flag-crisis:c1' }], list_complete: true });
    kv.get.mockImplementation(async (key: string) =>
      key === 'flag-crisis:c1' ? JSON.stringify({ commentId: 'c1', postId: 'p1', message: 'help' }) : null,
    );
    const env = envFor(kv);
    await expect(sweepCrisisAlerts(env)).resolves.toBe(1);
    expect(env.send).toHaveBeenCalledTimes(1);
  });

  it('skips flags already emailed', async () => {
    const kv = mockKV();
    kv.list.mockResolvedValue({ keys: [{ name: 'flag-crisis:c1' }], list_complete: true });
    kv.get.mockImplementation(async (key: string) => (key === 'crisis-emailed:c1' ? 'sent' : null));
    const env = envFor(kv);
    await expect(sweepCrisisAlerts(env)).resolves.toBe(0);
    expect(env.send).not.toHaveBeenCalled();
  });

  it('never throws when KV list fails', async () => {
    const kv = mockKV();
    kv.list.mockRejectedValue(new Error('kv down'));
    await expect(sweepCrisisAlerts(envFor(kv))).resolves.toBe(0);
  });

  it('CRLF in comment id cannot inject MIME headers', () => {
    const raw = buildCrisisAlertRaw('a@x.com', 'b@x.com', {
      commentId: 'c1\r\nBcc: evil@x.com',
      postId: 'p1',
      message: 'hi',
    });
    expect(raw).not.toContain('\r\nBcc');
    expect(raw).toContain('Subject: [CRISIS] Flagged comment c1Bcc: evil@x.com');
  });
});
