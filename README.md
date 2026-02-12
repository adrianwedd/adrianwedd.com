# adrianwedd.com

Personal website of Adrian Wedd. Built with Astro, styled with Tailwind, hosted on Cloudflare Pages.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Content

Content lives in `src/content/` as Markdown files with frontmatter. Use the scaffold scripts:

```bash
scripts/new-post.sh "My Post Title"
scripts/new-project.sh "My Project"
scripts/import-gallery.sh path/to/images/
scripts/import-audio.sh path/to/episode.mp3
```

## Design

- Dark-first with warm amber accent
- System fonts only
- WCAG 2.1 AA compliant
- Consent-gated analytics
- `prefers-reduced-motion` respected

## Architecture

See `CLAUDE.md` for AI agent instructions and `docs/` for design charter, spec, and implementation plan.
