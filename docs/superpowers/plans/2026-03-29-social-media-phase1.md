# Social Media Management Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Cloudflare Worker that auto-publishes new adrianwedd.com content to Facebook, manages a scheduled post queue, monitors comments with classification and auto-reply for professional inquiries, and provides a CLI for ad-hoc posting.

**Architecture:** Standalone Cloudflare Worker (`social.adrianwedd.com`) using Hono router and KV for state. GitHub Actions triggers cron endpoints and auto-publishes on content push. Platform adapter pattern enables future Instagram/Bluesky support.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers (Paid plan), KV, Vitest, GitHub Actions, Facebook Graph API v21.0

**Spec:** `docs/superpowers/specs/2026-03-29-social-media-management-design.md`

**Reference implementation:** `../thiswasntinthebrochure.wtf/website/src/lib/facebook.ts`

---

## File Map

```
worker/
  src/
    index.ts              — Hono router, all API endpoints
    auth.ts               — timingSafeEqual bearer token middleware
    env.ts                — Env/bindings type definitions
    platforms/
      types.ts            — Platform-agnostic interfaces (SocialPlatform, SocialPost, etc.)
      facebook.ts         — Facebook Graph API client (publishPost, getComments, etc.)
    cron/
      publish.ts          — Scheduled post publisher logic
      comments.ts         — Comment monitor + classifier + auto-reply logic
    classify.ts           — Comment classification engine (regex patterns)
    __tests__/
      auth.test.ts        — Auth middleware tests
      facebook.test.ts    — Facebook client tests (mocked fetch)
      publish.test.ts     — Publish cron logic tests
      comments.test.ts    — Comment monitor tests
      classify.test.ts    — Classification tests
      sync.test.ts        — Queue sync endpoint tests
  wrangler.toml           — Worker config with KV binding + nodejs_compat
  package.json            — Worker deps (hono, wrangler, vitest)
  tsconfig.json           — TypeScript strict config
social/
  facebook-posts.json     — Seed post queue (version-controlled)
scripts/
  extract-frontmatter.mjs — Node frontmatter extractor for GHA
  fb-post.sh              — CLI for posting and queue management
.github/workflows/
  social-autopublish.yml  — Auto-publish on content push + queue sync
  social-cron.yml         — Scheduled cron triggers (publish + comments)
```

---

## Task 1: Worker Scaffold and Types

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/env.ts`
- Create: `worker/src/platforms/types.ts`

- [ ] **Step 1: Create `worker/package.json`**

```json
{
  "name": "adrianwedd-social",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "hono": "^4.7.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260301.0",
    "vitest": "^3.1.0",
    "wrangler": "^4.5.0",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **Step 2: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "paths": { "~/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create `worker/wrangler.toml`**

```toml
name = "adrianwedd-social"
main = "src/index.ts"
compatibility_date = "2026-03-29"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SOCIAL"
id = "PLACEHOLDER_UNTIL_CREATED"

[vars]
FACEBOOK_PAGE_ID = "35753603727"
GRAPH_API_VERSION = "v21.0"
```

- [ ] **Step 4: Create `worker/src/env.ts`**

```typescript
export interface Env {
  // KV
  SOCIAL: KVNamespace;

  // Vars
  FACEBOOK_PAGE_ID: string;
  GRAPH_API_VERSION: string;

  // Secrets (set via wrangler secret put)
  CRON_SECRET: string;
  PUBLISH_SECRET: string;
  CLI_SECRET: string;
  FACEBOOK_PAGE_TOKEN: string;
  FACEBOOK_APP_TOKEN: string;
}
```

- [ ] **Step 5: Create `worker/src/platforms/types.ts`**

```typescript
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
```

- [ ] **Step 6: Install dependencies and verify**

Run: `cd worker && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add worker/package.json worker/package-lock.json worker/tsconfig.json worker/wrangler.toml worker/src/env.ts worker/src/platforms/types.ts
git commit -m "feat(social): scaffold worker with types and config"
```

---

## Task 2: Auth Middleware

**Files:**
- Create: `worker/src/auth.ts`
- Create: `worker/src/__tests__/auth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `worker/src/__tests__/auth.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run src/__tests__/auth.test.ts`
Expected: FAIL — `verifyBearer` not found.

- [ ] **Step 3: Implement `worker/src/auth.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run src/__tests__/auth.test.ts`
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/auth.ts worker/src/__tests__/auth.test.ts
git commit -m "feat(social): add timing-safe bearer auth middleware"
```

---

## Task 3: Facebook Client — Error Classification and `publishPost`

**Files:**
- Create: `worker/src/platforms/facebook.ts`
- Create: `worker/src/__tests__/facebook.test.ts`

- [ ] **Step 1: Write failing tests for error classification**

Create `worker/src/__tests__/facebook.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifyGraphError,
  createFacebookPlatform,
  type GraphErrorBody,
} from '../platforms/facebook';
import type { SocialPost } from '../platforms/types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('classifyGraphError', () => {
  it('classifies code 190 as auth error', () => {
    const result = classifyGraphError({ code: 190, message: 'Invalid token' });
    expect(result).toEqual({ isTransient: false, isAuthError: true });
  });

  it('classifies code 4 as transient (rate limit)', () => {
    const result = classifyGraphError({ code: 4, message: 'Rate limit' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 1 as transient', () => {
    const result = classifyGraphError({ code: 1, message: 'Unknown' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 2 as transient', () => {
    const result = classifyGraphError({ code: 2, message: 'Temporary' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 17 as transient', () => {
    const result = classifyGraphError({ code: 17, message: 'User rate limit' });
    expect(result).toEqual({ isTransient: true, isAuthError: false });
  });

  it('classifies code 10 as permanent', () => {
    const result = classifyGraphError({ code: 10, message: 'Permission denied' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });

  it('classifies code 200 as permanent', () => {
    const result = classifyGraphError({ code: 200, message: 'Permissions error' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });

  it('classifies code 240 as permanent', () => {
    const result = classifyGraphError({ code: 240, message: 'Blocked' });
    expect(result).toEqual({ isTransient: false, isAuthError: false });
  });
});

describe('publishPost', () => {
  const fb = createFacebookPlatform('35753603727', 'fake-token', 'fake-app-token', 'v21.0');

  const basePost: SocialPost = {
    id: 'test-001',
    platform: 'facebook',
    type: 'text',
    message: 'Hello world',
    scheduledAt: '2026-03-28T09:00:00+10:00',
    scheduledAtEpoch: 1774850400000,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  it('publishes a text post with Bearer auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '35753603727_123456' }),
    });

    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(true);
    expect(result.platformPostId).toBe('35753603727_123456');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/35753603727/feed');
    expect(options.headers['Authorization']).toBe('Bearer fake-token');
    expect(options.body).not.toContain('access_token');
  });

  it('publishes a photo post to /photos endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'photo_123', post_id: '35753603727_789' }),
    });

    const photoPost: SocialPost = { ...basePost, type: 'photo', imageUrl: 'https://example.com/img.png' };
    const result = await fb.publishPost(photoPost);
    expect(result.success).toBe(true);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/35753603727/photos');
    expect(options.body).toContain('caption=');
  });

  it('returns validation error for photo post without imageUrl', async () => {
    const photoPost: SocialPost = { ...basePost, type: 'photo' };
    const result = await fb.publishPost(photoPost);
    expect(result.success).toBe(false);
    expect(result.error).toContain('imageUrl');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('publishes a link post with link param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: '35753603727_456' }),
    });

    const linkPost: SocialPost = { ...basePost, type: 'link', link: 'https://adrianwedd.com/blog/test/' };
    const result = await fb.publishPost(linkPost);
    expect(result.success).toBe(true);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toContain('link=');
  });

  it('classifies auth errors from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 190, message: 'Invalid token' } }),
    });
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isAuthError).toBe(true);
  });

  it('treats HTTP 5xx as transient', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
  });

  it('handles fetch exceptions as transient', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
    const result = await fb.publishPost(basePost);
    expect(result.success).toBe(false);
    expect(result.isTransient).toBe(true);
    expect(result.error).toContain('Network timeout');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run src/__tests__/facebook.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `worker/src/platforms/facebook.ts`**

```typescript
import type {
  SocialPlatform,
  SocialPost,
  PublishResult,
  Comment,
  AuthStatus,
} from './types';

export interface GraphErrorBody {
  code: number;
  error_subcode?: number;
  message: string;
}

const AUTH_CODES = new Set([190]);
const TRANSIENT_CODES = new Set([1, 2, 4, 17]);

export function classifyGraphError(err: GraphErrorBody): { isTransient: boolean; isAuthError: boolean } {
  if (AUTH_CODES.has(err.code)) return { isTransient: false, isAuthError: true };
  if (TRANSIENT_CODES.has(err.code)) return { isTransient: true, isAuthError: false };
  return { isTransient: false, isAuthError: false };
}

export function createFacebookPlatform(
  pageId: string,
  pageToken: string,
  appToken: string,
  graphVersion = 'v21.0',
): SocialPlatform {
  const graphBase = `https://graph.facebook.com/${graphVersion}`;

  async function publishPost(post: SocialPost): Promise<PublishResult> {
    if (post.type === 'photo' && !post.imageUrl) {
      return { success: false, error: 'Photo post requires imageUrl', isTransient: false, isAuthError: false };
    }

    const endpoint = post.type === 'photo'
      ? `${graphBase}/${pageId}/photos`
      : `${graphBase}/${pageId}/feed`;

    const params = new URLSearchParams();
    if (post.type === 'photo') {
      params.set('url', post.imageUrl!);
      params.set('caption', post.message);
    } else {
      params.set('message', post.message);
      if (post.type === 'link' && post.link) {
        params.set('link', post.link);
      }
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        if (res.status >= 500) {
          const errText = await res.text().catch(() => `HTTP ${res.status}`);
          console.error(`Graph API server error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
          return { success: false, error: `HTTP ${res.status}`, errorCode: res.status, isTransient: true, isAuthError: false };
        }
        const body = await res.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: res.status, message: `HTTP ${res.status}` };
        const classification = classifyGraphError(err);
        console.error(`Graph API error (${err.code}): ${err.message}`);
        return { success: false, error: err.message, errorCode: err.code, ...classification };
      }

      const data = await res.json() as Record<string, unknown>;
      // For photo posts, Graph API returns { id: photo_id, post_id: page_post_id }
      // Prefer post_id (the page feed entry) over id (the photo object)
      const postId = (data.post_id as string) ?? (data.id as string) ?? undefined;
      return { success: true, platformPostId: postId, isTransient: false, isAuthError: false };
    } catch (error) {
      console.error('Graph API fetch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        isTransient: true,
        isAuthError: false,
      };
    }
  }

  // debugToken: Exception — input_token must be in query string per Graph API design
  async function debugAuth(): Promise<AuthStatus> {
    try {
      const res = await fetch(
        `${graphBase}/debug_token?input_token=${encodeURIComponent(pageToken)}`,
        { headers: { 'Authorization': `Bearer ${appToken}` } },
      );
      if (!res.ok) {
        return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const body = await res.json() as Record<string, unknown>;
      const data = body?.data as Record<string, unknown> | undefined;
      if (!data) {
        return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
      }
      const now = Math.floor(Date.now() / 1000);
      const dataAccessExpiresAt = Number(data.data_access_expires_at) || 0;
      const daysUntilExpiry = dataAccessExpiresAt > 0
        ? Math.floor((dataAccessExpiresAt - now) / 86400)
        : Infinity;
      return {
        valid: Boolean(data.is_valid),
        platform: 'facebook',
        expiresAt: Number(data.expires_at) || 0,
        dataAccessExpiresAt,
        daysUntilExpiry: Number.isFinite(daysUntilExpiry) ? daysUntilExpiry : 999,
      };
    } catch {
      return { valid: false, platform: 'facebook', expiresAt: 0, dataAccessExpiresAt: 0, daysUntilExpiry: 0 };
    }
  }

  async function listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>> {
    const sinceUnix = Math.floor(since.getTime() / 1000);
    const posts: Array<{ id: string; createdTime: string }> = [];
    let url: string | null = `${graphBase}/${pageId}/feed?fields=id,created_time&since=${sinceUnix}&limit=25`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; created_time: string }>; paging?: { next?: string } };
      for (const p of body.data ?? []) {
        posts.push({ id: p.id, createdTime: p.created_time });
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return posts;
  }

  async function getComments(postId: string, since: Date): Promise<Comment[]> {
    const sinceUnix = Math.floor(since.getTime() / 1000);
    const comments: Comment[] = [];
    let url: string | null = `${graphBase}/${postId}/comments?fields=id,from,message,created_time,is_hidden&since=${sinceUnix}&limit=50`;
    let pages = 0;

    while (url && pages < 4) {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
      if (!res.ok) break;
      const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; message: string; created_time: string; is_hidden?: boolean }>; paging?: { next?: string } };
      for (const c of body.data ?? []) {
        if (c.is_hidden) continue;
        comments.push({
          id: c.id,
          postId,
          rawAuthorId: c.from?.id ?? '',  // Caller is responsible for hashing before storage
          message: c.message,
          createdTime: c.created_time,
          isFromPage: c.from?.id === pageId,
        });
      }
      url = body.paging?.next ?? null;
      pages++;
    }
    return comments;
  }

  async function getCommentReplies(commentId: string): Promise<Comment[]> {
    const res = await fetch(
      `${graphBase}/${commentId}/comments?filter=stream&fields=id,from,message,created_time&limit=50`,
      { headers: { 'Authorization': `Bearer ${pageToken}` } },
    );
    if (!res.ok) return [];
    const body = await res.json() as { data?: Array<{ id: string; from?: { id: string }; message: string; created_time: string }> };
    return (body.data ?? []).map(c => ({
      id: c.id,
      postId: commentId,
      rawAuthorId: c.from?.id ?? '',
      message: c.message,
      createdTime: c.created_time,
      isFromPage: c.from?.id === pageId,
    }));
  }

  async function replyToComment(commentId: string, message: string): Promise<PublishResult> {
    try {
      const params = new URLSearchParams();
      params.set('message', message);
      const res = await fetch(`${graphBase}/${commentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pageToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
      if (!res.ok) {
        if (res.status >= 500) {
          return { success: false, error: `HTTP ${res.status}`, isTransient: true, isAuthError: false };
        }
        const body = await res.json() as { error?: GraphErrorBody };
        const err = body.error ?? { code: res.status, message: `HTTP ${res.status}` };
        return { success: false, error: err.message, errorCode: err.code, ...classifyGraphError(err) };
      }
      const data = await res.json() as { id?: string };
      return { success: true, platformPostId: data.id, isTransient: false, isAuthError: false };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), isTransient: true, isAuthError: false };
    }
  }

  function getPageIdentity(): string {
    return pageId;
  }

  return {
    platform: 'facebook',
    publishPost,
    listRecentPosts,
    getComments,
    getCommentReplies,
    replyToComment,
    getPageIdentity,
    debugAuth,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run src/__tests__/facebook.test.ts`
Expected: All 15 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/platforms/facebook.ts worker/src/__tests__/facebook.test.ts
git commit -m "feat(social): facebook graph API client with error classification"
```

---

## Task 4: Comment Classification

**Files:**
- Create: `worker/src/classify.ts`
- Create: `worker/src/__tests__/classify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `worker/src/__tests__/classify.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { classifyComment, type CommentClassification } from '../classify';

describe('classifyComment', () => {
  it('classifies crisis messages (highest priority)', () => {
    expect(classifyComment("I can't cope anymore")).toBe('crisis');
    expect(classifyComment("I want to die")).toBe('crisis');
    expect(classifyComment("thinking about self-harm")).toBe('crisis');
    expect(classifyComment("I don't want to exist")).toBe('crisis');
  });

  it('classifies negative messages', () => {
    expect(classifyComment("This is garbage")).toBe('negative');
    expect(classifyComment("You're wrong and irresponsible")).toBe('negative');
  });

  it('classifies spam', () => {
    expect(classifyComment("Check my profile for free gifts")).toBe('spam');
    expect(classifyComment("Great crypto investment opportunity here")).toBe('spam');
    expect(classifyComment("Visit https://scamsite.com now")).toBe('spam');
  });

  it('classifies professional inquiries', () => {
    expect(classifyComment("I'd like to hire you for consulting")).toBe('professional-inquiry');
    expect(classifyComment("What are your rates?")).toBe('professional-inquiry');
    expect(classifyComment("Can I work with you on a project?")).toBe('professional-inquiry');
    expect(classifyComment("How do I get in touch?")).toBe('professional-inquiry');
  });

  it('does not match "contact" alone (false positive risk)', () => {
    expect(classifyComment("I lost my contact lens")).toBe('unclassified');
  });

  it('crisis takes priority over other matches', () => {
    expect(classifyComment("I can't cope, this is garbage, DM me")).toBe('crisis');
  });

  it('multi-match (non-crisis) flags for review', () => {
    expect(classifyComment("This is garbage, check my profile")).toBe('multi-match');
  });

  it('returns unclassified for neutral messages', () => {
    expect(classifyComment("Great article!")).toBe('unclassified');
    expect(classifyComment("Thanks for sharing")).toBe('unclassified');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run src/__tests__/classify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `worker/src/classify.ts`**

```typescript
export type CommentClassification =
  | 'crisis'
  | 'negative'
  | 'spam'
  | 'professional-inquiry'
  | 'positive'
  | 'personal'
  | 'multi-match'
  | 'unclassified';

const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicide|suicidal|kill\s*(myself|themselves))\b/i,
  /\b(self[- ]?harm|hurt\s*(myself|themselves))\b/i,
  /\bcan'?t\s+(cope|go on|do this|take it|anymore)\b/i,
  /\b(end\s*(it|my life)|don'?t\s+want\s+to\s+(be here|live|exist))\b/i,
  /\b(want\s+to\s+(die|disappear)|no\s+point|give\s+up)\b/i,
  /\b(crisis|emergency)\b/i,
];

const NEGATIVE_PATTERNS: RegExp[] = [
  /\b(rubbish|garbage|waste|scam|terrible|awful|disgusting)\b/i,
  /\b(you'?re\s+wrong|dangerous|irresponsible|harmful)\b/i,
];

const SPAM_SIGNALS: RegExp[] = [
  /https?:\/\/(?!adrianwedd\.com)/i,
  /\b(DM\s+me|check\s+my\s+(profile|page|bio)|free\s+gift)\b/i,
  /\b(crypto|NFT|forex|investment\s+opportunity)\b/i,
];

const PROFESSIONAL_INQUIRY_PATTERNS: RegExp[] = [
  /\b(hire|hiring|consult|consulting|freelance)\b/i,
  /\b(work\s+with\s+you|collaborate|partnership)\b/i,
  /\b(services|rates?|availability|book\s+a\s+(call|meeting))\b/i,
  /\b(reach\s+you|get\s+in\s+touch)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function classifyComment(text: string): CommentClassification {
  // Crisis always wins
  if (matchesAny(text, CRISIS_PATTERNS)) return 'crisis';

  const matches: CommentClassification[] = [];
  if (matchesAny(text, NEGATIVE_PATTERNS)) matches.push('negative');
  if (matchesAny(text, SPAM_SIGNALS)) matches.push('spam');
  if (matchesAny(text, PROFESSIONAL_INQUIRY_PATTERNS)) matches.push('professional-inquiry');

  if (matches.length > 1) return 'multi-match';
  if (matches.length === 1) return matches[0];
  return 'unclassified';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd worker && npx vitest run src/__tests__/classify.test.ts`
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/classify.ts worker/src/__tests__/classify.test.ts
git commit -m "feat(social): comment classification engine with crisis detection"
```

---

## Task 5: Hono Router and Endpoints

**Files:**
- Create: `worker/src/index.ts`

- [ ] **Step 1: Implement the Hono router**

Create `worker/src/index.ts`:

```typescript
import { Hono } from 'hono';
import type { Env } from './env';
import { verifyBearer } from './auth';
import { createFacebookPlatform } from './platforms/facebook';
import type { SocialPost, IdempotencyRecord } from './platforms/types';

const app = new Hono<{ Bindings: Env }>();

// ── Auth helpers ──────────────────────────────────────────────────────────────

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── POST /api/publish ─────────────────────────────────────────────────────────

app.post('/api/publish', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform: string;
    type: string;
    message: string;
    link?: string;
    imageUrl?: string;
    idempotencyKey: string;
  }>();

  // Check durable idempotency record
  const existingRaw = await env.SOCIAL.get(`idempotent:${body.idempotencyKey}`);
  if (existingRaw) {
    const existing: IdempotencyRecord = JSON.parse(existingRaw);
    if (existing.status === 'published') {
      return json({ alreadyPublished: true, platformPostId: existing.platformPostId });
    }
    return json({ alreadyFailed: true, error: existing.error });
  }

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  const post: SocialPost = {
    id: body.idempotencyKey,
    platform: 'facebook',
    type: body.type as SocialPost['type'],
    message: body.message,
    link: body.link,
    imageUrl: body.imageUrl,
    scheduledAt: new Date().toISOString(),
    scheduledAtEpoch: Date.now(),
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  const result = await fb.publishPost(post);

  // Write durable idempotency record (30-day TTL)
  const record: IdempotencyRecord = {
    key: body.idempotencyKey,
    status: result.success ? 'published' : 'failed',
    platformPostId: result.platformPostId ?? null,
    completedAt: new Date().toISOString(),
    error: result.error ?? null,
  };
  await env.SOCIAL.put(`idempotent:${body.idempotencyKey}`, JSON.stringify(record), {
    expirationTtl: 30 * 24 * 60 * 60,
  });

  if (result.success) {
    return json({ published: true, platformPostId: result.platformPostId });
  }

  const status = result.isAuthError ? 503 : result.isTransient ? 502 : 422;
  return json({ published: false, error: result.error, isTransient: result.isTransient }, status);
});

// ── POST /api/queue ───────────────────────────────────────────────────────────

app.post('/api/queue', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    platform: string;
    type: string;
    message: string;
    scheduledAt: string;
    link?: string;
    imageUrl?: string;
  }>();

  const epoch = new Date(body.scheduledAt).getTime();
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return json({ error: 'Invalid scheduledAt — must be valid ISO 8601 datetime' }, 400);
  }
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const id = `adhoc-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

  const post: SocialPost = {
    id,
    platform: 'facebook',
    type: body.type as SocialPost['type'],
    message: body.message,
    link: body.link,
    imageUrl: body.imageUrl,
    scheduledAt: body.scheduledAt,
    scheduledAtEpoch: epoch,
    status: 'queued',
    publishedId: null,
    publishedAt: null,
    error: null,
  };

  const kvKey = `post:queued:${epoch}:${id}`;
  await env.SOCIAL.put(kvKey, JSON.stringify(post));

  return json({ id, scheduledAt: body.scheduledAt, kvKey });
});

// ── POST /api/queue/sync ──────────────────────────────────────────────────────

app.post('/api/queue/sync', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);
  if (!authOk) return unauthorized();

  const body = await c.req.json<{
    hash: string;
    posts: Array<{
      id: string;
      type: string;
      message: string;
      link?: string;
      imageUrl?: string;
      scheduledAt: string;
      scheduledAtEpoch: number;
    }>;
  }>();

  const existingHash = await env.SOCIAL.get('queue-hash');
  if (existingHash === body.hash) {
    return json({ unchanged: true, hash: body.hash });
  }

  // Build map of incoming posts by ID
  const incomingById = new Map(body.posts.map(p => [p.id, p]));

  // Scan all queued posts in KV
  const kvQueued = new Map<string, { key: string; post: SocialPost }>();
  let cursor: string | undefined;
  do {
    const list = await env.SOCIAL.list({ prefix: 'post:queued:', limit: 100, ...(cursor ? { cursor } : {}) });
    for (const key of list.keys) {
      const raw = await env.SOCIAL.get(key.name);
      if (!raw) continue;
      try {
        const post: SocialPost = JSON.parse(raw);
        kvQueued.set(post.id, { key: key.name, post });
      } catch { /* skip corrupt */ }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  let created = 0;
  let updated = 0;
  let cancelled = 0;
  let skippedTerminal = 0;

  // Create or update from incoming
  for (const [id, incoming] of incomingById) {
    const existing = kvQueued.get(id);

    if (!existing) {
      // Check if this post already reached terminal state
      const idempotent = await env.SOCIAL.get(`idempotent:${id}`);
      if (idempotent) {
        skippedTerminal++;
        continue;
      }
      // Create new queued post
      const post: SocialPost = {
        id,
        platform: 'facebook',
        type: incoming.type as SocialPost['type'],
        message: incoming.message,
        link: incoming.link,
        imageUrl: incoming.imageUrl,
        scheduledAt: incoming.scheduledAt,
        scheduledAtEpoch: incoming.scheduledAtEpoch,
        status: 'queued',
        publishedId: null,
        publishedAt: null,
        error: null,
      };
      await env.SOCIAL.put(`post:queued:${incoming.scheduledAtEpoch}:${id}`, JSON.stringify(post));
      created++;
    } else {
      // Update queued post (only if still queued)
      const updatedPost: SocialPost = {
        ...existing.post,
        message: incoming.message,
        type: incoming.type as SocialPost['type'],
        link: incoming.link,
        imageUrl: incoming.imageUrl,
        scheduledAt: incoming.scheduledAt,
        scheduledAtEpoch: incoming.scheduledAtEpoch,
      };
      // If epoch changed, need to move the key
      const newKey = `post:queued:${incoming.scheduledAtEpoch}:${id}`;
      if (newKey !== existing.key) {
        await env.SOCIAL.delete(existing.key);
      }
      await env.SOCIAL.put(newKey, JSON.stringify(updatedPost));
      updated++;
    }
  }

  // Cancel queued posts missing from incoming
  for (const [id, { key }] of kvQueued) {
    if (!incomingById.has(id)) {
      await env.SOCIAL.delete(key);
      cancelled++;
    }
  }

  await env.SOCIAL.put('queue-hash', body.hash);

  return json({ created, updated, cancelled, skippedTerminal, hash: body.hash });
});

// ── POST /api/cron/publish ────────────────────────────────────────────────────

app.post('/api/cron/publish', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET);
  if (!authOk) return unauthorized();

  // Cron lock
  const cronLock = await env.SOCIAL.get('cron-lock:publish');
  if (cronLock) return json({ skipped: true, reason: 'locked' });
  await env.SOCIAL.put('cron-lock:publish', '1', { expirationTtl: 300 });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  try {
    // Token health
    const tokenHealth = await fb.debugAuth();
    if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
      console.error('Facebook data access has expired');
      return json({ error: 'Facebook data access expired' }, 503);
    }
    if (tokenHealth.daysUntilExpiry <= 7) {
      console.error(`Facebook data access expires in ${tokenHealth.daysUntilExpiry} days — URGENT`);
    } else if (tokenHealth.daysUntilExpiry <= 14) {
      console.warn(`Facebook data access expires in ${tokenHealth.daysUntilExpiry} days`);
    }

    // Discover queued posts
    const duePosts: Array<{ key: string; post: SocialPost }> = [];
    let cursor: string | undefined;
    do {
      const list = await env.SOCIAL.list({ prefix: 'post:queued:', limit: 100, ...(cursor ? { cursor } : {}) });
      for (const key of list.keys) {
        const raw = await env.SOCIAL.get(key.name);
        if (!raw) continue;
        try {
          const post: SocialPost = JSON.parse(raw);
          if (post.scheduledAtEpoch <= Date.now()) {
            duePosts.push({ key: key.name, post });
          }
        } catch { continue; }
      }
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);

    duePosts.sort((a, b) => a.post.scheduledAtEpoch - b.post.scheduledAtEpoch);

    let published = 0;
    let failed = 0;

    for (const { key, post } of duePosts.slice(0, 5)) {
      // Check idempotency
      const existing = await env.SOCIAL.get(`idempotent:${post.id}`);
      if (existing) {
        await env.SOCIAL.delete(key); // Clean up stale queued key
        continue;
      }

      // Move to publishing state (optimistic lock)
      await env.SOCIAL.put(`post:publishing:${post.scheduledAtEpoch}:${post.id}`, JSON.stringify({ ...post, status: 'publishing' }));
      await env.SOCIAL.delete(key);

      const result = await fb.publishPost(post);

      if (result.success) {
        const publishedPost: SocialPost = {
          ...post,
          status: 'published',
          publishedId: result.platformPostId ?? null,
          publishedAt: new Date().toISOString(),
        };
        await env.SOCIAL.put(
          `post:published:${post.scheduledAtEpoch}:${post.id}`,
          JSON.stringify(publishedPost),
          { expirationTtl: 180 * 24 * 60 * 60 },
        );
        await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
          key: post.id, status: 'published',
          platformPostId: result.platformPostId ?? null,
          completedAt: new Date().toISOString(), error: null,
        }), { expirationTtl: 30 * 24 * 60 * 60 });
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        published++;
      } else if (result.isAuthError) {
        // Revert to queued
        await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        console.error(`Facebook token invalid — halting run`);
        return json({ error: 'Token invalid', published, failed, tokenExpiresInDays: tokenHealth.daysUntilExpiry }, 503);
      } else if (result.isTransient) {
        // Revert to queued
        await env.SOCIAL.put(key, JSON.stringify({ ...post, status: 'queued' }));
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        console.warn(`Transient error for ${post.id}: ${result.error} — skipping remaining`);
        break; // Spec: skip remaining posts on transient error
      } else {
        const failedPost: SocialPost = { ...post, status: 'failed', error: result.error ?? 'Unknown' };
        await env.SOCIAL.put(`post:failed:${post.id}`, JSON.stringify(failedPost));
        await env.SOCIAL.put(`idempotent:${post.id}`, JSON.stringify({
          key: post.id, status: 'failed',
          platformPostId: null,
          completedAt: new Date().toISOString(), error: result.error ?? 'Unknown',
        }), { expirationTtl: 30 * 24 * 60 * 60 });
        await env.SOCIAL.delete(`post:publishing:${post.scheduledAtEpoch}:${post.id}`);
        failed++;
      }
    }

    const remaining = Math.max(0, duePosts.length - 5);
    if (remaining > 10) console.error(`Post queue backlog: ${remaining}`);
    else if (remaining > 0) console.warn(`${remaining} posts still queued`);

    return json({ published, failed, remaining, tokenExpiresInDays: tokenHealth.daysUntilExpiry });
  } finally {
    await env.SOCIAL.delete('cron-lock:publish');
  }
});

// ── POST /api/cron/comments ───────────────────────────────────────────────────
// Implemented in Task 6

// ── GET /api/health ───────────────────────────────────────────────────────────

app.get('/api/health', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.PUBLISH_SECRET)
    || await verifyBearer(c.req.header('Authorization') ?? null, env.CLI_SECRET);

  if (!authOk) return json({ ok: true });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);
  const authStatus = await fb.debugAuth();

  // Count posts by status
  let queued = 0;
  let published = 0;
  let failed = 0;
  let nextScheduled: string | null = null;

  for (const prefix of ['post:queued:', 'post:published:', 'post:failed:']) {
    let listCursor: string | undefined;
    do {
      const list = await env.SOCIAL.list({ prefix, limit: 100, ...(listCursor ? { cursor: listCursor } : {}) });
      if (prefix === 'post:queued:') {
        queued += list.keys.length;
        // Find next scheduled (keys are time-ordered)
        if (!nextScheduled && list.keys.length > 0) {
          const raw = await env.SOCIAL.get(list.keys[0].name);
          if (raw) {
            try { nextScheduled = JSON.parse(raw).scheduledAt; } catch {}
          }
        }
      }
      else if (prefix === 'post:published:') published += list.keys.length;
      else failed += list.keys.length;
      listCursor = list.list_complete ? undefined : list.cursor;
    } while (listCursor);
  }

  // Count flagged comments
  let flaggedComments = 0;
  let flagCursor: string | undefined;
  do {
    const list = await env.SOCIAL.list({ prefix: 'fb-flag:', limit: 100, ...(flagCursor ? { cursor: flagCursor } : {}) });
    flaggedComments += list.keys.length;
    flagCursor = list.list_complete ? undefined : list.cursor;
  } while (flagCursor);

  return json({
    platforms: {
      facebook: {
        tokenValid: authStatus.valid,
        dataAccessExpiresAt: authStatus.dataAccessExpiresAt,
        daysUntilExpiry: authStatus.daysUntilExpiry,
      },
    },
    queue: { facebook: { queued, published, failed, nextScheduled } },
    recentActivity: { flaggedComments },
  });
});

export default app;
```

- [ ] **Step 2: Verify worker builds**

Run: `cd worker && npx wrangler dev --dry-run 2>&1 | head -5`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat(social): hono router with publish, queue, sync, cron, health endpoints"
```

---

## Task 6: Comment Monitor Cron

**Files:**
- Modify: `worker/src/index.ts` (add `/api/cron/comments` route)
- Create: `worker/src/cron/comments.ts`
- Create: `worker/src/__tests__/comments.test.ts`

- [ ] **Step 1: Write failing tests**

Create `worker/src/__tests__/comments.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { processComments, type CommentProcessResult } from '../cron/comments';
import type { SocialPlatform, Comment } from '../platforms/types';

function mockPlatform(overrides: Partial<SocialPlatform> = {}): SocialPlatform {
  return {
    platform: 'facebook',
    publishPost: vi.fn(),
    listRecentPosts: vi.fn().mockResolvedValue([]),
    getComments: vi.fn().mockResolvedValue([]),
    getCommentReplies: vi.fn().mockResolvedValue([]),
    replyToComment: vi.fn().mockResolvedValue({ success: true, platformPostId: 'reply_1', isTransient: false, isAuthError: false }),
    getPageIdentity: vi.fn().mockReturnValue('page_123'),
    debugAuth: vi.fn(),
    ...overrides,
  };
}

function mockKV(): { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ keys: [], list_complete: true }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe('processComments', () => {
  it('skips comments from page itself', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'Hello', createdTime: new Date().toISOString(), isFromPage: true },
      ]),
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(0);
    expect(result.flagged).toBe(0);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('skips already-seen comments', async () => {
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'Hello', createdTime: new Date().toISOString(), isFromPage: false },
      ]),
    });
    const kv = mockKV();
    kv.get.mockImplementation(async (key: string) => key === 'fb-comment:c1' ? '{}' : null);
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.newComments).toBe(0);
  });

  it('auto-replies to professional inquiries', async () => {
    const replyFn = vi.fn().mockResolvedValue({ success: true, platformPostId: 'reply_1', isTransient: false, isAuthError: false });
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'What are your consulting rates?', createdTime: new Date().toISOString(), isFromPage: false },
      ]),
      getCommentReplies: vi.fn().mockResolvedValue([]),
      replyToComment: replyFn,
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(1);
    expect(replyFn).toHaveBeenCalledOnce();
  });

  it('flags crisis comments without replying', async () => {
    const replyFn = vi.fn();
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: "I can't cope anymore", createdTime: new Date().toISOString(), isFromPage: false },
      ]),
      replyToComment: replyFn,
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.flagged).toBe(1);
    expect(result.replied).toBe(0);
    expect(replyFn).not.toHaveBeenCalled();
  });

  it('skips comments older than 48 hours', async () => {
    const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    const platform = mockPlatform({
      listRecentPosts: vi.fn().mockResolvedValue([{ id: 'post_1', createdTime: new Date().toISOString() }]),
      getComments: vi.fn().mockResolvedValue([
        { id: 'c1', postId: 'post_1', rawAuthorId: 'user_456', message: 'What are your rates?', createdTime: oldDate, isFromPage: false },
      ]),
    });
    const kv = mockKV();
    const result = await processComments(platform, kv as unknown as KVNamespace);
    expect(result.replied).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run src/__tests__/comments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `worker/src/cron/comments.ts`**

```typescript
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
  const pageId = platform.getPageIdentity();

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
```

- [ ] **Step 4: Wire into router**

Add to `worker/src/index.ts`, replacing the `// Implemented in Task 6` comment:

```typescript
import { processComments } from './cron/comments';

// ── POST /api/cron/comments ───────────────────────────────────────────────────

app.post('/api/cron/comments', async (c) => {
  const env = c.env;
  const authOk = await verifyBearer(c.req.header('Authorization') ?? null, env.CRON_SECRET);
  if (!authOk) return unauthorized();

  const cronLock = await env.SOCIAL.get('cron-lock:comments');
  if (cronLock) return json({ skipped: true, reason: 'locked' });
  await env.SOCIAL.put('cron-lock:comments', '1', { expirationTtl: 300 });

  const fb = createFacebookPlatform(env.FACEBOOK_PAGE_ID, env.FACEBOOK_PAGE_TOKEN, env.FACEBOOK_APP_TOKEN, env.GRAPH_API_VERSION);

  try {
    const tokenHealth = await fb.debugAuth();
    if (!tokenHealth.valid || tokenHealth.daysUntilExpiry <= 0) {
      return json({ error: 'Facebook data access expired' }, 503);
    }

    const result = await processComments(fb, env.SOCIAL);

    return json({ ...result, tokenExpiresInDays: tokenHealth.daysUntilExpiry });
  } finally {
    await env.SOCIAL.delete('cron-lock:comments');
  }
});
```

- [ ] **Step 5: Run all tests**

Run: `cd worker && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/cron/comments.ts worker/src/__tests__/comments.test.ts worker/src/index.ts
git commit -m "feat(social): comment monitor with classification and auto-reply"
```

---

## Task 7: Frontmatter Extractor Script

**Files:**
- Create: `scripts/extract-frontmatter.mjs`

- [ ] **Step 1: Create the script**

```javascript
#!/usr/bin/env node
// Extracts frontmatter from a markdown file as JSON.
// Used by social-autopublish.yml for reliable YAML parsing.
// Usage: node scripts/extract-frontmatter.mjs path/to/file.md

import { readFileSync } from 'node:fs';
import matter from 'gray-matter';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node extract-frontmatter.mjs <file>');
  process.exit(1);
}

const content = readFileSync(filePath, 'utf8');
const { data } = matter(content);
console.log(JSON.stringify(data));
```

- [ ] **Step 2: Verify it works**

Run: `node scripts/extract-frontmatter.mjs src/content/blog/hello-world.md | jq .title`
Expected: `"Building in the Open"`

- [ ] **Step 3: Commit**

```bash
git add scripts/extract-frontmatter.mjs
git commit -m "feat(social): frontmatter extractor for GHA autopublish workflow"
```

---

## Task 8: CLI Script

**Files:**
- Create: `scripts/fb-post.sh`

- [ ] **Step 1: Create the CLI**

```bash
#!/usr/bin/env bash
set -euo pipefail

# fb-post.sh — CLI for Facebook posting via social worker
# Reads SOCIAL_WORKER_URL and SOCIAL_CLI_SECRET from .env or environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$REPO_DIR/.env" ]; then
  set -a
  source "$REPO_DIR/.env"
  set +a
fi

URL="${SOCIAL_WORKER_URL:?Set SOCIAL_WORKER_URL in .env}"
SECRET="${SOCIAL_CLI_SECRET:?Set SOCIAL_CLI_SECRET in .env}"

usage() {
  cat <<'EOF'
Usage:
  fb-post.sh "message"                          # Immediate text post
  fb-post.sh "message" --link URL               # Immediate link post
  fb-post.sh "message" --image URL              # Immediate photo post
  fb-post.sh "message" --schedule ISO_DATETIME  # Schedule a post
  fb-post.sh --sync                             # Sync queue from JSON
  fb-post.sh --status                           # Queue status
  fb-post.sh --health                           # Token health
EOF
  exit 1
}

[ $# -eq 0 ] && usage

case "$1" in
  --sync)
    HASH=$(sha256sum "$REPO_DIR/social/facebook-posts.json" | cut -d' ' -f1)
    POSTS=$(jq '.posts' "$REPO_DIR/social/facebook-posts.json")
    curl -s -X POST "$URL/api/queue/sync" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      --data "$(jq -n --arg hash "$HASH" --argjson posts "$POSTS" '{hash: $hash, posts: $posts}')" | jq .
    ;;
  --status|--health)
    curl -s "$URL/api/health" \
      -H "Authorization: Bearer $SECRET" | jq .
    ;;
  *)
    MESSAGE="$1"
    shift
    TYPE="text"
    LINK=""
    IMAGE=""
    SCHEDULE=""

    while [ $# -gt 0 ]; do
      case "$1" in
        --link) TYPE="link"; LINK="$2"; shift 2 ;;
        --image) TYPE="photo"; IMAGE="$2"; shift 2 ;;
        --schedule) SCHEDULE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; usage ;;
      esac
    done

    if [ -n "$SCHEDULE" ]; then
      curl -s -X POST "$URL/api/queue" \
        -H "Authorization: Bearer $SECRET" \
        -H "Content-Type: application/json" \
        --data "$(jq -n \
          --arg platform "facebook" \
          --arg type "$TYPE" \
          --arg message "$MESSAGE" \
          --arg scheduledAt "$SCHEDULE" \
          --arg link "$LINK" \
          --arg image "$IMAGE" \
          '{platform: $platform, type: $type, message: $message, scheduledAt: $scheduledAt, link: (if $link == "" then null else $link end), imageUrl: (if $image == "" then null else $image end)}')" | jq .
    else
      KEY="cli-$(date +%Y%m%d%H%M%S)-$$"
      curl -s -X POST "$URL/api/publish" \
        -H "Authorization: Bearer $SECRET" \
        -H "Content-Type: application/json" \
        --data "$(jq -n \
          --arg platform "facebook" \
          --arg type "$TYPE" \
          --arg message "$MESSAGE" \
          --arg link "$LINK" \
          --arg image "$IMAGE" \
          --arg key "$KEY" \
          '{platform: $platform, type: $type, message: $message, link: (if $link == "" then null else $link end), imageUrl: (if $image == "" then null else $image end), idempotencyKey: $key}')" | jq .
    fi
    ;;
esac
```

- [ ] **Step 2: Make executable and verify help**

Run: `chmod +x scripts/fb-post.sh && ./scripts/fb-post.sh 2>&1 | head -5`
Expected: Usage text printed.

- [ ] **Step 3: Commit**

```bash
git add scripts/fb-post.sh
git commit -m "feat(social): CLI script for posting and queue management"
```

---

## Task 9: GitHub Actions Workflows

**Files:**
- Create: `.github/workflows/social-autopublish.yml`
- Create: `.github/workflows/social-cron.yml`

- [ ] **Step 1: Create `social-autopublish.yml`**

Copy from spec Section 13 with this fix: in the "Publish new content to social" step, add HTTP status checking after the `curl` call (matching the cron workflow pattern):
```bash
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SOCIAL_WORKER_URL}/api/publish" ...)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
  echo "::warning::Publish failed for $SLUG (HTTP $HTTP_CODE)"
fi
```

- [ ] **Step 2: Create `social-cron.yml`**

Copy from spec Section 13 with this fix: add explicit parentheses to `if:` conditions for clarity:
```yaml
if: (github.event_name == 'workflow_dispatch' && github.event.inputs.endpoint == 'publish') || github.event.schedule == '15 * * * *'
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/social-autopublish.yml .github/workflows/social-cron.yml
git commit -m "feat(social): github actions for autopublish and cron triggers"
```

---

## Task 10: Queue Seed File and Lychee Config

**Files:**
- Create: `social/facebook-posts.json`
- Modify: `.lychee.toml`

- [ ] **Step 1: Create empty queue file**

```json
{
  "version": 1,
  "description": "Facebook post queue — seed input for scheduled content (KV is authoritative for state)",
  "pageId": "35753603727",
  "posts": []
}
```

- [ ] **Step 2: Add `social.adrianwedd.com` to lychee excludes**

Read `.lychee.toml` and add `social.adrianwedd.com` to the exclude list.

- [ ] **Step 3: Commit**

```bash
git add social/facebook-posts.json .lychee.toml
git commit -m "feat(social): empty queue seed file and lychee exclude"
```

---

## Task 10a: Publish Cron Tests

**Files:**
- Create: `worker/src/__tests__/publish.test.ts`

- [ ] **Step 1: Write tests for publish cron logic**

Create `worker/src/__tests__/publish.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the publish cron logic by importing the Hono app and calling /api/cron/publish
// with mocked KV and Facebook platform

describe('POST /api/cron/publish', () => {
  it('skips when cron lock exists', async () => {
    // Mock KV.get('cron-lock:publish') returning '1'
    // Expect: 200 + { skipped: true, reason: 'locked' }
  });

  it('returns 503 when token is expired', async () => {
    // Mock debugAuth returning { valid: false }
    // Expect: 503 + { error: 'Facebook data access expired' }
  });

  it('publishes due posts oldest-first, max 5', async () => {
    // Mock 7 queued posts, all due
    // Expect: 5 published, remaining: 2
  });

  it('skips posts with existing idempotency records', async () => {
    // Mock idempotent:{id} exists
    // Expect: post's queued key deleted, not published
  });

  it('halts on auth error and reverts post to queued', async () => {
    // Mock publishPost returning isAuthError: true
    // Expect: 503 + post reverted to queued key
  });

  it('breaks on transient error and reverts post to queued', async () => {
    // Mock first post succeeds, second returns isTransient: true
    // Expect: published: 1, second post reverted to queued
  });

  it('marks permanent failures with idempotency record', async () => {
    // Mock publishPost returning permanent error
    // Expect: post:failed:{id} created, idempotent:{id} created with status 'failed'
  });

  it('moves post through publishing intermediate state', async () => {
    // Verify post:publishing:{epoch}:{id} is written before publishPost()
    // and deleted after success
  });

  it('releases cron lock even on unexpected error (finally)', async () => {
    // Mock an exception during processing
    // Expect: cron-lock:publish deleted
  });
});
```

**Note:** These are test stubs showing the required scenarios. The implementer must fill in the mock setup and assertions using the patterns from `auth.test.ts` and `facebook.test.ts`. Each test should mock the Hono `c.env` object with a fake KV implementation.

- [ ] **Step 2: Run tests**

Run: `cd worker && npx vitest run src/__tests__/publish.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add worker/src/__tests__/publish.test.ts
git commit -m "test(social): publish cron logic tests"
```

---

## Task 10b: Queue Sync Tests

**Files:**
- Create: `worker/src/__tests__/sync.test.ts`

- [ ] **Step 1: Write tests for queue sync reconciliation**

Create `worker/src/__tests__/sync.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('POST /api/queue/sync', () => {
  it('skips sync when hash is unchanged', async () => {
    // Mock KV.get('queue-hash') returning same hash as request
    // Expect: { unchanged: true }
  });

  it('creates new posts from incoming JSON', async () => {
    // Mock empty KV, 3 incoming posts
    // Expect: { created: 3, updated: 0, cancelled: 0, skippedTerminal: 0 }
  });

  it('updates queued posts when content changes', async () => {
    // Mock KV has post with old message, incoming has new message
    // Expect: { updated: 1 } and KV value contains new message
  });

  it('moves KV key when scheduledAtEpoch changes', async () => {
    // Mock KV has post at epoch X, incoming has epoch Y
    // Expect: old key deleted, new key created at epoch Y
  });

  it('cancels queued posts missing from incoming JSON', async () => {
    // Mock KV has 3 queued posts, incoming has 2
    // Expect: { cancelled: 1 } and missing post's KV key deleted
  });

  it('skips terminal posts (published/failed) even if in incoming', async () => {
    // Mock idempotent:{id} exists with status 'published'
    // Expect: { skippedTerminal: 1 }
  });

  it('does not delete published/failed posts missing from incoming', async () => {
    // Mock KV has published post not in incoming
    // Expect: published post key is NOT deleted (only queued keys are cancelled)
  });

  it('rejects requests with wrong auth', async () => {
    // Send with wrong bearer token
    // Expect: 401
  });

  it('accepts both PUBLISH_SECRET and CLI_SECRET', async () => {
    // Send with CLI_SECRET
    // Expect: 200 (not 401)
  });
});
```

**Note:** Same pattern as Task 10a — test stubs requiring full mock implementation.

- [ ] **Step 2: Run tests**

Run: `cd worker && npx vitest run src/__tests__/sync.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add worker/src/__tests__/sync.test.ts
git commit -m "test(social): queue sync reconciliation tests"
```

---

## Task 11: Cloudflare Infrastructure Setup

**Files:**
- Modify: `worker/wrangler.toml` (replace placeholder KV ID)

- [ ] **Step 1: Create KV namespace**

Run: `cd worker && npx wrangler kv namespace create SOCIAL`
Expected: Output includes namespace ID. Copy it.

- [ ] **Step 2: Update `worker/wrangler.toml` with real KV ID**

Replace `PLACEHOLDER_UNTIL_CREATED` with the actual ID from step 1.

- [ ] **Step 3: Set secrets**

Run:
```bash
cd worker
echo "CRON_SECRET_VALUE" | npx wrangler secret put CRON_SECRET
echo "PUBLISH_SECRET_VALUE" | npx wrangler secret put PUBLISH_SECRET
echo "CLI_SECRET_VALUE" | npx wrangler secret put CLI_SECRET
npx wrangler secret put FACEBOOK_PAGE_TOKEN  # paste token from .env
npx wrangler secret put FACEBOOK_APP_TOKEN   # paste app token from .env
```

Generate secrets:
```bash
openssl rand -hex 32  # CRON_SECRET
openssl rand -hex 32  # PUBLISH_SECRET
openssl rand -hex 32  # CLI_SECRET
```

- [ ] **Step 4: Add DNS CNAME**

```bash
CF_TOKEN=$(op item get lov5co2rxzkjciufhlnxlfo7g4 --fields label=credential --reveal)
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/109eaa3abaa7785f334074701f2c1d9b/dns_records" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"social","content":"adrianwedd-social.workers.dev","proxied":true}'
```

- [ ] **Step 5: Deploy worker and configure custom domain**

Run: `cd worker && npx wrangler deploy`

Then add the custom domain (DNS CNAME alone is not sufficient — need Worker route binding):
```bash
cd worker && npx wrangler domains add social.adrianwedd.com
```
This binds the Worker to the custom hostname. If `wrangler domains` is not available, configure via Cloudflare dashboard: Workers & Pages > adrianwedd-social > Settings > Domains & Routes > Add Custom Domain > `social.adrianwedd.com`.

Expected: Worker accessible at `https://social.adrianwedd.com`.

- [ ] **Step 6: Verify health endpoint**

Run: `curl -s https://social.adrianwedd.com/api/health | jq .`
Expected: `{ "ok": true }`

- [ ] **Step 7: Set GitHub Actions secrets**

In GitHub repo settings > Secrets and variables > Actions, add:
- `SOCIAL_WORKER_URL` = `https://social.adrianwedd.com`
- `SOCIAL_CRON_SECRET` = (value from step 3)
- `SOCIAL_PUBLISH_SECRET` = (value from step 3)

- [ ] **Step 8: Update `.env` with CLI secret**

Add `SOCIAL_WORKER_URL=https://social.adrianwedd.com` and `SOCIAL_CLI_SECRET=<value>` to `.env`.

- [ ] **Step 9: Commit wrangler.toml update**

```bash
git add worker/wrangler.toml
git commit -m "feat(social): configure KV namespace ID"
```

---

## Task 12: End-to-End Smoke Test

- [ ] **Step 1: Test immediate publish via CLI**

Run: `./scripts/fb-post.sh "Test post from adrianwedd.com social worker - please ignore" --link https://adrianwedd.com/`
Expected: JSON response with `{ "published": true, "platformPostId": "..." }`.

- [ ] **Step 2: Verify post appeared on Facebook**

Open `https://www.facebook.com/AdrianWeddDotCom/` and confirm the post is visible.

- [ ] **Step 3: Delete the test post from Facebook**

Manually delete via Facebook UI.

- [ ] **Step 4: Test health endpoint via CLI**

Run: `./scripts/fb-post.sh --health`
Expected: JSON with token status and queue info.

- [ ] **Step 5: Test queue add via CLI**

Run: `./scripts/fb-post.sh "Future test post" --schedule "2099-01-01T09:00:00+10:00"`
Expected: JSON with `{ "id": "adhoc-...", "kvKey": "post:queued:..." }`.

- [ ] **Step 6: Run all worker tests**

Run: `cd worker && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 7: Final commit and push**

```bash
git push origin main
```
