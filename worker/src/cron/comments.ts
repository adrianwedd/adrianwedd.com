import { createHash } from 'node:crypto';
import type { SocialPlatform, Comment } from '../platforms/types';
import { classifyComment } from '../classify';

const PROFESSIONAL_INQUIRY_REPLIES = [
  "Thanks for your interest! You can find details about my work and services at adrianwedd.com/services/ — feel free to reach out via the contact page.",
  "Appreciate the message! Head to adrianwedd.com/contact/ for the best way to get in touch about projects and collaborations.",
];

const MAX_REPLIES_PER_RUN = 5;
const STALE_HOURS = 48;

export interface CommentProcessResult {
  postsChecked: number;
  newComments: number;
  replied: number;
  flagged: number;
}

function hashAuthorId(rawId: string): string {
  return createHash('sha256').update(rawId).digest('hex');
}

export async function processComments(
  platform: SocialPlatform,
  kv: KVNamespace,
): Promise<CommentProcessResult> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleThreshold = Date.now() - STALE_HOURS * 60 * 60 * 1000;

  const recentPosts = await platform.listRecentPosts(since);
  let newComments = 0;
  let replied = 0;
  let flagged = 0;
  let repliesRemaining = MAX_REPLIES_PER_RUN;

  for (const post of recentPosts) {
    const comments = await platform.getComments(post.id, since);

    for (const comment of comments) {
      // Skip own comments
      if (comment.isFromPage) continue;

      // Skip already seen
      const seen = await kv.get(`fb-comment:${comment.id}`);
      if (seen) continue;

      // Skip stale
      const commentTime = new Date(comment.createdTime).getTime();
      if (commentTime < staleThreshold) continue;

      newComments++;

      const classification = classifyComment(comment.message);
      const authorHash = hashAuthorId(comment.rawAuthorId); // Hash the platform user ID, not the comment ID

      // Store comment record (no message body)
      await kv.put(`fb-comment:${comment.id}`, JSON.stringify({
        commentId: comment.id,
        postId: comment.postId,
        authorIdHash: authorHash,
        classification,
        replied: false,
        flagged: classification !== 'professional-inquiry',
        createdTime: comment.createdTime,
      }), { expirationTtl: 90 * 24 * 60 * 60 });

      if (classification === 'professional-inquiry' && repliesRemaining > 0) {
        // Check for existing page reply (idempotency)
        const existingReplies = await platform.getCommentReplies(comment.id);
        const alreadyReplied = existingReplies.some(r => r.isFromPage);

        if (!alreadyReplied) {
          const template = PROFESSIONAL_INQUIRY_REPLIES[Math.floor(Math.random() * PROFESSIONAL_INQUIRY_REPLIES.length)];
          const result = await platform.replyToComment(comment.id, template);
          if (result.success) {
            replied++;
            repliesRemaining--;
            // Update comment record
            await kv.put(`fb-comment:${comment.id}`, JSON.stringify({
              commentId: comment.id,
              postId: comment.postId,
              authorIdHash: authorHash,
              classification,
              replied: true,
              flagged: false,
              createdTime: comment.createdTime,
            }), { expirationTtl: 90 * 24 * 60 * 60 });
          }
        }
      } else {
        // Flag for review (includes message body)
        await kv.put(`fb-flag:${comment.id}`, JSON.stringify({
          commentId: comment.id,
          postId: comment.postId,
          reason: classification,
          message: comment.message,
          flaggedAt: new Date().toISOString(),
        }), { expirationTtl: 14 * 24 * 60 * 60 });
        flagged++;
      }
    }
  }

  return { postsChecked: recentPosts.length, newComments, replied, flagged };
}
