# Contributing

This is a personal website. External PRs are welcome for bug fixes, broken
links, accessibility issues, and typos. For anything larger, open an issue
first so we can discuss whether it fits.

## Prerequisites

- **Node 22** (matches CI — check with `node -v`)
- npm (bundled with Node)
- For worker development: [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Setup

```bash
git clone https://github.com/adrianwedd/adrianwedd.com.git
cd adrianwedd.com
npm ci
npm run dev       # dev server at localhost:4321
```

The site builds without the private `src/data/base-cv.json` (CV data is synced
from a private repo at deploy time; local dev falls back to defaults).

## Before opening a PR

Run the full local check suite:

```bash
npm run check          # astro type check + lint + content validation
npm run build          # full production build including Pagefind indexing
npm run check:links    # internal-link checker on the built output
```

If you touched worker code:

```bash
cd worker && npm test && npx wrangler deploy --dry-run
cd worker-csp && npm test && npx tsc --noEmit
```

## Content conventions

- **URLs are permanent.** Never rename a published content file — the filename
  determines the URL. If a URL truly must change, add a redirect in
  `astro.config.mjs`.
- **Descriptions ≤ 160 characters** — enforced by `scripts/validate-content.js`
  and the CI gate.
- **Local images use `<Picture>`** from `astro:assets`, never raw `<img>`.
  CI enforces this.
- **Every `.webp` heroImage needs a `.jpg` twin** at the same path — OG
  scrapers can't handle WebP. CI enforces this too.
- **`audioUrl` must be a full CDN URL** (`cdn.adrianwedd.com/…`), never a
  local path. Audio is served from Cloudflare R2.

## Commit style

Conventional commits: `type(scope): message`. Common types: `feat`, `fix`,
`content`, `docs`, `chore`, `ci`.

## Pull request checklist

See `.github/PULL_REQUEST_TEMPLATE.md` — it's pre-filled when you open a PR.
