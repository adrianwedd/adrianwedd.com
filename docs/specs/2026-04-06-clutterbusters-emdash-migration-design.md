# Clutterbusters Hub: EmDash CMS Migration Design

**Date:** 2026-04-06
**Author:** Adrian Wedd
**Status:** Draft
**Repo:** adrianwedd/clutterbusters-hub

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
| API functions (`/api/intake`, `/api/request`, `/api/issues`, `/api/issue`, `/api/contact`) | Server-side integrations with MailChannels, GitHub, claude-ops |
| Theme toggle | UI infrastructure |
| Design tokens / CSS | Visual design system |

### Grey Area — Migrate Later If Needed

| Feature | Notes |
|---------|-------|
| Doc viewer (`docs.html`) | Currently renders local `.md` files. Once docs move to EmDash, this page becomes redundant — EmDash renders Portable Text natively. Keep as fallback during transition. |
| `HUB_ALLOWED_DOCS` allowlist | Replaced by EmDash collection permissions. Remove once all docs are in the CMS. |
| Gallery / before-after photos | Currently `gallery/` directory with `MANIFEST.json` consent tracking. Could become an EmDash `gallery` collection later, but consent workflow needs careful design. |

## 2. EmDash Schema Design

### Collections

#### `services` — Clutterbusters Service Offerings

```json
{
  "slug": "services",
  "label": "Services",
  "labelSingular": "Service",
  "supports": ["drafts", "revisions"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "description", "label": "Short Description", "type": "text", "required": true },
    { "slug": "detail", "label": "Full Description", "type": "portableText" },
    { "slug": "icon", "label": "Icon (emoji)", "type": "string" },
    { "slug": "price_from", "label": "Price From ($)", "type": "number" },
    { "slug": "price_note", "label": "Pricing Note", "type": "string" },
    { "slug": "order", "label": "Display Order", "type": "integer" },
    { "slug": "featured", "label": "Show on Homepage", "type": "boolean" }
  ]
}
```

Services: body doubling, decluttering, shed/garage, pre-sale prep, deceased estate, repairs, recycling/rubbish removal.

#### `documents` — Operational Docs & Resources

```json
{
  "slug": "documents",
  "label": "Documents",
  "labelSingular": "Document",
  "supports": ["drafts", "revisions", "search"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "summary", "label": "Summary", "type": "text" },
    { "slug": "content", "label": "Content", "type": "portableText", "searchable": true },
    { "slug": "pinned", "label": "Pin to Top", "type": "boolean" }
  ]
}
```

#### `pages` — Editable Page Content

```json
{
  "slug": "pages",
  "label": "Pages",
  "labelSingular": "Page",
  "supports": ["drafts", "revisions"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true },
    { "slug": "content", "label": "Content", "type": "portableText" },
    { "slug": "featured_image", "label": "Featured Image", "type": "image" }
  ]
}
```

Used for: homepage hero copy, about section, any future static pages Gulley wants to add.

#### `posts` — Blog (Future)

```json
{
  "slug": "posts",
  "label": "Blog Posts",
  "labelSingular": "Post",
  "supports": ["drafts", "revisions", "search", "seo"],
  "fields": [
    { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
    { "slug": "featured_image", "label": "Featured Image", "type": "image" },
    { "slug": "summary", "label": "Summary", "type": "text", "searchable": true },
    { "slug": "content", "label": "Content", "type": "portableText", "searchable": true }
  ]
}
```

Not populated at launch. Available for Gulley to start blogging (decluttering tips, ADHD organising advice, before/after stories) when she is ready.

#### `testimonials` — Client Quotes (Future)

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
| R2 bucket | `clutterbusters-hub-media` | Media uploads (photos, before/after images) |
| KV namespace | `SESSION` | Astro sessions (auto-provisioned by @astrojs/cloudflare) |

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

## 4. Auth Strategy

### Two-Layer Authentication

**Layer 1: Password Gate (hub access)**
- Ported from current `functions/_middleware.js` to Astro middleware (`src/middleware.ts`)
- Same SHA-256 cookie mechanism, same `HUB_PASSWORD` secret
- Pattern follows muse's `src/middleware.ts` exactly (import `env` from `cloudflare:workers`)
- Bypasses: `/_emdash/` (EmDash has its own auth), `/_astro/` (static assets), `/api/contact` (public), `/api/intake` (public)
- Login page at `/login` (Astro page, same visual design as current inline login)

**Layer 2: EmDash Passkey (admin access)**
- WebAuthn passkey authentication at `/_emdash/admin`
- Gulley registers a passkey on her device during setup
- Administrator role (level 50) — full content management
- Adrian also registers as Developer (level 40) for schema changes
- No overlap with the password gate — they are independent auth layers

**Auth Flow:**
1. Unauthenticated visitor hits any page -> redirected to `/login` (password gate)
2. Enters hub password -> 30-day cookie, access to all hub pages
3. Navigates to `/_emdash/admin` -> EmDash passkey prompt (separate auth)
4. Authenticates with passkey -> full CMS admin access

### Secrets (via `wrangler secret put`)

| Secret | Purpose |
|--------|---------|
| `SITE_PASSWORD` | Hub password gate (renamed from `HUB_PASSWORD` for consistency with muse) |
| `GITHUB_TOKEN` | Dashboard API proxy (existing) |
| `FROM_EMAIL` | MailChannels sender (existing) |
| `TO_EMAIL` | Gulley's email (existing) |
| `OPS_API_SECRET` | claude-ops API auth (existing) |
| `OPS_API_URL` | claude-ops endpoint (existing) |

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
5. **Issue view** (`issue.html` -> `src/pages/issue.astro`): Port detail view + JS
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

Key change: Cloudflare Workers use `import { env } from 'cloudflare:workers'` instead of Pages Functions' `context.env`. This is a known gotcha from the muse build.

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

### Phase 5: DNS Cutover (30 minutes)

1. Remove Cloudflare Pages deployment
2. Add Workers custom domain for `clutterbusters.adrianwedd.com`
3. Verify password gate, admin panel, all API endpoints
4. Register Gulley's passkey for EmDash admin

### Phase 6: Gulley Training (1 hour)

1. Walk through `/_emdash/admin` — editing a document, publishing
2. Show how to create a new blog post (for future use)
3. Show how to update service descriptions and pricing
4. Explain what needs Adrian (forms, dashboard, code changes) vs what she can do herself

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
| Pages -> Workers DNS cutover causes downtime | Schedule during off-hours. Cloudflare DNS propagation is near-instant for same-zone changes. Have rollback plan (re-enable Pages deployment). |
| Password gate regression | The middleware pattern is proven in muse. Port carefully, test the exact same edge cases: no password set in prod = 503, localhost bypass for dev, timing-safe comparison, `__Host-` cookie prefix for secure context. |
| EmDash version instability (0.1.0) | EmDash is pre-1.0. Pin exact version in `package.json`. Keep muse as reference — any bugs found there will also apply here. |

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
├── issue.html          -> src/pages/issue.astro
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
| 1. Infrastructure | 2-3 | Phase 0 |
| 2. Port pages | 3-4 | Phase 1 |
| 3. Port APIs | 2 | Phase 1 |
| 4. Content migration | 2-3 | Phase 1 |
| 5. DNS cutover | 0.5 | Phases 2-4 |
| 6. Gulley training | 1 | Phase 5 |
| **Total** | **11.5-14.5** | |

Phases 2, 3, and 4 can run in parallel after Phase 1 completes.
