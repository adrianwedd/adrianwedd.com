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
4. Client never sees "AI", "Claude", or robotic language
5. SLA breaches are caught before they happen, not after
6. New client requests are captured and forwarded instantly
7. Weekly digest gives Adrian full visibility across all projects
8. Any project can connect by adding a config file — no per-repo code changes needed
