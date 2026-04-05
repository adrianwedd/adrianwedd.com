# Clutterbusters Hub: EmDash Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Clutterbusters Hub from static HTML/CSS/JS on Cloudflare Pages to Astro 6 + EmDash CMS on Cloudflare Workers, giving Gulley self-service content editing via `/_emdash/admin`.

**Architecture:** Astro 6 SSR on Cloudflare Workers with EmDash CMS (D1 database, R2 media). Two-layer auth: password gate (hub access) + passkey (admin access). Existing API endpoints ported from Pages Functions to Astro API routes. Vanilla JS stays as-is (no framework migration needed).

**Tech Stack:** Astro 6, EmDash CMS 0.1.x, Cloudflare Workers/D1/R2, TypeScript strict, Lexend font, coral/sage palette

**Spec:** `docs/specs/2026-04-06-clutterbusters-emdash-migration-design.md` (QA-revised)

**Working directory:** `/Users/adrian/repos/clutterbusters-hub/`

**Reference project:** `/Users/adrian/repos/muse/` (Astro 6 + EmDash on CF Workers)

---

## Phase 0: Preparation (Tasks 1-2)

### File Map — Phase 0

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `package.json` | Astro 6 + EmDash + tiptap deps |
| Create | `tsconfig.json` | TypeScript strict |
| Create | `astro.config.mjs` | Astro 6 + EmDash + Cloudflare adapter |
| Create | `wrangler.jsonc` | D1 + R2 bindings |
| Create | `seed/seed.json` | EmDash schema + taxonomies + menus |
| Preserve | `legacy` branch | Git branch of current static site |

---

### Task 1: Create Legacy Branch & Scaffold Astro Project

**Files:**
- Preserve: current repo on `legacy` branch
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`

- [ ] **Step 1: Create legacy branch**

```bash
cd /Users/adrian/repos/clutterbusters-hub
git checkout -b legacy
git push origin legacy
git checkout main
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "clutterbusters-hub",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "emdash": {
    "seed": "seed/seed.json"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "astro build && wrangler deploy",
    "typecheck": "astro check",
    "bootstrap": "emdash init && emdash seed",
    "seed": "emdash seed"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^13.1.7",
    "@emdash-cms/cloudflare": "^0.1.0",
    "@tiptap/extension-collaboration": "^3.22.1",
    "@tiptap/y-tiptap": "^3.0.2",
    "astro": "^6.1.3",
    "emdash": "^0.1.0",
    "y-protocols": "^1.0.7",
    "yjs": "^13.6.30"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@cloudflare/workers-types": "^4.20260301.0",
    "typescript": "^5.8.0",
    "wrangler": "^4.5.0"
  },
  "overrides": {
    "yaml": ">=2.8.3",
    "kysely": ">=0.28.14"
  }
}
```

No React/Preact — all interactivity is vanilla JS.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

- [ ] **Step 4: Create astro.config.mjs**

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

- [ ] **Step 5: Install dependencies**

```bash
npm install --legacy-peer-deps
```

Known EmDash requirement: `--legacy-peer-deps` needed for tiptap peer dep conflicts.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json astro.config.mjs package-lock.json
git commit -m "feat: scaffold Astro 6 + EmDash project"
```

---

### Task 2: Cloudflare Resources & EmDash Seed

**Files:**
- Create: `wrangler.jsonc`
- Create: `seed/seed.json`

- [ ] **Step 1: Create Cloudflare resources**

```bash
wrangler d1 create clutterbusters-hub-db
# Note the database_id from output

wrangler r2 bucket create clutterbusters-hub-media
```

- [ ] **Step 2: Create wrangler.jsonc** (fill in database_id from Step 1)

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
      "database_id": "<from-step-1>"
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

- [ ] **Step 3: Create seed/seed.json**

This is the full EmDash schema from the spec Section 2. Only launch collections (services, documents, pages) — posts and testimonials are deferred.

```json
{
  "$schema": "https://emdashcms.com/seed.schema.json",
  "version": "1",
  "meta": {
    "name": "Clutterbusters Hub",
    "description": "Operations hub for Clutterbusters decluttering business",
    "author": "adrianwedd"
  },
  "settings": {
    "title": "Clutterbusters Hub",
    "tagline": "Decluttering with heart"
  },
  "collections": [
    {
      "slug": "services",
      "label": "Services",
      "labelSingular": "Service",
      "supports": ["drafts", "revisions", "seo"],
      "fields": [
        { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
        { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path - do not change after publish" },
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
    },
    {
      "slug": "documents",
      "label": "Documents",
      "labelSingular": "Document",
      "supports": ["drafts", "revisions", "search"],
      "fields": [
        { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
        { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path - do not change after publish" },
        { "slug": "summary", "label": "Summary", "type": "text" },
        { "slug": "content", "label": "Content", "type": "portableText", "searchable": true },
        { "slug": "audience", "label": "Audience", "type": "string", "required": true, "helpText": "Who can see this document" },
        { "slug": "doc_type", "label": "Document Type", "type": "string" },
        { "slug": "order", "label": "Display Order", "type": "integer" },
        { "slug": "pinned", "label": "Pin to Top", "type": "boolean" },
        { "slug": "legacy_path", "label": "Legacy File Path", "type": "string", "helpText": "Original path in repo for redirect mapping" },
        { "slug": "file", "label": "Attachment", "type": "file", "helpText": "Optional PDF or document download" }
      ]
    },
    {
      "slug": "pages",
      "label": "Pages",
      "labelSingular": "Page",
      "supports": ["drafts", "revisions", "seo"],
      "fields": [
        { "slug": "title", "label": "Page Title", "type": "string", "required": true },
        { "slug": "url_slug", "label": "URL Slug", "type": "string", "required": true, "helpText": "Permanent URL path - do not change after publish" },
        { "slug": "hero_heading", "label": "Hero Heading", "type": "string", "helpText": "Main headline" },
        { "slug": "hero_subheading", "label": "Hero Subheading", "type": "string", "helpText": "Supporting tagline" },
        { "slug": "cta_label", "label": "Primary CTA Label", "type": "string", "helpText": "e.g. Get Started" },
        { "slug": "cta_url", "label": "Primary CTA URL", "type": "string", "helpText": "e.g. /intake" },
        { "slug": "cta_secondary_label", "label": "Secondary CTA Label", "type": "string" },
        { "slug": "cta_secondary_url", "label": "Secondary CTA URL", "type": "string" },
        { "slug": "content", "label": "Page Content", "type": "portableText" },
        { "slug": "featured_image", "label": "Featured Image", "type": "image" }
      ]
    }
  ],
  "taxonomies": [
    {
      "name": "category",
      "collections": ["documents"],
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
  ],
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

- [ ] **Step 4: Initialize EmDash**

```bash
npx emdash init && npx emdash seed seed/seed.json
```

- [ ] **Step 5: Create src/live.config.ts** (EmDash collection loader — same as muse)

```typescript
// src/live.config.ts
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
```

- [ ] **Step 6: Set secrets**

```bash
wrangler secret put SITE_PASSWORD
wrangler secret put GITHUB_TOKEN
wrangler secret put FROM_EMAIL
wrangler secret put TO_EMAIL
wrangler secret put OPS_API_SECRET
wrangler secret put OPS_API_URL
```

- [ ] **Step 7: Commit**

```bash
git add wrangler.jsonc seed/ src/live.config.ts
git commit -m "feat: EmDash schema seed, wrangler config, live collection loader"
```

---

## Phase 1: Infrastructure (Tasks 3-5)

### File Map — Phase 1

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/middleware.ts` | Password gate + security headers + robots |
| Create | `src/pages/login.astro` | Login page (ported from inline HTML) |
| Create | `src/layouts/Base.astro` | Base layout with Lexend, coral/sage, theme toggle |
| Create | `src/styles/tokens.css` | Design tokens ported from current hub |

---

### Task 3: Password Gate Middleware

Port from `functions/_middleware.js` to Astro middleware following muse pattern. Key changes: scoped `/_emdash/` bypass, CSRF origin validation, security headers, robots noindex.

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write src/middleware.ts**

```typescript
// src/middleware.ts
/**
 * Password gate + security headers for Clutterbusters Hub.
 * Ported from functions/_middleware.js, adapted for Astro + Workers.
 */
import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";

const COOKIE_NAME = "hub_auth";
const LOGIN_PATH = "/login";
const ALLOWED_ORIGIN = "https://clutterbusters.adrianwedd.com";

// Routes that bypass the password gate
const PUBLIC_PATHS = [
  LOGIN_PATH,
  "/_emdash/admin",   // EmDash admin (has passkey auth)
  "/_emdash/api",     // EmDash API (passkey-authenticated)
  "/_astro/",         // Static assets (hashed filenames)
  "/favicon",
  "/api/contact",     // Public contact form
  "/api/intake",      // Public intake form
  "/intake",          // Public intake page (new clients)
  "/robots.txt",
];

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let diff = 0;
  for (let i = 0; i < aBuf.length; i++) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, request } = context;

  // Block all other /_emdash/* paths (deny-by-default)
  if (
    url.pathname.startsWith("/_emdash/") &&
    !url.pathname.startsWith("/_emdash/admin") &&
    !url.pathname.startsWith("/_emdash/api")
  ) {
    return new Response("Not Found", { status: 404 });
  }

  // CSRF origin validation on POST requests to public endpoints
  if (request.method === "POST") {
    const origin = request.headers.get("Origin") || "";
    const isPublicPost =
      url.pathname === "/api/contact" ||
      url.pathname === "/api/intake" ||
      url.pathname === LOGIN_PATH;

    if (isPublicPost && origin && origin !== ALLOWED_ORIGIN) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let sitePassword: string | undefined;
  try {
    sitePassword = (env as Record<string, string>).SITE_PASSWORD;
  } catch {
    // env not available (e.g. prerender) — pass through
    return next();
  }

  // No password set — block in production, allow in dev
  if (!sitePassword) {
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      return next();
    }
    console.error("CRITICAL: SITE_PASSWORD not configured in production");
    return new Response("Hub is misconfigured. Contact administrator.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) {
    const response = await next();
    // Add security headers to all responses
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Check auth cookie
  const salt = url.hostname;
  const expectedHash = await sha256Hex(sitePassword + salt);
  const authCookie = cookies.get(`__Host-${COOKIE_NAME}`)?.value;

  if (authCookie && /^[0-9a-f]{64}$/.test(authCookie)) {
    if (timingSafeEqual(authCookie, expectedHash)) {
      const response = await next();
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        response.headers.set(key, value);
      }
      return response;
    }
  }

  // Redirect to login
  const returnTo = url.pathname + url.search;
  return redirect(
    `${LOGIN_PATH}?return=${encodeURIComponent(returnTo)}`
  );
});
```

- [ ] **Step 2: Verify middleware compiles**

```bash
npx astro check
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: password gate middleware with scoped EmDash bypass, CSRF, security headers"
```

---

### Task 4: Login Page

Port the inline login HTML from `_middleware.js` to an Astro page.

**Files:**
- Create: `src/pages/login.astro`

- [ ] **Step 1: Create src/pages/login.astro**

Port the `loginPage()` HTML from `functions/_middleware.js` into an Astro page. The login form POSTs to itself. On POST, validate the password against `SITE_PASSWORD`, set the `__Host-hub_auth` cookie, and redirect.

Key implementation details:
- Read `SITE_PASSWORD` via `import { env } from 'cloudflare:workers'`
- Same SHA-256 + hostname salt pattern as current middleware
- Same `__Host-` cookie prefix, `HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
- Same visual design (coral/sage palette, dark mode support)
- Sanitize redirect parameter (same `sanitizeRedirect()` logic)
- Return 401 with login form on failed auth

- [ ] **Step 2: Commit**

```bash
git add src/pages/login.astro
git commit -m "feat: login page (ported from inline middleware HTML)"
```

---

### Task 5: Base Layout, Styles & robots.txt

Port design tokens and create the base Astro layout.

**Files:**
- Create: `src/layouts/Base.astro`
- Create/Move: `src/styles/tokens.css` (from `styles/tokens.css`)
- Create: `public/robots.txt`

- [ ] **Step 1: Copy design tokens**

```bash
mkdir -p src/styles
cp styles/tokens.css src/styles/tokens.css
```

- [ ] **Step 2: Create src/layouts/Base.astro**

Include:
- Lexend font import (Google Fonts)
- Import `tokens.css`
- Theme toggle (ported from `scripts/theme-toggle.js` as inline script)
- `<meta name="robots" content="noindex, nofollow">` (belt-and-suspenders with header)
- Navigation from EmDash menu (or hardcoded for now)
- Slot for page content

Reference muse's layout structure but use Clutterbusters coral/sage palette.

- [ ] **Step 3: Create public/robots.txt**

```
User-agent: *
Disallow: /
```

- [ ] **Step 4: Deploy skeleton to verify Workers + D1 + R2**

```bash
npm run deploy
```

Verify on `clutterbusters-hub.{account}.workers.dev`:
- Login page renders
- Password gate works
- `/_emdash/admin` loads (EmDash admin UI)
- robots.txt returns `Disallow: /`

- [ ] **Step 5: Commit**

```bash
git add src/layouts/ src/styles/ public/robots.txt
git commit -m "feat: Base layout, design tokens, robots.txt, skeleton deploy"
```

---

## Phase 2: Port Pages (Tasks 6-10)

Tasks 6-10 can run in parallel after Phase 1.

### File Map — Phase 2

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/pages/index.astro` | Homepage (services from EmDash) |
| Create | `src/pages/intake.astro` | Intake form (ported HTML + JS) |
| Create | `src/pages/request.astro` | Request form (ported HTML + JS) |
| Create | `src/pages/dashboard.astro` | Dashboard (ported Kanban + JS) |
| Create | `src/pages/issues/[number].astro` | Issue detail (ported + JS) |
| Create | `src/pages/docs/index.astro` | Doc index (EmDash documents) |
| Create | `src/pages/docs/[slug].astro` | Doc detail (EmDash PortableText) |

---

### Task 6: Homepage

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Create homepage**

Query EmDash for:
- `pages` collection entry with `url_slug === "home"` for hero copy
- `services` collection where `featured === true`, ordered by `order`

Render hero section using structured fields (`hero_heading`, `hero_subheading`, `cta_label`, `cta_url`). Render services grid. Keep dashboard CTA and doc section links as hardcoded elements.

```typescript
// Example EmDash query pattern (from muse)
import { getEmDashCollection, getEmDashEntry } from "emdash/runtime";

const homePage = await getEmDashEntry("pages", "home");
const services = await getEmDashCollection("services", {
  filter: { featured: true },
  sort: { field: "order", direction: "asc" },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: homepage with EmDash services and structured hero"
```

---

### Task 7: Intake & Request Forms

**Files:**
- Create: `src/pages/intake.astro`
- Create: `src/pages/request.astro`

- [ ] **Step 1: Port intake form**

Copy HTML from `intake.html` into Astro template. Keep inline `<script>` for form validation and submission (vanilla JS, same `/api/intake` endpoint). Use Base layout.

- [ ] **Step 2: Port request form**

Same pattern from `request.html`. Posts to `/api/request`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/intake.astro src/pages/request.astro
git commit -m "feat: intake and request forms (ported from static HTML)"
```

---

### Task 8: Dashboard & Issue View

**Files:**
- Create: `src/pages/dashboard.astro`
- Create: `src/pages/issues/[number].astro`
- Create: `src/scripts/shared.ts`
- Create: `src/scripts/dashboard.ts`
- Create: `src/scripts/issue.ts`

- [ ] **Step 1: Port dashboard**

Copy HTML structure from `dashboard.html`. Include `shared.js` and `dashboard.js` as inline scripts (or external `.ts` files loaded via `<script>`). Same `/api/issues` endpoint.

- [ ] **Step 2: Port issue view**

Route is `/issues/[number]` (plural) to match claude-ops URL contract (`{hub_url}/issues/{number}`).

Add redirect from legacy URL pattern:
```typescript
// In middleware or as a redirect in astro.config.mjs
// /issue?id=123 -> /issues/123
```

- [ ] **Step 3: Port shared scripts**

Convert `scripts/shared.js` to TypeScript. Keep `linkifyContent()`, `enrichIssueLinks()`, `applyLabelColor()`, `isStructuralLabel()`. Remove `HUB_ALLOWED_DOCS` (replaced by EmDash).

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard.astro src/pages/issues/ src/scripts/
git commit -m "feat: dashboard and issue view (ported, /issues/{n} route)"
```

---

### Task 9: Document Viewer (EmDash)

**Files:**
- Create: `src/pages/docs/index.astro`
- Create: `src/pages/docs/[slug].astro`

- [ ] **Step 1: Create docs index page**

Query EmDash `documents` collection. Group by `audience` field (internal vs client-facing). Sort by `pinned` DESC then `order` ASC. Show title, summary, category badge.

- [ ] **Step 2: Create docs detail page**

Dynamic route `[slug].astro`. Query by `url_slug`. Render content via EmDash's `<PortableText>` component.

```typescript
// src/pages/docs/[slug].astro
import { getEmDashCollection, getEmDashEntry } from "emdash/runtime";
import PortableText from "emdash/components/PortableText.astro";

const { slug } = Astro.params;
const doc = await getEmDashEntry("documents", slug);
if (!doc) return Astro.redirect("/docs");
```

- [ ] **Step 3: Add legacy redirect in middleware**

Handle `docs.html?doc=operations/CLIENT_INTAKE.md` -> `/docs/{slug}`. Parse query param, strip path/extension, redirect.

- [ ] **Step 4: Commit**

```bash
git add src/pages/docs/
git commit -m "feat: doc viewer via EmDash PortableText (replaces file-based viewer)"
```

---

## Phase 3: Port API Routes (Tasks 10-11)

### File Map — Phase 3

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/pages/api/intake.ts` | Intake form handler (MailChannels) |
| Create | `src/pages/api/request.ts` | Request form handler (claude-ops) |
| Create | `src/pages/api/issues.ts` | GitHub Issues list proxy |
| Create | `src/pages/api/issue.ts` | GitHub Issue detail proxy |
| Create | `src/pages/api/contact.ts` | Contact form handler (MailChannels) |
| Create | `src/pages/api/reply.ts` | GitHub issue comment poster |

---

### Task 10: Port All API Routes

Each Pages Function becomes an Astro API route. Key changes for every file:
1. `export async function onRequestPost(context)` -> `export async function POST({ request })`
2. `context.env.SECRET` -> `(env as Record<string, string>).SECRET` with `import { env } from 'cloudflare:workers'`
3. Return `new Response()` (same as Pages Functions — no change here)
4. Origin validation already exists in current code — preserve it

**Files:**
- Create: `src/pages/api/intake.ts`
- Create: `src/pages/api/request.ts`
- Create: `src/pages/api/issues.ts`
- Create: `src/pages/api/issue.ts`
- Create: `src/pages/api/contact.ts`
- Create: `src/pages/api/reply.ts`

- [ ] **Step 1: Port intake.ts**

```typescript
// src/pages/api/intake.ts
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

const ALLOWED_ORIGIN = "https://clutterbusters.adrianwedd.com";

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  };

  // Origin validation (ported from existing code)
  const origin = request.headers.get("Origin") || "";
  if (origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers,
    });
  }

  // ... rest of intake logic (MailChannels email send)
  // Port from functions/api/intake.js, replacing context.env with env
  const fromEmail = (env as Record<string, string>).FROM_EMAIL;
  const toEmail = (env as Record<string, string>).TO_EMAIL;

  // Parse body, validate, send via MailChannels
  // (same logic as current intake.js)
};
```

- [ ] **Step 2: Port remaining API routes**

Same pattern for each: `request.ts`, `issues.ts`, `issue.ts`, `contact.ts`, `reply.ts`. Each replaces `context.env` with `import { env } from 'cloudflare:workers'`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/
git commit -m "feat: API routes ported from Pages Functions to Astro (env access change)"
```

---

### Task 11: API Contract Tests

Verify each endpoint returns expected responses after the port.

- [ ] **Step 1: Manual contract tests on staging**

Deploy to staging (`clutterbusters-hub.{account}.workers.dev`) and test each endpoint:

| Endpoint | Method | Test |
|----------|--------|------|
| `/api/intake` | POST (valid JSON) | Returns 200, email sent |
| `/api/intake` | POST (wrong origin) | Returns 403 |
| `/api/intake` | POST (missing fields) | Returns 400 |
| `/api/request` | POST (valid JSON) | Returns 200, issue created |
| `/api/issues` | GET | Returns JSON array of issues |
| `/api/issue?number=1` | GET | Returns single issue JSON |
| `/api/contact` | POST (valid) | Returns 200, email sent |
| `/api/reply` | POST (valid) | Returns 200, comment posted |
| `/login` | POST (correct password) | Returns 302 + Set-Cookie |
| `/login` | POST (wrong password) | Returns 401 |
| `/login` | POST (wrong origin) | Returns 403 |

- [ ] **Step 2: Verify MailChannels delivery**

Submit a test intake form on staging. Verify email arrives at `TO_EMAIL`. Check SPF/DKIM alignment.

- [ ] **Step 3: Commit test results**

```bash
git commit --allow-empty -m "test: API contract tests passed on staging"
```

---

## Phase 4: Content Migration (Tasks 12-13)

### Task 12: Migrate Documents to EmDash

- [ ] **Step 1: Prepare document inventory**

Map each markdown file to its EmDash document entry:

| File | Title | Audience | Category | Slug |
|------|-------|----------|----------|------|
| `docs/BUSINESS_PLAN.md` | Business Plan | internal | Strategy | `business-plan` |
| `docs/MARKETING_PLAN.md` | Marketing Plan | internal | Commercial | `marketing-plan` |
| `docs/MEETING_AGENDA.md` | Meeting Agenda | internal | Operations | `meeting-agenda` |
| `docs/commercial/STATEMENT_OF_WORK.md` | Statement of Work | internal | Commercial | `statement-of-work` |
| `operations/CLIENT_INTAKE.md` | Client Intake Process | internal | Operations | `client-intake` |
| `operations/EMAIL_TEMPLATES.md` | Email Templates | internal | Operations | `email-templates` |
| `operations/INVOICE.md` | Invoice Template | internal | Operations | `invoice` |
| `operations/PRICING_MATRIX.md` | Pricing Matrix | internal | Commercial | `pricing-matrix` |
| `operations/PROJECT_CHECKLIST.md` | Project Checklist | internal | Operations | `project-checklist` |
| `operations/JOB_CHECKLIST.md` | Job Checklist | internal | Operations | `job-checklist` |
| `resources/ADHD_ORGANIZING_GUIDE.md` | ADHD Organizing Guide | client-facing | Resources | `adhd-organizing-guide` |
| `resources/SENSORY_ASSESSMENT.md` | Sensory Assessment | client-facing | Resources | `sensory-assessment` |
| `resources/PHOTO_PERMISSIONS.md` | Photo Permissions | client-facing | Resources | `photo-permissions` |
| `GULLEY_AI_STRATEGY.md` | AI Strategy | internal | Strategy | `ai-strategy` |
| `GULLEY_MARKET_POSITIONING.md` | Market Positioning | internal | Strategy | `market-positioning` |

- [ ] **Step 2: Migrate via EmDash admin UI**

For each document:
1. Open `/_emdash/admin`
2. Create new document entry
3. Set title, url_slug, audience, category
4. Copy markdown content into Portable Text editor (EmDash handles Markdown paste)
5. Set `legacy_path` to original file path
6. Publish

- [ ] **Step 3: Verify all documents render at /docs/{slug}**

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "content: migrated all documents to EmDash (D1)"
```

---

### Task 13: Create Service & Page Entries

- [ ] **Step 1: Create service entries from index.html**

Extract service data from hardcoded `index.html`. Create each in EmDash admin:
- Body Doubling, Decluttering, Shed/Garage, Pre-sale Prep, Deceased Estate, Repairs, Recycling/Rubbish Removal

Set `url_slug`, `description`, `price_from`/`price_to`/`price_unit`/`price_note`, `order`, `featured`.

- [ ] **Step 2: Create homepage page entry**

Create a `pages` entry with `url_slug: "home"`. Set `hero_heading`, `hero_subheading`, `cta_label`, `cta_url` from current `index.html` content.

- [ ] **Step 3: Verify homepage renders with EmDash content**

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "content: services and homepage migrated to EmDash"
```

---

## Phase 5: Staging Verification & Cutover (Tasks 14-15)

### Task 14: Full Staging Verification

- [ ] **Step 1: Deploy to staging**

```bash
npm run deploy
```

- [ ] **Step 2: Run staging checklist**

| Check | Status |
|-------|--------|
| Password gate: login works | |
| Password gate: wrong password = 401 | |
| Password gate: no password env = 503 | |
| Password gate: `/intake` accessible without login | |
| EmDash admin: loads at `/_emdash/admin` | |
| EmDash admin: can edit a document | |
| EmDash admin: can upload an image | |
| Homepage: services render from CMS | |
| Homepage: hero copy from CMS | |
| Docs: document list renders | |
| Docs: document detail renders PortableText | |
| Dashboard: issues list loads | |
| Issue view: issue detail loads at `/issues/{n}` | |
| Intake form: submits successfully | |
| MailChannels: email arrives | |
| Request form: creates GitHub issue | |
| Security headers: all responses have X-Robots-Tag, X-Frame-Options, etc. | |
| robots.txt: returns Disallow: / | |
| `/_emdash/other`: returns 404 (not bypassed) | |
| Visual: side-by-side comparison with current site | |

- [ ] **Step 3: Register passkeys**

Register Gulley on 2 devices (phone + laptop). Register Adrian on 2 devices.

- [ ] **Step 4: Take pre-cutover D1 snapshot**

```bash
wrangler d1 export clutterbusters-hub-db --output backup-pre-cutover.sql
```

---

### Task 15: DNS Cutover

- [ ] **Step 1: Add Workers custom domain**

```bash
wrangler domains add clutterbusters.adrianwedd.com
```

Or via CF Dashboard: Workers & Pages > clutterbusters-hub > Settings > Domains & Routes > Add Custom Domain.

- [ ] **Step 2: Verify production URL**

Visit `https://clutterbusters.adrianwedd.com` — should now be served by Workers.

- [ ] **Step 3: Wait 24 hours before removing Pages deployment**

Monitor for issues. Only remove the Pages deployment after stability is confirmed.

- [ ] **Step 4: Remove Pages deployment**

Via CF Dashboard: Pages > clutterbusters-hub > Settings > Delete project.

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "ops: DNS cutover to Workers complete, Pages deployment removed"
```

---

## Phase 6: Training (Task 16)

### Task 16: Gulley Training

- [ ] **Step 1: Walk through EmDash admin**
  - Edit a document (show revision history)
  - Update a service description
  - Change homepage hero text
  - Upload an image

- [ ] **Step 2: Show recovery path**
  - "What if I break something?" -> revision history, call Adrian
  - Drafts vs published state

- [ ] **Step 3: Register backup passkey on second device**

- [ ] **Step 4: Document what Gulley can vs cannot do** (already in spec Section 7)

---

## Dependency Graph

```
Task 1 (scaffold) -> Task 2 (resources + seed)
                  -> Task 3 (middleware)
                  -> Task 4 (login page)
                  -> Task 5 (layout + styles)
                       |
                       v
            ┌──────────┼──────────┐
            v          v          v
     Tasks 6-9   Tasks 10-11   Tasks 12-13
     (pages)     (APIs)        (content)
            └──────────┼──────────┘
                       v
                  Task 14 (staging verification)
                       v
                  Task 15 (DNS cutover)
                       v
                  Task 16 (training)
```

Tasks 6-9, 10-11, and 12-13 can run in parallel after Tasks 3-5 complete.

---

## QA Findings Applied

All critical and high findings from the three-way QA (Codex + Gemini) have been addressed in the spec. Key changes reflected in this plan:

1. **Scoped EmDash bypass** (Codex #1) — middleware blocks `/_emdash/*` except `/admin*` and `/api*`
2. **CSRF origin validation** (Codex #2) — ported from existing middleware, applied to all POST routes
3. **Document visibility** (Codex #3) — `audience` field replaces `HUB_ALLOWED_DOCS`
4. **Explicit slugs** (Codex #4, Gemini #1) — `url_slug` field on all collections
5. **Structured homepage** (Codex #5) — explicit hero/CTA fields instead of PortableText blob
6. **Document schema enriched** (Codex #6) — audience, doc_type, order, legacy_path, file
7. **Pricing model** (Codex #7) — from/to range, unit, note fields
8. **Secret naming** (Codex #8) — consistently `SITE_PASSWORD`
9. **Passkey recovery** (Codex #9) — multi-device registration, CLI reset procedure
10. **Deployment sequence** (Codex #10) — deploy Workers first, verify, then remove Pages
11. **D1 backup** (Codex #11) — pre-cutover export
12. **CSP/security headers** (Codex #12) — set in middleware
13. **API contract tests** (Codex #13) — explicit test matrix
14. **Issue URL contract** (Codex #14) — `/issues/{n}` matches claude-ops
15. **Private R2 bucket** (Gemini #7) — no public access
16. **Deferred collections** (Codex #17) — posts/testimonials not in launch seed
17. **noindex/robots** (Codex #19) — belt-and-suspenders with middleware header + robots.txt
18. **Intake page bypass** (Gemini #1) — `/intake` page accessible without password
