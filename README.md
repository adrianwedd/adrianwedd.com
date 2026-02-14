# adrianwedd.com

Personal website of Adrian Wedd. Built with Astro 5, styled with Tailwind CSS, deployed to GitHub Pages via GitHub Actions.

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
- **Analytics:** GA4 consent-gated via ConsentBanner + Analytics components
- **Hosting:** GitHub Pages, DNS at Cloudflare

### Theming

CSS custom properties in `src/styles/global.css` (`:root` = dark, `.light` = light) drive all colours. Tailwind maps them via `tailwind.config.mjs` (e.g. `bg-surface`, `text-accent`). An inline script in `BaseLayout.astro` reads `localStorage('theme')` before paint to prevent flash. Never use Tailwind's `dark:` prefix.

### Islands

Preact islands in `src/components/islands/` are client-hydrated. All other components are Astro (server-rendered, zero JS).

## Content Authoring

```bash
scripts/new-post.sh "My Post Title"
scripts/new-project.sh "My Project"
scripts/import-gallery.sh path/to/images/
scripts/import-audio.sh path/to/episode.mp3
```

## NotebookLM Automation

Automated generation of audio overviews, video summaries, and other Studio assets for project and blog pages. Scripts live in `scripts/notebooklm/`.

See `docs/NOTEBOOKLM_PIPELINE.md` for the full pipeline reference.

## Design

- Botanical earth-tone palette: plum-tinted darks, dusty copper accent, mauve-gray muted
- Light mode: warm cream backgrounds with umber accent
- System fonts only — zero font downloads
- WCAG 2.1 AA compliant
- Consent-gated analytics
- `prefers-reduced-motion` respected

## Deployment

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`). Builds on push to `main`. DNS managed at Cloudflare pointing to GitHub Pages.

## Documentation

- `CLAUDE.md` — AI agent instructions and codebase reference
- `docs/PROJECT_SPEC.md` — Technical specification
- `docs/DESIGN_CHARTER.md` — Design charter
- `docs/NOTEBOOKLM_PIPELINE.md` — NotebookLM content pipeline
