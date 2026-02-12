# CLAUDE.md — adrianwedd.com

## Project

Personal website for Adrian Wedd. Astro 5 on Cloudflare Pages. Dark-first design with warm amber accent.

## Stack

- **Framework:** Astro 5 with TypeScript strict
- **Styling:** Tailwind CSS with CSS custom properties for theming
- **Islands:** Preact for interactive components (AudioPlayer, Personalisation, Transparency)
- **Content:** Astro Content Collections (blog, projects, gallery, audio) in `src/content/`
- **Hosting:** Cloudflare Pages (adapter: `@astrojs/cloudflare`)
- **Analytics:** GA4 consent-gated via `ConsentBanner.astro` + `Analytics.astro`

## Key patterns

- **Slug utility:** Astro 5 collection IDs include `.md` extension. Always use `slug()` from `src/lib/utils.ts` when generating hrefs from collection IDs.
- **Theme:** Dark is default. Light mode via `.light` class on `<html>`. Theme flash prevented by inline script in BaseLayout.
- **No custom fonts:** System font stack only — zero font downloads.
- **Consent-first:** No tracking before user consent. ConsentBanner dispatches `consent-updated` CustomEvent.
- **Class-based selectors:** ThemeToggle and Header use class selectors (not IDs) to avoid duplicate ID issues when rendered in both desktop and mobile nav.

## Commands

```
npm run dev        # dev server
npm run build      # production build
npm run preview    # preview production build
```

## Content authoring

```
scripts/new-post.sh "Title"       # scaffold blog post
scripts/new-project.sh "Title"    # scaffold project page
scripts/import-gallery.sh dir/    # import image directory as gallery
scripts/import-audio.sh file.mp3  # import audio as episode
```

## File structure

```
src/
  components/       # Astro components
    islands/        # Preact islands (client-hydrated)
  content/          # Content collections (blog/, projects/, gallery/, audio/)
  layouts/          # BaseLayout.astro
  lib/              # Utilities (utils.ts)
  pages/            # File-based routing
  styles/           # global.css with design tokens
public/             # Static assets (favicons, CNAME, robots.txt)
scripts/            # CLI tools for content management
```

## Gotchas

- `output: 'hybrid'` was removed in Astro 5 — static is default, use `export const prerender = false` for SSR routes
- Content collection IDs include file extension (`.md`/`.mdx`) — always strip with `slug()`
- Light mode accent color was darkened to `#b07820` for WCAG AA on white backgrounds
