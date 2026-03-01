# Sprint 26: Content, Reach & Distribution — Design

## Goal

Publish 3-4 new blog posts adapted from sibling research repos, extend OG image generation to blog posts, add per-collection RSS feeds, and create a tags discovery page.

## Architecture

Content-first sprint. New posts are adapted from existing research in sibling repos (not written from scratch). OG images reuse the existing sharp-based generator. RSS feeds follow the same `@astrojs/rss` pattern as the combined feed. Tags page is a new Astro page querying the blog collection.

## Sections

### 1. New Blog Posts (3-4)

Adapt from sibling repos into blog-voice posts with proper frontmatter:

| Source repo | Research paper | Blog title (working) |
|---|---|---|
| `why-demonstrated-risk-is-ignored` | Public article | "Why Demonstrated Risk Is Ignored" |
| `orchestrix` | Pilot Purgatory / J-Curve | "The AI Productivity J-Curve" |
| `failure-first-embodied-ai` | Adversarial Poetry paper | "Adversarial Poetry as Jailbreak" |
| `VERITAS` | Market Analysis | "Legal AI Market Opportunity" |

Each post:
- Adapted to blog voice (not copy-pasted)
- Description ≤ 160 chars
- Tags from existing tag vocabulary where possible
- FAQ schema if natural fit (2-3 Q&A pairs)
- ≤ 2000 words
- heroImage optional (OG image serves as fallback)

### 2. Blog OG Image Generation

Extend `scripts/generate-og-images.mjs`:
- Add blog post processing alongside existing project processing
- Same 1200×630 format, same palette
- Update blog detail page (`src/pages/blog/[...slug].astro`) OG fallback from `/og-default.svg` to `/og/{slug}.png`

### 3. Per-Collection RSS Feeds

Two new feed endpoints:
- `src/pages/blog/rss.xml.ts` — blog posts only, sorted by date desc
- `src/pages/audio/rss.xml.ts` — audio episodes only

Autodiscovery `<link>` tags added to:
- Blog index page (`src/pages/blog/index.astro`)
- Audio index page (`src/pages/audio/index.astro`)

Combined feed at `/rss.xml` remains unchanged.

### 4. Tags Discovery Page

New page at `src/pages/blog/tags/index.astro`:
- Lists all unique tags from blog collection
- Shows post count per tag
- Links to existing `/blog/tag/{tag}/` pages
- Sorted alphabetically or by count (TBD during implementation)

### Not in scope

- Pagefind search (already working)
- Gallery/audio content expansion
- Testimonials (#169, blocked)
- Contact form backend
- Social preview testing tools
