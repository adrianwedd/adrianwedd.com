import { EmailMessage } from 'cloudflare:email';

// Cloudflare Email Sending binding ([[send_email]] in wrangler.toml).
// Optional: absent in any environment without the binding configured, in
// which case crisis alerts degrade to the /api/health surfacing only.
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface CrisisAlertEnv {
  SOCIAL: KVNamespace;
  CRISIS_EMAIL?: EmailSender;
  CRISIS_ALERT_FROM?: string;
  CRISIS_ALERT_TO?: string;
}

export interface CrisisCommentInfo {
  commentId: string;
  postId: string;
  message: string;
}

const EMAILED_TTL = 90 * 24 * 60 * 60; // matches the flag-crisis: record TTL

export function buildCrisisAlertRaw(from: string, to: string, comment: CrisisCommentInfo): string {
  const excerpt = comment.message.length > 500 ? `${comment.message.slice(0, 500)}…` : comment.message;
  // Platform comment IDs are alphanumeric in practice, but this lands in a
  // raw MIME header — strip CR/LF so a hostile ID can't inject headers.
  const safeId = comment.commentId.replace(/[\r\n]/g, '');
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: [CRISIS] Flagged comment ${safeId}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'A comment was classified as crisis by the comment monitor.',
    '',
    `Comment ID: ${safeId}`,
    `Post ID:    ${comment.postId}`,
    '',
    'Message:',
    excerpt,
    '',
    'The full record is in KV under flag-crisis: (90-day TTL) and is counted',
    'on the authenticated /api/health endpoint (recentActivity.crisisFlags).',
    '',
  ].join('\r\n');
}

/**
 * Email Adrian about a crisis-classified comment. Deduped per comment via KV
 * (crisis-emailed:<id>) so retried cron runs can't re-alert. Never throws:
 * an alerting failure must not fail the comments cron — /api/health remains
 * the fallback channel.
 */
export async function sendCrisisAlert(env: CrisisAlertEnv, comment: CrisisCommentInfo): Promise<boolean> {
  try {
    if (!env.CRISIS_EMAIL || !env.CRISIS_ALERT_FROM || !env.CRISIS_ALERT_TO) {
      console.error('Crisis alert email not configured (CRISIS_EMAIL binding / FROM / TO) — health endpoint only');
      return false;
    }
    const dedupeKey = `crisis-emailed:${comment.commentId}`;
    if (await env.SOCIAL.get(dedupeKey)) return false;
    const raw = buildCrisisAlertRaw(env.CRISIS_ALERT_FROM, env.CRISIS_ALERT_TO, comment);
    await env.CRISIS_EMAIL.send(new EmailMessage(env.CRISIS_ALERT_FROM, env.CRISIS_ALERT_TO, raw));
    await env.SOCIAL.put(dedupeKey, new Date().toISOString(), { expirationTtl: EMAILED_TTL });
    return true;
  } catch (e) {
    console.error(`Crisis alert email failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

// KV list page size for the retry sweep — far above any realistic number of
// live crisis flags (90-day TTL).
const CRISIS_SWEEP_LIMIT = 100;

/**
 * Retry pass: alert for any flag-crisis: record that has no crisis-emailed:
 * marker. The inline alert in processComments fires first; this sweep exists
 * because a transient send failure there would otherwise never retry (the
 * comment is marked seen and skipped on later runs). Runs each comments cron.
 * Never throws; returns the number of alerts sent.
 */
export async function sweepCrisisAlerts(env: CrisisAlertEnv): Promise<number> {
  let sent = 0;
  try {
    if (!env.CRISIS_EMAIL || !env.CRISIS_ALERT_FROM || !env.CRISIS_ALERT_TO) return 0;
    const list = await env.SOCIAL.list({ prefix: 'flag-crisis:', limit: CRISIS_SWEEP_LIMIT });
    for (const key of list.keys) {
      const commentId = key.name.slice('flag-crisis:'.length);
      if (await env.SOCIAL.get(`crisis-emailed:${commentId}`)) continue;
      const rawRecord = await env.SOCIAL.get(key.name);
      if (!rawRecord) continue;
      let record: { postId?: string; message?: string };
      try {
        record = JSON.parse(rawRecord) as { postId?: string; message?: string };
      } catch {
        continue;
      }
      if (await sendCrisisAlert(env, { commentId, postId: record.postId ?? '', message: record.message ?? '' })) {
        sent++;
      }
    }
  } catch (e) {
    console.error(`Crisis alert sweep failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  return sent;
}
