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
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: [CRISIS] Flagged comment ${comment.commentId}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'A comment was classified as crisis by the comment monitor.',
    '',
    `Comment ID: ${comment.commentId}`,
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
export async function sendCrisisAlert(env: CrisisAlertEnv, comment: CrisisCommentInfo): Promise<void> {
  try {
    if (!env.CRISIS_EMAIL || !env.CRISIS_ALERT_FROM || !env.CRISIS_ALERT_TO) {
      console.error('Crisis alert email not configured (CRISIS_EMAIL binding / FROM / TO) — health endpoint only');
      return;
    }
    const dedupeKey = `crisis-emailed:${comment.commentId}`;
    if (await env.SOCIAL.get(dedupeKey)) return;
    const raw = buildCrisisAlertRaw(env.CRISIS_ALERT_FROM, env.CRISIS_ALERT_TO, comment);
    await env.CRISIS_EMAIL.send(new EmailMessage(env.CRISIS_ALERT_FROM, env.CRISIS_ALERT_TO, raw));
    await env.SOCIAL.put(dedupeKey, new Date().toISOString(), { expirationTtl: EMAILED_TTL });
  } catch (e) {
    console.error(`Crisis alert email failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
