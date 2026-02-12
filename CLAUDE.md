# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Adrian Wedd. Astro 5 on Cloudflare Pages. Dark-first design with warm amber accent.

## Commands

```
npm run dev        # dev server (localhost:4321)
npm run build      # production build
npm run preview    # preview production build
```

No linter, formatter, or test suite is configured.

## Stack

- **Framework:** Astro 5 with TypeScript strict
- **Styling:** Tailwind CSS 3 with CSS custom properties for theming
- **Islands:** Preact for interactive components (AudioPlayer, Personalisation, Transparency)
- **Content:** Astro Content Collections (blog, projects, gallery, audio) in `src/content/`
- **Hosting:** Cloudflare Pages (adapter: `@astrojs/cloudflare`)
- **Analytics:** GA4 consent-gated via `ConsentBanner.astro` + `Analytics.astro`

## Architecture

### Theming (spans 3 files)
CSS custom properties define all colors in `src/styles/global.css` (`:root` = dark, `.light` = light). Tailwind maps these via `tailwind.config.mjs` (e.g. `bg-surface`, `text-accent`). Theme flash is prevented by an inline script in `BaseLayout.astro` that reads `localStorage('theme')` before paint. ThemeToggle toggles `.light` on `<html>`.

**Never use Tailwind's `dark:` prefix** — theming is driven by CSS custom properties, not Tailwind dark mode classes.

### Content collections
Defined in `src/content.config.ts` with four collections:
- **blog:** title, description, date, tags (required), draft, heroImage, updatedDate
- **projects:** title, description, date, tags, status (`active|complete|archived|experiment`), featured, url, repo, heroImage
- **gallery:** title, date, tags, images array (`{src, alt, caption?}`), medium, collection, coverImage
- **audio:** title, description, date, tags, audioUrl, duration, transcript, heroImage

### Routing
File-based in `src/pages/`. Dynamic routes use `[...slug].astro` for blog, projects, gallery, audio detail pages. Blog has a tag index at `blog/tag/[tag].astro`.

### Islands architecture
Preact islands in `src/components/islands/` are client-hydrated interactive components. All other components are Astro (server-rendered, zero JS).

## Key patterns

- **Slug utility:** Astro 5 collection IDs include `.md` extension. Always use `slug()` from `src/lib/utils.ts` when generating hrefs from collection IDs.
- **No custom fonts:** System font stack only — zero font downloads.
- **Consent-first:** No tracking before user consent. ConsentBanner dispatches `consent-updated` CustomEvent.
- **Class-based selectors:** ThemeToggle and Header use class selectors (not IDs) to avoid duplicate ID issues when rendered in both desktop and mobile nav.

## Content authoring

```
scripts/new-post.sh "Title"       # scaffold blog post
scripts/new-project.sh "Title"    # scaffold project page
scripts/import-gallery.sh dir/    # import image directory as gallery
scripts/import-audio.sh file.mp3  # import audio as episode
```

## Gotchas

- `output: 'hybrid'` was removed in Astro 5 — static is default, use `export const prerender = false` for SSR routes
- Content collection IDs include file extension (`.md`/`.mdx`) — always strip with `slug()`
- Light mode accent color was darkened to `#b07820` for WCAG AA on white backgrounds
- Tailwind color utilities (`bg-surface`, `text-muted`, `text-accent`) resolve through CSS custom properties, not static values — inspect `tailwind.config.mjs` and `global.css` together
