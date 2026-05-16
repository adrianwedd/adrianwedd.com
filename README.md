# adrianwedd.com

Personal website of Adrian Wedd. Astro 5 on GitHub Pages. Dark-first design with botanical earth-tone palette.

## Quick Start

```bash
npm install
npm run dev            # dev server at localhost:4321
npm run build          # production build (Astro + Pagefind indexing)
npm run preview        # preview production build
npm run lint           # ESLint
npm run format         # Prettier (write)
npm run format:check   # Prettier (check only)
```

## Stack

| Layer              | Technology                                                           |
| ------------------ | -------------------------------------------------------------------- |
| **Framework**      | Astro 5 (fully static output), TypeScript strict                     |
| **Styling**        | Tailwind CSS 3 with CSS custom properties for dark/light theming     |
| **Islands**        | Preact for 13 interactive components                                 |
| **Content**        | Astro Content Collections — blog, projects, gallery, audio           |
| **Search**         | Pagefind (client-side WASM, indexed at build time)                   |
| **Analytics**      | GA4 + LinkedIn Insight Tag, consent-gated via ConsentBanner          |
| **Hosting**        | GitHub Pages via GitHub Actions                                      |
| **DNS**            | Cloudflare                                                           |
| **Media CDN**      | Cloudflare R2 at `cdn.adrianwedd.com` (audio + video)                |
| **Enquiry system** | Ops worker at `ops.adrianwedd.com` → GitHub Issues → chat page       |
| **Bot protection** | Cloudflare Turnstile on contact form                                 |
| **Social**         | Cloudflare Worker at `social.adrianwedd.com` for Facebook automation |

## Architecture

### Theming (spans 3 files)

CSS custom properties in `src/styles/global.css` (`:root` = dark, `.light` = light) drive all colours. Tailwind maps them via `tailwind.config.mjs` (e.g. `bg-surface`, `text-accent`). An inline script in `BaseLayout.astro` reads `localStorage('theme')` before paint to prevent flash.

**Never use Tailwind's `dark:` prefix** — theming is driven by CSS custom properties, not Tailwind dark mode.

### View Transitions

All interactive scripts use `is:inline` with sentinel guards on `documentElement.dataset` to survive Astro View Transitions. Pattern:

- `is:inline` (not module `<script>`) so scripts re-execute on VT swap
- Sentinel on `documentElement.dataset` to prevent duplicate global listeners
- Event delegation on `document` since DOM elements get replaced
- Lazy DOM lookups via functions (not cached references)
- `astro:after-swap` listener for re-initialising widgets (e.g. Turnstile)

### Islands (13 Preact components)

Client-hydrated interactive components in `src/components/islands/`:

| Island             | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| AudioPlayer        | Audio playback for blog/project audio overviews |
| Personalisation    | Dynamic content personalisation                 |
| Transparency       | AI transparency disclosures                     |
| Flashcards         | Study cards from NotebookLM                     |
| Quiz               | Quiz questions from NotebookLM                  |
| MindMap            | Mind map diagrams                               |
| DataTable          | Interactive data tables                         |
| TableOfContents    | Scrolling ToC with active-section highlighting  |
| ActivityDashboard  | GitHub activity visualisation                   |
| GitHubActivity     | GitHub contribution data                        |
| AnalyticsDashboard | GA4 analytics display                           |
| ShareButton        | Social sharing                                  |
| TerminalEasterEgg  | Hidden terminal emulator                        |

All other components are Astro (server-rendered, zero JS).

### Content Collections

Defined in `src/content.config.ts` with four collections:

| Collection   | Key fields                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **blog**     | title, description, date, tags, draft, heroImage, `faq` (optional `[{q,a}]` → FAQ schema), `series`/`seriesOrder`, plus `notebookAssets` (audioUrl, videoUrl, infographic, mindmap, quiz, flashcards, dataTable, slides) |
| **projects** | title, description, date, tags, status (`active\|complete\|archived\|experiment`), featured, url, repo, heroImage, `series`/`seriesOrder`, plus `notebookAssets`                                                         |
| **gallery**  | title, date, tags, images array (`{src, alt, caption?}`), medium, collection, coverImage                                                                                                                                 |
| **audio**    | title, description, date, tags, `audioUrl` (required), duration, transcript, heroImage, `relatedProject`, `relatedPost`                                                                                                  |

### Permalink Strategy

URLs are permanent. Once published, a page's URL must not change.

- **Blog:** `/blog/{slug}/`
- **Projects:** `/projects/{slug}/`
- **Gallery:** `/gallery/{slug}/`, images at `/gallery/{collection}/{image-slug}/`
- **Audio:** `/audio/{slug}/`

`updatedDate` in frontmatter tracks content revisions without changing URLs.

### Schema.org JSON-LD

- `about.astro` — Person schema (from `src/data/base-cv.json`)
- `projects/[...slug].astro` — SoftwareApplication + conditional VideoObject
- `blog/[...slug].astro` — Article + conditional VideoObject + conditional FAQPage
- `services.astro` — ProfessionalService
- `Breadcrumb.astro` — BreadcrumbList on all detail pages

## Enquiry System

The contact form at `/contact` creates tracked enquiry tickets via the ops worker:

```
Contact form (Turnstile-gated)
  → POST ops.adrianwedd.com/api/enquiry (Turnstile + origin validation)
    → Creates GitHub Issue in adrianwedd/adrianwedd.com
    → Returns read_token + write_token
  → Redirect to /enquiry/?t=read_token
    → Chat page polls ops worker for replies
    → User can reply (write_token auth)
```

The ops worker (`adrianwedd/adrianwedd-ops` at `ops.adrianwedd.com`) handles:

- Turnstile verification
- GitHub Issue creation via GitHub App installation token
- Conversation token management (30-day KV TTL)
- Email notification to client
- Comment classification (AI-powered via Claude) for auto-reply and crisis detection

Turnstile widget re-renders on View Transition navigation via explicit `turnstile.render()` in the `astro:after-swap` handler.

## Social Media Worker

Cloudflare Worker (`worker/`) at `social.adrianwedd.com` manages cross-platform social posting.

**Features:**

- Auto-publish new blog posts and projects on push to `main`
- Multi-platform: Facebook, Instagram, Bluesky, X/Twitter
- Scheduled and ad-hoc post queue (JSON seed in `social/`, KV for state)
- Comment monitoring with crisis detection, classification, and auto-reply
- Backdated posting to match original publication dates
- Idempotency via commit-SHA-based keys (force-retry via `forceRetry: true` for failed records)
- Atomic cron locking via Durable Object (`CronLock`) with fencing tokens — prevents concurrent cron tick races

**CLI:**

```bash
scripts/fb-post.sh "Post text"                          # immediate post
scripts/fb-post.sh "Post text" --link URL               # link post
scripts/fb-post.sh "Post text" --backdate 2026-01-15    # backdated
scripts/fb-post.sh "Post text" --schedule 2026-04-01    # scheduled
scripts/fb-post.sh --health                             # token + queue status
scripts/fb-post.sh --sync                               # sync queue JSON to KV
```

**Worker endpoints:**

- `POST /api/publish` — immediate publish on the platform named in the request body (`platform` ∈ `facebook|instagram|bluesky|twitter`). `forceRetry: true` retries a `failed` idempotency entry. Returns `409` if another publish for the same `idempotencyKey` is already in flight.
- `POST /api/queue` + `POST /api/queue/sync` — scheduled queue
- `POST /api/cron/publish` — hourly publish from queue (DO-locked)
- `POST /api/cron/comments` — comment monitor, 2-hourly (DO-locked)
- `GET /api/health` — token health and queue status

Worker tests: `cd worker && npm test`. Local validation: `cd worker && npx wrangler deploy --dry-run`.

## NotebookLM Automation

Automated generation of audio overviews, video summaries, infographics, and other Studio assets for blog and project pages. Scripts in `scripts/notebooklm/`.

**Quick start:**

```bash
cd scripts/notebooklm
nlm login                                                    # authenticate (one-time)
./scripts/automate-notebook.sh --config config.json --parallel  # generate assets
```

**Asset types:** audio (~2-10 min generation), video (~2-10 min), infographic, mindmap, quiz, flashcards, data-table, report, slides.

**Media pipeline:**

1. Generate assets via NotebookLM
2. Compress audio to 64kbps mono MP3
3. Upload audio + video to R2 (`cdn.adrianwedd.com`)
4. Keep infographics in `public/notebook-assets/` (committed to git)
5. Update frontmatter with CDN URLs (audio/video) and local paths (infographic)

**Batch generation:** `scripts/generate-all-notebook-assets.sh` (audio), `scripts/generate-all-infographics.sh` (images), `scripts/retry-failed-infographics.sh` (retry after rate limits). Daily quota: ~50 generations per asset type.

See `docs/NOTEBOOKLM_PIPELINE.md` for the full pipeline reference.

## CI/CD Pipeline

### Deploy (`deploy.yml`) — triggers on push to `main`

1. `npm ci` → validate content → audit deps → fetch GA4 analytics
2. Checkout CV data from `adrianwedd/cv` repo → copy to `src/data/base-cv.json`
3. `npm run build` (Astro + Pagefind)
4. Build size budget: `dist/_astro/` ≤ 100MB; warn on JS chunks > 150KB
5. Enforce no raw `<img>` on local paths (must use `<Picture>` from `astro:assets`)
6. Lychee link check (`dist/**/*.html`) — config in `.lychee.toml`
7. Upload pages artifact + deploy to GitHub Pages

### Other Workflows

| Workflow                 | Trigger                            | Purpose                                             |
| ------------------------ | ---------------------------------- | --------------------------------------------------- |
| `lighthouse.yml`         | PR checks                          | Lighthouse on 7 pages (90% thresholds)              |
| `social-autopublish.yml` | Push to main                       | Detect new content, post to Facebook (skips drafts) |
| `social-cron.yml`        | Hourly + 2-hourly                  | Publish from queue + comment monitor                |
| `content-pipeline.yml`   | Weekly (Sunday 22:00 UTC) + manual | Discover academic papers, create draft blog PRs     |

## Scripts

### Content Authoring

- `scripts/new-post.sh "Title"` — scaffold blog post
- `scripts/new-project.sh "Title"` — scaffold project page
- `scripts/import-gallery.sh dir/` — import image directory as gallery
- `scripts/import-audio.sh file.mp3` — import audio episode

### Validation & Generation

- `scripts/validate-content.js` — check required fields, description ≤ 160 chars, heroImage paths
- `scripts/generate-og-images.mjs` — generate 1200×630 OG PNGs from frontmatter (skips drafts/existing)
- `scripts/fetch-ga4-data.mjs` — pull analytics from GA4 service account
- `scripts/extract-frontmatter.mjs` — extract YAML frontmatter as JSON (used by autopublish)
- `scripts/validate-schema.mjs` — validate structured data

### Media & CDN

- `scripts/upload-media-to-r2.sh` — upload audio/video to Cloudflare R2
- `scripts/optimise-images.sh` — compress images
- `scripts/migrate-to-r2.sh` — migrate assets from git to R2

### NotebookLM

- `scripts/generate-all-notebook-assets.sh` — batch audio generation
- `scripts/generate-all-infographics.sh` — batch infographic generation
- `scripts/retry-failed-infographics.sh` — retry after rate limits
- `scripts/regenerate-branded-infographics.sh` — regenerate with consistent branding

### Social

- `scripts/fb-post.sh` — CLI for Facebook posting (immediate, scheduled, backdated)

## Key Patterns

- **Slug utility:** Collection IDs include `.md` extension. Always strip with `slug()` from `src/lib/utils.ts`
- **No custom fonts:** System font stack only — zero font downloads
- **Consent-first:** No tracking before user consent. `dns-prefetch` (not `preconnect`) for GA4 origins
- **Images:** Use `<Picture>` from `astro:assets` for all local images (CI gate enforces this)
- **CV sync:** `src/data/cv.ts` reads `src/data/base-cv.json` (gitignored, synced from `adrianwedd/cv` at build time)
- **Class-based selectors:** ThemeToggle and Header use class selectors (not IDs) to avoid duplicate ID issues across desktop/mobile nav

## Design

- Botanical earth-tone palette: plum-tinted darks, dusty copper accent, mauve-gray muted
- Light mode: warm cream backgrounds with umber accent (`#8a5e42`)
- System fonts only — zero font downloads
- WCAG 2.1 AA compliant
- Consent-first: no tracking before user consent
- `prefers-reduced-motion` and `prefers-contrast` respected
- Mobile-first responsive

## Documentation

- `CLAUDE.md` — AI agent instructions and full codebase reference
- `docs/PROJECT_SPEC.md` — Technical specification
- `docs/DESIGN_CHARTER.md` — Design charter
- `docs/NOTEBOOKLM_PIPELINE.md` — NotebookLM content pipeline reference
- `docs/ROADMAP.md` — Feature roadmap
- `docs/IMPLEMENTATION_PLAN.md` — Implementation plan
- `docs/superpowers/specs/` — Feature design specs
- `docs/superpowers/plans/` — Implementation plans
- `docs/UAT_PROMPT.md` — User acceptance testing prompts
- `docs/UAT_REPORT_CODEX.md` + `UAT_REPORT_GEMINI.md` — QA reports from multi-engine review
- `docs/COMPLIANCE_REPORT.md` — Compliance review report

## QA Tools

Three-way QA with Codex, Gemini, and Claude agent in parallel:

```bash
codex exec --full-auto "QA prompt" 2>&1 | tee /tmp/codex-qa.txt &
gemini -p "QA prompt" --yolo 2>&1 | tee /tmp/gemini-qa.txt &
wait
```

Each engine catches different things: Codex is strongest on security + correctness, Gemini on design + accessibility, Claude on architecture + spec compliance.
