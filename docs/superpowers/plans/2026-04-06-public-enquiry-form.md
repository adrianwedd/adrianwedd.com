# Public Enquiry Form + Chat Interface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured public enquiry form to adrianwedd.com that creates tracked issues in the private claude-ops system, gives visitors a unique chat URL with separated read/write tokens, and routes through AI triage for instant acknowledgement.

**Two codebases:**
1. `adrianwedd.com` (Astro 5, GitHub Pages) — contact form + chat page
2. `claude-ops` (Cloudflare Worker, Hono + KV) — API endpoints for enquiry creation, retrieval, and reply

**Spec:** `docs/specs/2026-04-06-public-enquiry-form-design.md`

**Tech Stack:** Astro 5, Preact (islands), Tailwind CSS, Hono, Cloudflare Workers/KV, Turnstile CAPTCHA, MailChannels, GitHub API

---

## Phase 1: claude-ops API Endpoints (Tasks 1-5)

All claude-ops work happens in the `claude-ops` repo at `/Users/adrian/repos/claude-ops`.

### File Map — Phase 1

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `worker/src/env.ts` | Add `TURNSTILE_SECRET_KEY` binding |
| Create | `worker/src/enquiry.ts` | Enquiry creation, retrieval, reply handlers |
| Create | `worker/src/turnstile.ts` | Turnstile CAPTCHA verification |
| Create | `worker/src/rate-limit.ts` | KV-based rate limiting |
| Create | `worker/src/__tests__/enquiry.test.ts` | Enquiry endpoint tests |
| Create | `worker/src/__tests__/turnstile.test.ts` | Turnstile verification tests |
| Create | `worker/src/__tests__/rate-limit.test.ts` | Rate limiting tests |
| Modify | `worker/src/index.ts` | Mount enquiry routes |

---

### Task 1: Turnstile Verification Module

**Files:**
- Create: `worker/src/turnstile.ts`
- Create: `worker/src/__tests__/turnstile.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// worker/src/__tests__/turnstile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyTurnstile } from '../turnstile';

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true for valid token with correct hostname', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        hostname: 'adrianwedd.com',
        challenge_ts: new Date().toISOString(),
      }),
    }));

    const result = await verifyTurnstile('valid-token', 'test-secret', '1.2.3.4');
    expect(result.success).toBe(true);
  });

  it('returns false when Turnstile API returns success: false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    }));

    const result = await verifyTurnstile('bad-token', 'test-secret', '1.2.3.4');
    expect(result.success).toBe(false);
  });

  it('returns false when hostname does not match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        hostname: 'evil.com',
        challenge_ts: new Date().toISOString(),
      }),
    }));

    const result = await verifyTurnstile('valid-token', 'test-secret', '1.2.3.4');
    expect(result.success).toBe(false);
  });

  it('returns false when token is stale (>5 minutes old)', async () => {
    const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        hostname: 'adrianwedd.com',
        challenge_ts: staleTime,
      }),
    }));

    const result = await verifyTurnstile('stale-token', 'test-secret', '1.2.3.4');
    expect(result.success).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await verifyTurnstile('token', 'test-secret', '1.2.3.4');
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx vitest run src/__tests__/turnstile.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement turnstile.ts**

```typescript
// worker/src/turnstile.ts

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const ALLOWED_HOSTNAME = 'adrianwedd.com';
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface TurnstileResult {
  success: boolean;
  error?: string;
}

/**
 * Verify a Turnstile CAPTCHA token.
 * Checks: success, hostname match, token freshness.
 */
export async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp: string,
): Promise<TurnstileResult> {
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: remoteIp,
      }),
    });

    const data = await res.json() as {
      success: boolean;
      hostname?: string;
      challenge_ts?: string;
      'error-codes'?: string[];
    };

    if (!data.success) {
      return { success: false, error: 'Turnstile verification failed' };
    }

    // Hostname validation
    if (data.hostname !== ALLOWED_HOSTNAME) {
      return { success: false, error: 'Invalid hostname' };
    }

    // Freshness check
    if (data.challenge_ts) {
      const challengeAge = Date.now() - new Date(data.challenge_ts).getTime();
      if (challengeAge > MAX_TOKEN_AGE_MS) {
        return { success: false, error: 'Token expired' };
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Turnstile verification error' };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx vitest run src/__tests__/turnstile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/adrian/repos/claude-ops
git add worker/src/turnstile.ts worker/src/__tests__/turnstile.test.ts
git commit -m "feat: Turnstile CAPTCHA verification with hostname + freshness checks"
```

---

### Task 2: KV-Based Rate Limiting

**Files:**
- Create: `worker/src/rate-limit.ts`
- Create: `worker/src/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// worker/src/__tests__/rate-limit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit } from '../rate-limit';

function mockKV(store: Record<string, string> = {}) {
  return {
    get: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
    put: vi.fn((key: string, val: string) => {
      store[key] = val;
      return Promise.resolve();
    }),
  } as unknown as KVNamespace;
}

describe('checkRateLimit', () => {
  it('allows first request', async () => {
    const kv = mockKV();
    const result = await checkRateLimit(kv, 'ratelimit:enquiry:1.2.3.4', 5, 3600);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('allows requests up to limit', async () => {
    const kv = mockKV({ 'ratelimit:enquiry:1.2.3.4': '4' });
    const result = await checkRateLimit(kv, 'ratelimit:enquiry:1.2.3.4', 5, 3600);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks requests over limit', async () => {
    const kv = mockKV({ 'ratelimit:enquiry:1.2.3.4': '5' });
    const result = await checkRateLimit(kv, 'ratelimit:enquiry:1.2.3.4', 5, 3600);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
```

- [ ] **Step 2: Implement rate-limit.ts**

```typescript
// worker/src/rate-limit.ts

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Simple KV-based rate limiter.
 * Increments a counter per key with TTL expiry.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const current = parseInt(await kv.get(key) ?? '0', 10);

  if (current >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  await kv.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return { allowed: true, remaining: maxRequests - current - 1 };
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx vitest run src/__tests__/rate-limit.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/adrian/repos/claude-ops
git add worker/src/rate-limit.ts worker/src/__tests__/rate-limit.test.ts
git commit -m "feat: KV-based rate limiting for enquiry endpoints"
```

---

### Task 3: Enquiry Creation Endpoint (POST /api/enquiry)

**Files:**
- Modify: `worker/src/env.ts` (add `TURNSTILE_SECRET_KEY`)
- Create: `worker/src/enquiry.ts`
- Create: `worker/src/__tests__/enquiry.test.ts`

- [ ] **Step 1: Add TURNSTILE_SECRET_KEY to env.ts**

Add to the `Env` interface in `worker/src/env.ts`:

```typescript
TURNSTILE_SECRET_KEY: string;  // Cloudflare Turnstile secret
```

- [ ] **Step 2: Write failing tests for enquiry creation**

```typescript
// worker/src/__tests__/enquiry.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  validateEnquiryInput,
  buildIssueBody,
  classifyAuthorType,
} from '../enquiry';

describe('validateEnquiryInput', () => {
  it('accepts valid input', () => {
    const result = validateEnquiryInput({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'I need a website.',
      turnstile_token: 'valid',
      idempotency_key: 'uuid-123',
    });
    expect(result.valid).toBe(true);
  });

  it('rejects missing name', () => {
    const result = validateEnquiryInput({
      name: '',
      email: 'a@b.com',
      message: 'hi',
      turnstile_token: 'x',
      idempotency_key: 'y',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  it('rejects invalid email', () => {
    const result = validateEnquiryInput({
      name: 'Alice',
      email: 'not-an-email',
      message: 'hi',
      turnstile_token: 'x',
      idempotency_key: 'y',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('email');
  });

  it('rejects message over 5000 chars', () => {
    const result = validateEnquiryInput({
      name: 'Alice',
      email: 'a@b.com',
      message: 'x'.repeat(5001),
      turnstile_token: 'x',
      idempotency_key: 'y',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('message');
  });

  it('rejects name over 200 chars', () => {
    const result = validateEnquiryInput({
      name: 'A'.repeat(201),
      email: 'a@b.com',
      message: 'hi',
      turnstile_token: 'x',
      idempotency_key: 'y',
    });
    expect(result.valid).toBe(false);
  });
});

describe('buildIssueBody', () => {
  it('includes name, email, message, and optional fields', () => {
    const body = buildIssueBody({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Need a website',
      budget: '$1k-$5k',
      project_type: 'New website',
    });
    expect(body).toContain('Alice');
    expect(body).toContain('alice@example.com');
    expect(body).toContain('Need a website');
    expect(body).toContain('$1k-$5k');
    expect(body).toContain('New website');
  });

  it('omits optional fields when not provided', () => {
    const body = buildIssueBody({
      name: 'Bob',
      email: 'bob@example.com',
      message: 'Hello',
    });
    expect(body).toContain('Bob');
    expect(body).not.toContain('Budget');
  });
});

describe('classifyAuthorType', () => {
  it('classifies bot comments as team', () => {
    expect(classifyAuthorType('adrianwedd-ops[bot]')).toBe('team');
  });

  it('classifies admin as team', () => {
    expect(classifyAuthorType('adrianwedd')).toBe('team');
  });

  it('classifies unknown users as client', () => {
    expect(classifyAuthorType('some-visitor')).toBe('client');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx vitest run src/__tests__/enquiry.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement enquiry.ts — validation + helpers**

```typescript
// worker/src/enquiry.ts
import type { Context } from 'hono';
import type { Env } from './env';
import { verifyTurnstile } from './turnstile';
import { checkRateLimit } from './rate-limit';
import { getInstallationToken } from './github-app';
import { postComment, addLabels, getIssueComments } from './github';
import { sendEmail } from './email';

// ── Constants ───────────────────────────────────────────────────────────────

const ENQUIRY_REPO = 'adrianwedd/client-inbox';
const ALLOWED_ORIGIN = 'https://adrianwedd.com';
const TEAM_LOGINS = ['adrianwedd', 'adrianwedd-ops[bot]', 'adrianwedd-ops'];
const KV_TTL_90_DAYS = 90 * 24 * 60 * 60;
const KV_TTL_1_HOUR = 3600;

// ── Input validation ────────────────────────────────────────────────────────

export interface EnquiryInput {
  name: string;
  email: string;
  message: string;
  budget?: string;
  project_type?: string;
  turnstile_token: string;
  idempotency_key: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEnquiryInput(input: Partial<EnquiryInput>): ValidationResult {
  if (!input.name?.trim() || (input.name?.length ?? 0) > 200) {
    return { valid: false, error: 'name is required (max 200 chars)' };
  }
  if (!input.email?.trim() || !EMAIL_RE.test(input.email) || (input.email?.length ?? 0) > 254) {
    return { valid: false, error: 'Valid email is required' };
  }
  if (!input.message?.trim() || (input.message?.length ?? 0) > 5000) {
    return { valid: false, error: 'message is required (max 5000 chars)' };
  }
  if (!input.turnstile_token?.trim()) {
    return { valid: false, error: 'CAPTCHA verification required' };
  }
  if (!input.idempotency_key?.trim()) {
    return { valid: false, error: 'idempotency_key is required' };
  }
  return { valid: true };
}

// ── Issue body builder ──────────────────────────────────────────────────────

export function buildIssueBody(data: {
  name: string;
  email: string;
  message: string;
  budget?: string;
  project_type?: string;
}): string {
  let body = `**Name:** ${data.name}\n**Email:** ${data.email}\n\n`;
  if (data.project_type) body += `**Project type:** ${data.project_type}\n`;
  if (data.budget) body += `**Budget:** ${data.budget}\n`;
  body += `\n---\n\n${data.message}`;
  return body;
}

// ── Author classification ───────────────────────────────────────────────────

export function classifyAuthorType(login: string): 'client' | 'team' {
  return TEAM_LOGINS.includes(login) ? 'team' : 'client';
}

// ── Allowlist projection for GET responses ──────────────────────────────────

interface ProjectedComment {
  author_type: 'client' | 'team';
  body_text: string;
  created_at: string;
}

interface ProjectedEnquiry {
  title: string;
  body_text: string;
  comments: ProjectedComment[];
  client_name: string;
  status: string;
}

export function projectEnquiry(
  issue: Record<string, any>,
  comments: Record<string, any>[],
  clientName: string,
): ProjectedEnquiry {
  return {
    title: issue.title,
    body_text: issue.body ?? '',
    client_name: clientName,
    status: issue.state ?? 'open',
    comments: comments
      .map((c) => {
        // Strip [claude-ops] markers from visible text
        const body = (c.body ?? '').replace(/<!--\s*\[claude-ops\]\s*-->/g, '').trim();
        if (!body) return null;
        return {
          author_type: classifyAuthorType(c.user?.login ?? ''),
          body_text: body,
          created_at: c.created_at ?? '',
        };
      })
      .filter(Boolean) as ProjectedComment[],
  };
}

// ── Origin validation ───────────────────────────────────────────────────────

export function validateOrigin(origin: string | undefined): boolean {
  return origin === ALLOWED_ORIGIN;
}

// ── Reply validation ────────────────────────────────────────────────────────

export interface ReplyInput {
  write_token: string;
  body: string;
}

export function validateReplyInput(input: Partial<ReplyInput>): ValidationResult {
  if (!input.write_token?.trim()) {
    return { valid: false, error: 'write_token is required' };
  }
  if (!input.body?.trim() || (input.body?.length ?? 0) > 2000) {
    return { valid: false, error: 'Reply body is required (max 2000 chars)' };
  }
  return { valid: true };
}

// ── Route handlers (mounted in index.ts) ────────────────────────────────────

/**
 * POST /api/enquiry — Create a new enquiry.
 * Public endpoint. Turnstile + origin validation + rate limiting.
 */
export async function handleCreateEnquiry(c: Context<{ Bindings: Env }>): Promise<Response> {
  const env = c.env;

  // Origin validation
  if (!validateOrigin(c.req.header('Origin'))) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const data = await c.req.json<EnquiryInput>();

  // Input validation
  const validation = validateEnquiryInput(data);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Rate limiting: 5 per IP per hour
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const rateCheck = await checkRateLimit(env.OPS, `ratelimit:enquiry:${ip}`, 5, KV_TTL_1_HOUR);
  if (!rateCheck.allowed) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  // Turnstile verification
  const turnstile = await verifyTurnstile(data.turnstile_token, env.TURNSTILE_SECRET_KEY, ip);
  if (!turnstile.success) {
    return c.json({ error: 'CAPTCHA verification failed' }, 403);
  }

  // Idempotency check
  const idemKey = `enquiry-idem:${data.idempotency_key}`;
  const existing = await env.OPS.get(idemKey);
  if (existing) {
    return c.json(JSON.parse(existing));
  }

  try {
    const token = await getInstallationToken(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, env.OPS);

    // Create GitHub issue
    const issueBody = buildIssueBody({
      name: data.name,
      email: data.email,
      message: data.message,
      budget: data.budget,
      project_type: data.project_type,
    });

    const issueRes = await fetch(`https://api.github.com/repos/${ENQUIRY_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'claude-ops/1.0',
      },
      body: JSON.stringify({
        title: `Enquiry: ${data.name.slice(0, 100)}`,
        body: issueBody,
        labels: ['enquiry'],
      }),
    });

    if (!issueRes.ok) {
      const err = await issueRes.text();
      console.error('GitHub issue creation failed:', err);
      return c.json({ error: 'Failed to create enquiry' }, 502);
    }

    const issue = await issueRes.json() as { number: number };

    // Generate tokens
    const readToken = crypto.randomUUID();
    const writeToken = crypto.randomUUID();

    // Store in KV
    await env.OPS.put(
      `enquiry:${readToken}`,
      JSON.stringify({
        repo: ENQUIRY_REPO,
        issue_number: issue.number,
        name: data.name,
        email: data.email,
        write_token: writeToken,
        created_at: new Date().toISOString(),
      }),
      { expirationTtl: KV_TTL_90_DAYS },
    );

    // Store idempotency key (1 hour TTL)
    const responsePayload = {
      read_token: readToken,
      write_token: writeToken,
      issue_number: issue.number,
    };
    await env.OPS.put(idemKey, JSON.stringify(responsePayload), { expirationTtl: KV_TTL_1_HOUR });

    // Store client email for webhook-triggered triage (matches existing pattern)
    await env.OPS.put(
      `client-email:${ENQUIRY_REPO}:${issue.number}`,
      JSON.stringify({ name: data.name, email: data.email }),
      { expirationTtl: 86400 },
    );

    // Send ONE email with chat URL (Fix 8: email sent once only)
    const chatUrl = `https://adrianwedd.com/enquiry/${readToken}`;
    const messageId = `<enquiry-${issue.number}@ops.adrianwedd.com>`;
    await sendEmail({
      from: env.MAILCHANNELS_FROM,
      to: data.email,
      subject: `Your enquiry has been received (#${issue.number})`,
      body: `Hi ${data.name},\n\nThank you for your enquiry. We've received your message and are reviewing it now.\n\nYou can view the conversation and any responses here:\n${chatUrl}\n\nWe'll aim to respond within a few hours.\n\nBest,\nAdrian's Agentic Team`,
      hubUrl: chatUrl,
      issueNumber: issue.number,
      inReplyTo: messageId,
    });

    // Audit log
    await env.DB.prepare(
      `INSERT INTO audit_log (repo, issue_number, action, detail, created_at)
       VALUES (?, ?, 'enquiry_created', ?, datetime('now'))`,
    )
      .bind(ENQUIRY_REPO, issue.number, JSON.stringify({ name: data.name, read_token: readToken }))
      .run();

    return c.json(responsePayload);
  } catch (err) {
    console.error('Enquiry creation error:', err);
    return c.json({ error: 'Internal error' }, 500);
  }
}

/**
 * GET /api/enquiry/:token — Fetch enquiry conversation (read-only).
 * Returns allowlisted fields only (Fix 2).
 */
export async function handleGetEnquiry(c: Context<{ Bindings: Env }>): Promise<Response> {
  const readToken = c.req.param('token');
  const env = c.env;

  const raw = await env.OPS.get(`enquiry:${readToken}`);
  if (!raw) {
    return c.json({ error: 'not found' }, 404);
  }

  const enquiry = JSON.parse(raw) as {
    repo: string;
    issue_number: number;
    name: string;
    write_token: string;
  };

  try {
    const token = await getInstallationToken(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, env.OPS);

    // Fetch issue
    const issueRes = await fetch(
      `https://api.github.com/repos/${enquiry.repo}/issues/${enquiry.issue_number}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'claude-ops/1.0',
        },
      },
    );

    if (!issueRes.ok) {
      return c.json({ error: 'not found' }, 404);
    }

    const issue = await issueRes.json() as Record<string, any>;

    // Fetch comments
    const commentsRes = await fetch(
      `https://api.github.com/repos/${enquiry.repo}/issues/${enquiry.issue_number}/comments`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'claude-ops/1.0',
        },
      },
    );

    const comments = commentsRes.ok
      ? (await commentsRes.json() as Record<string, any>[])
      : [];

    // Allowlist projection — only safe fields returned
    const projected = projectEnquiry(issue, comments, enquiry.name);

    return c.json(projected, 200, {
      'Cache-Control': 'no-store',
    });
  } catch (err) {
    console.error('Enquiry fetch error:', err);
    return c.json({ error: 'not found' }, 404);
  }
}

/**
 * POST /api/enquiry/:token/reply — Post a reply.
 * Validates write_token from body. Origin validation + rate limiting.
 */
export async function handleEnquiryReply(c: Context<{ Bindings: Env }>): Promise<Response> {
  const readToken = c.req.param('token');
  const env = c.env;

  // Origin validation
  if (!validateOrigin(c.req.header('Origin'))) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const data = await c.req.json<ReplyInput>();

  // Input validation
  const validation = validateReplyInput(data);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 400);
  }

  // Look up enquiry
  const raw = await env.OPS.get(`enquiry:${readToken}`);
  if (!raw) {
    return c.json({ error: 'not found' }, 404);
  }

  const enquiry = JSON.parse(raw) as {
    repo: string;
    issue_number: number;
    name: string;
    write_token: string;
  };

  // Validate write token
  if (data.write_token !== enquiry.write_token) {
    return c.json({ error: 'forbidden' }, 403);
  }

  // Check abuse flag
  const abused = await env.OPS.get(`enquiry-abuse:${readToken}`);
  if (abused) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  // Rate limiting: 10 per hour per token + 3 per minute per IP
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const tokenRate = await checkRateLimit(env.OPS, `ratelimit:reply:${readToken}`, 10, KV_TTL_1_HOUR);
  if (!tokenRate.allowed) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  const ipRate = await checkRateLimit(env.OPS, `ratelimit:reply-ip:${ip}`, 3, 60);
  if (!ipRate.allowed) {
    return c.json({ error: 'Too many requests' }, 429);
  }

  // Reply idempotency (hash of token + body)
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${readToken}:${data.body}`),
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const replyIdemKey = `reply-idem:${hashHex}`;

  const existingReply = await env.OPS.get(replyIdemKey);
  if (existingReply) {
    return c.json({ ok: true, deduplicated: true });
  }

  try {
    const token = await getInstallationToken(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, env.OPS);

    // Post comment to GitHub issue (plain text, attributed to client)
    await postComment(
      token,
      enquiry.repo,
      enquiry.issue_number,
      `**${enquiry.name}** replied:\n\n${data.body}`,
    );

    // Mark reply as sent (1 hour dedup window)
    await env.OPS.put(replyIdemKey, '1', { expirationTtl: KV_TTL_1_HOUR });

    return c.json({ ok: true });
  } catch (err) {
    console.error('Reply error:', err);
    return c.json({ error: 'Failed to send reply' }, 500);
  }
}
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx vitest run src/__tests__/enquiry.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/adrian/repos/claude-ops
git add worker/src/enquiry.ts worker/src/__tests__/enquiry.test.ts worker/src/env.ts
git commit -m "feat: enquiry creation, retrieval, reply handlers with token model"
```

---

### Task 4: Mount Enquiry Routes in index.ts

**Files:**
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Add imports and routes to index.ts**

Add these imports at the top:

```typescript
import { handleCreateEnquiry, handleGetEnquiry, handleEnquiryReply } from './enquiry';
```

Add these routes after the existing `/api/issue` route:

```typescript
// Public enquiry endpoints (Turnstile-protected, no bearer auth)
app.post('/api/enquiry', handleCreateEnquiry);
app.get('/api/enquiry/:token', handleGetEnquiry);
app.post('/api/enquiry/:token/reply', handleEnquiryReply);
```

- [ ] **Step 2: Add CORS preflight for enquiry endpoints**

Add before the enquiry routes:

```typescript
// CORS preflight for public enquiry endpoints
app.options('/api/enquiry', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://adrianwedd.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
});

app.options('/api/enquiry/:token/reply', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://adrianwedd.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
});
```

Add CORS headers middleware for enquiry responses (after route mounting):

```typescript
// Add CORS headers to enquiry responses
app.use('/api/enquiry/*', async (c, next) => {
  await next();
  c.res.headers.set('Access-Control-Allow-Origin', 'https://adrianwedd.com');
});
```

- [ ] **Step 3: Add TURNSTILE_SECRET_KEY to wrangler.toml secrets list (comment)**

Add a comment in `worker/wrangler.toml` noting the new secret:

```toml
# Required secrets (set via `wrangler secret put`):
# TURNSTILE_SECRET_KEY — Cloudflare Turnstile secret key
```

- [ ] **Step 4: Run full test suite**

Run: `cd /Users/adrian/repos/claude-ops/worker && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/adrian/repos/claude-ops
git add worker/src/index.ts worker/wrangler.toml
git commit -m "feat: mount public enquiry routes with CORS"
```

---

### Task 5: Deploy claude-ops + Set Turnstile Secret

**Files:** None (deployment task)

- [ ] **Step 1: Set the Turnstile secret**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx wrangler secret put TURNSTILE_SECRET_KEY`
(Enter the secret from the Cloudflare Turnstile dashboard)

- [ ] **Step 2: Deploy**

Run: `cd /Users/adrian/repos/claude-ops/worker && npx wrangler deploy`

- [ ] **Step 3: Verify health**

Run: `curl https://ops.adrianwedd.com/api/health`
Expected: `{"ok":true,"service":"claude-ops"}`

- [ ] **Step 4: Commit (if any wrangler.toml changes)**

```bash
cd /Users/adrian/repos/claude-ops
git add -A && git commit -m "chore: deploy enquiry endpoints"
```

---

## Phase 2: adrianwedd.com Frontend (Tasks 6-9)

All frontend work happens in the `adrianwedd.com` repo at `/Users/adrian/repos/adrianwedd.com`.

### File Map — Phase 2

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/pages/contact.astro` | Add structured enquiry form with Turnstile |
| Create | `src/pages/enquiry/[...token].astro` | Chat page (SSR-style, client-hydrated) |
| Create | `src/components/islands/EnquiryChat.tsx` | Preact chat island (polling, reply, a11y) |
| Modify | `astro.config.mjs` | Add Turnstile script to head (if needed) |
| Modify | `.lychee.toml` | Exclude `/enquiry/` paths from link checking |

---

### Task 6: Enquiry Form on Contact Page

**Files:**
- Modify: `src/pages/contact.astro`

The existing contact page has a booking widget and email link. Add a structured enquiry form above or alongside it. The form POSTs to `ops.adrianwedd.com/api/enquiry` and redirects to the chat page on success.

- [ ] **Step 1: Add Turnstile site key as env/config**

Add a constant or env-based config. For a static site, the Turnstile site key is public and can be hardcoded:

```typescript
// In contact.astro frontmatter or a shared config
const TURNSTILE_SITE_KEY = 'YOUR_SITE_KEY'; // Replace with actual key from Cloudflare dashboard
const OPS_API = 'https://ops.adrianwedd.com';
```

- [ ] **Step 2: Add enquiry form section to contact.astro**

Add before or after the booking widget section. Key elements:

```html
<section class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-12">
  <h2 class="text-xl font-semibold text-text">Send an enquiry</h2>
  <p class="mt-1 text-sm text-text-muted">
    Describe what you need and we'll get back to you — usually within a few hours.
  </p>

  <form id="enquiry-form" class="mt-6 space-y-4" novalidate>
    <div>
      <label for="eq-name" class="block text-sm font-medium text-text">Name</label>
      <input type="text" id="eq-name" name="name" required maxlength="200"
        class="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none" />
    </div>

    <div>
      <label for="eq-email" class="block text-sm font-medium text-text">Email</label>
      <input type="email" id="eq-email" name="email" required maxlength="254"
        class="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none" />
    </div>

    <div>
      <label for="eq-message" class="block text-sm font-medium text-text">What do you need?</label>
      <textarea id="eq-message" name="message" required rows="5" maxlength="5000"
        class="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"></textarea>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label for="eq-type" class="block text-sm font-medium text-text">Project type <span class="text-text-muted">(optional)</span></label>
        <select id="eq-type" name="project_type"
          class="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none">
          <option value="">Select...</option>
          <option value="New website">New website</option>
          <option value="Redesign">Redesign</option>
          <option value="CMS/content">CMS/content</option>
          <option value="Automation">Automation</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label for="eq-budget" class="block text-sm font-medium text-text">Budget range <span class="text-text-muted">(optional)</span></label>
        <select id="eq-budget" name="budget"
          class="mt-1 block w-full rounded border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none">
          <option value="">Not sure</option>
          <option value="Under $1k">Under $1k</option>
          <option value="$1k-$5k">$1k-$5k</option>
          <option value="$5k-$15k">$5k-$15k</option>
          <option value="$15k+">$15k+</option>
        </select>
      </div>
    </div>

    <!-- Turnstile widget -->
    <div class="cf-turnstile" data-sitekey="TURNSTILE_SITE_KEY" data-theme="dark"></div>

    <input type="hidden" id="eq-idempotency" name="idempotency_key" />

    <button type="submit" id="eq-submit"
      class="rounded bg-accent px-6 py-2 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50">
      Send enquiry
    </button>

    <div id="eq-status" role="status" aria-live="polite" class="text-sm"></div>
  </form>

  <p class="mt-4 text-xs text-text-muted">
    By submitting, you agree to our <a href="/privacy/" class="text-accent hover:underline">privacy policy</a>.
    Your data is stored securely and retained for 90 days. Enquiries are processed by AI for initial triage.
  </p>
</section>
```

- [ ] **Step 3: Add form submission script (VT-safe pattern)**

Use `is:inline` script following View Transitions compatibility pattern:

```html
<script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<script is:inline>
(function() {
  if (document.documentElement.dataset.enquiryFormInit) return;
  document.documentElement.dataset.enquiryFormInit = '1';

  var OPS_API = 'https://ops.adrianwedd.com';

  document.addEventListener('submit', async function(e) {
    var form = e.target.closest('#enquiry-form');
    if (!form) return;
    e.preventDefault();

    var status = document.getElementById('eq-status');
    var btn = document.getElementById('eq-submit');
    var nameInput = document.getElementById('eq-name');
    var emailInput = document.getElementById('eq-email');
    var messageInput = document.getElementById('eq-message');

    // Generate idempotency key if not set
    var idemInput = document.getElementById('eq-idempotency');
    if (!idemInput.value) {
      idemInput.value = crypto.randomUUID();
    }

    // Get Turnstile response
    var turnstileResponse = document.querySelector('[name="cf-turnstile-response"]');
    if (!turnstileResponse || !turnstileResponse.value) {
      status.textContent = 'Please complete the CAPTCHA verification.';
      status.className = 'text-sm text-red-400';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    status.textContent = '';

    try {
      var res = await fetch(OPS_API + '/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          message: messageInput.value.trim(),
          project_type: form.querySelector('[name="project_type"]').value || undefined,
          budget: form.querySelector('[name="budget"]').value || undefined,
          turnstile_token: turnstileResponse.value,
          idempotency_key: idemInput.value,
        }),
      });

      var data = await res.json();

      if (res.ok && data.read_token) {
        // Store write token in sessionStorage
        sessionStorage.setItem('enquiry_write_token', data.write_token);
        // Redirect to chat page
        window.location.href = '/enquiry/' + data.read_token + '/';
        return;
      }

      status.textContent = data.error || 'Something went wrong. Please try again.';
      status.className = 'text-sm text-red-400';
    } catch (err) {
      status.textContent = 'Network error. Please check your connection and try again.';
      status.className = 'text-sm text-red-400';
    }

    btn.disabled = false;
    btn.textContent = 'Send enquiry';
  });

  // Generate idempotency key on page load
  document.addEventListener('astro:after-swap', function() {
    var idem = document.getElementById('eq-idempotency');
    if (idem) idem.value = crypto.randomUUID();
  });

  // Set initial idempotency key
  var idem = document.getElementById('eq-idempotency');
  if (idem && !idem.value) idem.value = crypto.randomUUID();
})();
</script>
```

- [ ] **Step 4: Verify form renders in dev**

Run: `cd /Users/adrian/repos/adrianwedd.com && npm run dev`
Visit `http://localhost:4321/contact/` and verify form displays correctly.

- [ ] **Step 5: Commit**

```bash
cd /Users/adrian/repos/adrianwedd.com
git add src/pages/contact.astro
git commit -m "feat: structured enquiry form with Turnstile CAPTCHA on contact page"
```

---

### Task 7: Chat Page (Enquiry Conversation View)

**Files:**
- Create: `src/pages/enquiry/[...token].astro`

- [ ] **Step 1: Create the chat page**

The chat page is a static shell that fetches conversation data client-side from `ops.adrianwedd.com/api/enquiry/:token`. It renders all content as plain text (no markdown, no HTML — XSS eliminated by design).

Key requirements from spec:
- Left-aligned: client messages. Right-aligned: team messages.
- `role="log"` with `aria-live="polite"` for screen reader announcements
- Auto-refresh every 15 seconds (non-destructive: preserves input, scroll, focus)
- Reply textarea only if `write_token` in sessionStorage
- Security headers via `<meta>` tags: `robots: noindex`, `referrer: no-referrer`
- `dvh` units for mobile layout, `visualViewport` API for keyboard handling
- No GA4, no analytics on this page
- Expired/invalid token: friendly error with link to form

```astro
---
// src/pages/enquiry/[...token].astro
import BaseLayout from '../../layouts/BaseLayout.astro';

// getStaticPaths not needed — this is a catch-all that renders client-side
export function getStaticPaths() {
  // Return empty — all rendering is client-side via fetch
  // Astro will generate a single shell page
  return [{ params: { token: undefined } }];
}
---

<BaseLayout
  title="Your Enquiry"
  description="View your enquiry conversation."
  noAnalytics={true}
>
  <Fragment slot="head">
    <meta name="robots" content="noindex, nofollow" />
    <meta name="referrer" content="no-referrer" />
  </Fragment>

  <main class="mx-auto flex max-w-2xl flex-col px-4 sm:px-6" style="height: 100dvh;">
    <!-- Loading state -->
    <div id="eq-loading" class="flex flex-1 items-center justify-center">
      <p class="text-text-muted">Loading conversation...</p>
    </div>

    <!-- Error state -->
    <div id="eq-error" hidden class="flex flex-1 flex-col items-center justify-center gap-4">
      <p id="eq-error-msg" class="text-text-muted">This conversation could not be found.</p>
      <a href="/contact/" class="text-accent hover:underline">Submit a new enquiry</a>
    </div>

    <!-- Chat view -->
    <div id="eq-chat" hidden class="flex flex-1 flex-col overflow-hidden">
      <header class="border-b border-border py-4">
        <h1 class="text-lg font-semibold text-text" id="eq-title">Your Enquiry</h1>
        <p class="text-sm text-text-muted" id="eq-status-line">Loading...</p>
      </header>

      <div id="eq-messages" role="log" aria-live="polite" aria-label="Conversation"
        class="flex-1 space-y-4 overflow-y-auto py-4">
        <!-- Messages rendered here by JS -->
      </div>

      <!-- Reply box (shown only with write token) -->
      <div id="eq-reply-box" hidden class="border-t border-border py-3">
        <form id="eq-reply-form" class="flex gap-2">
          <label for="eq-reply-input" class="sr-only">Reply</label>
          <textarea id="eq-reply-input" name="reply" rows="2" maxlength="2000"
            placeholder="Type your reply..."
            class="flex-1 rounded border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"></textarea>
          <button type="submit" id="eq-reply-btn"
            class="self-end rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50">
            Send
          </button>
        </form>
        <div id="eq-reply-status" role="status" aria-live="polite" class="mt-1 text-xs"></div>
      </div>

      <!-- Read-only notice -->
      <div id="eq-readonly-notice" hidden class="border-t border-border py-3">
        <p class="text-sm text-text-muted">This is a read-only view. To reply, use the link from your original email.</p>
      </div>
    </div>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Add client-side chat script (VT-safe, is:inline)**

Add after the HTML in the same file:

```html
<script is:inline>
(function() {
  if (document.documentElement.dataset.enquiryChatInit) return;
  document.documentElement.dataset.enquiryChatInit = '1';

  var OPS_API = 'https://ops.adrianwedd.com';
  var POLL_INTERVAL = 15000;
  var pollTimer = null;

  function getToken() {
    var path = window.location.pathname.replace(/\/$/, '');
    var parts = path.split('/');
    return parts[parts.length - 1] || null;
  }

  function getWriteToken() {
    try { return sessionStorage.getItem('enquiry_write_token'); } catch { return null; }
  }

  function el(id) { return document.getElementById(id); }

  function showError(msg) {
    el('eq-loading').hidden = true;
    el('eq-chat').hidden = true;
    el('eq-error').hidden = false;
    if (msg) el('eq-error-msg').textContent = msg;
  }

  function showChat() {
    el('eq-loading').hidden = true;
    el('eq-error').hidden = true;
    el('eq-chat').hidden = false;
  }

  // Render a message bubble (plain text only — no innerHTML, no XSS)
  function renderMessage(container, text, authorType, timestamp) {
    var msg = document.createElement('div');
    var isTeam = authorType === 'team';
    msg.className = isTeam
      ? 'flex justify-end'
      : 'flex justify-start';

    var bubble = document.createElement('div');
    bubble.className = isTeam
      ? 'max-w-[80%] rounded-lg bg-accent/20 px-4 py-2'
      : 'max-w-[80%] rounded-lg bg-surface-alt px-4 py-2';

    // Plain text only — textContent, not innerHTML (Fix 9)
    var bodyEl = document.createElement('p');
    bodyEl.className = 'text-sm text-text whitespace-pre-wrap break-words';
    bodyEl.textContent = text;
    bubble.appendChild(bodyEl);

    var meta = document.createElement('p');
    meta.className = 'mt-1 text-xs text-text-muted';
    var label = isTeam ? "Adrian's Agentic Team" : 'You';
    var dateStr = timestamp ? new Date(timestamp).toLocaleDateString('en-AU', { dateStyle: 'short' }) : '';
    meta.textContent = label + (dateStr ? ' \u00B7 ' + dateStr : '');
    bubble.appendChild(meta);

    msg.appendChild(bubble);
    container.appendChild(msg);
  }

  var lastCommentCount = 0;

  async function loadConversation(token) {
    try {
      var res = await fetch(OPS_API + '/api/enquiry/' + token);
      if (res.status === 404) {
        showError('This conversation has expired or could not be found. Please submit a new enquiry.');
        return null;
      }
      if (!res.ok) {
        showError('Something went wrong. Please try again later.');
        return null;
      }
      return await res.json();
    } catch {
      showError('Network error. Please check your connection.');
      return null;
    }
  }

  function renderConversation(data) {
    showChat();
    el('eq-title').textContent = data.title || 'Your Enquiry';
    el('eq-status-line').textContent = data.status === 'open' ? 'Active' : 'Closed';

    var container = el('eq-messages');

    // On first load, render all messages
    if (lastCommentCount === 0) {
      container.replaceChildren();

      // System message
      var sysMsg = document.createElement('div');
      sysMsg.className = 'flex justify-center';
      var sysBubble = document.createElement('p');
      sysBubble.className = 'rounded-full bg-surface-alt px-4 py-1 text-xs text-text-muted';
      sysBubble.textContent = 'Message received! We\'re reviewing your enquiry.';
      sysMsg.appendChild(sysBubble);
      container.appendChild(sysMsg);

      // Original message (from issue body)
      if (data.body_text) {
        renderMessage(container, data.body_text, 'client', null);
      }

      // All comments
      for (var i = 0; i < data.comments.length; i++) {
        renderMessage(container, data.comments[i].body_text, data.comments[i].author_type, data.comments[i].created_at);
      }
      lastCommentCount = data.comments.length;
    } else if (data.comments.length > lastCommentCount) {
      // Append only new comments (non-destructive refresh)
      for (var j = lastCommentCount; j < data.comments.length; j++) {
        renderMessage(container, data.comments[j].body_text, data.comments[j].author_type, data.comments[j].created_at);
      }
      lastCommentCount = data.comments.length;
    }

    // Scroll to bottom (only if user is near bottom already)
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 100) {
      container.scrollTop = container.scrollHeight;
    }

    // Show reply box or read-only notice
    var writeToken = getWriteToken();
    if (writeToken && data.status === 'open') {
      el('eq-reply-box').hidden = false;
      el('eq-readonly-notice').hidden = true;
    } else {
      el('eq-reply-box').hidden = true;
      el('eq-readonly-notice').hidden = !writeToken ? false : true;
    }
  }

  async function init() {
    var token = getToken();
    if (!token || token === 'enquiry') {
      showError('No conversation token provided.');
      return;
    }

    var data = await loadConversation(token);
    if (!data) return;
    renderConversation(data);

    // Start polling
    pollTimer = setInterval(async function() {
      var updated = await loadConversation(token);
      if (updated) renderConversation(updated);
    }, POLL_INTERVAL);
  }

  // Reply form handler
  document.addEventListener('submit', async function(e) {
    var form = e.target.closest('#eq-reply-form');
    if (!form) return;
    e.preventDefault();

    var input = el('eq-reply-input');
    var btn = el('eq-reply-btn');
    var status = el('eq-reply-status');
    var text = input.value.trim();
    if (!text) return;

    var token = getToken();
    var writeToken = getWriteToken();
    if (!token || !writeToken) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    status.textContent = '';

    try {
      var res = await fetch(OPS_API + '/api/enquiry/' + token + '/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ write_token: writeToken, body: text }),
      });

      if (res.ok) {
        // Optimistic render
        renderMessage(el('eq-messages'), text, 'client', new Date().toISOString());
        el('eq-messages').scrollTop = el('eq-messages').scrollHeight;
        input.value = '';
        lastCommentCount++; // Prevent re-rendering on next poll
      } else {
        var data = await res.json();
        status.textContent = data.error || 'Failed to send reply.';
        status.className = 'mt-1 text-xs text-red-400';
      }
    } catch {
      status.textContent = 'Network error.';
      status.className = 'mt-1 text-xs text-red-400';
    }

    btn.disabled = false;
    btn.textContent = 'Send';
  });

  // Mobile keyboard handling
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      var chat = el('eq-chat');
      if (chat) {
        chat.style.height = window.visualViewport.height + 'px';
      }
    });
  }

  // Init on load and VT swap
  init();
  document.addEventListener('astro:after-swap', function() {
    lastCommentCount = 0;
    if (pollTimer) clearInterval(pollTimer);
    init();
  });
})();
</script>
```

- [ ] **Step 3: Handle SSG — configure getStaticPaths for catch-all**

Note: Since Astro is in static mode and we cannot enumerate all tokens at build time, the `[...token].astro` catch-all generates a single shell page. The token is extracted client-side from `window.location.pathname`. This is the same pattern used for any SPA-like page in a static Astro build.

If Astro's static build rejects a catch-all without paths, use a `404.astro`-style fallback or configure this specific route. The simplest approach: the `[...token].astro` with `getStaticPaths` returning `[{ params: { token: undefined } }]` generates `/enquiry/index.html`, and a Cloudflare Pages `_redirects` rule or GitHub Pages 404 handling serves it for all `/enquiry/*` paths.

**Alternative (simpler):** Create `src/pages/enquiry/index.astro` as the chat shell, and extract the token from the URL client-side. This avoids dynamic route issues entirely with static builds.

- [ ] **Step 4: Test in dev**

Run: `cd /Users/adrian/repos/adrianwedd.com && npm run dev`
Visit `http://localhost:4321/enquiry/test-token/` and verify:
- Loading state appears
- Error state shows (since test-token is invalid)
- Layout is correct on mobile viewport

- [ ] **Step 5: Commit**

```bash
cd /Users/adrian/repos/adrianwedd.com
git add src/pages/enquiry/
git commit -m "feat: enquiry chat page with polling, reply, and plain-text rendering"
```

---

### Task 8: Lychee + Build Configuration

**Files:**
- Modify: `.lychee.toml` (exclude `/enquiry/` paths)
- Modify: `astro.config.mjs` (if redirect needed)

- [ ] **Step 1: Exclude enquiry paths from lychee link checker**

Add to `.lychee.toml` exclude list:

```toml
"adrianwedd.com/enquiry/"
```

These are dynamic client-rendered pages that won't exist at build time.

- [ ] **Step 2: Update sitemap exclusion**

If the `astro.config.mjs` sitemap filter exists, ensure `/enquiry/` pages are excluded from the sitemap (they contain PII tokens and should not be indexed):

```typescript
// In astro.config.mjs sitemap integration config
filter: (page) => !page.includes('/enquiry/'),
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/adrian/repos/adrianwedd.com && npm run build`
Expected: Clean build, no errors. The enquiry page shell should be in the output.

- [ ] **Step 4: Commit**

```bash
cd /Users/adrian/repos/adrianwedd.com
git add .lychee.toml astro.config.mjs
git commit -m "chore: exclude enquiry paths from lychee and sitemap"
```

---

### Task 9: Privacy Notice Update

**Files:**
- Modify: `src/pages/privacy.astro` (or equivalent — create if missing)

- [ ] **Step 1: Add or update privacy page**

Ensure the privacy page discloses:
- Enquiry data stored in Cloudflare KV (90-day retention, auto-expires)
- Issue data stored in private GitHub repo (US-hosted)
- AI processing by Anthropic Claude for initial triage
- Email sent via MailChannels (transient, not stored)
- Deletion process: request via chat, admin deletes KV + GitHub issue
- No cookies set by the enquiry system
- No analytics on chat pages

- [ ] **Step 2: Commit**

```bash
cd /Users/adrian/repos/adrianwedd.com
git add src/pages/privacy.astro
git commit -m "docs: update privacy page with enquiry data handling disclosures"
```

---

## Phase 3: Integration + QA (Tasks 10-12)

### Task 10: End-to-End Integration Test

**Files:** None (manual testing)

- [ ] **Step 1: Test enquiry creation flow**

1. Visit `https://adrianwedd.com/contact/`
2. Fill in form with test data
3. Complete Turnstile CAPTCHA
4. Submit
5. Verify redirect to `/enquiry/{token}/`
6. Verify "Message received" system bubble appears
7. Verify issue created in `adrianwedd/client-inbox` repo
8. Verify email received with chat URL

- [ ] **Step 2: Test AI triage response**

1. Wait up to 60 seconds on chat page
2. Verify AI response appears (right-aligned, "Adrian's Agentic Team")
3. Verify response is contextually relevant to the enquiry

- [ ] **Step 3: Test reply flow**

1. Type a reply in the chat page
2. Submit
3. Verify reply appears immediately (optimistic render)
4. Verify reply posted as comment on GitHub issue
5. Verify AI follow-up response appears on next poll

- [ ] **Step 4: Test read-only access**

1. Copy the chat URL
2. Open in incognito browser (no sessionStorage)
3. Verify conversation is visible (read-only)
4. Verify reply box is hidden, read-only notice shown

- [ ] **Step 5: Test error cases**

1. Visit `/enquiry/invalid-token/` — verify 404 with friendly message
2. Submit form without CAPTCHA — verify "Please verify" error
3. Submit duplicate (refresh after submit) — verify idempotent (returns same tokens)
4. Submit 6+ times rapidly — verify rate limit (429)

---

### Task 11: Security Review

**Files:** None (review task)

- [ ] **Step 1: Verify origin validation**

```bash
# Should return 403
curl -X POST https://ops.adrianwedd.com/api/enquiry \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://evil.com' \
  -d '{"name":"test","email":"t@t.com","message":"hi","turnstile_token":"x","idempotency_key":"y"}'
```

- [ ] **Step 2: Verify read token does not grant write access**

```bash
# Should return 403 (wrong write token)
curl -X POST https://ops.adrianwedd.com/api/enquiry/VALID_READ_TOKEN/reply \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://adrianwedd.com' \
  -d '{"write_token":"wrong","body":"test"}'
```

- [ ] **Step 3: Verify allowlist projection**

```bash
# GET should not expose GitHub usernames, labels, or internal metadata
curl https://ops.adrianwedd.com/api/enquiry/VALID_READ_TOKEN | jq .
# Verify: only title, body_text, comments[{author_type, body_text, created_at}], client_name, status
```

- [ ] **Step 4: Verify security headers on chat page**

Check the HTML meta tags on `/enquiry/{token}/`:
- `<meta name="robots" content="noindex, nofollow">`
- `<meta name="referrer" content="no-referrer">`
- API responses include `Cache-Control: no-store`

- [ ] **Step 5: Verify plain text rendering**

Submit an enquiry with HTML/markdown content:
```
Message: <script>alert('xss')</script> **bold** [link](http://evil.com)
```
Verify chat page renders as literal plain text, not HTML or markdown.

---

### Task 12: Accessibility Review

**Files:** None (review task)

- [ ] **Step 1: Screen reader testing**

- Verify `role="log"` and `aria-live="polite"` on message container
- Verify new messages are announced on auto-refresh
- Verify reply textarea has visible label
- Verify focus management on form submission

- [ ] **Step 2: Keyboard navigation**

- Tab through form fields — verify logical order
- Tab through chat page — verify reply box is reachable
- Enter to submit form and reply

- [ ] **Step 3: Mobile layout**

- Test on 320px viewport — verify no horizontal scroll
- Test with virtual keyboard open — verify reply box stays visible
- Test auto-refresh during reply typing — verify input not cleared

- [ ] **Step 4: Lighthouse audit**

Run Lighthouse on `/contact/` and `/enquiry/test/`:
- Accessibility score >= 90
- Best Practices score >= 90

---

## Spec Compliance Checklist

| # | Requirement | Task |
|---|-------------|------|
| 1 | Visitor submits form, receives chat URL within 5 seconds | Task 6, 10 |
| 2 | Immediate "Message received" bubble | Task 7 |
| 3 | AI response within 60 seconds | Task 10 (relies on existing triage pipeline) |
| 4 | Visitor can reply with write token | Task 7, 10 |
| 5 | Chat URL works for 90 days | Task 3 (KV TTL) |
| 6 | ONE email sent with chat URL | Task 3 |
| 7 | Turnstile blocks bots | Task 1, 6 |
| 8 | Invalid/expired tokens return 404 | Task 3, 7 |
| 9 | Rate limiting (5 submissions/hr, 10 replies/hr) | Task 2, 3 |
| 10 | No PII leaks via Referer/cache/third-party | Task 7, 8 |
| 11 | Separate read/write tokens | Task 3, 6, 7 |
| 12 | Idempotent creation + replies | Task 3 |
| 13 | Plain text rendering (no XSS) | Task 7 |
| 14 | aria-live screen reader announcements | Task 7 |
| 15 | Mobile keyboard handling | Task 7 |

---

## Addendum: QA Findings on Plan (Codex + Gemini, 2026-04-06)

### Critical Fixes (must apply during implementation)

**P1: Client replies use postComment() which adds [claude-ops] marker → webhook ignores them (Critical)**
The reply endpoint must NOT use the existing `postComment()` from github.ts, which appends `<!-- [claude-ops] -->`. Create a new `postClientComment(token, repo, issueNumber, body)` function that posts without the marker. This ensures the webhook `handleComment` handler picks up client replies and triggers AI follow-up.

**P2: CORS middleware path doesn't cover `/api/enquiry` exact (Critical)**
The CORS preflight handler matches `/api/enquiry/*` but not `/api/enquiry` (no trailing path). Fix: add explicit CORS handling for the exact `/api/enquiry` path, or use a pattern that matches both.

**P3: Security headers can't be HTTP headers on GitHub Pages (High)**
adrianwedd.com is static on GitHub Pages — no server to set `Referrer-Policy`, `Cache-Control`, `X-Robots-Tag` as HTTP headers. Fix: use `<meta>` equivalents where possible (`<meta name="referrer" content="no-referrer">`, `<meta name="robots" content="noindex">`). For `Cache-Control: no-store`, this must come from the ops API responses (already a Worker), not the HTML page. Accept this limitation for the static site — the critical protection is on the API responses.

### High Fixes

**P4: Write-token recovery flow missing from plan**
Spec requires email-based recovery when sessionStorage write_token is lost. Add: "Recover access" button → form asks for email → POST to `/api/enquiry/:token/recover` → if email matches KV record, generate new write_token, email it as a one-time link → link sets write_token in sessionStorage. Rate limit: 1 recovery per hour.

**P5: Issue body leaks PII (email, budget) in first chat bubble**
`buildIssueBody()` puts all form fields in the issue body, then the GET endpoint returns it as `body_text`. Fix: store the visitor's message text separately in the issue body (first line), put metadata (email, budget, project type) in a `<!-- metadata: {...} -->` HTML comment that the projection strips. The chat shows only the message text.

**P6: Typing indicator not implemented**
Add a "typing" animation that shows when the chat has 0 team responses and the enquiry was created < 2 minutes ago. CSS-only pulsing dots. Hides when first team response arrives.

### Medium Fixes

**P7: Idempotency check should run BEFORE rate limiting**
Reorder: check idempotency key first (return cached tokens if seen), then check rate limit. This prevents harmless retries from consuming rate limit quota.

**P8: JSON parse errors unhandled**
Wrap `c.req.json()` calls in try/catch, return 400 on malformed JSON.

**P9: sendEmail() result ignored**
Check return value. On failure: still return success to client (enquiry was created), but log warning and set a flag for cron follow-up.

**P10: Accessibility — visible reply label + focus management**
Replace `sr-only` label with visible "Your reply" label above textarea. On auto-refresh with new messages: check if user was scrolled to bottom → if yes, scroll to new message and announce via aria-live. If no, show "New messages" indicator without stealing scroll.

**P11: Test coverage too shallow**
Add route-level tests for: CORS preflight, malformed JSON, idempotency ordering, rate limit interaction, email failure handling, marker-free client comments. At minimum 15 new tests for the enquiry endpoints.

### Gemini Fixes

**P12: Typing indicator** — same as P6.
**P13: Focus management** — same as P10.
**P14: Chat notice for closed issues** — check `data.status === 'closed'` and show "This enquiry has been resolved" message.
**P15: Cross-repo deployment sequence** — deploy claude-ops first (API endpoints), then adrianwedd.com (frontend). Document this in the plan.
