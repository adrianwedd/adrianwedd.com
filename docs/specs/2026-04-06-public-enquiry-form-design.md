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
6. Worker generates read token + write token (separate UUIDs), stores in KV
7. Worker returns { read_token, write_token, issue_number }
8. Browser redirects to adrianwedd.com/enquiry/{read_token}
9. Chat page loads — shows "Message received! We're reviewing your enquiry..."
   followed by the visitor's original message as first bubble
10. Within ~60 seconds: AI response appears (right-aligned, "Adrian's Agentic Team")
11. Visitor can type replies using the write_token (stored in sessionStorage)
12. Visitor gets ONE email with the chat URL — subsequent responses are in-chat only
13. Adrian sees the issue on GitHub, can reply (shows in chat as "Adrian's Agentic Team")
```

### Components

**1. Enquiry Form (adrianwedd.com)**

A new page at `src/pages/contact.astro` (replace or augment existing contact page) with:

- Name (required)
- Email (required)
- What do you need? (textarea, required)
- Budget range (optional select: "Not sure", "Under $1k", "$1k-$5k", "$5k-$15k", "$15k+")
- Project type (optional select: "New website", "Redesign", "CMS/content", "Automation", "Other")
- Cloudflare Turnstile CAPTCHA (managed mode)
- Idempotency key (hidden field, UUID generated on page load — prevents duplicate submissions)

On submit: POST to `ops.adrianwedd.com/api/enquiry`, redirect to `/enquiry/{read_token}`. Store `write_token` in `sessionStorage` for reply capability.

**2. Chat Page (adrianwedd.com)**

A new page at `src/pages/enquiry/[token].astro` with:

- Chat-style conversation view (same pattern as clutterbusters-hub issue.html)
- Left-aligned: visitor messages (original enquiry + replies)
- Right-aligned: team responses (AI or Adrian, branded "Adrian's Agentic Team")
- Immediate "Message received" system bubble + typing indicator while AI processes
- Reply textarea + send button (only works if `write_token` is in sessionStorage)
- Without write_token: read-only view (can see conversation but not reply)
- Auto-refresh every 15 seconds (non-destructive — preserves input state and scroll)
- `[claude-ops]` markers hidden from view
- 404 if token is invalid or expired

**Security headers on chat page:**
- `Referrer-Policy: no-referrer` (prevents token leaking via Referer to any linked resource)
- `Cache-Control: no-store` (prevents caching of PII-bearing responses)
- `X-Robots-Tag: noindex` (prevents search engine indexing)
- CSP: `default-src 'self'; connect-src 'self' https://ops.adrianwedd.com; img-src 'self'; frame-ancestors 'none'` (no third-party resources that could leak token)

**Accessibility (WCAG):**
- Chat container uses `role="log"` with `aria-live="polite"` for screen reader announcement of new messages
- Reply textarea has visible label
- Focus management: focus moves to new messages on auto-refresh
- Mobile: use `dvh` units for layout, handle virtual keyboard with `visualViewport` API
- Auto-refresh is non-destructive: does not clear textarea, move scroll position, or steal focus

**3. Ops API Endpoints (ops.adrianwedd.com)**

New endpoints on the claude-ops worker:

`POST /api/enquiry` — Create a new enquiry
- Validates Turnstile token via Cloudflare Turnstile API (`https://challenges.cloudflare.com/turnstile/v0/siteverify`), checking `success`, `hostname`, and token freshness
- Checks idempotency key in KV — if already seen, return existing tokens (prevents duplicate submissions)
- Creates GitHub issue in `adrianwedd/client-inbox` (PII in issue body is acceptable — private repo, single owner)
- Generates two UUIDs: `read_token` (view-only) and `write_token` (reply capability)
- Stores in KV: `enquiry:{read_token}` → `{repo, issue_number, name, email, write_token, created_at}` with 90-day TTL
- Stores idempotency key: `enquiry-idem:{key}` → `{read_token, write_token}` with 1-hour TTL
- Stores client email for webhook: `client-email:{repo}:{issue_number}` → `{name, email}`
- Returns `{ read_token, write_token, issue_number }`
- Origin validation: only accept requests from `https://adrianwedd.com`
- Rate limited: max 5 submissions per IP per hour

`GET /api/enquiry/:token` — Fetch enquiry conversation (read-only)
- Looks up token in KV → gets repo + issue_number
- Fetches issue + comments via GitHub API
- **Allowlist projection** (not blocklist): returns only `{ title, body_text, comments: [{author_type, body_text, created_at}], client_name, status }`. Strips all GitHub metadata, labels, internal comments, attachments, URLs. `author_type` is either `"client"` or `"team"` — no GitHub usernames exposed.
- `Cache-Control: no-store` header on response
- Returns 404 if token not found or expired (no error details)

`POST /api/enquiry/:token/reply` — Post a reply
- Validates `write_token` from request body against stored value in KV (separate from URL read_token)
- Origin validation: only accept from `https://adrianwedd.com`
- Checks reply idempotency key (hash of token + body text) — prevents double-submit
- Posts comment to GitHub issue via GitHub API
- Returns `{ ok: true }`
- Rate limited: max 10 replies per hour per token + max 3 replies per minute per IP
- If token has been flagged as abusive (KV `enquiry-abuse:{token}`), return 429

### Token Model

**Read token:** URL-safe UUID. Grants read-only access to the conversation. This is the token in the URL. Acceptable to share — worst case someone reads the conversation.

**Write token:** Separate UUID. Required in POST body to reply. Stored in browser `sessionStorage` (not URL, not cookie). Lost on browser close — visitor must use email link to get a new write token (step-up verification via email).

- Storage: KV key `enquiry:{read_token}` with 90-day TTL
- Value: `{ repo, issue_number, name, email, write_token, created_at }`
- Write token refresh: visitor clicks "Reply" on an expired session → form asks for email → if email matches stored email, new write_token issued and stored in sessionStorage
- Revocation: delete the KV key (wrangler CLI or admin endpoint)
- Abuse flag: set `enquiry-abuse:{read_token}` to block all writes

### Anti-Abuse

- **Turnstile CAPTCHA** on form submission (managed mode, verifying hostname + freshness)
- **Rate limiting — submissions**: max 5 per IP per hour (KV counter `ratelimit:enquiry:{ip}` with 1hr TTL)
- **Rate limiting — replies**: max 10 per hour per token + max 3 per minute per IP
- **Idempotency**: creation and reply both dedup via KV keys
- **Origin validation**: all POST endpoints check `Origin` header against `https://adrianwedd.com`
- **Abuse kill switch**: set `enquiry-abuse:{token}` in KV to block writes for a specific token
- **Token expiry**: 90 days — stale enquiries auto-expire from KV
- **Email format validation**: regex check (not existence verification)
- **Content sanitization**: all user input rendered as plain text in chat (no markdown, no HTML — plain text only, newlines preserved). This eliminates XSS entirely.
- **Input length limits**: name 200 chars, email 254 chars, message 5000 chars, reply 2000 chars

### Email Notifications

- **Initial email only**: ONE email sent to the visitor after enquiry creation, containing the chat URL and a summary. Subsequent responses appear in the chat only — no repeated URL distribution.
- **Email threading**: `In-Reply-To` and `References` headers using `Message-ID: <enquiry-{issue_number}@ops.adrianwedd.com>` for consistent threading.
- **Write token recovery**: if visitor returns to chat URL without sessionStorage write_token, they can request a recovery email (rate limited: 1 per hour). Email contains a one-time link that sets the write_token in sessionStorage.

### Privacy

- Visitor name and email stored in KV (90-day TTL, auto-expires) and GitHub issue body (private repo)
- No cookies set — read token is in URL path, write token in sessionStorage
- No tracking — no GA4, no analytics on chat page
- No third-party resources loaded on chat page (strict CSP)
- `Referrer-Policy: no-referrer` prevents token leaking via HTTP Referer
- **Data deletion**: visitor can request via chat. Adrian deletes: KV entry + GitHub issue (close + delete) + audit log entry. Email copies in MailChannels are transient (not stored).
- **GDPR**: legitimate interest for business enquiry contact. Privacy notice linked on the form page, disclosing: data stored in Cloudflare D1/KV (AU/APAC region), GitHub (US), processed by Anthropic AI for triage. Retention: 90 days unless engagement proceeds.

### Error Handling

- **Form submission fails**: show inline error, preserve form state, allow retry
- **Turnstile fails**: show "Please verify you're human" with retry button
- **API timeout**: show "We're experiencing delays — your enquiry has been saved, we'll email you"
- **Token expired**: show friendly message "This conversation has expired. Please submit a new enquiry." with link to form
- **Token not found**: 404 page, no error details
- **Rate limited**: show "Too many requests — please wait a few minutes"

### What Changes

| Component | Current | New |
|-----------|---------|-----|
| adrianwedd.com /contact | Basic email form | Structured enquiry form with Turnstile |
| adrianwedd.com routing | No /enquiry route | `/enquiry/[token]` chat page |
| ops.adrianwedd.com API | `/api/issue` (auth required) | + `/api/enquiry` (public, Turnstile) |
| ops.adrianwedd.com API | — | + `/api/enquiry/:token` (GET/POST) |
| claude-ops KV | delivery dedup, locks, configs | + enquiry tokens, rate limits, abuse flags |
| client-inbox repo | Exists (catch-all) | Receives enquiry issues |

### What Stays

- Existing claude-ops triage pipeline (Haiku + Sonnet) — works unchanged
- Existing email via MailChannels — works unchanged
- Existing project configs — client-inbox already has `_inbox.json` config
- Hub chat pattern — adapted for public use with stricter security

### Success Criteria

1. Visitor submits form → receives chat URL within 5 seconds
2. Immediate "Message received" bubble, AI response within 60 seconds
3. Visitor can reply (with write token) and see responses without any account
4. Chat URL works for 90 days — visitor can bookmark and return (read-only without write token)
5. Adrian sees all enquiries as GitHub issues in client-inbox
6. ONE email sent to visitor with chat URL (not repeated)
7. Turnstile blocks bot submissions
8. Invalid/expired tokens return 404, not error details
9. Rate limiting prevents abuse (5 submissions/hr, 10 replies/hr)
10. No PII leaks via Referer, cache, or third-party resources
11. Read-only token in URL is separate from write token in sessionStorage
12. Duplicate submissions return existing tokens (idempotent)
13. Plain text rendering — no XSS possible
14. Screen readers announce new messages via aria-live
15. Mobile keyboard doesn't break layout

## Addendum: QA Findings Applied

From Codex (15 findings, 4 critical, 11 high) + Gemini (10 findings):

### Fix 1: Separate read/write tokens (Critical — Codex #1, #3)
Read token (URL) grants view-only. Write token (sessionStorage) required for replies. Leaked URL = readable conversation, not writable. Write token recovery via email verification.

### Fix 2: Allowlist projection on API response (Critical — Codex #2)
GET endpoint returns only allowlisted fields: title, body_text, comments[{author_type, body_text, created_at}], status. No GitHub metadata, usernames, labels, or internal notes exposed.

### Fix 3: Origin validation on all POSTs (Critical — Codex #4)
All POST endpoints validate `Origin: https://adrianwedd.com`. Blocks cross-site form submissions.

### Fix 4: Security headers on chat page (High — Codex #5, #13)
`Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`, strict CSP. Prevents token leaking via Referer, caching, or search indexing.

### Fix 5: PII handling aligned with claude-ops (High — Codex #6)
PII in private repo issue body is acceptable (single owner, private). KV entries auto-expire at 90 days. Not stored in git-tracked files.

### Fix 6: Proper GDPR treatment (High — Codex #7, #8)
Privacy notice on form page. Retention period documented. Deletion process defined (KV + GitHub issue + audit log). AI processing disclosed.

### Fix 7: Enhanced anti-abuse (High — Codex #9, #10)
Per-IP rate limiting on replies (not just per-token). Turnstile validation checks hostname + freshness. Abuse kill switch per token.

### Fix 8: Email URL sent once only (High — Codex #11)
Chat URL emailed on initial enquiry only. Subsequent responses are in-chat. Reduces token exposure surface.

### Fix 9: Plain text rendering (High — Codex #12)
Chat renders all content as plain text (escaped, newlines preserved). No markdown, no HTML. XSS eliminated by design.

### Fix 10: Idempotent creation + replies (High — Codex #14, #15)
Idempotency key on creation (prevents duplicate issues). Reply dedup via hash of token + body (prevents double-submit).

### Fix 11: Email threading headers (Critical — Gemini #1)
`In-Reply-To` and `References` headers with consistent Message-ID pattern.

### Fix 12: Immediate feedback on chat page (High — Gemini #2)
"Message received" system bubble + typing indicator while AI processes. No 60-second silence.

### Fix 13: Accessibility — aria-live (High — Gemini #3)
Chat container `role="log"` with `aria-live="polite"`. Focus management for new messages.

### Fix 14: Mobile layout (High — Gemini #4)
`dvh` units, `visualViewport` API for keyboard handling. Non-destructive auto-refresh preserves input state.

### Fix 15: SEO — noindex on chat pages (Medium — Gemini #8)
`X-Robots-Tag: noindex` + `<meta name="robots" content="noindex">` on `/enquiry/[token]` pages.

### Fix 16: Graceful token expiry (Low — Gemini #9)
Expired token shows friendly message with link to submit new enquiry, not a generic 404.
