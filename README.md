# adrianwedd.com

Personal website of Adrian Wedd. Built with Astro 5, styled with Tailwind CSS, deployed to GitHub Pages. Social media automation via Cloudflare Worker.

## Quick Start

```bash
npm install
npm run dev        # dev server at localhost:4321
npm run build      # production build
npm run preview    # preview production build
```

## Architecture

- **Framework:** Astro 5 (fully static output) with TypeScript strict
- **Styling:** Tailwind CSS 3 with CSS custom properties for dark/light theming
- **Islands:** Preact for interactive components (AudioPlayer, Personalisation, Transparency)
- **Content:** Astro Content Collections — blog, projects, gallery, audio — in `src/content/`
- **Search:** Pagefind (client-side WASM, indexed at build time)
- **Analytics:** GA4 + LinkedIn Insight Tag, consent-gated via ConsentBanner
- **Hosting:** GitHub Pages, DNS at Cloudflare
- **Social:** Cloudflare Worker at `social.adrianwedd.com` for Facebook page automation

### Theming

CSS custom properties in `src/styles/global.css` (`:root` = dark, `.light` = light) drive all colours. Tailwind maps them via `tailwind.config.mjs` (e.g. `bg-surface`, `text-accent`). An inline script in `BaseLayout.astro` reads `localStorage('theme')` before paint to prevent flash. Never use Tailwind's `dark:` prefix.

### View Transitions

All interactive scripts use `is:inline` with sentinel guards on `documentElement.dataset` to survive Astro View Transitions. Event delegation on `document` (not per-element listeners) since DOM elements get replaced on navigation.

### Islands

Preact islands in `src/components/islands/` are client-hydrated. All other components are Astro (server-rendered, zero JS).

## Content

```bash
scripts/new-post.sh "My Post Title"       # scaffold blog post
scripts/new-project.sh "My Project"        # scaffold project page
scripts/import-gallery.sh path/to/images/  # import image gallery
scripts/import-audio.sh path/to/episode.mp3 # import audio episode
```

Four content collections defined in `src/content.config.ts`: blog, projects, gallery, audio. All support `series`/`seriesOrder` for multi-part content.

## Social Media Worker

Cloudflare Worker (`worker/`) at `social.adrianwedd.com` manages the Facebook page [AdrianWeddDotCom](https://www.facebook.com/AdrianWeddDotCom).

**Features:**
- Auto-publish new blog posts and projects to Facebook on push to `main`
- Scheduled and ad-hoc post queue (JSON seed in `social/`, KV for state)
- Comment monitoring with crisis detection, classification, and auto-reply
- Backdated posting to match original publication dates
- Platform adapter pattern for future Instagram/Bluesky support

**CLI:**
```bash
scripts/fb-post.sh "Post text"                          # immediate post
scripts/fb-post.sh "Post text" --link URL               # link post
scripts/fb-post.sh "Post text" --backdate 2026-01-15    # backdated post
scripts/fb-post.sh "Post text" --schedule 2026-04-01    # schedule for later
scripts/fb-post.sh --health                             # token + queue status
scripts/fb-post.sh --sync                               # sync queue JSON to KV
```

**Worker endpoints:**
- `POST /api/publish` — immediate publish
- `POST /api/queue` — add to scheduled queue
- `POST /api/queue/sync` — sync JSON queue to KV
- `POST /api/cron/publish` — publish due posts (hourly cron)
- `POST /api/cron/comments` — monitor + classify comments (2-hourly cron)
- `GET /api/health` — token health and queue status

See `docs/superpowers/specs/2026-03-29-social-media-management-design.md` for the full design spec.

## NotebookLM Automation

Automated generation of audio overviews, video summaries, infographics, and other Studio assets for project and blog pages. Scripts in `scripts/notebooklm/`.

See `docs/NOTEBOOKLM_PIPELINE.md` for the full pipeline reference.

## CI Pipeline

GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`:

1. `npm ci` + content validation
2. Dependency audit (`npm audit --audit-level=high`)
3. Fetch GA4 analytics data + CV data from sibling repo
4. `npm run build` (Astro + Pagefind)
5. Build size budget check (`dist/_astro/` < 100MB, JS chunks < 150KB)
6. No raw `<img>` on local paths (must use Astro `<Picture>`)
7. Lychee link check on all HTML output

Additional workflows:
- `social-autopublish.yml` — auto-post new content to Facebook
- `social-cron.yml` — hourly publish cron + 2-hourly comment monitor
- `content-pipeline.yml` — weekly research paper discovery
- `lighthouse.yml` — performance auditing

## Design

- Botanical earth-tone palette: plum-tinted darks, dusty copper accent, mauve-gray muted
- Light mode: warm cream backgrounds with umber accent (`#8a5e42`)
- System fonts only — zero font downloads
- WCAG 2.1 AA compliant
- Consent-first: no tracking before user consent
- `prefers-reduced-motion` and `prefers-contrast` respected
- No custom fonts, no framework JS overhead

## Documentation

- `CLAUDE.md` — AI agent instructions and codebase reference
- `docs/PROJECT_SPEC.md` — Technical specification
- `docs/DESIGN_CHARTER.md` — Design charter
- `docs/NOTEBOOKLM_PIPELINE.md` — NotebookLM content pipeline
- `docs/superpowers/specs/` — Feature design specs
- `docs/superpowers/plans/` — Implementation plans
