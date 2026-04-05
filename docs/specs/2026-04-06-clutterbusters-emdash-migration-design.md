# Clutterbusters Hub: EmDash CMS Migration Design

**Date:** 2026-04-06
**Author:** Adrian Wedd
**Status:** Draft (QA-revised 2026-04-06)
**Repo:** adrianwedd/clutterbusters-hub
**QA:** Codex (22 findings), Gemini (7 findings) — all critical/high addressed below

## Context

The Clutterbusters Hub is a private operations site for Gulley Freeman's neurodivergent-focused decluttering business. It currently runs as vanilla HTML/CSS/JS on Cloudflare Pages with Pages Functions for APIs. Gulley (non-technical) cannot edit content without developer involvement.

The goal is to migrate to EmDash CMS (Astro 6 + Cloudflare Workers SSR) so Gulley can manage her own marketing content, service descriptions, and operational documents through the `/_emdash/admin` interface — the same stack already proven on the Muse project at `muse.wedd.au`.

## 1. What Migrates vs What Stays as Code

### Migrates to EmDash (Gulley-editable content)

| Content | Current Location | EmDash Collection |
|---------|-----------------|-------------------|
| Service descriptions | Hardcoded in `index.html` | `services` |
| Landing page copy (hero, tagline, CTAs) | Hardcoded in `index.html` | `pages` |
| Operational docs (business plan, marketing plan, meeting agenda) | Markdown files in `docs/` | `documents` |
| Operations templates (intake process, email templates, checklists) | Markdown files in `operations/` | `documents` |
| Client resources (ADHD guide, sensory assessment) | Markdown files in `resources/` | `documents` |
| Pricing matrix | `operations/PRICING_MATRIX.md` | `documents` (or `services` field) |
| FAQ / testimonials (future) | Does not exist yet | `testimonials`, `faqs` |
| Blog posts (future) | Does not exist yet | `posts` |

### Stays as Code (developer-maintained)

| Feature | Reason |
|---------|--------|
| Client intake form (`intake.html`) | Custom form logic, validation, MailChannels integration, privacy notice |
| Change request form (`request.html`) | Custom form logic, claude-ops API integration, GitHub issue creation |
| Project dashboard (`dashboard.html`) | GitHub Issues API proxy, Kanban board JS, real-time filtering |
| Issue detail view (`issue.html`) | GitHub API proxy, timeline rendering, comment display |
| Password gate middleware | Security-critical auth logic |
| API functions (`/api/intake`, `/api/request`, `/api/issues`, `/api/issue`, `/api/contact`, `/api/reply`) | Server-side integrations with MailChannels, GitHub, claude-ops |
| Theme toggle | UI infrastructure |
| Design tokens / CSS | Visual design system |

### Grey Area — Migrate Later If Needed

| Feature | Notes |
|---------|-------|
| Doc viewer (`docs.html`) | Currently renders local `.md` files. Once docs move to EmDash, this page becomes redundant — EmDash renders Portable Text natively. Keep as fallback during transition. **Add redirect from `docs.html?doc={name}` to `/docs/{slug}` in middleware** (QA: Codex #15). |
| `HUB_ALLOWED_DOCS` allowlist | Replaced by EmDash collection permissions. Remove once all docs are in the CMS. |
| Gallery / before-after photos | Currently `gallery/` directory with `MANIFEST.json` consent tracking. Could become an EmDash `gallery` collection later, but consent workflow needs careful design. **Do not migrate gallery to EmDash until consent revocation workflow is designed** — generic media upload without consent tracking is unsafe for client photos (QA: Codex #20, Gemini #7). |

## 2. EmDash Schema Design

### Collections

#### `services` — Clutterbusters Service Offerings

```json
{
  "slug": "services",
  "label": "Services",
  "labelSingular": "Service",
  "supports": ["drafts", "revisions", "seo"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path — do not change after publish" },
    { "slug": "description", "label": "Short Description", "type": "text", "required": true },
    { "slug": "detail", "label": "Full Description", "type": "portableText" },
    { "slug": "icon", "label": "Icon (emoji)", "type": "string" },
    { "slug": "price_from", "label": "Price From ($)", "type": "number", "helpText": "Leave blank for POA" },
    { "slug": "price_to", "label": "Price To ($)", "type": "number", "helpText": "Leave blank if single price point" },
    { "slug": "price_unit", "label": "Price Unit", "type": "string", "helpText": "e.g. per hour, per session, per project" },
    { "slug": "price_note", "label": "Pricing Note", "type": "string", "helpText": "e.g. GST inclusive, NDIS pricing available" },
    { "slug": "order", "label": "Display Order", "type": "integer" },
    { "slug": "featured", "label": "Show on Homepage", "type": "boolean" }
  ]
}
```

Services: body doubling, decluttering, shed/garage, pre-sale prep, deceased estate, repairs, recycling/rubbish removal.

> **QA note (Codex #7, Gemini #1):** Pricing now supports ranges (`price_from`/`price_to`), unit types, POA (leave both blank), and GST notes. SEO support added for social sharing when service pages are shared externally. Slug field is explicit and immutable — title changes do not break URLs.

#### `documents` — Operational Docs & Resources

```json
{
  "slug": "documents",
  "label": "Documents",
  "labelSingular": "Document",
  "supports": ["drafts", "revisions", "search"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path — do not change after publish" },
    { "slug": "summary", "label": "Summary", "type": "text" },
    { "slug": "content", "label": "Content", "type": "portableText", "searchable": true },
    { "slug": "audience", "label": "Audience", "type": "string", "required": true, "helpText": "Who can see this document", "options": ["internal", "client-facing"] },
    { "slug": "doc_type", "label": "Document Type", "type": "string", "options": ["plan", "template", "guide", "checklist", "reference"] },
    { "slug": "order", "label": "Display Order", "type": "integer" },
    { "slug": "pinned", "label": "Pin to Top", "type": "boolean" },
    { "slug": "legacy_path", "label": "Legacy File Path", "type": "string", "helpText": "Original path in repo (for redirect mapping)" },
    { "slug": "file", "label": "Attachment", "type": "file", "helpText": "Optional PDF or document download" }
  ]
}
```

> **QA note (Codex #3, #6; Gemini #3):** `audience` field replaces `HUB_ALLOWED_DOCS` allowlist — route-side filtering uses this to control visibility. `legacy_path` enables redirect mapping from old `docs.html?doc=` URLs. `doc_type` and `order` support navigation reconstruction. `file` field supports PDF/attachment downloads.

#### `pages` — Editable Page Content

```json
{
  "slug": "pages",
  "label": "Pages",
  "labelSingular": "Page",
  "supports": ["drafts", "revisions", "seo"],
  "fields": [
    { "slug": "title", "label": "Page Title", "type": "string", "required": true },
    { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path — do not change after publish" },
    { "slug": "hero_heading", "label": "Hero Heading", "type": "string", "helpText": "Main headline (e.g. 'Decluttering with heart')" },
    { "slug": "hero_subheading", "label": "Hero Subheading", "type": "string", "helpText": "Supporting tagline" },
    { "slug": "cta_label", "label": "Primary CTA Label", "type": "string", "helpText": "e.g. 'Get Started'" },
    { "slug": "cta_url", "label": "Primary CTA URL", "type": "string", "helpText": "e.g. '/intake'" },
    { "slug": "cta_secondary_label", "label": "Secondary CTA Label", "type": "string" },
    { "slug": "cta_secondary_url", "label": "Secondary CTA URL", "type": "string" },
    { "slug": "content", "label": "Page Content", "type": "portableText" },
    { "slug": "featured_image", "label": "Featured Image", "type": "image" }
  ]
}
```

Used for: homepage hero copy, about section, any future static pages Gulley wants to add.

> **QA note (Codex #5):** Homepage fields are explicit and constrained — hero heading, subheading, CTAs with separate label/URL fields. This prevents a non-technical editor from accidentally breaking the homepage layout by editing a single rich text blob. The `content` field remains for general page body below the hero.

#### `posts` — Blog (Deferred to Phase 2)

> **QA note (Codex #17):** Deferred to post-migration stabilisation. Adding empty collections at launch increases admin complexity and accidental-publish surface for no immediate value. Add via schema seed when Gulley is ready to blog.

```json
{
  "slug": "posts",
  "label": "Blog Posts",
  "labelSingular": "Post",
  "supports": ["drafts", "revisions", "search", "seo"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true },
    { "slug": "featured_image", "label": "Featured Image", "type": "image" },
    { "slug": "summary", "label": "Summary", "type": "text", "searchable": true },
    { "slug": "content", "label": "Content", "type": "portableText", "searchable": true }
  ]
}
```

#### `testimonials` — Client Quotes (Deferred to Phase 2)

> **QA note (Codex #17):** Same rationale — defer until core editorial flow is stable.

```json
{
  "slug": "testimonials",
  "label": "Testimonials",
  "labelSingular": "Testimonial",
  "supports": ["drafts"],
  "fields": [
    { "slug": "quote", "label": "Quote", "type": "text", "required": true },
    { "slug": "client_name", "label": "Client Name", "type": "string" },
    { "slug": "location", "label": "Location", "type": "string" },
    { "slug": "order", "label": "Display Order", "type": "integer" }
  ]
}
```

### Taxonomies

```json
{
  "taxonomies": [
    {
      "name": "category",
      "collections": ["documents", "posts"],
      "terms": [
        { "name": "Operations", "slug": "operations" },
        { "name": "Resources", "slug": "resources" },
        { "name": "Strategy", "slug": "strategy" },
        { "name": "Commercial", "slug": "commercial" },
        { "name": "Research", "slug": "research" }
      ]
    },
    {
      "name": "service_type",
      "collections": ["services"],
      "terms": [
        { "name": "Decluttering", "slug": "decluttering" },
        { "name": "Body Doubling", "slug": "body-doubling" },
        { "name": "Repairs", "slug": "repairs" },
        { "name": "Property", "slug": "property" }
      ]
    }
  ]
}
```

### Menus

```json
{
  "menus": [
    {
      "name": "primary",
      "items": [
        { "label": "Hub", "url": "/" },
        { "label": "Dashboard", "url": "/dashboard" },
        { "label": "Docs", "url": "/docs" },
        { "label": "New Enquiry", "url": "/intake" }
      ]
    }
  ]
}
```

## 3. Deployment Architecture

### Current: Cloudflare Pages (Static + Functions)

```
clutterbusters.adrianwedd.com
├── Static HTML files (served directly)
├── functions/_middleware.js (password gate)
└── functions/api/*.js (Pages Functions)
```

### Target: Cloudflare Workers (SSR)

```
clutterbusters.adrianwedd.com
├── Astro 6 SSR (Workers) ← all page rendering
├── src/middleware.ts (password gate, EmDash bypass)
├── src/pages/api/*.ts (API routes, same logic as current functions/)
├── EmDash CMS (D1 database, R2 media)
└── /_emdash/admin (passkey-protected admin UI)
```

### Cloudflare Resources Required

| Resource | Name | Purpose |
|----------|------|---------|
| Workers site | `clutterbusters-hub` | SSR hosting |
| Custom domain | `clutterbusters.adrianwedd.com` | Production URL (already exists) |
| D1 database | `clutterbusters-hub-db` | EmDash CMS schema + content |
| R2 bucket | `clutterbusters-hub-media` | Media uploads — **private bucket, no public access** |

> **QA note (Codex #21):** `SESSION` KV namespace removed — nothing in the design uses Astro sessions. The password gate uses a cookie directly, not Astro's session API.

> **QA note (Gemini #7):** R2 bucket MUST be private (no public access). Before/after client photos are sensitive PII. All media served through authenticated routes only — EmDash's media proxy handles this behind the password gate. If media needs external sharing in future, implement signed URLs with expiry.

### `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "clutterbusters-hub",
  "compatibility_date": "2026-04-06",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "clutterbusters-hub-db",
      "database_id": "<created-at-init>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "clutterbusters-hub-media"
    }
  ]
}
```

### `astro.config.mjs`

```javascript
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: "https://clutterbusters.adrianwedd.com",
  integrations: [
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
    }),
  ],
  devToolbar: { enabled: false },
});
```

No React/Preact needed initially — all current interactivity is vanilla JS (theme toggle, form submission, dashboard filtering). These can remain as inline scripts or Astro `<script>` tags.

### Security Headers & CSP

> **QA note (Codex #12):** The current site uses `public/_headers` for security headers. Workers SSR requires these to be set programmatically in middleware or per-response.

**Strategy:** Set security headers in Astro middleware for all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Robots-Tag: noindex, nofollow` (entire site is private — belt-and-suspenders with password gate)

**CSP:** Two policies:
1. **Public pages + hub pages:** Strict CSP allowing inline scripts (`'unsafe-inline'` or nonce-based), same-origin images, fonts from `fonts.googleapis.com`/`fonts.gstatic.com` (Lexend)
2. **`/_emdash/*` routes:** EmDash admin requires its own CSP — defer to EmDash's built-in headers, do not override

### robots.txt & Indexing

> **QA note (Codex #19):** Private site must be defense-in-depth against indexing.

- Serve `robots.txt` with `Disallow: /` for all user agents
- Set `X-Robots-Tag: noindex, nofollow` on all responses via middleware
- No sitemap generation
- No `<meta name="robots">` needed (header is sufficient)

### Performance & Caching

> **QA note (Codex #18):** Moving from static Pages to SSR adds per-request compute. Mitigate with caching.

- **Static assets** (`/_astro/*`): Immutable cache (`Cache-Control: public, max-age=31536000, immutable`) — Astro hashes filenames
- **SSR pages** (behind password gate): `Cache-Control: private, no-store` — content is per-user (authenticated)
- **EmDash content queries:** D1 reads are fast (~1ms) but consider `stale-while-revalidate` for public pages if the site ever has a public face
- **Dashboard API proxies:** Short cache (60s) via `Cache-Control: private, max-age=60` — GitHub data is near-real-time but not critical

### Route Compatibility

> **QA note (Codex #14):** The claude-ops design expects issue URLs of the form `{hub_url}/issues/{number}`. The current `issue.html?id={number}` must be preserved or redirected.

**Route mapping for backwards compatibility:**
- `/issue?id={number}` -> `/issues/{number}` (Astro redirect or middleware rewrite)
- `/docs.html?doc={name}` -> `/docs/{slug}` (redirect via middleware during transition)
- All current API paths (`/api/*`) remain unchanged

The `issue.html` to `/issues/[number].astro` migration uses `/issues/` (plural) to match the claude-ops URL contract.

## 4. Auth Strategy

### Two-Layer Authentication

**Layer 1: Password Gate (hub access)**
- Ported from current `functions/_middleware.js` to Astro middleware (`src/middleware.ts`)
- Same SHA-256 cookie mechanism, using `SITE_PASSWORD` secret (renamed from `HUB_PASSWORD` for consistency with muse)
- Pattern follows muse's `src/middleware.ts` exactly (import `env` from `cloudflare:workers`)
- Login page at `/login` (Astro page, same visual design as current inline login)

**Middleware bypass rules (deny-by-default):**
- `/_emdash/admin*` — EmDash admin UI (has its own passkey auth)
- `/_emdash/api*` — EmDash API routes (passkey-authenticated)
- `/_astro/` — static assets (hashed filenames, no secrets)
- `/api/contact` — public contact form endpoint
- `/api/intake` — public intake form endpoint
- `/intake` — **public intake page** (new clients must access the form without hub password)
- `/contact` — public contact page (if exists)
- `/login` — login page itself
- All other `/_emdash/*` paths — **BLOCKED** (deny-by-default; EmDash may expose metadata/media at other paths)

> **QA note (Codex #1, Gemini #1):** The `/_emdash/` bypass is now scoped to known safe sub-paths (`/admin*`, `/api*`) rather than a blanket exemption. This prevents accidental exposure of draft content, media, or internal metadata through uncharted EmDash routes. The `/intake` **page** (not just the API endpoint) is now explicitly bypassed so new clients can access the intake form.

**Layer 2: EmDash Passkey (admin access)**
- WebAuthn passkey authentication at `/_emdash/admin`
- Gulley registers a passkey on her device during setup
- **Both Gulley and Adrian register passkeys on multiple devices** (phone + laptop minimum)
- Administrator role (level 50) — full content management
- Adrian also registers as Developer (level 40) for schema changes
- No overlap with the password gate — they are independent auth layers

**Passkey recovery plan:**
- Each user registers passkeys on at least 2 devices during setup
- Adrian (Developer role) can reset passkeys via EmDash CLI if Gulley is locked out
- Recovery procedure documented in repo README for future reference
- Fallback: Adrian seeds a new passkey via `npx emdash admin:reset` (destructive but available)

> **QA note (Codex #9):** Passkey lockout is not an edge case for a non-technical client. Multi-device registration and a documented recovery procedure are essential.

**Auth Flow:**
1. Unauthenticated visitor hits any page (except bypassed routes) -> redirected to `/login`
2. Enters hub password -> 30-day cookie (`__Host-` prefix), access to all hub pages
3. Navigates to `/_emdash/admin` -> EmDash passkey prompt (separate auth)
4. Authenticates with passkey -> full CMS admin access

### CSRF and Origin Validation

> **QA note (Codex #2):** All public POST endpoints (`/api/contact`, `/api/intake`, `/login`) and all cookie-mutating routes MUST validate the `Origin` header against `https://clutterbusters.adrianwedd.com`. The current hub already does origin validation in its middleware — this must be ported, not dropped. Rate limiting via Cloudflare WAF rules (5 req/10s per IP on `/api/*` POST).

### Secrets (via `wrangler secret put`)

| Secret | Purpose |
|--------|---------|
| `SITE_PASSWORD` | Hub password gate |
| `GITHUB_TOKEN` | Dashboard API proxy (existing) |
| `FROM_EMAIL` | MailChannels sender (existing) |
| `TO_EMAIL` | Gulley's email (existing) |
| `OPS_API_SECRET` | claude-ops API auth (existing) |
| `OPS_API_URL` | claude-ops endpoint (existing) |

> **QA note (Codex #8):** Secret is consistently named `SITE_PASSWORD` throughout. The previous reference to "same `HUB_PASSWORD` secret" was misleading — the middleware code uses `SITE_PASSWORD` to match the muse pattern.

## 5. Migration Steps

### Phase 0: Preparation (1 hour)

1. Create Cloudflare resources: D1 database, R2 bucket
2. Scaffold Astro 6 project in `clutterbusters-hub/` (replace static files)
3. `npm install --legacy-peer-deps` (known EmDash requirement)
4. Install tiptap peer deps explicitly (known EmDash requirement)
5. Configure `wrangler.jsonc`, `astro.config.mjs`
6. Create `seed/seed.json` with schema from Section 2
7. Run `npx emdash init && npx emdash seed seed/seed.json`

### Phase 1: Infrastructure (2-3 hours)

1. Port `_middleware.js` to `src/middleware.ts` (follow muse pattern)
2. Create `/login` page (same visual design)
3. Create `src/live.config.ts` (same as muse — single `_emdash` collection)
4. Port CSS design tokens from `styles/tokens.css` to Astro global styles
5. Create `Base.astro` layout with Lexend font, coral/sage palette, theme toggle
6. Deploy skeleton to verify Workers + D1 + R2 work

### Phase 2: Port Existing Pages (3-4 hours)

1. **Homepage** (`index.html` -> `src/pages/index.astro`): Pull services from EmDash, keep dashboard CTA and doc section links as code
2. **Intake form** (`intake.html` -> `src/pages/intake.astro`): Port HTML + inline JS directly, same `/api/intake` endpoint
3. **Request form** (`request.html` -> `src/pages/request.astro`): Port HTML + inline JS, same `/api/request` endpoint
4. **Dashboard** (`dashboard.html` -> `src/pages/dashboard.astro`): Port Kanban board HTML + JS, same `/api/issues` endpoint
5. **Issue view** (`issue.html` -> `src/pages/issues/[number].astro`): Port detail view + JS. Route is `/issues/{number}` (plural) to match claude-ops URL contract. Add redirect from `/issue?id={n}` to `/issues/{n}` for backwards compatibility.
6. **Doc viewer** (`docs.html` -> `src/pages/docs/index.astro` + `[slug].astro`): Replace file-based viewer with EmDash document rendering via `<PortableText>`

### Phase 3: Port API Functions (2 hours)

Port Pages Functions to Astro API routes in `src/pages/api/`:

| From | To | Changes |
|------|----|---------|
| `functions/api/intake.js` | `src/pages/api/intake.ts` | Access env via `import { env } from 'cloudflare:workers'` instead of `context.env` |
| `functions/api/request.js` | `src/pages/api/request.ts` | Same env change |
| `functions/api/issues.js` | `src/pages/api/issues.ts` | Same env change |
| `functions/api/issue.js` | `src/pages/api/issue.ts` | Same env change |
| `functions/api/contact.js` | `src/pages/api/contact.ts` | Same env change |
| `functions/api/reply.js` | `src/pages/api/reply.ts` | Same env change — posts comments on GitHub issues |

Key change: Cloudflare Workers use `import { env } from 'cloudflare:workers'` instead of Pages Functions' `context.env`. This is a known gotcha from the muse build.

> **QA note (Codex #13):** "Same logic, just change env access" is insufficient. The port must also handle: Astro API route request/response conventions (return `new Response()`), multipart form parsing differences, CORS preflight if any endpoints are called cross-origin, and cookie writing via `Set-Cookie` headers. Each endpoint needs a contract test verifying: correct status codes, response body shape, error handling, and origin validation. Test on `*.workers.dev` staging URL before cutover.

> **QA note (Gemini #6):** Explicitly test MailChannels form submission on the staging URL. MailChannels SPF/DKIM may behave differently from Workers vs Pages Functions — verify email delivery end-to-end.

### Phase 4: Content Migration (2-3 hours)

1. Migrate all markdown documents to EmDash via admin UI or CLI:
   - `docs/BUSINESS_PLAN.md`, `docs/MARKETING_PLAN.md`, `docs/MEETING_AGENDA.md`
   - `operations/*.md` (6 files)
   - `resources/*.md` (3 files)
   - Root docs: `GULLEY_AI_STRATEGY.md`, `GULLEY_MARKET_POSITIONING.md`, etc.
2. Create service entries from hardcoded `index.html` content
3. Create homepage page entry with hero copy
4. Tag all documents with categories
5. Verify Gulley can edit each document type in `/_emdash/admin`

### Phase 5: Staging Verification & DNS Cutover (1-2 hours)

> **QA note (Codex #10):** Deployment sequence reversed — deploy Workers first, verify on staging, THEN remove Pages. Never remove the working deployment before the replacement is proven.

1. Deploy Workers to `clutterbusters-hub.{account}.workers.dev` staging URL
2. Run staging verification checklist:
   - Password gate: login, cookie persistence, logout, no-password-set = 503
   - EmDash admin: passkey registration, document CRUD, media upload
   - All API endpoints: `/api/intake`, `/api/request`, `/api/issues`, `/api/issue`, `/api/contact`
   - MailChannels: submit intake form, verify email delivery
   - Dashboard: GitHub API proxy, issue list, issue detail
   - CSP headers: verify no console errors on all page types
   - Visual regression: side-by-side comparison of old vs new for homepage, docs, dashboard
3. Register Gulley's passkey for EmDash admin (on staging first)
4. Register Adrian's passkey as Developer
5. **Take D1 snapshot:** `wrangler d1 export clutterbusters-hub-db --output backup-pre-cutover.sql`
6. Add Workers custom domain for `clutterbusters.adrianwedd.com`
7. Verify production URL works (Workers now serving)
8. Remove Cloudflare Pages deployment only after 24-hour stability window
9. **Rollback plan:** If critical issues found post-cutover, re-deploy Pages from `legacy` branch (code rollback) — note that CMS content created after cutover will be in D1 only, not in the legacy static files

> **QA note (Codex #11):** D1 export before cutover provides a database-level rollback point. R2 media is append-only during migration — no destructive operations. The `legacy` branch preserves the last-known-good static deployment.

### Phase 6: Gulley Training (1 hour)

1. Walk through `/_emdash/admin` — editing a document, publishing
2. Show how to update service descriptions and pricing
3. Explain what needs Adrian (forms, dashboard, code changes) vs what she can do herself
4. Register passkey on Gulley's second device (backup)
5. Walk through the "what if I break something" recovery path (drafts, revisions, calling Adrian)

> **QA note (Codex #16):** Schema fields include `helpText` on all non-obvious inputs. EmDash's built-in revision history provides an undo path. Blog posts and testimonials are deferred — Gulley only sees the three collections she needs at launch (services, documents, pages). This reduces cognitive load significantly.

## 6. Risk Assessment

### Low Risk

| Risk | Mitigation |
|------|-----------|
| EmDash peer dep conflicts during install | Known fix: `--legacy-peer-deps` + explicit tiptap deps (documented in muse CLAUDE.md) |
| Media URL format differences | Use `meta.storageKey` not media ID (known from muse) |
| Env access pattern change | Use `import { env } from 'cloudflare:workers'` consistently (known from muse) |

### Medium Risk

| Risk | Mitigation |
|------|-----------|
| MailChannels API compatibility from Workers (vs Pages Functions) | MailChannels works identically from Workers — same fetch API. Test in staging. |
| Content loss during migration | Keep current repo as-is on a `legacy` branch. EmDash content lives in D1, not files — no destructive file deletion needed until verified. |
| Gulley finds admin UI confusing | EmDash admin is straightforward for content editing. Train on one document type first. The Portable Text editor is WYSIWYG-like. |
| Dashboard JS complexity in Astro | The dashboard is self-contained vanilla JS — it works fine as an inline `<script>` in an Astro page. No framework migration needed. |

### High Risk

| Risk | Mitigation |
|------|-----------|
| Pages -> Workers DNS cutover causes downtime | Deploy Workers first, verify on staging URL, THEN swap DNS. Keep Pages deployment as rollback for 24 hours. Take D1 export before cutover. |
| Password gate regression | The middleware pattern is proven in muse. Port carefully, test the exact same edge cases: no password set in prod = 503, localhost bypass for dev, timing-safe comparison, `__Host-` cookie prefix for secure context. CSRF origin validation on `/login` POST. |
| EmDash version instability (0.1.0) | EmDash is pre-1.0. Pin exact version in `package.json`. Keep muse as reference �� any bugs found there will also apply here. |
| Passkey lockout | Multi-device registration mandatory. Adrian can reset via CLI. Document recovery procedure. |

## 7. What Gulley Can Edit vs What Needs a Developer

### Gulley Can Do (via `/_emdash/admin`)

- Edit any service description (title, price, detail text, display order)
- Edit homepage hero copy, tagline, CTAs
- Edit operational documents (business plan, meeting agenda, checklists, email templates)
- Edit client resources (ADHD guide, sensory assessment)
- Add/edit/publish blog posts
- Add testimonials
- Upload images (before/after photos, service images)
- Reorder services
- Save drafts before publishing
- Search across all documents

### Needs a Developer

- Add new form fields to intake or request forms
- Change form submission logic or email routing
- Modify dashboard columns or filtering behaviour
- Add new API integrations
- Change visual design (colours, fonts, layout)
- Add new page types or routes
- Modify the password gate or auth behaviour
- Schema changes (add new collections or fields)
- Deploy changes (still `wrangler deploy`)
- Update the public Clutterbusters marketing site (separate repo)

### Grey Area (Train Gulley If She Wants)

- Creating new document categories (via admin taxonomy management)
- Managing the primary navigation menu (via admin menu editor)
- SEO fields on blog posts (meta description, OG image)

## Appendix: File Mapping

### Current -> New

```
clutterbusters-hub/
├── index.html          -> src/pages/index.astro
├── intake.html         -> src/pages/intake.astro
├── request.html        -> src/pages/request.astro
├── dashboard.html      -> src/pages/dashboard.astro
├── issue.html          -> src/pages/issues/[number].astro (plural, matches claude-ops URL contract)
├── docs.html           -> src/pages/docs/index.astro + [slug].astro
├── styles/tokens.css   -> src/styles/tokens.css (or global.css)
├── styles/*.css        -> src/styles/ (port per-page styles)
├── scripts/shared.js   -> src/scripts/shared.ts (dashboard/issue only)
├── scripts/dashboard.js -> src/scripts/dashboard.ts
├── scripts/issue.js    -> src/scripts/issue.ts
├── scripts/theme-toggle.js -> inline in Base.astro
├── functions/_middleware.js -> src/middleware.ts
├── functions/api/intake.js -> src/pages/api/intake.ts
├── functions/api/request.js -> src/pages/api/request.ts
├── functions/api/issues.js -> src/pages/api/issues.ts
├── functions/api/issue.js -> src/pages/api/issue.ts
├── functions/api/contact.js -> src/pages/api/contact.ts
├── functions/api/reply.js  -> src/pages/api/reply.ts
├── docs/*.md           -> EmDash "documents" collection (D1)
├── operations/*.md     -> EmDash "documents" collection (D1)
├── resources/*.md      -> EmDash "documents" collection (D1)
├── seed/seed.json      -> NEW (EmDash schema + initial content)
├── wrangler.jsonc      -> NEW (Workers deployment config)
├── astro.config.mjs    -> NEW
├── src/live.config.ts  -> NEW (EmDash collection loader)
└── src/layouts/Base.astro -> NEW (Lexend, coral/sage, theme toggle)
```

### New Files (Not Ported)

```
src/live.config.ts      # EmDash Live Collection loader (3 lines, same as muse)
seed/seed.json          # Schema + initial content seed
wrangler.jsonc          # D1 + R2 bindings
astro.config.mjs        # Astro 6 + EmDash + Cloudflare adapter
package.json            # Astro 6, EmDash, tiptap deps
tsconfig.json           # TypeScript strict
```

## Appendix: Estimated Effort

| Phase | Hours | Dependency |
|-------|-------|-----------|
| 0. Preparation | 1 | None |
| 1. Infrastructure (middleware, auth, layout, CSP, robots) | 3-4 | Phase 0 |
| 2. Port pages (including route redirects) | 3-4 | Phase 1 |
| 3. Port APIs (including contract tests) | 3 | Phase 1 |
| 4. Content migration | 2-3 | Phase 1 |
| 5. Staging verification & DNS cutover | 1-2 | Phases 2-4 |
| 6. Gulley training | 1 | Phase 5 |
| **Total** | **14-18** | |

> **QA note (Codex #22):** Previous estimate of 11.5-14.5h excluded staging verification, contract tests, CSP/header work, redirect mapping, and passkey recovery testing. Revised estimate includes these.

Phases 2, 3, and 4 can run in parallel after Phase 1 completes.
