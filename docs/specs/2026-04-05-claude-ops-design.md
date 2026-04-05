# Claude Ops: AI-Powered Client Issue Desk

## Problem

Adrian manages multiple client projects (nannabayer, clutterbusters, evolve-chiropractic-care, etc.) across separate repos. Clients need a way to submit requests, get fast acknowledgement, and track progress — without needing technical knowledge or GitHub accounts. Currently, requests come in via scattered channels (email, phone, forms) with no structured triage, no SLA tracking, and no automation.

The goal: a central AI-powered service that receives client requests from any project, triages them intelligently, communicates beautifully on Adrian's behalf, and for simple changes, prototypes and creates PRs automatically.

## Architecture

### System Overview

```
Client submits form on their hub (nannabayer, clutterbusters, etc.)
        ↓
Hub creates GitHub Issue in client's repo (via GitHub API)
        ↓
GitHub webhook fires → claude-ops Worker
        ↓
Worker: load project config → classify with Haiku
        ↓
    ┌───┴────────────────────────────┐
    ↓                                ↓
Communication path              Code path
(95% of issues)                 (5% of issues)
    ↓                                ↓
Sonnet drafts reply             Dispatch GitHub Action
    ↓                                ↓
Post comment on issue           Claude Code: branch, implement, PR
    ↓                                ↓
Email client via MailChannels   Post PR link on issue, email client
        ↓
Cron: SLA monitor, stale nudge, weekly digest
```

### Three Components

1. **claude-ops Worker** — Hono + KV + D1 Cloudflare Worker. Webhook receiver, triage engine, email sender, cron handler. The brain. Deployed at `ops.adrianwedd.com` or `ops.adrianwedd.workers.dev`.

2. **Project configs** — `projects/*.json` files in the claude-ops repo. Per-project: repo, client details, tone guide, SLA, allowed actions, escalation rules. Loaded into KV at deploy time.

3. **Shared GitHub Action** — Reusable workflow in claude-ops repo that client repos reference. Triggered via `workflow_dispatch` by the Worker when code changes are needed. Checks out the client repo, runs Claude Code, creates PR.

### New Repo: `adrianwedd/claude-ops`

```
claude-ops/
  worker/
    src/
      index.ts              # Hono routes: webhook, API, health
      triage.ts             # Haiku classification pipeline
      communicate.ts        # Sonnet response drafting + email
      dispatch.ts           # Claude Code dispatch via workflow_dispatch
      cron/
        sla-monitor.ts      # SLA breach detection + alerts
        stale-nudge.ts      # Follow-up on quiet issues
        weekly-digest.ts    # Monday summary email
      github.ts             # GitHub API client (issues, comments, PRs, labels)
      email.ts              # MailChannels integration
      config.ts             # Project config loader (KV-backed)
    wrangler.toml
    package.json
    tsconfig.json
    src/__tests__/
  projects/
    nannabayer.json
    clutterbusters.json
    evolve-chiropractic.json
    _template.json
    _inbox.json             # catch-all config for unknown clients
  .github/
    actions/
      claude-build/
        action.yml          # Reusable action: checkout, claude code, PR
    workflows/
      deploy.yml            # Deploy worker on push
  CLAUDE.md
  AGENTS.md
```

## Triage Pipeline

When the Worker receives a `issues.opened` webhook:

### Step 1: Identify Project

Match `repository.full_name` from webhook payload against project configs in KV. If unknown repo, route to `_inbox` config (catch-all for new clients).

### Step 2: Classify with Haiku

Send issue title + body + project context summary to Claude Haiku. Returns:

```json
{
  "category": "content_change | bug_report | feature_request | question | billing | other",
  "complexity": "trivial | simple | complex",
  "needs_clarification": true,
  "clarifying_questions": ["What page should this appear on?"],
  "summary": "Client wants to update their phone number on the contact page"
}
```

### Step 3: Route

| Category | Complexity | Action |
|----------|-----------|--------|
| content_change | trivial/simple | Acknowledge → dispatch Claude Code → PR |
| content_change | complex | Acknowledge → clarify → label `awaiting-client` |
| bug_report | any | Acknowledge → label `bug` → notify Adrian |
| feature_request | any | Acknowledge → clarify scope → label `enhancement` → notify Adrian |
| question | any | Draft answer from CLAUDE.md context → post → close if resolved |
| needs_clarification | any | Post clarifying questions → label `awaiting-client` |

### Step 4: Draft Response with Sonnet

Client-facing replies are written by Sonnet (not Haiku) using the project's tone guide from the config. The response must be warm, professional, and specific. Not generic chatbot language.

### Step 5: Post + Email

Comment on the GitHub issue (record of truth) AND send email to client via MailChannels (their interface).

## Project Config

Each client project gets a JSON config file:

```json
{
  "repo": "adrianwedd/nannabayer",
  "client": {
    "name": "Nanna Bayer",
    "email": "nanna@example.com",
    "language": "en"
  },
  "tone": "warm, creative, respectful of artistic process",
  "sla": {
    "acknowledge_minutes": 5,
    "update_hours": 24,
    "resolve_hours": 72
  },
  "allowed_actions": ["content_change", "image_swap", "text_edit"],
  "escalate_to": "adrian@adrianwedd.com",
  "hub_url": "https://nannabayer.adrianwedd.com",
  "claude_code": {
    "enabled": true,
    "branch_prefix": "client/",
    "auto_pr": true,
    "auto_merge": false
  }
}
```

### Config Fields

- **repo:** GitHub `owner/name` for webhook matching
- **client.name / email / language:** For email personalization
- **tone:** Guides Sonnet's response style. Short phrase the LLM uses as a style constraint.
- **sla:** Response time commitments. `acknowledge_minutes` = time to first reply. `update_hours` = max silence between updates. `resolve_hours` = target resolution time.
- **allowed_actions:** What Claude Code can do autonomously. Anything outside this list gets escalated.
- **escalate_to:** Email for urgent notifications and SLA breach alerts.
- **hub_url:** Included in emails so clients can view their issues.
- **claude_code:** Controls the code dispatch tier. `enabled: false` means triage + communication only.

### New Clients (No Repo)

When a request comes from an unknown source (form submission with no matching project config):
- Issue created in a shared `adrianwedd/client-inbox` repo
- Labelled `new-client`
- Warm acknowledgement email: "Thanks for reaching out, I'll be in touch shortly"
- Immediate notification to Adrian (this is a sales lead)
- No triage, no Claude Code dispatch — capture and notify only

## Communication Layer

### Outbound (Worker → Client)

1. **GitHub issue comment** — the record of truth
2. **Email via MailChannels** — the client's interface
3. Email includes: issue number, summary, questions or status update, link to their hub

### Email Template

```
From: Adrian Wedd <hello@adrianwedd.com>
Subject: Re: [{project}] {issue title} (#{number})

Hi {client.name},

{sonnet_drafted_body}

— Adrian's Studio

---
View this request: {hub_url}/issues/{number}
```

The client sees "Adrian's Studio", not "Claude" or "AI". The tone matches the project config.

### Inbound (Client → Worker)

- **Hub form** — creates GitHub issue directly via API. Each hub gets a "Request" form.
- **Email reply** — client replies to notification email. GitHub's built-in email reply posts it as an issue comment. Worker picks it up via `issue_comment.created` webhook.
- **Hub issue view** — client comments via their hub's issues page, same webhook fires.

### Webhook Events

| Event | Trigger | Worker Action |
|-------|---------|---------------|
| `issues.opened` | New request | Full triage pipeline |
| `issue_comment.created` | Client replied | Re-evaluate: answer follow-up, mark clarified, or dispatch |
| `pull_request.opened` | Claude Code created PR | Post PR link on issue, email client preview |
| `pull_request.closed` (merged) | Adrian merged PR | Post "Changes are live!", email confirmation, close issue |

## Claude Code Dispatch (Tier 2)

When triage classifies an issue as `content_change` with `trivial` or `simple` complexity, and the action is in `allowed_actions`:

### Dispatch Flow

1. Worker posts comment: "Working on this now — I'll have a preview ready shortly."
2. Worker triggers GitHub Action in client's repo via `workflow_dispatch` API
3. The Action:
   - Checks out the repo
   - Runs Claude Code: `claude -p "Implement: {title}\n{body}\nContext: {CLAUDE.md summary}" --model haiku`
   - Creates branch (`client/issue-12-update-gallery`)
   - Commits changes, opens PR linking to the issue
4. Worker detects PR via `pull_request.opened` webhook:
   - Posts PR link on the issue
   - Emails client: "I've prepared the changes for review"
   - Labels issue `awaiting-review`

### On PR Merge

- Worker detects `pull_request.closed` (merged)
- Posts on issue: "Done! Your changes are now live."
- Emails client confirmation
- Closes the issue

### Safety Rails

- Claude Code runs in GitHub Action sandbox — no access to secrets beyond the repo
- `allowed_actions` constrains what gets dispatched
- PRs always require Adrian's review (`auto_merge: false` by default)
- If Claude Code fails or produces no changes: "I need Adrian's help with this one" → escalate
- Branch prefix `client/` makes it easy to identify AI-generated branches

## Cron Jobs

Cloudflare Cron Trigger runs hourly:

### Job 1: SLA Monitor

- Scan all open issues across connected repos (cached issue list in KV, refreshed hourly)
- Check each against project SLA config
- `acknowledge_minutes` about to breach + no comment → alert Adrian immediately
- `update_hours` about to breach + no recent activity → post courtesy update to client ("Still working on this") + notify Adrian

### Job 2: Stale Issue Nudge

- Issues labelled `awaiting-client` with no response in 72 hours → gentle follow-up email to client
- Issues labelled `awaiting-review` (PR ready) with no action from Adrian in 48 hours → ping Adrian

### Job 3: Weekly Digest

- Every Monday: email Adrian a summary of all open issues across all projects
- Grouped by client, colour-coded by SLA status (green/amber/red)
- Includes: issue count, oldest open issue, any SLA breaches

## API Endpoints

The Worker exposes an API so any system can interact:

```
POST /webhook/github          # GitHub webhook receiver
POST /api/issue               # Create issue programmatically (from hub forms, email, etc.)
POST /api/triage              # Manually re-triage an issue
GET  /api/projects            # List connected projects
GET  /api/project/:repo/issues # List issues for a project
GET  /api/health              # Health check + SLA dashboard
```

**Auth:** Bearer token (`OPS_SECRET`) for API endpoints. GitHub webhook uses HMAC signature verification (`GITHUB_WEBHOOK_SECRET`).

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** Hono (TypeScript)
- **State:** KV (project configs, issue cache, idempotency) + D1 (SLA tracking, audit log)
- **AI:** Anthropic SDK — Haiku for classification, Sonnet for client communication
- **Email:** MailChannels (existing pattern from client hubs)
- **Code dispatch:** GitHub Actions `workflow_dispatch` API
- **Testing:** Vitest

## What This Replaces

| Before | After |
|--------|-------|
| Scattered email/phone requests | Structured forms → GitHub issues |
| Manual acknowledgement (hours/days) | Instant AI acknowledgement (<5 min) |
| No SLA tracking | Automated SLA monitoring + alerts |
| Adrian does all triage | AI classifies, clarifies, routes |
| Adrian writes all replies | AI drafts warm, project-aware replies |
| Adrian implements all changes | AI prototypes simple changes via PR |
| No client visibility | Hub shows issue status, email updates |

## Success Criteria

1. Client submits form → acknowledgement email within 5 minutes
2. Simple content change → PR created within 15 minutes
3. Clarifying questions are relevant and project-aware (informed by CLAUDE.md)
4. AI-assisted responses are warm and professional — branded as "Adrian's Studio"
5. SLA breaches are caught before they happen, not after
6. New client requests are captured and forwarded instantly
7. Weekly digest gives Adrian full visibility across all projects
8. Any project can connect by adding a config file — no per-repo code changes needed

## Addendum: QA Findings Applied

From Codex + Gemini + Claude agent spec review (2026-04-05):

### Fix 1: Webhook Replay Protection (Critical)
Every incoming webhook is deduplicated using the `X-GitHub-Delivery` header (a unique GUID per delivery). The Worker stores delivery IDs in KV with a 24-hour TTL. If a delivery ID already exists, the webhook is silently dropped. This prevents duplicate triage, duplicate emails, and duplicate Claude Code dispatches.

### Fix 2: Prompt Injection Defense (Critical)
Issue title and body are NEVER interpolated directly into Claude Code prompts. Instead:
- The triage layer extracts a structured task description (e.g. "Update phone number on contact page to 0412 345 678")
- The Claude Code prompt uses a system message that constrains the task to the `allowed_actions` list
- Raw issue body is passed as a separate `user` message, not concatenated into instructions
- The GitHub Action runs with minimal permissions (contents: write, pull-requests: write — no secrets access)
- Branch protection rules on `main` prevent direct pushes even from the Action

### Fix 3: Idempotency for AI Calls (Critical)
Before calling Haiku or Sonnet, the Worker checks KV for `{delivery_id}:triage_started`. If found, skip. This is set before the first API call. On completion, `{delivery_id}:triage_complete` is set. On partial failure, the cron job detects `started` without `complete` and retries.

### Fix 4: PII Out of Git (Critical)
Client emails and personal details are NOT stored in `projects/*.json` in the repo. Instead:
- Config files contain repo name, tone, SLA, allowed actions (non-sensitive)
- Client PII (name, email) is stored in D1 (`clients` table) and referenced by client ID
- D1 is encrypted at rest and access-controlled via Worker bindings
- This also enables GDPR deletion: `DELETE FROM clients WHERE id = ?`

### Fix 5: Infinite Loop Prevention (Critical)
The Worker ignores comments from:
- GitHub bots (sender type `Bot`)
- Its own user (the GitHub App's identity)
- Comments containing `[claude-ops]` marker (added to all Worker-posted comments)
- Comments from email auto-replies (detect `X-Auto-Reply` header pattern in comment body, or known auto-reply phrases like "out of office", "automatic reply")

If a loop is detected (>3 comments from the same issue in 5 minutes), the Worker stops responding and alerts Adrian.

### Fix 6: Human Override / "Silence" Mode (Critical)
When Adrian posts a comment on an issue manually:
- The Worker detects the comment author matches `escalate_to` config
- It sets a `human_override` flag on the issue in KV
- All future AI responses are suppressed for that issue
- Cron jobs skip `human_override` issues
- To re-enable AI: Adrian adds label `claude-ops:resume`

### Fix 7: Race Condition Mitigation (Important)
The Worker uses KV-based locking per issue:
- On webhook receipt: attempt to SET `lock:{repo}:{issue_number}` with 60-second TTL
- If lock exists: queue the event for retry (KV queue or delayed re-delivery)
- On triage completion: delete the lock
- This prevents concurrent processing of `issues.opened` and `issue_comment.created` for the same issue

### Fix 8: Email Authentication (Important)
Pre-launch checklist includes:
- Verify SPF record for `adrianwedd.com` includes MailChannels IP ranges
- Configure DKIM signing via MailChannels dashboard
- Set DMARC policy to `p=quarantine` (not `reject` initially, to catch misconfigurations)
- Test email deliverability before going live with client-facing emails

### Fix 9: API Failure Recovery (Important)
All AI API calls use a 3-retry loop with exponential backoff (1s, 4s, 16s). On final failure:
- Post a comment: "I'm having trouble processing this — Adrian has been notified."
- Label the issue `needs-help`
- Send immediate alert to `escalate_to` email
- Log the failure to D1 audit table

### Fix 10: Multi-Turn Conversation Context (Important)
When processing `issue_comment.created`, the Worker fetches the full issue body + all previous comments (via GitHub API) and includes them in the Sonnet prompt as conversation history. This ensures the AI doesn't lose context across a multi-turn thread. History is truncated to the most recent 20 comments to stay within token limits.

### Fix 11: GDPR Data Retention (Important)
- D1 `clients` table has a `data_retention_days` column (default: 365)
- Cron job prunes resolved issues older than retention period from D1
- Client can request data export (all their issues as JSON) or deletion
- On client offboarding: delete client row + all associated issue records from D1

### Fix 12: GitHub App Instead of PAT (Important)
Use a GitHub App (not a Personal Access Token) for repo access:
- Install the App on specific repos only (minimal scope)
- Permissions: Issues (read/write), Pull Requests (read/write), Contents (read/write)
- Each installation is scoped to one repo — compromise of one doesn't affect others
- App generates short-lived installation tokens (1 hour expiry)

### Fix 13: Attachment Support (Important)
When an issue body or comment contains image URLs (GitHub auto-uploads attachments as URLs):
- Include the image URLs in the Sonnet prompt for visual context
- For Claude Code dispatch: download attachments and include them in the working directory
- If attachments are critical to understanding (e.g. screenshot of a bug): flag in triage as `has_attachments` and prioritize visual review

### Fix 14: Business Hours SLA (Important)
Project config gains an optional `business_hours` field:
```json
"business_hours": {
  "timezone": "Australia/Melbourne",
  "start": "09:00",
  "end": "17:00",
  "days": [1, 2, 3, 4, 5]
}
```
SLA timers pause outside business hours. Cron job adjusts breach calculations accordingly. If not set, SLA is 24/7 (default for always-on clients).

### Fix 15: Priority/Impact Dimension (Important)
Haiku classification output gains an `impact` field:
```json
{
  "category": "bug_report",
  "complexity": "trivial",
  "impact": "high",
  "summary": "Price displays as $0 on pricing page"
}
```
Impact is `low | medium | high | critical`. A trivial bug with critical impact (site-down, wrong pricing) gets escalated immediately regardless of complexity. Labels reflect both: `complexity:trivial` + `impact:critical`.

### Deferred (Not Critical for v1)
- AI transparency toggle per project config (clients who want to know it's AI-assisted)
- Per-client cost tracking and caps
- Monitoring dashboard for AI classification accuracy
- Attachment analysis via multimodal Claude (images → understanding)
- KV → D1 migration for issue state at scale (50+ projects)
