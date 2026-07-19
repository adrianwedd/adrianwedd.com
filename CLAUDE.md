# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Adrian Wedd. Astro 6 on GitHub Pages. Dark-first design with botanical earth-tone palette (dusty copper accent).

## Commands

```
npm run dev            # dev server (localhost:4321)
npm run build          # production build (Astro + Pagefind indexing)
npm run preview        # preview production build
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
npm run fetch-analytics  # manual GA4 data fetch
npm run test:unit        # root unit tests (vitest) — test/unit/*.spec.ts, no build
npm run test:e2e         # full Playwright suite (build + preview on :4322)
npm run test:e2e:smoke   # @smoke subset — the PR gate (<3 min, Chromium)
npm run test:e2e:full    # nightly-only specs (search, filters, pagination, audio)
```

Content validation: `node scripts/validate-content.js` (checks required fields, description ≤160 chars, heroImage paths).

The Astro site has root unit tests (vitest, `test/unit/`) covering the pure lib helpers (`slug`/`imageSlug`/`youtubeId`/`ogSafeImage`/`heroAltText` in `src/lib/utils.ts`, the `parseDimensions` header parser in `src/lib/image-dimensions.ts`) and the `validateEntry` content-schema checks (`scripts/validate-content.js`). Config in `vitest.config.ts` is scoped to `test/unit/**` so it never picks up the Playwright specs or the `worker/` suites. Run with `npm run test:unit`; CI runs it as the `unit` job in `e2e.yml` on every PR.

The Astro site also has a Playwright E2E suite (`e2e/`), run in CI by `.github/workflows/e2e.yml` — smoke on PRs, full nightly. It serves the production build via `astro preview` on port 4322; the build must set `PUBLIC_GA_MEASUREMENT_ID` (CI uses a dummy `G-TESTE2E0000`) for the consent spec. `worker/` and `worker-csp/` each have their own test suite (`cd worker && npm test`, `cd worker-csp && npm test`).

## Stack

- **Framework:** Astro 6 with TypeScript strict
- **Styling:** Tailwind CSS 4 with CSS custom properties for theming
- **Islands:** Preact for interactive components (12 islands in `src/components/islands/`)
- **Content:** Astro Content Collections (blog, projects, gallery, audio, fixes, case-studies) in `src/content/`
- **Search:** Pagefind (client-side WASM, indexed at build time)
- **Hosting:** GitHub Pages via GitHub Actions (fully static output)
- **DNS:** Cloudflare
- **Analytics:** GA4 + LinkedIn Insight Tag, both consent-gated via `ConsentBanner.astro` + `Analytics.astro`
- **Media CDN:** Cloudflare R2 at `cdn.adrianwedd.com` — audio + video served from R2, infographics remain in git
- **Social:** Cloudflare Worker at `social.adrianwedd.com` for Facebook automation (see Worker section)
- **CSP Worker:** Cloudflare Worker in `worker-csp/` — injects per-request nonces into HTML at the edge, sets strict `Content-Security-Policy` response header (strict-dynamic, form-action, frame-ancestors). Route: `adrianwedd.com/*`.

## Architecture

### Theming (spans 3 files)
CSS custom properties define all colors in `src/styles/global.css` (`:root` = dark, `.light` = light). Tailwind 4 maps these via the `@theme` block in `global.css` (e.g. `bg-surface`, `text-accent`) — there is no `tailwind.config.mjs`. Theme flash is prevented by an inline script in `BaseLayout.astro` that reads `localStorage('theme')` before paint. ThemeToggle toggles `.light` on `<html>`.

**Never use Tailwind's `dark:` prefix** — theming is driven by CSS custom properties, not Tailwind dark mode classes.

### Content collections
Defined in `src/content.config.ts` with six collections (blog, projects, gallery, audio, fixes, case-studies). Key fields beyond the obvious:

- **blog:** title, description, date, tags (required), draft, heroImage, updatedDate, `faq` (optional `[{q, a}]` for FAQ schema), `series`/`seriesOrder` (multi-part posts), plus `notebookAssets` (audioUrl, videoUrl, infographic, etc.)
- **projects:** title, description, date, tags, status (`active|complete|archived|experiment`), featured, url, repo, heroImage, updatedDate, `series`/`seriesOrder`, plus `notebookAssets`
- **gallery:** title, date, tags, images array (`{src, alt, caption?}`), medium, collection, coverImage
- **audio:** title, description, date, tags, `audioUrl` (optional in the schema — the validator requires audioUrl OR videoUrl), duration, transcript, heroImage, `relatedProject`, `relatedPost`
- **fixes / case-studies:** title, description, date, tags, `category` (required)

`notebookAssets` is a shared schema across blog/projects providing: audioUrl, videoUrl, infographic, mindmap, quiz, flashcards, dataTable, slides. Note: `audioDuration` is a separate top-level field in blog/projects, not part of `notebookAssets`.

### Routing
File-based in `src/pages/`. Dynamic routes use `[...slug].astro` for blog, projects, gallery, audio detail pages. Blog has a paginated tag index at `blog/tag/[tag]/[...page].astro`. Two legacy redirects in `astro.config.mjs` (`/projects/ticketsmith/` → `/projects/`, `/2023/03/paperclip-maximizer/` → `/`).

### Islands architecture
Preact islands in `src/components/islands/` are client-hydrated interactive components. All other components are Astro (server-rendered, zero JS). Current islands include: AudioPlayer, Personalisation, Transparency, Flashcards, MindMap, DataTable, ShareButton, AnalyticsDashboard, Quiz, TableOfContents, TerminalEasterEgg, GitHubActivity.

### View Transitions compatibility
All interactive scripts must follow this pattern for Astro View Transitions:
- Use `is:inline` (not module `<script>`) so scripts re-execute on VT swap
- Use `documentElement.dataset.someInit` sentinel to prevent duplicate global listeners
- Use event delegation on `document` (not per-element listeners) since DOM elements get replaced
- Use lazy DOM lookups via functions (not cached references) since elements change
- Register `astro:after-swap` listener inside the sentinel guard to avoid accumulation

Components using this pattern: ThemeToggle, ConsentBanner, Lightbox, ScrollReveal, Header, blog tag toggle, audio filters, project filters, gallery filters, search/Pagefind, contact/booking widget, hero carousel.

**Exception:** `Analytics.astro` uses a bare `<script>` (Astro processes this as a module — runs once) with sentinels on `documentElement.dataset` for each global listener. The `astro:after-swap` handler only re-runs per-element trackers.

### Schema.org JSON-LD
- **about.astro:** Person schema using CV data from `src/data/base-cv.json`
- **projects/[...slug].astro:** SoftwareApplication (price conditional on `repo`) + conditional VideoObject
- **blog/[...slug].astro:** Article + conditional VideoObject + conditional FAQPage (from `faq` frontmatter)
- **services.astro:** ProfessionalService schema
- **Breadcrumb.astro:** BreadcrumbList on all detail pages

### OG image dimensions
`og:image:width` / `og:image:height` are read from the actual file at build time via `src/lib/image-dimensions.ts` — a 256 KB header parser for PNG/JPEG/WebP/GIF. Avoids the old filename-heuristic (`heroImage.includes('infographic')`) which mis-sized any hero whose path didn't match the convention. Build-time only (uses `node:fs`); never import into a Worker.

## CI/CD Pipeline

### Deploy (`deploy.yml`) — triggers on push to main
1. `npm ci` → validate content → audit deps → fetch GA4 analytics
2. Checkout CV data from `adrianwedd/cv` repo → copy to `src/data/base-cv.json`
3. `npm run build`
4. Check build size budget (`dist/_astro/` ≤ 100MB; warns on JS chunks >150KB)
5. Enforce no raw `<img>` on local paths (must use `<Picture>` from `astro:assets`)
6. Lychee link check (`dist/**/*.html`) — config in `.lychee.toml`
7. Internal-link check (`npm run check:links` → `scripts/check-internal-links.mjs`) — scans `dist/**/*.html` for same-origin links missing from `dist/`; closes the own-domain 404 blind spot Lychee skips
8. Upload pages artifact + deploy

### Other workflows
- **lighthouse.yml:** PR checks — builds + runs Lighthouse on 7 pages (90% thresholds)
- **social-autopublish.yml:** Queue sync on push to main — regenerates the date-scheduled queue from content (`scripts/generate-social-queue.mjs`) and syncs it to the worker's KV; broadcasting itself is date-triggered via the cron, not fire-on-commit
- **social-cron.yml:** Scheduled publish from queue every 10 min + comment monitor every 2 hours
- **content-pipeline.yml:** Weekly discovery of academic papers for blog draft PRs

## Worker (Cloudflare)

Located in `worker/`. Hono framework, TypeScript. State lives in KV (`SOCIAL`) plus a single Durable Object class (`CronLock`) used for atomic locking.

**Endpoints:**
- `POST /api/publish` — immediate multi-platform publish (`platform` ∈ `facebook|instagram|bluesky|twitter`). Optional `forceRetry: true` bypasses a `failed` idempotency record but never a `published` one. Returns `409` if another publish for the same `idempotencyKey` holds the per-key lock.
- `POST /api/queue` + `POST /api/queue/sync` — scheduled post queue (JSON seed in `social/facebook-posts.json`, KV is authoritative)
- `POST /api/cron/publish` — scheduled publish from queue (cron fires every 10 min)
- `POST /api/cron/comments` — comment monitor with classification (crisis detection, auto-reply)
- `GET /api/health` — token health + queue status

**Auth:** Timing-safe bearer token (`PUBLISH_SECRET` / `CLI_SECRET`). Idempotency via KV with 30-day TTL (failed records bypassable via `forceRetry`).

**Cron locking:** `CronLock` Durable Object provides atomic named locks via `blockConcurrencyWhile` + fencing tokens. Used in three places:
- `cron-lock:publish` (300s TTL) — serialises `/api/cron/publish`
- `cron-lock:comments` (300s TTL) — serialises `/api/cron/comments`
- `publish:<idempotencyKey>` (60s TTL) — serialises the read-decide-publish window in `/api/publish` so concurrent `forceRetry` calls can't double-post

KV-based locks have a TOCTOU window between `get` and `put`; the DO closes that. `release()` requires the fencing token returned by `tryAcquire`, so a run that exceeds its TTL can't release the successor's lock.

**Tests:** Vitest with a per-platform mock registry (`getPlatformMocks(name)`) — each platform has independent `publishPost`/`debugAuth` mocks so multi-platform scenarios (e.g. one healthy + one expired) can be tested in a single run. `cloudflare:workers` is aliased to `worker/test-shims/cloudflare-workers.ts` for vitest.

**Deploy:** `cd worker && npx wrangler deploy`. CLI posting: `scripts/fb-post.sh`. Validate locally with `npx wrangler deploy --dry-run` before pushing.

## Key patterns

- **Slug utility:** Astro 6 collection IDs include `.md` extension. Always use `slug()` from `src/lib/utils.ts` when generating hrefs from collection IDs.
- **Image slug:** Use `imageSlug()` from `src/lib/utils.ts` for gallery image URLs derived from alt text.
- **No custom fonts:** System font stack only — zero font downloads.
- **Consent-first:** No tracking before user consent. ConsentBanner dispatches `consent-updated` CustomEvent. Use `dns-prefetch` (not `preconnect`) for GA4 origins — preconnect opens TCP/TLS before consent.
- **Class-based selectors:** ThemeToggle and Header use class selectors (not IDs) to avoid duplicate ID issues when rendered in both desktop and mobile nav.
- **Images:** Use `<Picture>` from `astro:assets` for all local images — never raw `<img>` on local paths (CI gate enforces this).
- **CV sync:** `src/data/cv.ts` reads `src/data/base-cv.json` (gitignored, synced from `adrianwedd/cv` at build time). Falls back to DEFAULTS if file missing.

## Permalink strategy

URLs are permanent. Once published, a page's URL must not change.

- **Blog:** `/blog/{slug}/` — slug derived from filename (strip `.md`)
- **Projects:** `/projects/{slug}/` — slug derived from filename
- **Gallery collections:** `/gallery/{slug}/` — slug derived from filename
- **Gallery images:** `/gallery/{collection}/{image-slug}/` — image-slug from alt text
- **Audio:** `/audio/{slug}/` — slug derived from filename

**Rules:**
- Never rename a content file after publication (changes the URL)
- Canonical URLs are set automatically via `SEOHead.astro`
- If a URL must change, add a redirect in the Astro config or a 301 page
- `updatedDate` in frontmatter tracks content revisions without changing URLs

## Content authoring

```
scripts/new-post.sh "Title"       # scaffold blog post
scripts/new-project.sh "Title"    # scaffold project page
scripts/import-gallery.sh dir/    # import image directory as gallery
scripts/import-audio.sh file.mp3  # import audio as episode
```

### Key scripts
- `scripts/validate-content.js` — validates all content (required fields, description ≤160 chars)
- `scripts/generate-og-images.mjs` — generates 1200×630 OG text-card PNGs to `public/og/{blog,projects}/{slug}.png` via sharp+SVG. Skips drafts, existing files, and **posts with a `heroImage`** (those use the heroImage as og:image per `[...slug].astro`, so a text card would be dead weight). `public/og/blog/` is committed — it holds cards for heroImage-less posts
- `scripts/fetch-ga4-data.mjs` — pulls analytics from GA4 service account (falls back to mock data)
- `scripts/fb-post.sh` — CLI for Facebook posting (immediate, scheduled, backdated)

## NotebookLM Automation

**Location**: `scripts/notebooklm/` (within the repo)

Automated generation of audio overviews, video summaries, and other Studio assets for blog posts and projects.

### Quick Start

```bash
cd scripts/notebooklm

# Authenticate (one-time)
nlm login

# Generate audio + video for a project
./scripts/automate-notebook.sh --config my-config.json --parallel
```

### Key Scripts

**`automate-notebook.sh`** - End-to-end automation from JSON config:
- Creates notebook from title
- Adds sources (URLs, text files, Google Drive)
- Generates artifacts (audio, video, quiz, flashcards, etc.)
- Exports to directory structure
- Returns JSON summary

**`generate-parallel.sh`** - Concurrent artifact generation:
- Generate multiple artifacts at once (3x faster)
- Real-time progress monitoring
- Use with `--wait --download ./output`

**`research-topic.sh`** - Smart notebook creation from topics:
- DuckDuckGo + Wikipedia source discovery
- URL deduplication
- Automatic source addition

### Generating Assets for Projects

**1. Create config JSON** (per project):

```json
{
  "title": "Project Name - Audio Overview",
  "sources": [
    "textfile:src/content/projects/project-name.md"
  ],
  "studio": [
    {"type": "audio"},
    {"type": "video"}
  ]
}
```

**2. Run automation**:

```bash
cd scripts/notebooklm
./scripts/automate-notebook.sh \
  --config project-config.json \
  --parallel \
  --export ./exports/project-name
```

**3. Upload to R2 and update frontmatter**:

Audio and video are served from `cdn.adrianwedd.com` (Cloudflare R2 bucket `adrianwedd-com-media`). Infographics remain in `public/notebook-assets/` (committed to git).

**NEVER compress or re-encode the audio** — serve it at original quality. NLM delivers 256kbps stereo AAC in an MP4 container (even when the download is named `.mp3`); copy it as-is to `audio.m4a`. Keep the original take forever — deleted notebooks can't re-issue the same narration.

```bash
# Copy original-quality audio as-is (no transcode)
cp exports/project-name/studio/audio/overview.mp3 \
   public/notebook-assets/project-name/audio.m4a

# Upload audio + video to R2
./scripts/upload-media-to-r2.sh

# Copy infographic to git-tracked directory
cp exports/project-name/studio/infographic/*.png \
   public/notebook-assets/project-name/infographic.webp
```

**4. Update project frontmatter** (CDN URLs for audio/video, local for infographic):

```markdown
---
title: "Project Name"
audioUrl: "https://cdn.adrianwedd.com/notebook-assets/project-name/audio.m4a"
videoUrl: "https://cdn.adrianwedd.com/notebook-assets/project-name/video.mp4"
heroImage: "/notebook-assets/project-name/infographic.webp"
---
```

**5. Create audio collection entry** (for cross-linking):

```markdown
---
title: "Project Name Overview"
description: "Audio deep dive into..."
date: 2026-02-13
tags: ["notebooklm", "relevant-tags"]
audioUrl: "https://cdn.adrianwedd.com/notebook-assets/project-name/audio.m4a"
duration: "8:47"
relatedProject: "project-name"
---

NotebookLM Studio overview generated from project materials...

[View the full project →](/projects/project-name/)
```

### Branded Visual Style

All visual assets (infographics, videos, slides) must use the branded dark botanical aesthetic. The canonical `--focus` prompt is defined in `scripts/regenerate-branded-infographics.sh` and should be used for all NotebookLM visual generation:

```
Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34).
Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones,
no bright or neon colours. Elegant editorial layout with strong typographic hierarchy.
Professional data visualisation with muted, saturated colour palette. WCAG AA contrast
ratios. Minimal, sophisticated, Australian dark-mode design.
```

Scripts that use this: `regenerate-branded-infographics.sh`, `generate-all-infographics.sh`, `regenerate-one-infographic.sh`. Always pass `--focus` with this prompt when generating visual assets.

### Asset Types

**Fast** (~30-60 seconds):
- `quiz` - Quiz questions (JSON)
- `flashcards` - Study cards (JSON)
- `data-table` - Data table (CSV)
- `report` - Written report (Markdown)

**Slow** (2-10 minutes):
- `audio` - Audio overview (MP3, 20-60MB)
- `video` - Video summary (MP4, 30-100MB)

**Visual**:
- `infographic` - Visual infographic (PNG)
- `mindmap` - Mind map diagram (JSON)
- `slides` - Presentation slides (PDF)

### Batch Generation Helpers

**Audio overviews** for all projects without them:

```bash
./scripts/generate-all-notebook-assets.sh
```

This script:
1. Identifies projects without audioUrl
2. Creates NotebookLM configs
3. Runs parallel audio generation
4. Copies original-quality audio as-is (never compress)
5. Moves assets to public/notebook-assets/
6. Updates project frontmatter

**Infographic hero images** for all projects:

```bash
./scripts/generate-all-infographics.sh [--yes] [--landscape]
```

This script:
1. Finds projects without infographics
2. Generates portrait infographics (1536x2752px)
3. Uses consistent focus prompt for visual cohesion
4. Converts to WebP (~150KB vs 6MB PNG)
5. Updates heroImage in project frontmatter
6. Skips projects with existing infographics

**Retry failed generations:**

```bash
./scripts/retry-failed-infographics.sh [--yes]
```

Auto-detects projects without infographics and retries generation (useful after hitting rate limits).

### Daily Quota

NotebookLM has generation limits:
- ~50 audio generations per day
- ~50 video generations per day
- ~50 infographic generations per day
- Unlimited text-based artifacts (quiz, flashcards, reports)

Plan accordingly for batch generation. If hitting rate limits, wait 24 hours and retry.

### Authentication

Cookie-based via Chrome DevTools Protocol:
- Stored in `~/.notebooklm-mcp-cli/profiles/default`
- Re-auth when cookies expire: `nlm login`
- Use dedicated Google account (ToS violation risk)

### Export Structure

```
exports/project-name/
├── metadata.json
├── sources/
│   ├── index.json
│   └── content--<id>.md
└── studio/
    ├── manifest.json
    ├── audio/
    │   └── overview.mp3
    └── video/
        └── overview.mp4
```

## Gotchas

- Content collection IDs include file extension (`.md`/`.mdx`) — always strip with `slug()`
- Light mode accent color is `#8a5e42` (umber) for WCAG AA on warm cream backgrounds
- Tailwind color utilities (`bg-surface`, `text-muted`, `text-accent`) resolve through CSS custom properties — inspect the `@theme` block in `src/styles/global.css`
- **NotebookLM audio/video generation takes 2-10 minutes per asset** — batch generation of 30 projects = ~1-5 hours total
- Content descriptions must be ≤ 160 chars (validated by `scripts/validate-content.js` and CI)
- Lychee link checker excludes social media domains, private repos, and own domain (pre-deploy 404s) — see `.lychee.toml`
- `src/data/base-cv.json` is gitignored — synced from `adrianwedd/cv` at build time; local dev works without it (falls back to defaults)

## QA Tools

### Codex CLI
```bash
codex exec --full-auto "prompt"     # non-interactive execution
codex review                        # code review
```
Use for: security review, correctness checks, codebase-wide QA. Runs in sandbox.

### Agy CLI (Gemini-based)
```bash
agy -p "prompt" --dangerously-skip-permissions   # non-interactive, auto-approve tools
agy --print "prompt" --dangerously-skip-permissions  # long form
agy --print-timeout 10m "prompt" --dangerously-skip-permissions  # override 5m default timeout
```
Use for: accessibility review, design consistency, content QA. Has file access.

### Hermes CLI
```bash
hermes -z "prompt"                   # one-shot: send a single prompt, print ONLY the response (USE THIS for scripts/QA)
hermes -z "prompt" -m model          # specific model (e.g. anthropic/claude-sonnet-4.6)
hermes -z "prompt" --skills arxiv    # preload skills
hermes -z "prompt" -t toolsets       # restrict toolsets
```
**Use `-z`/`--oneshot` (top-level) for all programmatic/background use** — it prints only the final response, ideal for `tee`/piping. Do NOT use `hermes chat -q ... -Q` for scripting: `chat` is the interactive subcommand and in background runs it engages the chat agent's side machinery (TTS, session log) and returns only a `session_id` instead of the answer.

Use for: research tasks, cross-referencing, second-opinion QA, web browsing. Also registered as MCP server (`hermes-acp`) for direct tool access (browser, web search, memory, cron) without shelling out.

### Multi-Engine QA Pattern
Run Codex + Agy + Hermes + Claude agent in parallel for comprehensive review:
```bash
codex exec --full-auto "QA prompt" 2>&1 | tee /tmp/codex-qa.txt &
agy -p "QA prompt" --dangerously-skip-permissions 2>&1 | tee /tmp/agy-qa.txt &
hermes -z "QA prompt" 2>&1 | tee /tmp/hermes-qa.txt &
wait
```
Each engine catches different things. Codex is strongest on security + correctness. Agy is strongest on design + accessibility. Hermes is strongest on research + cross-referencing. Claude agent is strongest on architecture + spec compliance.

Reliability notes from a multi-round cross-agent session: codex verifies findings by writing and running live repro scripts (its findings are the most trustworthy), but its dispatch can stall in non-interactive batch mode when it hits an unresolved design question — kill and relaunch with the decision pre-resolved rather than waiting it out. Hermes is the most careful at distinguishing pre-existing repo patterns from genuinely new bugs, but is consistently the slowest to finish. Agy is a solid reviewer but a riskier implementer — its own green test suites don't prove generated code/files actually work (tests can pass without ever executing the artifact produced), so always read the diff of anything agy implements directly before trusting it. In general, read the diff yourself before dispatching QA — don't rely on a green test suite alone.

Read STRATEGY.md before any task. It overrides your judgment.
