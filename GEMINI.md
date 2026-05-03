# GEMINI.md

Personal website for Adrian Wedd. Astro 6 (static) on GitHub Pages. Dark-first design with botanical earth-tone palette.

## Project Overview

- **Framework:** Astro 6 (TypeScript strict)
- **Styling:** Tailwind CSS 4 with CSS custom properties for theming.
- **Islands:** Preact for interactive components (`src/components/islands/`).
- **Content:** Astro Content Collections (blog, projects, gallery, audio).
- **Hosting:** GitHub Pages (fully static).
- **Media:** Cloudflare R2 for audio/video (`cdn.adrianwedd.com`). Infographics in git (`public/notebook-assets/`).
- **CSP Worker:** Cloudflare Worker in `worker-csp/` — per-request nonce injection, strict CSP header, Permissions-Policy. Route: `adrianwedd.com/*`.
- **Social Worker:** Cloudflare Worker in `worker/` — Facebook automation (publish, queue, comment monitor).
- **Booking API:** Cloudflare Worker in `~/repos/book-api/` — Google Calendar slots + booking at `api.book.adrianwedd.com`.

## Building and Running

```bash
npm install            # Install dependencies
npm run dev            # Start dev server (localhost:4321)
npm run build          # Production build + Pagefind indexing
npm run preview        # Preview production build
npm run lint           # Run ESLint
npm run format         # Run Prettier (write)
npm run fetch-analytics # Fetch GA4 data (build-time)
```

## Development Conventions

### Theming
- **Never use Tailwind's `dark:` prefix.**
- Theming is driven by CSS custom properties in `src/styles/global.css`.
- `:root` is the dark theme (default). `.light` class on `<html>` is the light theme.
- Tailwind 4 maps these via the `@theme` block in `src/styles/global.css` (e.g., `bg-surface`, `text-accent`). There is no `tailwind.config.mjs`.

### View Transitions & Scripts
- All interactive scripts must use `is:inline` (not module `<script>`) to re-execute on View Transition swap.
- Use sentinel guards on `documentElement.dataset` to prevent duplicate global listeners.
- Use event delegation on `document` as DOM elements are replaced during transitions.
- Use lazy DOM lookups via functions rather than cached references.
- Register `astro:after-swap` listeners inside sentinel guards to re-initialize widgets.

### Content Collections (`src/content/`)
- **IDs include extensions:** Astro 6 collection IDs include `.md` or `.mdx`.
- **Slug Utility:** Always use `slug()` from `src/lib/utils.ts` to generate URLs from collection IDs (strips extensions and `-post` suffix).
- **Permanent URLs:** Never rename a published content file as it changes the URL.
- **Image handling:** Use `<Picture>` from `astro:assets` for all local images. Raw `<img>` for local paths is forbidden by CI.

### Content Types
- **blog:** `/blog/{slug}/`
- **projects:** `/projects/{slug}/`
- **gallery:** `/gallery/{slug}/`
- **audio:** `/audio/{slug}/`

### NotebookLM Assets
- Shared schema across blog/projects: `audioUrl`, `videoUrl`, `infographic`, `mindmap`, `quiz`, `flashcards`, `dataTable`, `slides`.
- Visual assets must use the "dark botanical" aesthetic prompt (see `scripts/regenerate-branded-infographics.sh`).
- Infographics should be converted to WebP (~150KB) before committing.

## Key Directories

- `src/components/islands/`: Client-side Preact components.
- `src/content/`: Markdown/MDX content collections.
- `scripts/`: Automation scripts (social media, content validation, asset generation).
- `scripts/notebooklm/`: NotebookLM automation tools.
- `worker/`: Cloudflare Worker for Facebook automation (social.adrianwedd.com).
- `worker-csp/`: Cloudflare Worker for CSP nonce injection (adrianwedd.com/*).
- `docs/`: Technical specs, roadmap, and compliance reports.

## Automation Workflows

- **Facebook Posting:** `scripts/fb-post.sh` CLI for immediate or scheduled posts.
- **NotebookLM:** `scripts/notebooklm/automate-notebook.sh` for generating AI assets from content.
- **CI/CD:** GitHub Actions handle content validation, GA4 data fetching, build size checks, and deployment.

## Design System

- **Dark Palette:** Plum-tinted darks, dusty copper accent, mauve-gray muted.
- **Light Palette:** Warm cream backgrounds, umber accent (`#8a5e42`).
- **Typography:** System font stack only. No external font loads.
- **Accessibility:** WCAG 2.1 AA compliant. `prefers-reduced-motion` and `prefers-contrast` respected.
