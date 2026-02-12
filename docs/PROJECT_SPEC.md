# PROJECT SPEC: adrianwedd.com

**Governed by:** `docs/DESIGN_CHARTER.md` v2.0
**Voice reference:** `../aisi-apps/STYLE.md`

---

## Scope

Build and deploy adrianwedd.com as a hybrid Astro site on Cloudflare Pages. The site is a creative technologist's living workshop—portfolio, blog, gallery, audio, and intelligence layer—auto-building from GitHub with smart CI and personalisation features.

---

## Content Inventory

### Featured Projects (rich showcase pages)

| Project | Repo | Domain | Description |
|---------|------|--------|-------------|
| This Wasn't in the Brochure | `This-Wasn-t-in-the-Brochure` | thiswasntinthebrochure.wtf | Parenting/neurodivergence book |
| Failure First | `failure-first` | failurefirst.org | Failure-first methodology for AI safety |
| Footnotes at the Edge of Reality | `Footnotes-at-the-Edge-of-Reality` | — | Poem + exegesis, Astro site with canvas background |
| Why Demonstrated Risk Is Ignored | `why-demonstrated-risk-is-ignored` | — | Astro site, research article |
| CV | `cv` | — | Living CV with multi-locale builds |

### Additional Projects (auto-discovered from GitHub)

115 repos across: AI agents, home automation, music tools, voice systems, security research, generative art, government tech. Auto-discovery scripts will index these from GitHub API metadata.

### Content Types

| Type | Source | Format |
|------|--------|--------|
| Blog posts | New + migrated | Markdown with frontmatter |
| Project pages | Generated from repo metadata + hand-curated | Markdown + Astro components |
| Gallery images | Local directories + R2 | WebP/AVIF, responsive srcsets |
| Audio | Generated via NotebookLM tooling, podcasts | MP3 via R2 |
| CV/About | `../cv/` repo | Markdown, living document |

---

## Site Map

```
/                       → Home (hero + featured work + recent activity)
/projects/              → Project index (filterable grid)
/projects/[slug]/       → Individual project showcase
/blog/                  → Blog index (chronological, tagged)
/blog/[slug]/           → Individual post
/gallery/               → Image gallery (masonry/grid, filterable by collection/tag/medium)
/gallery/[collection]/  → Gallery collection (curated set with narrative)
/gallery/[collection]/[image]/ → Individual image with metadata, context, and related work
/audio/                 → Audio index (podcast feed + episodes)
/audio/[slug]/          → Individual episode with player
/about/                 → About/CV
/analytics/             → Public analytics dashboard
/colophon/              → How the site was built (meta-showcase)
```

---

## Technical Architecture

### Astro Configuration

- **Output:** `hybrid` (SSG default, SSR opt-in per route)
- **Adapter:** `@astrojs/cloudflare`
- **Integrations:** `@astrojs/mdx`, `@astrojs/sitemap`, `astro-icon`
- **Islands:** Preact (`@astrojs/preact`)
- **CSS:** Tailwind CSS with custom dark/light theme
- **Content Collections:** `blog`, `projects`, `gallery`, `audio`

### Cloudflare Stack

- **Pages:** Build + deploy from `main` branch
- **Functions:** SSR routes for personalisation, analytics proxy
- **R2:** Media storage (images, audio)
- **KV:** Visitor segment cache, build metadata
- **Analytics:** Cloudflare Web Analytics as baseline + GA4

### Personalisation Architecture

```
Visitor arrives
  → Cloudflare Function reads cookies (if consented)
  → Determines segment: new / returning / referral-source / time-of-day
  → Injects segment into Astro SSR context
  → Components conditionally render based on segment
  → Client-side: localStorage for preferences, no PII
  → Fallback: full static experience (no degradation)
```

### Content Pipeline

```
Author writes Markdown → git commit → push to main
  → Cloudflare Pages build triggers
  → Astro build:
    1. Content collections validate frontmatter
    2. Cross-links generated from shared tags
    3. Image pipeline: Sharp optimises → WebP/AVIF → responsive srcsets
    4. Audio metadata extracted
    5. Project index refreshed from GitHub API (cached)
    6. Sitemap + RSS generated
  → Deploy to Cloudflare Pages
```

### Local Development Tooling

| Script | Purpose |
|--------|---------|
| `scripts/new-post.sh` | Scaffold blog post with frontmatter |
| `scripts/new-project.sh` | Scaffold project page from repo URL |
| `scripts/import-gallery.sh` | Process image directory → gallery collection with metadata |
| `scripts/import-audio.sh` | Process audio file → episode page |
| `scripts/sync-repos.sh` | Pull project metadata from GitHub API |
| `scripts/optimise-images.sh` | Batch image optimisation (Sharp → WebP/AVIF, responsive srcsets) |
| `scripts/generate-audio.sh` | Generate podcast/audio content via NotebookLM API (assimilated from `../notebooklm`) |
| `scripts/research-topic.sh` | Research and generate source material for blog posts (assimilated from `../notebooklm`) |

---

## Design System

### Typography

- **Headings:** Variable-weight sans-serif (Inter or similar)
- **Body:** Readable serif or sans for long-form (to be determined during design phase)
- **Code:** JetBrains Mono or similar monospace
- **Scale:** Modular scale, responsive

### Colour

- **Dark mode (default):** Rich dark backgrounds, warm accent colours
- **Light mode:** Full parity, comfortable contrast
- **Accent:** TBD — one or two signature colours
- **Constraint:** WCAG AA contrast ratios enforced

### Layout

- **Content width:** Comfortable reading measure (~65ch for prose)
- **Grid:** CSS Grid for galleries and project cards
- **Responsive:** Mobile-first, fluid typography

---

## Analytics & Intelligence

### GA4 Integration

- Consent-gated (no tracking before opt-in)
- Custom events: project views, audio plays, gallery interactions, scroll depth
- Measurement Protocol for server-side events
- GA4 Data API for public dashboard

### Public Dashboard (`/analytics/`)

- Aggregate traffic, popular content, visitor geography
- Built with Preact island, data from GA4 API via Cloudflare Function
- Refreshes on build or at configurable interval
- No individual visitor data exposed

### Personalisation Features (Progressive)

| Feature | Segment | Implementation |
|---------|---------|---------------|
| Greeting variation | Time of day | SSR |
| "You might also like" | Browsing history (localStorage) | Client-side |
| Referral-aware hero | Referral source | SSR |
| Generative accent imagery | Visitor segment | Build-time variants + client selection |
| Return visitor recognition | Cookie (consented) | SSR |

---

## SEO & Social

- Open Graph tags on all pages
- Twitter/X cards
- JSON-LD structured data (Person, Article, CreativeWork)
- RSS feed for blog
- Podcast RSS feed for audio
- `sitemap.xml` auto-generated
- Canonical URLs on all pages

---

## Deployment

- **Branch:** `main` → production
- **Preview:** PR branches get preview URLs from Cloudflare Pages
- **Domain:** adrianwedd.com (DNS already at Cloudflare)
- **CI:** Cloudflare Pages auto-build on push
- **Local CI (dev phase):** Scripts run locally before graduating to GitHub Actions

---
