# Social Media Management — Design Spec

**Date:** 2026-03-29
**Author:** CLAUDE
**Status:** Revised (post three-way QA: Codex + Gemini + Claude)
**Scope:** Phase 1 = Facebook posting + comment management. Architecture supports Instagram, Bluesky, and other platforms via adapter pattern.
**QA:** Codex (12 findings), Gemini (8 findings), Claude Agent (14 findings) — all resolved below.

## Overview

Automated social media management for adrianwedd.com — auto-publishing new blog posts and projects to Facebook on push to `main`, scheduled/ad-hoc posting via JSON queue, comment monitoring with classification and auto-reply, and a CLI for immediate posting.

**Phased delivery:**
- **Phase 1:** Facebook posting (auto-publish + scheduled + ad-hoc) + comment monitoring + classification + auto-reply
- **Phase 2:** Instagram cross-posting (Meta Graph API shares permissions infrastructure)
- **Phase 3:** Bluesky AT Protocol integration
- **Phase 4:** Additional platforms as needed

## Context

- **Site:** adrianwedd.com (Astro 5, GitHub Pages, fully static)
- **Meta App ID:** `160779818397`
- **Facebook Page ID:** `213409802761321` ([AdrianWeddDotCom](https://www.facebook.com/AdrianWeddDotCom/))
- **API version:** v21.0
- **Domain verification:** TXT record added 2026-03-29 (`facebook-domain-verification=ijht0ednfdllp47fypz3w5hhyyx72s`)
- **Reference implementation:** `../thiswasntinthebrochure.wtf/website/src/lib/facebook.ts` (ported with modifications)
- **Workers plan:** Requires Cloudflare Workers Paid plan ($5/month) for sufficient CPU time and KV operations.

### Permissions Required

| Permission | Purpose | Phase |
|------------|---------|-------|
| `pages_manage_posts` | Publish posts | 1 |
| `pages_manage_engagement` | Reply to comments | 1 |
| `pages_read_engagement` | Read comments, reactions | 1 |
| `pages_read_user_content` | Read visitor posts/comments | 1 |
| `pages_show_list` | List managed pages | 1 |
| `read_insights` | Page analytics | 2+ |
| `instagram_basic` | Instagram cross-posting | 2 |
| `instagram_content_publish` | Instagram posting | 2 |
| `instagram_manage_comments` | Instagram comments | 2 |

## Architecture

```
┌─────────────────────────────┐
│  GitHub: adrianwedd.com     │
│                             │
│  push to main               │
│  ├── social-autopublish.yml │──► Detect new blog/project content
│  │   (on: push)             │    Generate post → call Worker /api/publish
│  │                          │    Sync queue → call Worker /api/queue/sync
│  │                          │
│  ├── social-cron.yml        │──► Hourly: trigger /api/cron/publish
│  │   (on: schedule)         │    Every 2h: trigger /api/cron/comments
│  │                          │
│  └── social/                │
│      └── facebook-posts.json│──► Scheduled/ad-hoc post queue (seed input)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Cloudflare Worker          │
│  social.adrianwedd.com      │
│                             │
│  POST /api/publish          │──► Immediate publish (any platform)
│  POST /api/queue            │──► Add single post to KV queue
│  POST /api/queue/sync       │──► Sync full JSON queue to KV
│  POST /api/cron/publish     │──► Publish due queued posts
│  POST /api/cron/comments    │──► Monitor + classify + reply
│  GET  /api/health           │──► Token health (auth required)
│                             │
│  KV: SOCIAL                 │
│  ├── post:queued:{epoch}:{id}    Post records (queued)
│  ├── post:published:{epoch}:{id} Post records (published, 180d TTL)
│  ├── post:failed:{id}            Post records (failed)
│  ├── idempotent:{key}            Durable idempotency records (30d TTL)
│  ├── fb-comment:{id}             Comment records (90d TTL)
│  ├── fb-flag:{id}                Flagged comments (14d TTL)
│  ├── cron-lock:{name}            Execution locks (300s TTL)
│  └── queue-hash                  SHA-256 of last synced JSON
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Facebook Graph API v21.0   │
│  (Authorization: Bearer)    │
└─────────────────────────────┘
```

### Component Roles

| Component | Role | Runs on |
|-----------|------|---------|
| `social-autopublish.yml` | Detects new content on push, generates post text, calls Worker `/api/publish`; syncs queue JSON | GitHub Actions |
| `social-cron.yml` | Triggers Worker cron endpoints on schedule (two separate jobs, not minute detection) | GitHub Actions |
| `worker/` | All social media API calls, state management, comment monitoring | Cloudflare Workers (Paid plan) |
| `social/facebook-posts.json` | Version-controlled post queue — seed input only (KV is authoritative for state) | Git |
| `scripts/fb-post.sh` | CLI for immediate posting or adding to queue | Local (calls Worker) |

## 1. File Structure

### New Files

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | Hono router — all API endpoints |
| `worker/src/auth.ts` | Bearer token auth middleware using `crypto.subtle` (see Section 1.1) |
| `worker/src/platforms/types.ts` | Platform-agnostic interfaces (`SocialPlatform`, `SocialPost`, `PublishResult`) |
| `worker/src/platforms/facebook.ts` | Facebook Graph API client (ported from thiswasnt `facebook.ts`) |
| `worker/src/cron/publish.ts` | Scheduled post publisher (ported from thiswasnt `facebook-publish.ts`) |
| `worker/src/cron/comments.ts` | Comment monitor + classifier + auto-reply |
| `worker/src/classify.ts` | Comment classification engine (regex v1) |
| `worker/wrangler.toml` | Worker config with KV binding, `nodejs_compat` flag, and secrets |
| `worker/package.json` | Worker dependencies (hono, wrangler) |
| `worker/tsconfig.json` | TypeScript config for Worker |
| `social/facebook-posts.json` | Post queue seed input (version-controlled) |
| `scripts/fb-post.sh` | CLI for posting and queue management |
| `scripts/extract-frontmatter.mjs` | Node script for reliable YAML frontmatter extraction (used by GHA) |
| `.github/workflows/social-autopublish.yml` | Auto-publish on content push + queue sync |
| `.github/workflows/social-cron.yml` | Scheduled cron triggers (separate jobs per endpoint) |

### Modified Files

| File | Change |
|------|--------|
| `.lychee.toml` | Add `social.adrianwedd.com` to excludes (Worker endpoint, not a page) |

### Unchanged

The static site (`src/`, `astro.config.mjs`, `package.json`, `deploy.yml`) is **not modified**. The social media system is entirely additive.

### 1.1 Runtime Compatibility

The Worker requires `nodejs_compat` for `crypto.timingSafeEqual` and `Buffer`:

```toml
# worker/wrangler.toml
compatibility_flags = ["nodejs_compat"]
```

This enables `import { timingSafeEqual } from 'node:crypto'` on Cloudflare Workers, matching the reference implementation pattern. Without this flag, use `crypto.subtle` with manual constant-time comparison on SHA-256 digests instead.

## 2. Platform Adapter Pattern

All platform-specific logic is behind a common interface. Cron handlers and the publish endpoint are platform-agnostic.

```typescript
// worker/src/platforms/types.ts

type PostType = 'text' | 'photo' | 'link';
type PostStatus = 'queued' | 'publishing' | 'published' | 'failed';
type Platform = 'facebook' | 'instagram' | 'bluesky';

interface SocialPost {
  id: string;
  platform: Platform;
  type: PostType;
  message: string;
  imageUrl?: string;
  link?: string;
  scheduledAt: string;          // ISO 8601 with timezone
  scheduledAtEpoch: number;     // UTC epoch ms for comparison
  status: PostStatus;
  publishedId: string | null;
  publishedAt: string | null;
  error: string | null;
}

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  errorCode?: number;
  isTransient: boolean;
  isAuthError: boolean;
}

interface Comment {
  id: string;
  postId: string;
  authorIdHash: string;         // SHA-256 hash of platform user ID (hashed by caller, not adapter)
  message: string;
  createdTime: string;
  isFromPage: boolean;
}

interface AuthStatus {
  valid: boolean;
  platform: Platform;
  expiresAt: number;
  dataAccessExpiresAt: number;
  daysUntilExpiry: number;
}

// Platform adapters receive credentials via constructor, not per-call.
// This keeps the interface clean and avoids passing tokens through every method.
interface SocialPlatform {
  platform: Platform;

  // Publishing
  publishPost(post: SocialPost): Promise<PublishResult>;

  // Comment monitoring — full feed traversal
  listRecentPosts(since: Date): Promise<Array<{ id: string; createdTime: string }>>;
  getComments(postId: string, since: Date): Promise<Comment[]>;
  getCommentReplies(commentId: string): Promise<Comment[]>;
  replyToComment(commentId: string, message: string): Promise<PublishResult>;
  getPageIdentity(): string;    // Returns page's own ID for self-comment filtering

  // Health
  debugAuth(): Promise<AuthStatus>;
}

// Factory function — credentials injected at construction time
function createFacebookPlatform(
  pageId: string,
  pageToken: string,
  appToken: string,
): SocialPlatform;
```

**QA fix (A1, #4, #10, #14):** Adapter now includes `listRecentPosts`, `getPageIdentity`, and pagination support. Credentials are injected via factory function, not passed per-call. `authorIdHash` renamed to clarify that hashing is the caller's responsibility, not the adapter's.

Phase 2+ platforms implement the same interface. The cron handlers iterate registered platforms.

## 3. Facebook Client (Phase 1)

Ported from `thiswasntinthebrochure.wtf/website/src/lib/facebook.ts` with modifications:

- Page ID from env var (not hardcoded constant) — single-page in Phase 1, multi-page deferred to Future Enhancements
- Uses platform adapter interface from Section 2, credentials via constructor
- Error classification unchanged (proven in production)

### Graph API Calls

**All requests use `Authorization: Bearer {token}` header. NEVER pass `access_token` in URL or POST body.**

**Exception:** `debugToken` requires `input_token` as a query parameter per Graph API design. This is the only endpoint where a token appears in the URL. The token being debugged (page token) goes in the query string; the authenticating token (app token) goes in the `Authorization: Bearer` header. Document this in the code comment (matching the reference implementation's line 5-6 comment).

```
// Text post
POST https://graph.facebook.com/v21.0/{page-id}/feed
Headers: Authorization: Bearer {page-token}
         Content-Type: application/x-www-form-urlencoded
Body: message={url-encoded-text}

// Photo post (from URL)
POST https://graph.facebook.com/v21.0/{page-id}/photos
Headers: Authorization: Bearer {page-token}
         Content-Type: application/x-www-form-urlencoded
Body: url={image-url}&caption={url-encoded-text}

// Link post
POST https://graph.facebook.com/v21.0/{page-id}/feed
Headers: Authorization: Bearer {page-token}
         Content-Type: application/x-www-form-urlencoded
Body: message={url-encoded-text}&link={url}

// Debug token (exception: input_token in query string)
GET https://graph.facebook.com/v21.0/debug_token?input_token={page-token}
Headers: Authorization: Bearer {app-token}
```

### Error Classification

Identical to thiswasnt — proven in production:

| Category | Codes | Action |
|----------|-------|--------|
| **Auth** | 190, 190+463, 190+460 | Halt cron run, return 503, revert post to `queued` |
| **Transient** | 1, 2, 4, 17, HTTP 5xx | Leave `queued`, retry next run |
| **Permanent** | 10, 200, 240 | Mark `failed` |

### Token Health Monitoring

Every cron run calls `GET /debug_token`:
- `< 14 days` until data access expiry: log WARNING
- `< 7 days`: log ERROR
- Expired: return 503, halt run

### Rate Limits

- Graph API: 200 calls/user/hour
- Max 5 posts per cron run (well under limit)
- Max 5 auto-replies per comment cron run
- Comment monitoring: budget ~20 API calls per run (feed + comments + reply checks + replies)
- Cron execution locks prevent overlapping runs

## 4. Auto-Publish on Content Push

### Trigger

`social-autopublish.yml` runs on push to `main` when files change in `src/content/blog/`, `src/content/projects/`, or `social/facebook-posts.json`.

### Detection Logic

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/content/blog/**'
      - 'src/content/projects/**'
      - 'social/facebook-posts.json'
```

The workflow:
1. `git diff ${{ github.event.before }}..${{ github.event.after }} --name-only --diff-filter=A` to find **newly added** content files across the full push range (not just HEAD~1)
2. For each new file, extract frontmatter via `scripts/extract-frontmatter.mjs` (Node script using `gray-matter` — not `sed`, which fails on colons, multiline, and quoted values)
3. Skip if `draft: true`
4. Generate post text from frontmatter (see Section 4.1)
5. Call Worker `POST /api/publish` with the generated post

**QA fix (#1, #2, I.1, #8):** Uses full push range `${{ github.event.before }}..${{ github.event.after }}` instead of `HEAD~1`. Uses Node script with `gray-matter` for frontmatter extraction instead of brittle `sed`.

### 4.1 Post Generation

For **blog posts:**
```
{title}

{description}

adrianwedd.com/blog/{slug}/
```

For **projects:**
```
New project: {title}

{description}

adrianwedd.com/projects/{slug}/
```

Post type is `link` with the canonical URL. If `heroImage` exists in frontmatter, the OG image will be used by Facebook's link preview automatically — no need to separately upload an image.

### 4.2 Idempotency

The workflow generates a deterministic idempotency key: `auto-{slug}-{sha7}` where `sha7` is the first 7 characters of the commit SHA.

The Worker checks for a **durable idempotency record** `idempotent:{key}` in KV (30-day TTL). This record stores the terminal state (`published` or `failed`) and the resulting Facebook post ID. Unlike a TTL lock that disappears after success, this record persists — a workflow re-run days later will still see it and skip.

**QA fix (#7):** Replaced TTL publish-lock with durable idempotency record. The lock-then-delete pattern was fundamentally broken: deleting the lock after success meant re-runs could re-publish.

```
Idempotency record schema:
{
  "key": "auto-the-cognitive-cage-a1b2c3d",
  "status": "published",           // or "failed"
  "platformPostId": "213409802761321_123456",
  "completedAt": "2026-03-29T09:15:00Z",
  "error": null
}
```

## 5. Scheduled Post Publisher (Cron)

### Endpoint

`POST /api/cron/publish`

### Schedule

Hourly at `:15` via GitHub Actions (`social-cron.yml`, dedicated `publish` job).

### Logic

Adapted from thiswasnt's `facebook-publish.ts` for multi-platform:

```
1. Validate auth (timingSafeEqual bearer token)
2. Validate env (KV binding, platform tokens)
3. Check cron-lock:publish — if exists, return 200 + "skipped: locked"
4. Write cron-lock:publish (300s TTL)
5. Token health check per platform
6. KV.list({ prefix: 'post:queued:' }) to discover queued posts only
7. Filter: scheduledAtEpoch <= Date.now()
8. Sort by scheduledAtEpoch ascending (oldest first)
9. For each due post (max 5 per run):
   a. Check idempotent:{id} — skip if exists (already processed)
   b. Move key from post:queued:{epoch}:{id} to post:publishing:{epoch}:{id}
   c. Call platform.publishPost()
   d. On success:
      - Move key to post:published:{epoch}:{id} (180-day TTL)
      - Write idempotent:{id} with terminal state (30-day TTL)
   e. On auth error: revert to post:queued:..., halt run, return 503
   f. On transient error: revert to post:queued:..., skip remaining
   g. On permanent error:
      - Move to post:failed:{id}
      - Write idempotent:{id} with error
10. Log remaining queue depth (warn > 0, error > 10)
11. Delete cron-lock:publish
12. Return { published, failed, remaining, tokenHealth }
```

**QA fix (#5, #17, A.1, O2):** KV key prefix now includes status: `post:queued:`, `post:published:`, `post:failed:`. This means `KV.list({ prefix: 'post:queued:' })` only returns actionable posts, not the entire history. Published posts get a 180-day TTL so KV doesn't grow unbounded.

**Note on KV atomicity (#8):** KV `get`/`put` is not atomic and is eventually consistent. Two concurrent Workers could theoretically both observe "no lock" and proceed. For a personal site with hourly cron triggered by GitHub Actions (single runner), the practical risk of concurrent execution is negligible. The cron-lock is a best-effort guard, not a hard guarantee. If exactly-once semantics become critical (e.g., high-volume multi-platform), upgrade to a Durable Object for coordination. For Phase 1, KV locks + durable idempotency records provide sufficient protection.

### Queue Sync

The Worker cannot read `facebook-posts.json` from git directly. The `social-autopublish.yml` workflow handles sync:

1. On push to `main`, the workflow checks if `social/facebook-posts.json` changed
2. If changed, it reads the JSON, computes a SHA-256 hash, and calls `POST /api/queue/sync`
3. The Worker compares the hash against `queue-hash` in KV — if different, it processes the sync

**QA fix (#9, #3, C.1, C.2, #11, #18):** Full reconciliation rules defined below.

### Queue Sync Endpoint: `POST /api/queue/sync`

**Request body:**
```json
{
  "hash": "sha256-of-json-content",
  "posts": [ ... ]
}
```

**Reconciliation rules:**

| Condition | Action |
|-----------|--------|
| Post in JSON, not in KV | Create as `post:queued:{epoch}:{id}` |
| Post in JSON and KV, KV status = `queued` | Update message/schedule/type from JSON (editable before publish) |
| Post in JSON and KV, KV status = `published` or `failed` | Skip — KV state is terminal, JSON cannot revert it |
| Post in KV (`queued`), not in JSON | Delete from KV (post was cancelled by removing from JSON) |
| Post in KV (`published`/`failed`), not in JSON | Keep — removal from JSON after publish/fail is normal cleanup |

**Response:**
```json
{
  "created": 3,
  "updated": 1,
  "cancelled": 0,
  "skippedTerminal": 2,
  "hash": "sha256..."
}
```

**Source-of-truth clarification (#11):** `facebook-posts.json` is **seed input** — it feeds content into KV. KV is **authoritative for state** (status, publishedId, publishedAt, error). Once a post reaches a terminal state (`published` or `failed`) in KV, the JSON file cannot change it. The JSON file description has been updated from "local source of truth" to "seed input for scheduled content" (see Section 16).

## 6. Comment Monitor (Cron)

### Endpoint

`POST /api/cron/comments`

### Schedule

Every 2 hours at `:45` via GitHub Actions (dedicated `comments` job).

### Logic

```
1. Validate auth + env + cron lock (same pattern as publish)
2. Token health check
3. Call platform.listRecentPosts(7 days ago) with pagination:
   GET /{page-id}/feed?fields=id,created_time&since={unix_7d_ago}&limit=25
   Follow pagination cursors until exhausted or 100 posts max
4. For each recent post, call platform.getComments(postId, since) with pagination:
   GET /{post-id}/comments?fields=id,from,message,created_time,is_hidden&limit=50
   Follow pagination cursors until exhausted or 200 comments max per post
5. For each comment:
   a. Check if KV key fb-comment:{comment-id} exists → skip if seen
   b. Skip if from page's own ID (platform.getPageIdentity())
   c. Skip if createdTime > 48 hours ago (stale replies look robotic)
   d. Classify comment (see Section 7)
   e. Hash author ID: SHA-256(platform-user-id) — hashing done by cron handler, not adapter
   f. Store in KV: fb-comment:{comment-id} (90-day TTL)
      Stored fields: commentId, postId, authorIdHash, classification, replied, flagged, createdTime
      Message body is NOT stored in comment records (only in flag records where needed for review)
   g. If classified as professional-inquiry:
      - Call platform.getCommentReplies(commentId) to check for existing page reply (idempotency)
      - If no page reply exists, call platform.replyToComment()
   h. All other classifications:
      - Write fb-flag:{comment-id} (14-day TTL) — flag records DO include message body for review
6. Return { postsChecked, newComments, replied, flagged, tokenHealth }
```

**QA fix (#5, #11, C3, #10, #12):** Explicit pagination with limits. `since` parameter specified as Unix timestamp. Platform adapter's `listRecentPosts` and `getComments` handle cursor-based pagination internally. Comment records no longer store message body (reducing PII surface); flag records store it only when needed for review. API call budget documented in Section 3 rate limits.

### Reply Idempotency

Before posting a reply, `platform.getCommentReplies(commentId)` checks if any reply is from the page's own ID. If a reply already exists, skip.

### Guardrails

| Rule | Reason |
|------|--------|
| Don't reply to page's own comments | Avoid infinite loops |
| Don't reply to comments > 48 hours old | Stale replies look robotic |
| Max 5 auto-replies per cron run | Rate limiting + quality control |
| Auto-reply ONLY for `professional-inquiry` | Only safe-to-automate category in v1 |
| Flag everything else for manual review | Reputational safety |
| Do NOT auto-hide comments | Flag suspected spam for review instead |

## 7. Comment Classification

### Categories (priority order — highest wins)

1. **crisis** — flag, NEVER reply
2. **negative** — flag, never reply
3. **spam** — flag for review, do not auto-hide
4. **professional-inquiry** — auto-reply (the only auto-reply category)
5. **positive** — flag for review
6. **personal** — flag for review
7. **unclassified** — flag for review

If a comment matches 2+ non-crisis categories, classify as `multi-match` and flag for review.

### Crisis Detection

Expansive patterns — false negatives are far worse than false positives:

```typescript
const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicide|suicidal|kill\s*(myself|themselves))\b/i,
  /\b(self[- ]?harm|hurt\s*(myself|themselves))\b/i,
  /\bcan'?t\s+(cope|go on|do this|take it|anymore)\b/i,
  /\b(end\s*(it|my life)|don'?t\s+want\s+to\s+(be here|live|exist))\b/i,
  /\b(want\s+to\s+(die|disappear)|no\s+point|give\s+up)\b/i,
  /\b(crisis|emergency)\b/i,
];
```

### Professional Inquiry Detection

Narrow patterns — low false-positive risk. `/\bcontact\b/` is intentionally omitted as a standalone pattern (matches "contact lens" etc.) — only used in the multi-word pattern `reach you|get in touch`.

```typescript
const PROFESSIONAL_INQUIRY_PATTERNS: RegExp[] = [
  /\b(hire|hiring|consult|consulting|freelance)\b/i,
  /\b(work\s+with\s+you|collaborate|partnership)\b/i,
  /\b(services|rates?|availability|book\s+a\s+(call|meeting))\b/i,
  /\b(reach\s+you|get\s+in\s+touch)\b/i,
];
```

### Other Classification

```typescript
const NEGATIVE_PATTERNS: RegExp[] = [
  /\b(rubbish|garbage|waste|scam|terrible|awful|disgusting)\b/i,
  /\b(you'?re\s+wrong|dangerous|irresponsible|harmful)\b/i,
];

const SPAM_SIGNALS: RegExp[] = [
  /https?:\/\/(?!adrianwedd\.com)/i,  // External links (not own domain)
  /\b(DM\s+me|check\s+my\s+(profile|page|bio)|free\s+gift)\b/i,
  /\b(crypto|NFT|forex|investment\s+opportunity)\b/i,
];
```

### Auto-Reply Templates (professional-inquiry only)

```typescript
const PROFESSIONAL_INQUIRY_REPLIES: string[] = [
  "Thanks for your interest! You can find details about my work and services at adrianwedd.com/services/ — feel free to reach out via the contact page.",
  "Appreciate the message! Head to adrianwedd.com/contact/ for the best way to get in touch about projects and collaborations.",
];
```

Template selected randomly per reply. No placeholders, no dynamic content generation in v1.

## 8. Immediate Publish Endpoint

### Endpoint

`POST /api/publish`

Used by:
- `social-autopublish.yml` (auto-publish on content push)
- `scripts/fb-post.sh --now` (immediate ad-hoc posting)

### Request Body

```json
{
  "platform": "facebook",
  "type": "link",
  "message": "New blog post: The Cognitive Cage\n\nWhat happens when...\n\nadrianwedd.com/blog/the-cognitive-cage/",
  "link": "https://adrianwedd.com/blog/the-cognitive-cage/",
  "imageUrl": null,
  "idempotencyKey": "auto-the-cognitive-cage-a1b2c3d"
}
```

### Logic

```
1. Validate auth (bearer token)
2. Check idempotent:{idempotencyKey} in KV:
   - If exists and status = 'published': return 200 + { alreadyPublished: true, platformPostId }
   - If exists and status = 'failed': return 200 + { alreadyFailed: true, error }
3. Call platform.publishPost()
4. Write durable idempotency record: idempotent:{idempotencyKey} (30-day TTL)
   - On success: { status: 'published', platformPostId, completedAt }
   - On failure: { status: 'failed', error, completedAt }
5. Return result
```

**QA fix (#7):** Uses durable idempotency record instead of TTL publish-lock. Record persists for 30 days, surviving workflow re-runs.

## 9. Queue Management Endpoint

### Endpoint

`POST /api/queue`

Used by `scripts/fb-post.sh --schedule` to add posts to KV without going through git.

### Request Body

```json
{
  "platform": "facebook",
  "type": "text",
  "message": "Exploring the intersection of AI safety and...",
  "scheduledAt": "2026-04-01T09:00:00+10:00",
  "imageUrl": null,
  "link": null
}
```

### Logic

```
1. Validate auth
2. Generate ID: adhoc-{YYYYMMDD}-{random6}
3. Compute scheduledAtEpoch from scheduledAt
4. Write to KV: post:queued:{epoch}:{id}
   Initialize: status='queued', publishedId=null, publishedAt=null, error=null
5. Return { id, scheduledAt, kvKey }
```

## 10. Health Endpoint

### Endpoint

`GET /api/health`

**Auth required for all data.** Unauthenticated requests receive only `{ "ok": true }`.

**QA fix (#6, S2, #10):** No operational data exposed without auth. Prevents information leakage about queue depth, token status, or activity.

### Response (unauthenticated)

```json
{ "ok": true }
```

### Response (authenticated)

```json
{
  "platforms": {
    "facebook": {
      "tokenValid": true,
      "dataAccessExpiresAt": "2026-06-24T00:00:00Z",
      "daysUntilExpiry": 87
    }
  },
  "queue": {
    "facebook": {
      "queued": 5,
      "published": 42,
      "failed": 1,
      "nextScheduled": "2026-04-01T09:00:00+10:00"
    }
  },
  "recentActivity": {
    "lastPublished": "2026-03-29T09:15:00Z",
    "lastCommentCheck": "2026-03-29T08:45:00Z",
    "flaggedComments": 2
  }
}
```

## 11. CLI Script

### `scripts/fb-post.sh`

```bash
# Immediate text post
./scripts/fb-post.sh "Hello from the CLI"

# Immediate link post
./scripts/fb-post.sh "Check out this new post" --link https://adrianwedd.com/blog/example/

# Immediate photo post
./scripts/fb-post.sh "Behind the scenes" --image https://example.com/photo.jpg

# Schedule a post
./scripts/fb-post.sh "Scheduled post" --schedule "2026-04-01T09:00:00+10:00"

# Sync queue from JSON
./scripts/fb-post.sh --sync

# Check queue status
./scripts/fb-post.sh --status

# Check token health
./scripts/fb-post.sh --health
```

The script reads `SOCIAL_WORKER_URL` and `SOCIAL_CLI_SECRET` from `.env` (or environment). Calls the Worker endpoints directly via `curl`.

**QA fix (#13):** CLI uses `SOCIAL_CLI_SECRET`, a separate secret from `CRON_SECRET`. See Section 12 for secret scoping.

## 12. Cloudflare Resources

### Worker

- **Name:** `adrianwedd-social`
- **Route:** `social.adrianwedd.com/*` (add DNS CNAME + Worker route)
- **Framework:** Hono (lightweight, Cloudflare-native router)
- **Plan:** Workers Paid ($5/month) — required for sufficient CPU time and KV operations

### Wrangler Config

```toml
# worker/wrangler.toml
name = "adrianwedd-social"
main = "src/index.ts"
compatibility_date = "2026-03-29"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SOCIAL"
id = "<created-id>"

[vars]
FACEBOOK_PAGE_ID = "213409802761321"
GRAPH_API_VERSION = "v21.0"
```

### KV Namespace

- **Binding:** `SOCIAL`
- **Key prefixes:**
  - `post:queued:{epoch}:{id}` — queued post records
  - `post:publishing:{epoch}:{id}` — optimistic lock state (transient)
  - `post:published:{epoch}:{id}` — published post records (180-day TTL)
  - `post:failed:{id}` — failed post records (no TTL, for debugging)
  - `idempotent:{key}` — durable idempotency records (30-day TTL)
  - `fb-comment:{comment-id}` — comment records (90-day TTL)
  - `fb-flag:{comment-id}` — flagged comments (14-day TTL)
  - `cron-lock:{name}` — execution locks (300s TTL)
  - `queue-hash` — SHA-256 of last synced `facebook-posts.json`

### Secrets (Cloudflare) — Scoped by Function

| Secret | Purpose | Used by |
|--------|---------|---------|
| `CRON_SECRET` | Auth for scheduled cron triggers | GitHub Actions `social-cron.yml` |
| `PUBLISH_SECRET` | Auth for publish + queue endpoints | GitHub Actions `social-autopublish.yml` |
| `CLI_SECRET` | Auth for CLI operations | Local `scripts/fb-post.sh` |
| `FACEBOOK_PAGE_TOKEN` | Never-expiring Page Access Token | Worker (Graph API calls) |
| `FACEBOOK_APP_TOKEN` | `{app_id}\|{app_secret}` for `debugToken()` | Worker (token health checks) |

**QA fix (#7, #13):** Three separate bearer secrets with different scopes. A leaked CLI secret cannot trigger cron endpoints. A leaked cron secret cannot make ad-hoc posts. `FACEBOOK_APP_TOKEN` contains the app secret component — must NEVER be logged even in error paths.

### Secrets (GitHub Actions)

| Secret | Value | Used by |
|--------|-------|---------|
| `SOCIAL_CRON_SECRET` | Same as Cloudflare `CRON_SECRET` | `social-cron.yml` |
| `SOCIAL_PUBLISH_SECRET` | Same as Cloudflare `PUBLISH_SECRET` | `social-autopublish.yml` |
| `SOCIAL_WORKER_URL` | `https://social.adrianwedd.com` | Both workflows |

### DNS

- `social.adrianwedd.com` — CNAME to Worker (Cloudflare proxied)

## 13. GitHub Actions Workflows

### `social-autopublish.yml`

```yaml
name: Social Auto-Publish

on:
  push:
    branches: [main]
    paths:
      - 'src/content/blog/**'
      - 'src/content/projects/**'
      - 'social/facebook-posts.json'

jobs:
  autopublish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0    # Full history for push range diff

      - uses: actions/setup-node@v6
        with:
          node-version: 20

      - name: Install frontmatter extractor deps
        run: npm install --no-save gray-matter

      - name: Detect new content
        id: detect
        run: |
          # Full push range — catches multi-commit pushes
          BEFORE="${{ github.event.before }}"
          AFTER="${{ github.event.after }}"
          if [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
            # First push to branch — compare against parent
            BEFORE="HEAD~1"
          fi
          NEW_FILES=$(git diff "$BEFORE".."$AFTER" --name-only --diff-filter=A -- \
            'src/content/blog/*.md' 'src/content/projects/*.md')
          echo "files<<EOF" >> "$GITHUB_OUTPUT"
          echo "$NEW_FILES" >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"

      - name: Publish new content to social
        if: steps.detect.outputs.files != ''
        env:
          SOCIAL_WORKER_URL: ${{ secrets.SOCIAL_WORKER_URL }}
          SOCIAL_PUBLISH_SECRET: ${{ secrets.SOCIAL_PUBLISH_SECRET }}
        run: |
          echo "${{ steps.detect.outputs.files }}" | while IFS= read -r file; do
            [ -z "$file" ] && continue

            # Extract frontmatter with Node (handles colons, multiline, quotes)
            FRONTMATTER=$(node scripts/extract-frontmatter.mjs "$file")
            TITLE=$(echo "$FRONTMATTER" | jq -r '.title // empty')
            DESC=$(echo "$FRONTMATTER" | jq -r '.description // empty')
            DRAFT=$(echo "$FRONTMATTER" | jq -r '.draft // false')

            [ "$DRAFT" = "true" ] && { echo "Skipping draft: $file"; continue; }
            [ -z "$TITLE" ] && { echo "Skipping (no title): $file"; continue; }

            # Determine content type and slug
            if echo "$file" | grep -q "^src/content/blog/"; then
              SLUG=$(basename "$file" .md)
              URL="https://adrianwedd.com/blog/${SLUG}/"
              MESSAGE=$(printf "%s\n\n%s\n\n%s" "$TITLE" "$DESC" "$URL")
            elif echo "$file" | grep -q "^src/content/projects/"; then
              SLUG=$(basename "$file" .md)
              URL="https://adrianwedd.com/projects/${SLUG}/"
              MESSAGE=$(printf "New project: %s\n\n%s\n\n%s" "$TITLE" "$DESC" "$URL")
            else
              continue
            fi

            IDEMPOTENCY_KEY="auto-${SLUG}-$(git rev-parse --short HEAD)"

            curl -s -X POST "${SOCIAL_WORKER_URL}/api/publish" \
              -H "Authorization: Bearer ${SOCIAL_PUBLISH_SECRET}" \
              -H "Content-Type: application/json" \
              --data "$(jq -n \
                --arg platform "facebook" \
                --arg type "link" \
                --arg message "$MESSAGE" \
                --arg link "$URL" \
                --arg key "$IDEMPOTENCY_KEY" \
                '{platform: $platform, type: $type, message: $message, link: $link, idempotencyKey: $key}')" \
              --max-time 30

            echo "Published: $SLUG"
          done

      - name: Sync queue if changed
        env:
          SOCIAL_WORKER_URL: ${{ secrets.SOCIAL_WORKER_URL }}
          SOCIAL_PUBLISH_SECRET: ${{ secrets.SOCIAL_PUBLISH_SECRET }}
        run: |
          BEFORE="${{ github.event.before }}"
          AFTER="${{ github.event.after }}"
          if [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
            BEFORE="HEAD~1"
          fi
          if git diff "$BEFORE".."$AFTER" --name-only -- 'social/facebook-posts.json' | grep -q .; then
            echo "Queue file changed — syncing to KV"
            HASH=$(sha256sum social/facebook-posts.json | cut -d' ' -f1)
            POSTS=$(jq '.posts' social/facebook-posts.json)
            curl -s -X POST "${SOCIAL_WORKER_URL}/api/queue/sync" \
              -H "Authorization: Bearer ${SOCIAL_PUBLISH_SECRET}" \
              -H "Content-Type: application/json" \
              --data "$(jq -n --arg hash "$HASH" --argjson posts "$POSTS" '{hash: $hash, posts: $posts}')" \
              --max-time 30
            echo "Queue sync complete"
          else
            echo "Queue file unchanged — skipping sync"
          fi
```

### `social-cron.yml`

**QA fix (#16, O3):** Two separate jobs gated by `github.event.schedule` instead of unreliable `date -u +%M` minute detection.

```yaml
name: Social Cron

on:
  schedule:
    - cron: '15 * * * *'      # Publish: hourly at :15
    - cron: '45 */2 * * *'    # Comments: every 2 hours at :45
  workflow_dispatch:
    inputs:
      endpoint:
        description: 'Endpoint to trigger (publish or comments)'
        required: false
        default: 'publish'

jobs:
  publish:
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.endpoint == 'publish' || github.event.schedule == '15 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger publish cron
        env:
          SOCIAL_WORKER_URL: ${{ secrets.SOCIAL_WORKER_URL }}
          SOCIAL_CRON_SECRET: ${{ secrets.SOCIAL_CRON_SECRET }}
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "${SOCIAL_WORKER_URL}/api/cron/publish" \
            -H "Authorization: Bearer ${SOCIAL_CRON_SECRET}" \
            -H "Content-Type: application/json" \
            --max-time 30)
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | sed '$d')
          echo "HTTP status: $HTTP_CODE"
          echo "Response: $BODY"
          if [ "$HTTP_CODE" != "200" ]; then
            echo "::error::Publish cron returned HTTP $HTTP_CODE"
            exit 1
          fi

  comments:
    if: github.event_name == 'workflow_dispatch' && github.event.inputs.endpoint == 'comments' || github.event.schedule == '45 */2 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger comments cron
        env:
          SOCIAL_WORKER_URL: ${{ secrets.SOCIAL_WORKER_URL }}
          SOCIAL_CRON_SECRET: ${{ secrets.SOCIAL_CRON_SECRET }}
        run: |
          RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
            "${SOCIAL_WORKER_URL}/api/cron/comments" \
            -H "Authorization: Bearer ${SOCIAL_CRON_SECRET}" \
            -H "Content-Type: application/json" \
            --max-time 30)
          HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
          BODY=$(echo "$RESPONSE" | sed '$d')
          echo "HTTP status: $HTTP_CODE"
          echo "Response: $BODY"
          if [ "$HTTP_CODE" != "200" ]; then
            echo "::error::Comments cron returned HTTP $HTTP_CODE"
            exit 1
          fi
```

## 14. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token leakage | `Authorization: Bearer` header only — never in URL/body. **Exception:** `debugToken` requires `input_token` in query per Graph API design (documented in Section 3). Never logged. |
| Token in source code | Cloudflare secrets + GitHub Actions secrets. `.env` gitignored. App secret in `FACEBOOK_APP_TOKEN` must never be logged even in error paths. |
| Endpoint auth | `timingSafeEqual` via `nodejs_compat` flag — never `===`. |
| Secret scoping | Three separate bearer secrets: `CRON_SECRET` (cron only), `PUBLISH_SECRET` (publish+queue), `CLI_SECRET` (CLI ops). Leak of one does not compromise others. |
| Duplicate posts | Durable idempotency records in KV (30-day TTL). Survives workflow re-runs. |
| KV atomicity | `get`/`put` is not atomic. Acceptable for personal site with single-runner cron. Acknowledged as best-effort, not guaranteed mutex. Upgrade path: Durable Objects. |
| Auto-reply risk | v1: auto-reply ONLY for `professional-inquiry`. Everything else flagged. |
| Crisis content | Expansive regex. Crisis always wins priority. Never auto-replied. |
| Commenter PII | Names not stored. User IDs SHA-256 hashed (plain hash, not HMAC — acceptable for pseudonymization). Comment message body NOT stored in comment records; only stored in flag records (14-day TTL) where review requires it. 90-day TTL on comment records. |
| Cron overlap | Execution locks with TTL (best-effort). Single GHA runner per schedule. |
| Data access expiry | `debugToken()` on every run. Warnings at 14d, errors at 7d. |
| Rate limits | Max 5 posts/hour, 5 replies/2 hours, ~20 API calls per comment run. Locks prevent runaway scheduling. |
| Spam hiding | v1 does NOT auto-hide. Flags for manual review. |
| Worker abuse | Bearer auth on all endpoints. Health returns only `{ "ok": true }` without auth. |
| App secret exposure | App ID `160779818397` is public. App secret stored only in Cloudflare secrets and 1Password. |

## 15. Data Access Renewal

The Page Access Token never expires, but Meta's data access grant expires periodically (typically 90 days from authorization).

### Automated monitoring

Every cron run calls `debugToken()` and:
- Logs WARNING at < 14 days remaining
- Logs ERROR at < 7 days remaining
- Returns 503 if expired

### Manual renewal

1. Go to developers.facebook.com > App > Settings
2. Re-authorize data access permissions
3. Token itself does not change
4. Set a calendar reminder one week before expiry

## 16. Content Queue Format

### `social/facebook-posts.json`

```json
{
  "version": 1,
  "description": "Facebook post queue — seed input for scheduled content (KV is authoritative for state)",
  "pageId": "213409802761321",
  "posts": [
    {
      "id": "adhoc-20260401-01",
      "type": "link",
      "message": "Post text here\n\nadrianwedd.com/blog/example/",
      "link": "https://adrianwedd.com/blog/example/",
      "scheduledAt": "2026-04-01T09:00:00+10:00",
      "scheduledAtEpoch": 1743462000000,
      "status": "queued",
      "publishedId": null,
      "publishedAt": null,
      "error": null
    }
  ]
}
```

**Source-of-truth model:** This JSON file is **seed input**. It feeds content into KV via the `/api/queue/sync` endpoint. KV is **authoritative for state** — once a post reaches a terminal state (`published` or `failed`) in KV, the JSON file cannot change it. The `pageId` field is informational only (the Worker reads Page ID from its env var).

**Editing queued posts:** Edit the JSON and push. The sync endpoint will update queued posts in KV.

**Cancelling posts:** Remove from JSON and push. The sync endpoint will delete queued posts from KV.

**Post-publish cleanup:** Published/failed posts can be removed from JSON for cleanliness. They remain in KV until TTL expiry.

## 17. Future Enhancements (Not in Phase 1)

- **Phase 2:** Instagram cross-posting via same Meta App (permissions already requestable)
- **Phase 3:** Bluesky AT Protocol adapter
- **Phase 4:** LinkedIn posting (separate OAuth flow)
- Multi-page support (multiple Page IDs in env, page-specific tokens in KV)
- LLM-powered comment classification and reply generation
- Broader auto-reply categories (after corpus validation)
- Auto-hide confirmed spam (after false-positive rate review)
- Analytics dashboard via `read_insights`
- Post performance tracking and optimal timing analysis
- Image upload from local files (v1 uses public URLs only)
- Durable Objects upgrade for atomic cron coordination (if needed)

## Appendix A: Differences from thiswasnt Implementation

| Aspect | thiswasnt | adrianwedd.com |
|--------|-----------|----------------|
| **Runtime** | Astro API routes on Cloudflare Pages | Standalone Cloudflare Worker |
| **Router** | Astro `APIRoute` | Hono |
| **Page ID** | Hardcoded constant | Environment variable |
| **Content pillars** | education/survival-cards/solidarity/behind-the-book | None (auto-publish + ad-hoc) |
| **Auto-publish** | No (manual queue only) | Yes (on content push to main) |
| **CLI** | No | `scripts/fb-post.sh` |
| **Multi-platform** | Facebook only | Platform adapter pattern |
| **Comment auto-reply** | Book questions only | Professional inquiries only |
| **Queue sync** | Manual KV writes | Git JSON → KV sync with reconciliation rules |
| **KV namespace** | `FACEBOOK` | `SOCIAL` (platform-agnostic naming) |
| **Idempotency** | TTL publish-locks (deleted after success) | Durable idempotency records (30-day TTL) |
| **KV key design** | `fb-post:{epoch}:{id}` (all statuses mixed) | `post:{status}:{epoch}:{id}` (status-prefixed) |
| **Secret scoping** | Single `CRON_SECRET` for all | Three secrets: cron, publish, CLI |
| **Health endpoint** | No | Yes (auth-gated) |

## Appendix B: QA Findings Resolution

| ID | Source | Severity | Finding | Resolution |
|----|--------|----------|---------|------------|
| #1 | All 3 | HIGH | `git diff HEAD~1` misses multi-commit pushes | Use `${{ github.event.before }}..${{ github.event.after }}` (Section 4, 13) |
| #2 | All 3 | HIGH | `sed` frontmatter extraction fragile | Node script with `gray-matter` (Section 4, 13) |
| #3 | All 3 | HIGH | Workers `timingSafeEqual` needs runtime flag | `nodejs_compat` in `wrangler.toml` (Section 1.1) |
| #4 | All 3 | HIGH | Queue sync step missing from workflow | Added sync step to `social-autopublish.yml` (Section 13) |
| #5 | Gemini+Claude | MEDIUM | KV list degrades with history | Status-prefixed keys: `post:queued:` (Section 5, 12) |
| #6 | Claude+Codex | MEDIUM | Health endpoint leaks data unauthenticated | Auth required; unauth returns `{ "ok": true }` (Section 10) |
| #7 | Codex | HIGH | Idempotency model wrong (lock deleted after success) | Durable idempotency records with 30-day TTL (Section 4.2, 8) |
| #8 | Codex | MEDIUM | KV locks not atomic | Acknowledged as best-effort; single GHA runner mitigates; Durable Objects upgrade path noted (Section 5) |
| #9 | Codex | HIGH | Queue reconciliation undefined | Full reconciliation rules defined (Section 5, sync endpoint) |
| #10 | Codex+Claude | MEDIUM | Platform adapter missing feed/pagination methods | Added `listRecentPosts`, `getPageIdentity`, pagination (Section 2) |
| #11 | Codex | MEDIUM | Comment polling underspecified | Explicit pagination with limits, `since` parameter, API budget (Section 6) |
| #12 | Codex | MEDIUM | PII handling weaker than claimed | Comment records don't store message body; flag records do (14d TTL) (Section 6, 14) |
| #13 | Codex | MEDIUM | Single shared secret too coarse | Three scoped secrets: cron, publish, CLI (Section 12, 14) |
| #14 | Claude | MEDIUM | Adapter interface has no credential passing | Factory function with constructor injection (Section 2) |
| #15 | Claude | HIGH | `debugToken` query parameter exception undocumented | Documented exception with full URL pattern (Section 3) |
| #16 | Claude | MEDIUM | Cron minute detection bug | Separate jobs gated by `github.event.schedule` (Section 13) |
| #17 | Gemini | MEDIUM | KV keys should include status prefix | Status-prefixed: `post:queued:`, `post:published:` (Section 5, 12) |
| #18 | Gemini | MEDIUM | No queue deletion mechanism | Sync reconciliation: missing-from-JSON queued posts are deleted (Section 5) |
| S1 | Gemini | LOW | `FACEBOOK_APP_TOKEN` contains app secret | Documented: must never be logged (Section 12, 14) |
| A3 | Claude | LOW | `pageId` in JSON redundant with env var | Documented as informational-only (Section 16) |
| IC2 | Claude | LOW | Mixed seconds/minutes notation | Standardized to seconds in KV section, human-readable in prose |
| #12b | Codex | LOW | Multi-page claimed then deferred | Clarified: single-page Phase 1, multi-page in Future Enhancements (Section 3, 17) |
