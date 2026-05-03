# AGENTS.md

Personal website for Adrian Wedd. Astro 6 (static) on GitHub Pages. Dark-first design, botanical earth-tone palette.

## Stack

- **Framework:** Astro 6, TypeScript strict
- **Styling:** Tailwind CSS 4 via `@theme` block in `src/styles/global.css` (no `tailwind.config.*`)
- **Islands:** Preact in `src/components/islands/` (13 islands, client-hydrated)
- **Content:** Astro Content Collections — blog, projects, gallery, audio (`src/content/`)
- **Search:** Pagefind (WASM, indexed at build)
- **Hosting:** GitHub Pages (fully static)
- **DNS/Proxy:** Cloudflare
- **Media CDN:** Cloudflare R2 at `cdn.adrianwedd.com` (audio/video); infographics in git
- **CSP Worker:** `worker-csp/` — per-request nonce injection + strict CSP header. Route: `adrianwedd.com/*`
- **Social Worker:** `worker/` — Facebook automation at `social.adrianwedd.com`
- **Booking API:** `~/repos/book-api/` — Google Calendar slots at `api.book.adrianwedd.com`

## Commands

```bash
npm run dev            # dev server (localhost:4321)
npm run build          # production build + Pagefind index
npm run lint           # ESLint
npm run format         # Prettier
node scripts/validate-content.js  # validate frontmatter
cd worker-csp && npm test         # CSP worker tests
cd worker && npm test             # social worker tests
```

## Critical conventions

- **Never use Tailwind `dark:` prefix** — theming via CSS custom properties (`:root` dark, `.light` light)
- **Slug utility** — always use `slug()` from `src/lib/utils.ts` for hrefs from collection IDs (strips `.md`, `-post`)
- **Images** — always `<Picture>` from `astro:assets` for local images; raw `<img>` blocked by CI
- **Consent-first** — no tracking before consent; use `dns-prefetch` not `preconnect` for analytics origins
- **Permanent URLs** — never rename a published content file
- **View Transitions scripts** — use `is:inline`, sentinel on `documentElement.dataset`, event delegation on `document`

## Content schema highlights

- **blog/projects:** `notebookAssets` (audioUrl, videoUrl, infographic, mindmap, quiz, flashcards, dataTable, slides); `audioDuration` is top-level, not in notebookAssets
- **audio:** `audioUrl` required; `relatedProject`/`relatedPost` for cross-linking
- **gallery:** `images[]` with `{src, alt, caption?}`; `coverImage` separate

## CI gates

1. Content validation (descriptions ≤160 chars, required fields)
2. Dep audit
3. Build size (`dist/_astro/` ≤100MB, JS chunks warn >150KB)
4. No raw `<img>` on local paths
5. Lychee link check

## Gotchas

- Collection IDs include file extension — always strip with `slug()`
- Light accent is `#8a5e42` (umber) for WCAG AA on warm cream
- `src/data/base-cv.json` is gitignored — synced from `adrianwedd/cv` at build time
- `worker-csp/` deploys separately (`cd worker-csp && npx wrangler deploy`); CSP policy is in `worker-csp/src/csp.ts`
