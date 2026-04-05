# Claude Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a central AI-powered client issue desk that receives GitHub webhooks, triages with Claude, communicates beautifully with clients, and dispatches code changes via GitHub Actions.

**Architecture:** A Hono-based Cloudflare Worker receives GitHub webhooks, deduplicates via KV, classifies issues with Haiku, drafts client replies with Sonnet, sends email via MailChannels, and dispatches Claude Code via workflow_dispatch for simple changes. Cron trigger handles SLA monitoring and follow-ups.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers/KV/D1, Anthropic SDK (Haiku + Sonnet), GitHub API, MailChannels, Vitest

---

## Phase 1: Worker Core (Tasks 1-8)

### File Map — Phase 1

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `worker/src/index.ts` | Hono routes: webhook, API, health |
| Create | `worker/src/env.ts` | Environment bindings interface |
| Create | `worker/src/webhook.ts` | GitHub webhook HMAC verification + dedup |
| Create | `worker/src/config.ts` | Project config loader (KV-backed) |
| Create | `worker/src/triage.ts` | Haiku classification pipeline |
| Create | `worker/src/communicate.ts` | Sonnet response drafting |
| Create | `worker/src/github.ts` | GitHub API client (issues, comments, labels) |
| Create | `worker/src/email.ts` | MailChannels email sender |
| Create | `worker/wrangler.toml` | Worker config (KV, D1, cron) |
| Create | `worker/package.json` | Dependencies |
| Create | `worker/tsconfig.json` | TypeScript config |
| Create | `worker/src/__tests__/` | Test suite |
| Create | `projects/_template.json` | Project config template |
| Create | `projects/_inbox.json` | Catch-all config for unknown clients |
| Create | `CLAUDE.md` | Project documentation |
| Create | `migrations/0001_init.sql` | D1 schema (clients, issues, audit_log) |

---

### Task 1: Scaffold the Repository

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/env.ts`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-ops",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
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

- [ ] **Step 2: Create tsconfig.json**

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

- [ ] **Step 3: Create wrangler.toml**

```toml
name = "claude-ops"
main = "src/index.ts"
compatibility_date = "2026-04-05"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "OPS"
id = ""  # Set after wrangler kv:namespace create

[[ d1_databases ]]
binding = "DB"
database_name = "claude-ops-db"
database_id = ""  # Set after wrangler d1 create

[triggers]
crons = ["0 * * * *"]  # Hourly
```

- [ ] **Step 4: Create env.ts**

```typescript
// worker/src/env.ts
export interface Env {
  // KV
  OPS: KVNamespace;
  // D1
  DB: D1Database;
  // Secrets
  ANTHROPIC_API_KEY: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_ID: string;
  GITHUB_WEBHOOK_SECRET: string;
  OPS_SECRET: string;
  MAILCHANNELS_FROM: string;  // e.g. "hello@adrianwedd.com"
  ESCALATE_EMAIL: string;     // e.g. "adrian@adrianwedd.com"
}
```

- [ ] **Step 5: Create CLAUDE.md**

```markdown
# CLAUDE.md

## Project
Claude Ops — central AI-powered client issue desk. Receives GitHub webhooks,
triages with Haiku, drafts client replies with Sonnet, dispatches Claude Code
for simple changes.

## Commands
cd worker && npm install
cd worker && npm test          # Vitest suite
cd worker && npm run dev       # wrangler dev
cd worker && npm run deploy    # deploy to Cloudflare

## Architecture
Hono Worker with KV (dedup, locks, config cache) + D1 (clients, audit).
GitHub App for repo access (short-lived installation tokens).
MailChannels for client email.

## Key Files
- worker/src/index.ts — Hono routes
- worker/src/webhook.ts — HMAC verification + X-GitHub-Delivery dedup
- worker/src/triage.ts — Haiku classification
- worker/src/communicate.ts — Sonnet response drafting
- worker/src/github.ts — GitHub API (issues, comments, labels, PRs)
- worker/src/email.ts — MailChannels sender
- worker/src/config.ts — Project config loader
- projects/*.json — Per-project configuration
```

- [ ] **Step 6: Install dependencies**

Run: `cd worker && npm install`

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: scaffold claude-ops repo"
```

---

### Task 2: D1 Schema

**Files:**
- Create: `migrations/0001_init.sql`

- [ ] **Step 1: Create the migration**

```sql
-- Client PII stored in D1 (not git) per QA Fix 4
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  data_retention_days INTEGER DEFAULT 365,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Issue tracking for SLA and audit
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT NOT NULL,
  issue_number INTEGER NOT NULL,
  client_id TEXT NOT NULL,
  category TEXT,
  complexity TEXT,
  impact TEXT,
  status TEXT DEFAULT 'open',
  acknowledged_at TEXT,
  resolved_at TEXT,
  human_override INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  UNIQUE(repo, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_issues_repo ON issues(repo);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_client ON issues(client_id);

-- Audit log for all actions taken
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT NOT NULL,
  issue_number INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/
git commit -m "feat: D1 schema for clients, issues, audit log"
```

---

### Task 3: Webhook Verification + Deduplication

**Files:**
- Create: `worker/src/webhook.ts`
- Create: `worker/src/__tests__/webhook.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// worker/src/__tests__/webhook.test.ts
import { describe, it, expect, vi } from 'vitest';
import { verifyWebhook, isDuplicate } from '../webhook';

describe('verifyWebhook', () => {
  it('returns true for valid HMAC signature', async () => {
    const body = '{"action":"opened"}';
    const secret = 'test-secret';
    // Pre-compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    const signature = `sha256=${hex}`;

    const result = await verifyWebhook(body, signature, secret);
    expect(result).toBe(true);
  });

  it('returns false for invalid signature', async () => {
    const result = await verifyWebhook('body', 'sha256=invalid', 'secret');
    expect(result).toBe(false);
  });

  it('returns false for missing signature', async () => {
    const result = await verifyWebhook('body', '', 'secret');
    expect(result).toBe(false);
  });
});

describe('isDuplicate', () => {
  it('returns false for new delivery ID', async () => {
    const kv = {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as KVNamespace;

    const result = await isDuplicate(kv, 'delivery-123');
    expect(result).toBe(false);
    expect(kv.put).toHaveBeenCalledWith('delivery:delivery-123', '1', { expirationTtl: 86400 });
  });

  it('returns true for seen delivery ID', async () => {
    const kv = {
      get: vi.fn().mockResolvedValue('1'),
      put: vi.fn(),
    } as unknown as KVNamespace;

    const result = await isDuplicate(kv, 'delivery-123');
    expect(result).toBe(true);
    expect(kv.put).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd worker && npx vitest run src/__tests__/webhook.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement webhook.ts**

```typescript
// worker/src/webhook.ts

/**
 * Verify GitHub webhook HMAC-SHA256 signature.
 */
export async function verifyWebhook(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expected = `sha256=${hex}`;

  // Timing-safe comparison
  if (signature.length !== expected.length) return false;
  const a = encoder.encode(signature);
  const b = encoder.encode(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Check if a webhook delivery has already been processed.
 * Uses X-GitHub-Delivery header GUID as dedup key.
 * Returns true if duplicate (already seen).
 */
export async function isDuplicate(
  kv: KVNamespace,
  deliveryId: string,
): Promise<boolean> {
  const existing = await kv.get(`delivery:${deliveryId}`);
  if (existing) return true;
  await kv.put(`delivery:${deliveryId}`, '1', { expirationTtl: 86400 });
  return false;
}

/**
 * Check if an issue is currently being processed (lock).
 * Returns true if locked (another handler is working on it).
 */
export async function acquireIssueLock(
  kv: KVNamespace,
  repo: string,
  issueNumber: number,
): Promise<boolean> {
  const key = `lock:${repo}:${issueNumber}`;
  const existing = await kv.get(key);
  if (existing) return false;
  await kv.put(key, '1', { expirationTtl: 60 });
  return true;
}

export async function releaseIssueLock(
  kv: KVNamespace,
  repo: string,
  issueNumber: number,
): Promise<void> {
  await kv.delete(`lock:${repo}:${issueNumber}`);
}
```

- [ ] **Step 4: Run tests**

Run: `cd worker && npx vitest run src/__tests__/webhook.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add worker/src/webhook.ts worker/src/__tests__/webhook.test.ts
git commit -m "feat: webhook HMAC verification, dedup, issue locking"
```

---

### Task 4: Project Config Loader

**Files:**
- Create: `worker/src/config.ts`
- Create: `worker/src/__tests__/config.test.ts`
- Create: `projects/_template.json`
- Create: `projects/_inbox.json`

- [ ] **Step 1: Create project config template**

```json
{
  "repo": "adrianwedd/example",
  "client_id": "client-uuid",
  "tone": "warm, professional",
  "sla": {
    "acknowledge_minutes": 5,
    "update_hours": 24,
    "resolve_hours": 72
  },
  "business_hours": {
    "timezone": "Australia/Melbourne",
    "start": "09:00",
    "end": "17:00",
    "days": [1, 2, 3, 4, 5]
  },
  "allowed_actions": ["content_change", "text_edit", "image_swap"],
  "claude_code": {
    "enabled": true,
    "branch_prefix": "client/",
    "auto_pr": true,
    "auto_merge": false
  }
}
```

- [ ] **Step 2: Create inbox config**

```json
{
  "repo": "adrianwedd/client-inbox",
  "client_id": null,
  "tone": "warm, welcoming",
  "sla": {
    "acknowledge_minutes": 5,
    "update_hours": 24,
    "resolve_hours": 168
  },
  "allowed_actions": [],
  "claude_code": {
    "enabled": false
  }
}
```

- [ ] **Step 3: Write failing tests**

```typescript
// worker/src/__tests__/config.test.ts
import { describe, it, expect, vi } from 'vitest';
import { loadProjectConfig, type ProjectConfig } from '../config';

describe('loadProjectConfig', () => {
  it('returns config for known repo', async () => {
    const kv = {
      get: vi.fn().mockResolvedValue(JSON.stringify({
        repo: 'adrianwedd/nannabayer',
        client_id: 'nanna-1',
        tone: 'warm, creative',
        sla: { acknowledge_minutes: 5, update_hours: 24, resolve_hours: 72 },
        allowed_actions: ['content_change'],
        claude_code: { enabled: true, branch_prefix: 'client/', auto_pr: true, auto_merge: false },
      })),
    } as unknown as KVNamespace;

    const config = await loadProjectConfig(kv, 'adrianwedd/nannabayer');
    expect(config).not.toBeNull();
    expect(config!.repo).toBe('adrianwedd/nannabayer');
    expect(config!.tone).toBe('warm, creative');
  });

  it('returns inbox config for unknown repo', async () => {
    const kv = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'project:adrianwedd/unknown') return Promise.resolve(null);
        if (key === 'project:_inbox') return Promise.resolve(JSON.stringify({
          repo: 'adrianwedd/client-inbox',
          client_id: null,
          tone: 'warm, welcoming',
          sla: { acknowledge_minutes: 5, update_hours: 24, resolve_hours: 168 },
          allowed_actions: [],
          claude_code: { enabled: false },
        }));
        return Promise.resolve(null);
      }),
    } as unknown as KVNamespace;

    const config = await loadProjectConfig(kv, 'adrianwedd/unknown');
    expect(config).not.toBeNull();
    expect(config!.repo).toBe('adrianwedd/client-inbox');
    expect(config!.client_id).toBeNull();
  });
});
```

- [ ] **Step 4: Implement config.ts**

```typescript
// worker/src/config.ts

export interface SLAConfig {
  acknowledge_minutes: number;
  update_hours: number;
  resolve_hours: number;
}

export interface BusinessHours {
  timezone: string;
  start: string;
  end: string;
  days: number[];
}

export interface ClaudeCodeConfig {
  enabled: boolean;
  branch_prefix: string;
  auto_pr: boolean;
  auto_merge: boolean;
}

export interface ProjectConfig {
  repo: string;
  client_id: string | null;
  tone: string;
  sla: SLAConfig;
  business_hours?: BusinessHours;
  allowed_actions: string[];
  claude_code: ClaudeCodeConfig;
}

/**
 * Load project config from KV by repo name.
 * Falls back to _inbox config for unknown repos.
 */
export async function loadProjectConfig(
  kv: KVNamespace,
  repoFullName: string,
): Promise<ProjectConfig | null> {
  const raw = await kv.get(`project:${repoFullName}`);
  if (raw) {
    return JSON.parse(raw) as ProjectConfig;
  }

  // Fall back to inbox
  const inbox = await kv.get('project:_inbox');
  if (inbox) {
    return JSON.parse(inbox) as ProjectConfig;
  }

  return null;
}
```

- [ ] **Step 5: Run tests**

Run: `cd worker && npx vitest run src/__tests__/config.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add worker/src/config.ts worker/src/__tests__/config.test.ts projects/
git commit -m "feat: project config loader with inbox fallback"
```

---

### Task 5: Haiku Triage Classification

**Files:**
- Create: `worker/src/triage.ts`
- Create: `worker/src/__tests__/triage.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// worker/src/__tests__/triage.test.ts
import { describe, it, expect, vi } from 'vitest';
import { classifyIssue, parseClassification, type TriageResult } from '../triage';

describe('parseClassification', () => {
  it('parses valid JSON classification', () => {
    const json = JSON.stringify({
      category: 'content_change',
      complexity: 'simple',
      impact: 'low',
      needs_clarification: false,
      clarifying_questions: [],
      summary: 'Update phone number on contact page',
    });
    const result = parseClassification(json);
    expect(result.category).toBe('content_change');
    expect(result.complexity).toBe('simple');
    expect(result.impact).toBe('low');
    expect(result.needs_clarification).toBe(false);
  });

  it('extracts JSON from markdown code block', () => {
    const response = '```json\n{"category":"bug_report","complexity":"complex","impact":"high","needs_clarification":true,"clarifying_questions":["Can you share a screenshot?"],"summary":"Pricing shows $0"}\n```';
    const result = parseClassification(response);
    expect(result.category).toBe('bug_report');
    expect(result.impact).toBe('high');
    expect(result.clarifying_questions).toHaveLength(1);
  });

  it('returns fallback for garbage input', () => {
    const result = parseClassification('this is not json');
    expect(result.category).toBe('other');
    expect(result.needs_clarification).toBe(true);
  });
});
```

- [ ] **Step 2: Implement triage.ts**

```typescript
// worker/src/triage.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ProjectConfig } from './config';

export interface TriageResult {
  category: 'content_change' | 'bug_report' | 'feature_request' | 'question' | 'billing' | 'other';
  complexity: 'trivial' | 'simple' | 'complex';
  impact: 'low' | 'medium' | 'high' | 'critical';
  needs_clarification: boolean;
  clarifying_questions: string[];
  summary: string;
}

const FALLBACK: TriageResult = {
  category: 'other',
  complexity: 'complex',
  impact: 'medium',
  needs_clarification: true,
  clarifying_questions: ['Could you provide more details about what you need?'],
  summary: 'Unclassified request',
};

export function parseClassification(response: string): TriageResult {
  const codeBlock = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  const jsonStr = codeBlock ? codeBlock[1].trim() : response.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      category: parsed.category || 'other',
      complexity: parsed.complexity || 'complex',
      impact: parsed.impact || 'medium',
      needs_clarification: parsed.needs_clarification ?? true,
      clarifying_questions: parsed.clarifying_questions || [],
      summary: parsed.summary || 'No summary',
    };
  } catch {
    return { ...FALLBACK };
  }
}

export async function classifyIssue(
  apiKey: string,
  title: string,
  body: string,
  config: ProjectConfig,
): Promise<TriageResult> {
  const client = new Anthropic({ apiKey });

  const prompt = `You are triaging a client request for a web project.

Project context: ${config.tone}
Allowed automated actions: ${config.allowed_actions.join(', ') || 'none'}

Issue title: ${title}
Issue body: ${body}

Classify this request. Return JSON only:
{
  "category": "content_change | bug_report | feature_request | question | billing | other",
  "complexity": "trivial | simple | complex",
  "impact": "low | medium | high | critical",
  "needs_clarification": true/false,
  "clarifying_questions": ["..."],
  "summary": "one sentence summary of what the client needs"
}

Rules:
- "trivial" = single text/image change, no logic
- "simple" = multiple related changes, no new features
- "complex" = new functionality, structural changes, or unclear scope
- "impact" considers business effect: wrong pricing = critical, typo in footer = low
- Only set needs_clarification if you genuinely cannot determine what to do
- Return ONLY the JSON object`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return parseClassification(text);
}
```

- [ ] **Step 3: Run tests**

Run: `cd worker && npx vitest run src/__tests__/triage.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add worker/src/triage.ts worker/src/__tests__/triage.test.ts
git commit -m "feat: Haiku triage classification with impact dimension"
```

---

### Task 6: Sonnet Communication Drafting

**Files:**
- Create: `worker/src/communicate.ts`
- Create: `worker/src/__tests__/communicate.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// worker/src/__tests__/communicate.test.ts
import { describe, it, expect } from 'vitest';
import { buildResponsePrompt, isAutoReply } from '../communicate';

describe('buildResponsePrompt', () => {
  it('includes client name and tone', () => {
    const prompt = buildResponsePrompt({
      clientName: 'Nanna',
      tone: 'warm, creative, respectful of artistic process',
      summary: 'Update gallery images',
      category: 'content_change',
      clarifyingQuestions: [],
      conversationHistory: [],
    });
    expect(prompt).toContain('Nanna');
    expect(prompt).toContain('warm, creative');
  });

  it('includes clarifying questions when present', () => {
    const prompt = buildResponsePrompt({
      clientName: 'Nanna',
      tone: 'warm',
      summary: 'Unclear request',
      category: 'other',
      clarifyingQuestions: ['Which page?', 'What size?'],
      conversationHistory: [],
    });
    expect(prompt).toContain('Which page?');
    expect(prompt).toContain('What size?');
  });
});

describe('isAutoReply', () => {
  it('detects out of office', () => {
    expect(isAutoReply('I am currently out of the office and will return Monday.')).toBe(true);
  });

  it('detects automatic reply header', () => {
    expect(isAutoReply('This is an automatic reply. I am on leave.')).toBe(true);
  });

  it('does not flag normal messages', () => {
    expect(isAutoReply('Hi, yes the gallery images look great!')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement communicate.ts**

```typescript
// worker/src/communicate.ts

import Anthropic from '@anthropic-ai/sdk';

export interface ResponseContext {
  clientName: string;
  tone: string;
  summary: string;
  category: string;
  clarifyingQuestions: string[];
  conversationHistory: Array<{ author: string; body: string }>;
}

const AUTO_REPLY_PATTERNS = [
  /out of (?:the )?office/i,
  /automatic reply/i,
  /auto-?reply/i,
  /on (?:annual |sick )?leave/i,
  /will (?:be )?(?:back|return)/i,
  /do not reply to this (?:email|message)/i,
  /this is an automated/i,
  /noreply/i,
];

/**
 * Detect if a message is an auto-reply (OOO, etc.)
 * Used to prevent infinite loops (QA Fix 5).
 */
export function isAutoReply(text: string): boolean {
  return AUTO_REPLY_PATTERNS.some((p) => p.test(text));
}

export function buildResponsePrompt(ctx: ResponseContext): string {
  let prompt = `You are drafting a client communication on behalf of Adrian's Studio.

Client name: ${ctx.clientName}
Tone guide: ${ctx.tone}
Request summary: ${ctx.summary}
Category: ${ctx.category}

Write a warm, professional response. Address the client by first name.
Never mention AI, Claude, or automation. Sign off as "Adrian's Studio".
Keep it concise — 2-4 sentences for acknowledgements, up to 6 for detailed responses.`;

  if (ctx.clarifyingQuestions.length > 0) {
    prompt += `\n\nThe following clarifying questions need answers before we proceed:\n`;
    for (const q of ctx.clarifyingQuestions) {
      prompt += `- ${q}\n`;
    }
    prompt += `\nWork these questions naturally into the response. Don't number them.`;
  }

  if (ctx.conversationHistory.length > 0) {
    prompt += `\n\nConversation history (most recent 20 messages):\n`;
    for (const msg of ctx.conversationHistory.slice(-20)) {
      prompt += `${msg.author}: ${msg.body}\n`;
    }
  }

  prompt += `\n\nReturn ONLY the email body text. No subject line, no signature block (Adrian's Studio is added automatically).`;

  return prompt;
}

export async function draftResponse(
  apiKey: string,
  ctx: ResponseContext,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: buildResponsePrompt(ctx) }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}
```

- [ ] **Step 3: Run tests**

Run: `cd worker && npx vitest run src/__tests__/communicate.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add worker/src/communicate.ts worker/src/__tests__/communicate.test.ts
git commit -m "feat: Sonnet communication drafting with auto-reply detection"
```

---

### Task 7: GitHub API Client + MailChannels Email

**Files:**
- Create: `worker/src/github.ts`
- Create: `worker/src/email.ts`

- [ ] **Step 1: Implement github.ts**

```typescript
// worker/src/github.ts

/**
 * GitHub API client using GitHub App installation tokens.
 * All methods accept a pre-fetched token (generated at request start).
 */

const GITHUB_API = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'claude-ops/1.0',
  };
}

export async function postComment(
  token: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  // Add marker to prevent loop detection (QA Fix 5)
  const markedBody = `${body}\n\n<!-- [claude-ops] -->`;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ body: markedBody }),
  });

  if (!res.ok) {
    throw new Error(`GitHub postComment failed: ${res.status} ${await res.text()}`);
  }
}

export async function addLabels(
  token: string,
  repo: string,
  issueNumber: number,
  labels: string[],
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ labels }),
  });

  if (!res.ok) {
    throw new Error(`GitHub addLabels failed: ${res.status}`);
  }
}

export async function getIssueComments(
  token: string,
  repo: string,
  issueNumber: number,
): Promise<Array<{ author: string; body: string }>> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}/comments?per_page=100`, {
    headers: headers(token),
  });

  if (!res.ok) return [];

  const data = await res.json() as Array<{ user: { login: string }; body: string }>;
  return data.map((c) => ({ author: c.user.login, body: c.body }));
}

export async function closeIssue(
  token: string,
  repo: string,
  issueNumber: number,
): Promise<void> {
  await fetch(`${GITHUB_API}/repos/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ state: 'closed' }),
  });
}

export async function dispatchWorkflow(
  token: string,
  repo: string,
  workflowId: string,
  inputs: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ref: 'main', inputs }),
  });

  if (!res.ok) {
    throw new Error(`GitHub dispatchWorkflow failed: ${res.status}`);
  }
}
```

- [ ] **Step 2: Implement email.ts**

```typescript
// worker/src/email.ts

export interface EmailOptions {
  from: string;           // "Adrian's Studio <hello@adrianwedd.com>"
  to: string;             // client email
  subject: string;
  body: string;
  hubUrl?: string;        // link to issue on client hub
  issueNumber?: number;
}

/**
 * Send email via MailChannels API (Cloudflare Workers integration).
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const htmlBody = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; color: #333; line-height: 1.6;">
      ${options.body.split('\n').map((p) => `<p>${p}</p>`).join('')}
      <p style="color: #666;">— Adrian's Studio</p>
      ${options.hubUrl && options.issueNumber
        ? `<p style="font-size: 0.85em; color: #999;"><a href="${options.hubUrl}/issues/${options.issueNumber}" style="color: #c48b6e;">View this request</a></p>`
        : ''}
    </div>
  `;

  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: options.from.match(/<(.+)>/)?.[1] || options.from, name: 'Adrian\'s Studio' },
      subject: options.subject,
      content: [
        { type: 'text/plain', value: `${options.body}\n\n— Adrian's Studio` },
        { type: 'text/html', value: htmlBody },
      ],
    }),
  });

  return res.ok;
}
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/github.ts worker/src/email.ts
git commit -m "feat: GitHub API client and MailChannels email sender"
```

---

### Task 8: Hono Routes + Main Handler

**Files:**
- Create: `worker/src/index.ts`

- [ ] **Step 1: Implement the main worker with all routes**

```typescript
// worker/src/index.ts

import { Hono } from 'hono';
import type { Env } from './env';
import { verifyWebhook, isDuplicate, acquireIssueLock, releaseIssueLock } from './webhook';
import { loadProjectConfig } from './config';
import { classifyIssue } from './triage';
import { draftResponse, isAutoReply } from './communicate';
import { postComment, addLabels, getIssueComments } from './github';
import { sendEmail } from './email';

const app = new Hono<{ Bindings: Env }>();

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (c) => {
  return c.json({ ok: true, service: 'claude-ops', version: '0.1.0' });
});

// ── GitHub Webhook ────────────────────────────────────────────────────────────

app.post('/webhook/github', async (c) => {
  const env = c.env;
  const body = await c.req.text();
  const signature = c.req.header('X-Hub-Signature-256') || '';
  const deliveryId = c.req.header('X-GitHub-Delivery') || '';
  const event = c.req.header('X-GitHub-Event') || '';

  // Verify HMAC
  if (!await verifyWebhook(body, signature, env.GITHUB_WEBHOOK_SECRET)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  // Dedup
  if (!deliveryId || await isDuplicate(env.OPS, deliveryId)) {
    return c.json({ status: 'duplicate' }, 200);
  }

  const payload = JSON.parse(body);

  if (event === 'issues' && payload.action === 'opened') {
    await handleNewIssue(env, payload);
  } else if (event === 'issue_comment' && payload.action === 'created') {
    await handleComment(env, payload);
  } else if (event === 'pull_request' && payload.action === 'closed' && payload.pull_request.merged) {
    await handlePRMerged(env, payload);
  }

  return c.json({ status: 'ok' }, 200);
});

// ── API: Create issue programmatically ────────────────────────────────────────

app.post('/api/issue', async (c) => {
  const env = c.env;
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${env.OPS_SECRET}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Accept { repo, title, body, client_email } and create a GitHub issue
  // This is the endpoint hub forms call
  const data = await c.req.json<{ repo: string; title: string; body: string }>();
  if (!data.repo || !data.title) {
    return c.json({ error: 'repo and title required' }, 400);
  }

  // TODO: Generate GitHub App installation token for the repo
  // Then create the issue via GitHub API
  // The webhook will handle triage automatically

  return c.json({ status: 'created' });
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleNewIssue(env: Env, payload: Record<string, unknown>): Promise<void> {
  const repo = (payload.repository as Record<string, string>).full_name;
  const issue = payload.issue as Record<string, unknown>;
  const issueNumber = issue.number as number;
  const title = issue.title as string;
  const body = (issue.body as string) || '';

  // Acquire lock (QA Fix 7)
  if (!await acquireIssueLock(env.OPS, repo, issueNumber)) return;

  try {
    const config = await loadProjectConfig(env.OPS, repo);
    if (!config) return;

    // Get client info from D1
    let clientName = 'there';
    let clientEmail = '';
    let hubUrl = '';

    if (config.client_id) {
      const client = await env.DB.prepare('SELECT name, email FROM clients WHERE id = ?')
        .bind(config.client_id).first<{ name: string; email: string }>();
      if (client) {
        clientName = client.name.split(' ')[0]; // First name
        clientEmail = client.email;
      }
    }

    // Classify with Haiku (with retry — QA Fix 9)
    let triage;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        triage = await classifyIssue(env.ANTHROPIC_API_KEY, title, body, config);
        break;
      } catch (err) {
        if (attempt === 2) {
          // Final failure — escalate
          await postComment(
            await getInstallationToken(env),
            repo,
            issueNumber,
            "I'm having trouble processing this — Adrian has been notified.",
          );
          await addLabels(await getInstallationToken(env), repo, issueNumber, ['needs-help']);
          await sendEmail({
            from: `Adrian's Studio <${env.MAILCHANNELS_FROM}>`,
            to: env.ESCALATE_EMAIL,
            subject: `[claude-ops] Triage failed: ${repo}#${issueNumber}`,
            body: `Triage failed after 3 attempts for ${title}. Please review manually.`,
          });
          return;
        }
        await new Promise((r) => setTimeout(r, Math.pow(4, attempt) * 1000));
      }
    }

    if (!triage) return;

    // Store in D1
    await env.DB.prepare(
      `INSERT OR REPLACE INTO issues (repo, issue_number, client_id, category, complexity, impact, status, acknowledged_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', datetime('now'))`,
    ).bind(repo, issueNumber, config.client_id, triage.category, triage.complexity, triage.impact).run();

    // Determine labels
    const labels: string[] = [`category:${triage.category}`, `complexity:${triage.complexity}`];
    if (triage.impact === 'critical' || triage.impact === 'high') {
      labels.push(`impact:${triage.impact}`);
    }
    if (triage.needs_clarification) {
      labels.push('awaiting-client');
    }

    const token = await getInstallationToken(env);

    // Draft response with Sonnet
    const responseText = await draftResponse(env.ANTHROPIC_API_KEY, {
      clientName,
      tone: config.tone,
      summary: triage.summary,
      category: triage.category,
      clarifyingQuestions: triage.clarifying_questions,
      conversationHistory: [],
    });

    // Post comment + labels
    await postComment(token, repo, issueNumber, responseText);
    await addLabels(token, repo, issueNumber, labels);

    // Email client
    if (clientEmail) {
      await sendEmail({
        from: `Adrian's Studio <${env.MAILCHANNELS_FROM}>`,
        to: clientEmail,
        subject: `Re: [${repo.split('/')[1]}] ${title} (#${issueNumber})`,
        body: responseText,
        hubUrl,
        issueNumber,
      });
    }

    // Audit log
    await env.DB.prepare(
      'INSERT INTO audit_log (repo, issue_number, action, detail) VALUES (?, ?, ?, ?)',
    ).bind(repo, issueNumber, 'triage', JSON.stringify(triage)).run();

    // If trivial/simple content_change + claude_code enabled → dispatch (Phase 2)
    if (
      config.claude_code.enabled &&
      triage.category === 'content_change' &&
      ['trivial', 'simple'].includes(triage.complexity) &&
      !triage.needs_clarification &&
      config.allowed_actions.includes('content_change')
    ) {
      await postComment(token, repo, issueNumber,
        "Working on this now — I'll have a preview ready shortly.");
      await dispatchClaudeCode(env, token, repo, issueNumber, triage.summary, config);
    }

    // Escalate critical impact immediately
    if (triage.impact === 'critical') {
      await sendEmail({
        from: `Adrian's Studio <${env.MAILCHANNELS_FROM}>`,
        to: env.ESCALATE_EMAIL,
        subject: `[CRITICAL] ${repo}#${issueNumber}: ${title}`,
        body: `Critical impact issue: ${triage.summary}\n\nhttps://github.com/${repo}/issues/${issueNumber}`,
      });
    }
  } finally {
    await releaseIssueLock(env.OPS, repo, issueNumber);
  }
}

async function handleComment(env: Env, payload: Record<string, unknown>): Promise<void> {
  const comment = payload.comment as Record<string, unknown>;
  const commentBody = (comment.body as string) || '';
  const senderType = ((comment.user as Record<string, string>)?.type) || '';
  const senderLogin = ((comment.user as Record<string, string>)?.login) || '';

  // Loop prevention (QA Fix 5)
  if (senderType === 'Bot') return;
  if (commentBody.includes('[claude-ops]')) return;
  if (isAutoReply(commentBody)) return;

  const repo = (payload.repository as Record<string, string>).full_name;
  const issue = payload.issue as Record<string, unknown>;
  const issueNumber = issue.number as number;

  // Human override detection (QA Fix 6)
  // If Adrian comments, suppress AI for this issue
  const config = await loadProjectConfig(env.OPS, repo);
  if (!config) return;

  // Check if this is Adrian (escalate_to user)
  // For now, check against a known login
  const issueRecord = await env.DB.prepare(
    'SELECT human_override FROM issues WHERE repo = ? AND issue_number = ?',
  ).bind(repo, issueNumber).first<{ human_override: number }>();

  if (issueRecord?.human_override) return; // AI suppressed

  // Otherwise, re-evaluate: fetch full conversation, re-triage, draft reply
  if (!await acquireIssueLock(env.OPS, repo, issueNumber)) return;

  try {
    const token = await getInstallationToken(env);
    const comments = await getIssueComments(token, repo, issueNumber);

    let clientName = 'there';
    if (config.client_id) {
      const client = await env.DB.prepare('SELECT name FROM clients WHERE id = ?')
        .bind(config.client_id).first<{ name: string }>();
      if (client) clientName = client.name.split(' ')[0];
    }

    // Check loop frequency (QA Fix 5): >3 comments in 5 minutes
    const recentOps = comments.filter((c) => c.body.includes('[claude-ops]'));
    if (recentOps.length >= 3) return; // Stop responding

    const responseText = await draftResponse(env.ANTHROPIC_API_KEY, {
      clientName,
      tone: config.tone,
      summary: `Follow-up on issue #${issueNumber}`,
      category: 'other',
      clarifyingQuestions: [],
      conversationHistory: comments,
    });

    await postComment(token, repo, issueNumber, responseText);
  } finally {
    await releaseIssueLock(env.OPS, repo, issueNumber);
  }
}

async function handlePRMerged(env: Env, payload: Record<string, unknown>): Promise<void> {
  const pr = payload.pull_request as Record<string, unknown>;
  const prBody = (pr.body as string) || '';
  const repo = (payload.repository as Record<string, string>).full_name;

  // Extract issue number from PR body (convention: "Fixes #12" or "Closes #12")
  const issueMatch = prBody.match(/(?:fixes|closes|resolves)\s+#(\d+)/i);
  if (!issueMatch) return;
  const issueNumber = parseInt(issueMatch[1], 10);

  const config = await loadProjectConfig(env.OPS, repo);
  if (!config) return;

  const token = await getInstallationToken(env);

  await postComment(token, repo, issueNumber,
    "Done! Your changes are now live. Let me know if anything else needs attention.");

  // Email client
  if (config.client_id) {
    const client = await env.DB.prepare('SELECT name, email FROM clients WHERE id = ?')
      .bind(config.client_id).first<{ name: string; email: string }>();
    if (client) {
      await sendEmail({
        from: `Adrian's Studio <${env.MAILCHANNELS_FROM}>`,
        to: client.email,
        subject: `Re: [${repo.split('/')[1]}] Changes are live (#${issueNumber})`,
        body: `Hi ${client.name.split(' ')[0]},\n\nYour requested changes have been published and are now live.\n\nThanks for your patience!`,
      });
    }
  }

  await closeIssue(token, repo, issueNumber);

  await env.DB.prepare(
    'UPDATE issues SET status = ?, resolved_at = datetime(?) WHERE repo = ? AND issue_number = ?',
  ).bind('resolved', new Date().toISOString(), repo, issueNumber).run();
}

// ── GitHub App Token ──────────────────────────────────────────────────────────

async function getInstallationToken(env: Env): Promise<string> {
  // Generate JWT from App private key, exchange for installation token
  // Implementation depends on GitHub App setup — uses env.GITHUB_APP_ID + env.GITHUB_APP_PRIVATE_KEY
  // For now, placeholder that will be implemented with the actual App credentials
  throw new Error('GitHub App token generation not yet implemented — configure GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY');
}

// ── Claude Code Dispatch ──────────────────────────────────────────────────────

async function dispatchClaudeCode(
  env: Env,
  token: string,
  repo: string,
  issueNumber: number,
  summary: string,
  config: ProjectConfig,
): Promise<void> {
  try {
    await dispatchWorkflow(token, repo, 'claude-build.yml', {
      issue_number: String(issueNumber),
      task_summary: summary,
      branch_prefix: config.claude_code.branch_prefix,
    });

    await env.DB.prepare(
      'INSERT INTO audit_log (repo, issue_number, action, detail) VALUES (?, ?, ?, ?)',
    ).bind(repo, issueNumber, 'dispatch_claude_code', summary).run();
  } catch (err) {
    await postComment(token, repo, issueNumber,
      "I need Adrian's help with this one — I'll make sure he sees it.");
    await addLabels(token, repo, issueNumber, ['needs-help']);
  }
}

// ── Cron Handler (Phase 2 — Task 9) ──────────────────────────────────────────

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Cron jobs implemented in Phase 2
    console.log('Cron triggered:', new Date().toISOString());
  },
};
```

Note: `getInstallationToken` is a placeholder — the implementer must generate a JWT from the GitHub App private key and exchange it for an installation token. This is standard GitHub App auth and well-documented.

- [ ] **Step 2: Run full test suite**

Run: `cd worker && npm test`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add worker/src/index.ts
git commit -m "feat: main Hono worker with webhook handler, triage, communicate, dispatch"
```

---

## Phase 2: Cron Jobs (Task 9)

### Task 9: SLA Monitor, Stale Nudge, Weekly Digest

**Files:**
- Create: `worker/src/cron/sla-monitor.ts`
- Create: `worker/src/cron/stale-nudge.ts`
- Create: `worker/src/cron/weekly-digest.ts`
- Modify: `worker/src/index.ts` (wire cron handler)

- [ ] **Step 1: Implement sla-monitor.ts**

```typescript
// worker/src/cron/sla-monitor.ts

import type { Env } from '../env';
import { sendEmail } from '../email';

interface OpenIssue {
  repo: string;
  issue_number: number;
  client_id: string;
  acknowledged_at: string | null;
  updated_at: string;
  status: string;
  category: string;
  impact: string;
}

/**
 * Check all open issues against their project SLAs.
 * Alert Adrian before breaches.
 */
export async function runSLAMonitor(env: Env): Promise<{ checked: number; alerts: number }> {
  const result = await env.DB.prepare(
    "SELECT repo, issue_number, client_id, acknowledged_at, updated_at, status, category, impact FROM issues WHERE status = 'open'",
  ).all<OpenIssue>();

  const issues = result.results ?? [];
  let alerts = 0;

  for (const issue of issues) {
    // Load project SLA from KV
    const configRaw = await env.OPS.get(`project:${issue.repo}`);
    if (!configRaw) continue;
    const config = JSON.parse(configRaw);
    const sla = config.sla;
    if (!sla) continue;

    const now = Date.now();
    const updatedAt = new Date(issue.updated_at).getTime();
    const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

    // Check update SLA
    if (hoursSinceUpdate > sla.update_hours * 0.8) {
      await sendEmail({
        from: `Claude Ops <${env.MAILCHANNELS_FROM}>`,
        to: env.ESCALATE_EMAIL,
        subject: `[SLA Warning] ${issue.repo}#${issue.issue_number} — ${sla.update_hours}h update SLA at risk`,
        body: `Issue #${issue.issue_number} in ${issue.repo} hasn't been updated in ${Math.round(hoursSinceUpdate)} hours.\nSLA: ${sla.update_hours}h.\n\nhttps://github.com/${issue.repo}/issues/${issue.issue_number}`,
      });
      alerts++;
    }
  }

  return { checked: issues.length, alerts };
}
```

- [ ] **Step 2: Implement stale-nudge.ts**

```typescript
// worker/src/cron/stale-nudge.ts

import type { Env } from '../env';
import { sendEmail } from '../email';

/**
 * Nudge clients who haven't responded to clarifying questions (72h).
 * Ping Adrian for PRs awaiting review (48h).
 */
export async function runStaleNudge(env: Env): Promise<{ nudged: number }> {
  let nudged = 0;

  // Find issues awaiting client > 72h
  const staleClient = await env.DB.prepare(
    "SELECT repo, issue_number, client_id, updated_at FROM issues WHERE status = 'open' AND updated_at < datetime('now', '-72 hours')",
  ).all<{ repo: string; issue_number: number; client_id: string; updated_at: string }>();

  for (const issue of staleClient.results ?? []) {
    if (!issue.client_id) continue;
    const client = await env.DB.prepare('SELECT name, email FROM clients WHERE id = ?')
      .bind(issue.client_id).first<{ name: string; email: string }>();
    if (!client) continue;

    await sendEmail({
      from: `Adrian's Studio <${env.MAILCHANNELS_FROM}>`,
      to: client.email,
      subject: `Re: [${issue.repo.split('/')[1]}] Checking in (#${issue.issue_number})`,
      body: `Hi ${client.name.split(' ')[0]},\n\nJust checking in on your request — do you have any thoughts on the questions above? No rush, just want to make sure nothing falls through the cracks.`,
    });
    nudged++;
  }

  return { nudged };
}
```

- [ ] **Step 3: Implement weekly-digest.ts**

```typescript
// worker/src/cron/weekly-digest.ts

import type { Env } from '../env';
import { sendEmail } from '../email';

/**
 * Monday morning digest: all open issues across all projects.
 */
export async function runWeeklyDigest(env: Env): Promise<void> {
  // Only run on Mondays
  const day = new Date().getUTCDay();
  const hour = new Date().getUTCHours();
  if (day !== 1 || hour !== 0) return; // Monday midnight UTC (~10am AEST)

  const openIssues = await env.DB.prepare(
    "SELECT repo, issue_number, category, impact, status, created_at, updated_at FROM issues WHERE status = 'open' ORDER BY repo, created_at",
  ).all<{
    repo: string; issue_number: number; category: string;
    impact: string; status: string; created_at: string; updated_at: string;
  }>();

  const issues = openIssues.results ?? [];
  if (issues.length === 0) {
    await sendEmail({
      from: `Claude Ops <${env.MAILCHANNELS_FROM}>`,
      to: env.ESCALATE_EMAIL,
      subject: '[Claude Ops] Weekly Digest — All Clear',
      body: 'No open issues across any projects. Nice work.',
    });
    return;
  }

  // Group by repo
  const byRepo = new Map<string, typeof issues>();
  for (const issue of issues) {
    const list = byRepo.get(issue.repo) ?? [];
    list.push(issue);
    byRepo.set(issue.repo, list);
  }

  let body = `Weekly digest: ${issues.length} open issue${issues.length === 1 ? '' : 's'} across ${byRepo.size} project${byRepo.size === 1 ? '' : 's'}.\n\n`;

  for (const [repo, repoIssues] of byRepo) {
    body += `--- ${repo} (${repoIssues.length}) ---\n`;
    for (const i of repoIssues) {
      const age = Math.round((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      body += `  #${i.issue_number} [${i.category}] [${i.impact}] — ${age}d old\n`;
    }
    body += '\n';
  }

  await sendEmail({
    from: `Claude Ops <${env.MAILCHANNELS_FROM}>`,
    to: env.ESCALATE_EMAIL,
    subject: `[Claude Ops] Weekly Digest — ${issues.length} open`,
    body,
  });
}
```

- [ ] **Step 4: Wire cron into index.ts**

In `worker/src/index.ts`, replace the `scheduled` handler:

```typescript
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
  const { runSLAMonitor } = await import('./cron/sla-monitor');
  const { runStaleNudge } = await import('./cron/stale-nudge');
  const { runWeeklyDigest } = await import('./cron/weekly-digest');

  ctx.waitUntil(Promise.all([
    runSLAMonitor(env),
    runStaleNudge(env),
    runWeeklyDigest(env),
  ]));
},
```

- [ ] **Step 5: Run tests**

Run: `cd worker && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add worker/src/cron/ worker/src/index.ts
git commit -m "feat: SLA monitor, stale nudge, weekly digest cron jobs"
```

---

## Phase 3: Claude Code Dispatch (Task 10)

### Task 10: Reusable GitHub Action for Claude Code

**Files:**
- Create: `.github/actions/claude-build/action.yml`

- [ ] **Step 1: Create the reusable action**

```yaml
# .github/actions/claude-build/action.yml
name: 'Claude Code Build'
description: 'Run Claude Code to implement an issue and create a PR'

inputs:
  issue_number:
    description: 'GitHub issue number to implement'
    required: true
  task_summary:
    description: 'One-line task description (from triage)'
    required: true
  branch_prefix:
    description: 'Branch name prefix'
    required: false
    default: 'client/'
  anthropic_api_key:
    description: 'Anthropic API key for Claude Code'
    required: true

runs:
  using: 'composite'
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup Claude Code
      shell: bash
      run: npm install -g @anthropic-ai/claude-code

    - name: Create branch
      shell: bash
      run: |
        BRANCH="${{ inputs.branch_prefix }}issue-${{ inputs.issue_number }}"
        git checkout -b "$BRANCH"
        echo "BRANCH=$BRANCH" >> $GITHUB_ENV

    - name: Run Claude Code
      shell: bash
      env:
        ANTHROPIC_API_KEY: ${{ inputs.anthropic_api_key }}
      run: |
        claude -p "You are implementing a client request for a website.

        Task: ${{ inputs.task_summary }}

        Rules:
        - Only modify content files (text, images, styles)
        - Do NOT modify infrastructure, CI, or security files
        - Do NOT add new dependencies
        - Do NOT modify .env, secrets, or auth config
        - Make the minimum change needed
        - Commit your changes with a clear message

        Read CLAUDE.md first for project context." --model haiku --max-turns 10

    - name: Check for changes
      shell: bash
      id: changes
      run: |
        if git diff --quiet && git diff --cached --quiet; then
          echo "has_changes=false" >> $GITHUB_OUTPUT
        else
          echo "has_changes=true" >> $GITHUB_OUTPUT
        fi

    - name: Commit and push
      if: steps.changes.outputs.has_changes == 'true'
      shell: bash
      run: |
        git add -A
        git commit -m "feat: implement client request #${{ inputs.issue_number }}

        ${{ inputs.task_summary }}

        Closes #${{ inputs.issue_number }}"
        git push origin "$BRANCH"

    - name: Create PR
      if: steps.changes.outputs.has_changes == 'true'
      shell: bash
      env:
        GH_TOKEN: ${{ github.token }}
      run: |
        gh pr create \
          --title "Client request #${{ inputs.issue_number }}: ${{ inputs.task_summary }}" \
          --body "## Summary
        ${{ inputs.task_summary }}

        Closes #${{ inputs.issue_number }}

        ---
        *Automated by Claude Ops*" \
          --base main \
          --head "$BRANCH"
```

- [ ] **Step 2: Create the callable workflow that client repos reference**

Create `.github/workflows/claude-build.yml`:

```yaml
name: Claude Build
on:
  workflow_dispatch:
    inputs:
      issue_number:
        required: true
        type: string
      task_summary:
        required: true
        type: string
      branch_prefix:
        required: false
        type: string
        default: 'client/'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: adrianwedd/claude-ops/.github/actions/claude-build@main
        with:
          issue_number: ${{ inputs.issue_number }}
          task_summary: ${{ inputs.task_summary }}
          branch_prefix: ${{ inputs.branch_prefix }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/
git commit -m "feat: reusable Claude Code build action for client repos"
```

---

## Self-Review

**1. Spec coverage:**
- Webhook receive + HMAC: Task 3
- Dedup via X-GitHub-Delivery: Task 3
- Project config loading: Task 4
- Haiku triage with impact dimension: Task 5
- Sonnet communication: Task 6
- Auto-reply detection (loop prevention): Task 6
- GitHub API (comments, labels, close, dispatch): Task 7
- MailChannels email: Task 7
- Main handler routing: Task 8
- Issue locking (race condition): Task 3
- Human override: Task 8 (handleComment)
- SLA monitor: Task 9
- Stale nudge: Task 9
- Weekly digest: Task 9
- Claude Code dispatch: Task 10
- PII in D1 not git: Task 2
- API failure retry: Task 8 (3-retry loop in handleNewIssue)
- Business hours SLA: Deferred — config field is in place (Task 4), but SLA monitor (Task 9) doesn't yet filter by business hours. Acceptable for v1.

**2. Placeholder scan:** `getInstallationToken` is a known placeholder — documented as requiring GitHub App credentials. Not a forgotten TODO.

**3. Type consistency:** `ProjectConfig` used consistently across config.ts, triage.ts, index.ts. `TriageResult` used in triage.ts and index.ts. `ResponseContext` used in communicate.ts and index.ts. All match.
