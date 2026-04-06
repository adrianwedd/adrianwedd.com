# Public Enquiry Form + Chat Interface

## Problem

Adrian's consultancy has no structured intake for new clients on adrianwedd.com. Potential clients email, call, or find him via referral — there's no way to submit a request, get an instant acknowledgement, and track the conversation. The existing `/contact` page has a basic form that sends an email and disappears.

The goal: a public-facing enquiry form on adrianwedd.com that creates a tracked issue in the private claude-ops system, gives the visitor a unique chat URL where they can see responses and reply, and routes through the AI triage pipeline for instant acknowledgement.

## Design

### User Journey

```
1. Visitor arrives at adrianwedd.com/contact (or /enquiry)
2. Fills in: name, email, what they need, budget range (optional)
3. Submits → Turnstile CAPTCHA validates
4. Form POSTs to ops.adrianwedd.com/api/enquiry
5. Worker creates issue in adrianwedd/client-inbox repo
6. Worker generates a session token (UUID), stores in KV: token → {repo, issue_number, name, email}
7. Worker returns { token, issue_number }
8. Browser redirects to adrianwedd.com/enquiry/{token}
9. Chat page loads — shows the visitor's original message as first bubble
10. Within ~60 seconds: AI response appears (right-aligned, "Adrian's Agentic Team")
11. Visitor can type replies — POSTed to ops API, posted as GitHub comments
12. Visitor bookmarks the URL or gets it via email — can return anytime
13. Adrian sees the issue on GitHub, can reply there (shows in chat as "Adrian's Agentic Team")
```

### Components

**1. Enquiry Form (adrianwedd.com)**

A new page at `src/pages/contact.astro` (replace or augment existing contact page) with:

- Name (required)
- Email (required)
- What do you need? (textarea, required)
- Budget range (optional select: "Not sure", "Under $1k", "$1k–$5k", "$5k–$15k", "$15k+")
- Project type (optional select: "New website", "Redesign", "CMS/content", "Automation", "Other")
- Cloudflare Turnstile CAPTCHA (invisible or managed)

On submit: POST to `ops.adrianwedd.com/api/enquiry`, redirect to `/enquiry/{token}`.

**2. Chat Page (adrianwedd.com)**

A new page at `src/pages/enquiry/[token].astro` with:

- Chat-style conversation view (same pattern as clutterbusters-hub issue.html)
- Left-aligned: visitor messages (original enquiry + replies)
- Right-aligned: team responses (AI or Adrian, branded "Adrian's Agentic Team")
- Reply textarea + send button
- Auto-refresh every 15 seconds
- `[claude-ops]` markers hidden from view
- No authentication required — the token IS the auth (knowledge-based access)
- 404 if token is invalid or expired

**3. Ops API Endpoints (ops.adrianwedd.com)**

New endpoints on the claude-ops worker:

`POST /api/enquiry` — Create a new enquiry
- Validates Turnstile token via Cloudflare API
- Creates GitHub issue in `adrianwedd/client-inbox`
- Generates UUID session token
- Stores in KV: `enquiry:{token}` → `{repo, issue_number, name, email, created_at}` with 90-day TTL
- Stores client email for the webhook handler: `client-email:{repo}:{issue_number}` → `{name, email}`
- Returns `{ token, issue_number }`
- No auth required (public endpoint) — Turnstile is the anti-abuse mechanism

`GET /api/enquiry/:token` — Fetch enquiry conversation
- Looks up token in KV → gets repo + issue_number
- Fetches issue + comments via GitHub API
- Returns `{ issue, comments, client_name }` (filtered — strips [claude-ops] markers)
- Returns 404 if token not found or expired

`POST /api/enquiry/:token/reply` — Post a reply
- Looks up token in KV → gets repo + issue_number
- Posts comment to GitHub issue via GitHub API
- Returns `{ ok: true }`
- Rate limited: max 10 replies per hour per token

### Session Token Model

- Token: UUID v4 (`crypto.randomUUID()`)
- Storage: KV key `enquiry:{token}` with 90-day TTL
- Value: `{ repo: string, issue_number: number, name: string, email: string, created_at: string }`
- Access: knowledge-based — anyone with the token URL can view and reply
- Revocation: delete the KV key (Adrian can do this via wrangler CLI)

### Anti-Abuse

- **Turnstile CAPTCHA** on form submission — blocks bots, invisible to most users
- **Rate limiting** on `/api/enquiry`: max 5 submissions per IP per hour (KV counter with TTL)
- **Rate limiting** on `/api/enquiry/:token/reply`: max 10 replies per hour per token
- **Token expiry**: 90 days — stale enquiries naturally expire
- **Email validation**: basic format check (contains @), not existence check
- **Input sanitization**: all user input HTML-escaped before storage and display

### Email Notifications

When the enquiry is created, the webhook fires and claude-ops handles it:
- Triage with Haiku (classifies as question/feature_request/etc.)
- Draft response with Sonnet (warm, professional)
- Post comment on GitHub issue
- Send email to the visitor with the response + chat URL

Subsequent AI responses also email the visitor with the chat URL, so they can return to the conversation.

### Privacy

- Visitor name and email stored in KV (90-day TTL, auto-expires)
- Also stored in the GitHub issue body (in private repo)
- No cookies set — token is in the URL path
- No tracking — no GA4, no analytics on the chat page
- Visitor can request data deletion via the chat interface (Adrian manually revokes)
- GDPR: enquiry = legitimate interest for business contact

### What Changes

| Component | Current | New |
|-----------|---------|-----|
| adrianwedd.com /contact | Basic email form | Structured enquiry form with Turnstile |
| adrianwedd.com routing | No /enquiry route | `/enquiry/[token]` chat page |
| ops.adrianwedd.com API | `/api/issue` (auth required) | + `/api/enquiry` (public, Turnstile) |
| ops.adrianwedd.com API | — | + `/api/enquiry/:token` (GET/POST) |
| claude-ops KV | delivery dedup, locks, configs | + enquiry session tokens |
| client-inbox repo | Exists (catch-all) | Receives enquiry issues |

### What Stays

- Existing claude-ops triage pipeline (Haiku + Sonnet) — works unchanged
- Existing email via MailChannels — works unchanged
- Existing project configs — client-inbox already has `_inbox.json` config
- Hub chat pattern — reused for the public chat page

### Success Criteria

1. Visitor submits form → receives chat URL within 5 seconds
2. AI acknowledgement appears in chat within 60 seconds
3. Visitor can reply and see responses without any account
4. Chat URL works for 90 days — visitor can bookmark and return
5. Adrian sees all enquiries as GitHub issues in client-inbox
6. Email sent to visitor with each AI response
7. Turnstile blocks bot submissions
8. Invalid/expired tokens return 404, not error details
9. Rate limiting prevents abuse (5 submissions/hr, 10 replies/hr)
10. No PII leaks — token is the only identifier in the URL
