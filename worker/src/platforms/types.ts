export type PostType = 'text' | 'photo' | 'link';
export type PostStatus = 'queued' | 'publishing' | 'published' | 'failed';
export type Platform = 'facebook' | 'instagram' | 'bluesky';

export interface SocialPost {
  id: string;
  platform: Platform;
  type: PostType;
  message: string;
  imageUrl?: string;
  link?: string;
  scheduledAt: string;
  scheduledAtEpoch: number;
  status: PostStatus;
  publishedId: string | null;
  publishedAt: string | null;
  error: string | null;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  errorCode?: number;
  isTransient: boolean;
  isAuthError: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  rawAuthorId: string;          // Platform user ID — caller is responsible for hashing before storage
  message: string;
  createdTime: string;
  isFromPage: boolean;
}

export interface AuthStatus {
  valid: boolean;
  platform: Platform;
  expiresAt: number;
  dataAccessExpiresAt: number;
  daysUntilExpiry: number;
}

export interface IdempotencyRecord {
  key: string;
  status: 'published' | 'failed';
  platformPostId: string | null;
  completedAt: string;
  error: string | null;
}

export interface SocialPlatform {
  platform: Platform;
  publishPost(post: SocialPost): Promise<PublishResult>;
  listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>>;
  getComments(postId: string, since: Date): Promise<Comment[]>;
  getCommentReplies(commentId: string): Promise<Comment[]>;
  replyToComment(commentId: string, message: string): Promise<PublishResult>;
  getPageIdentity(): string;
  debugAuth(): Promise<AuthStatus>;
}
