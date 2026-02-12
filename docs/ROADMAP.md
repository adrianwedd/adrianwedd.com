# ROADMAP: adrianwedd.com

**Post-launch features.** Everything here was part of the original vision, reviewed by three models, and intentionally deferred — not forgotten.

---

## Post-Launch: Automation & Tooling

### NotebookLM Content Pipeline
- Assimilate key scripts from `../notebooklm` via stable adapter interface:
  - `generate-audio.sh` — podcast-style audio from source material
  - `research-topic.sh` — research and compile source material for blog posts
  - `add-sources.sh` / `export-notebook.sh` — notebook management
- Define input/output contract: source material in → Markdown/audio + frontmatter out
- Outputs are drafts — publish first, review later
- Pin tool versions, treat as optional enhancement (publishing works without it)

### GitHub Project Auto-Discovery
- `scripts/sync-repos.sh` — fetch repo metadata from GitHub API
- Auto-generate project stubs for undocumented repos
- Categorise by topic/language/activity
- Surface on project index as "explorable" second tier
- Cache API responses in `data/repos.json` (not live API calls during build)

### Build-Time Cross-Linking Enhancement
- Tag co-occurrence analysis for smarter "related content"
- Temporal proximity linking (content published around same time)

### Enhanced Content Scaffolding
- `scripts/new-post.sh` enhanced with AI-assisted metadata suggestion
- Gallery auto-import from directory watch
- Audio episode auto-scaffolding from file drop

---

## Post-Launch: Intelligence Layer

### SSR Personalisation
- Cloudflare Function middleware for SSR routes
- Segment detection: new vs returning, time of day, referral source
- Component variants based on segment
- Cookie-based return visitor recognition (consent-gated)

### Public Analytics Dashboard
- `/analytics/` route
- Preact island consuming GA4 Data API via Cloudflare Function
- Aggregate metrics: traffic, popular content, geography, referral sources
- Build-time snapshot cached in KV + client-side refresh
- No individual visitor data exposed
- Style with same personality as the rest of the site — not a generic admin panel

### Measurement Protocol
- Server-side GA4 events via Measurement Protocol
- Requires client ID passing from browser to server
- Only worth the complexity if specific server-side events are needed

### Generative Imagery
- Build-time generation of accent images per visitor segment
- Variant selection via SSR based on segment
- Pre-generated at build, not real-time API calls
- Image generation pipeline (local, using available tools)

---

## Post-Launch: Gallery Enhancements

### Individual Image Pages
- `/gallery/[collection]/[image]/` routes
- Full metadata, context, related work links
- EXIF data display (privacy-filtered: strip GPS, keep camera model + date)

### Smart Import Enhancement
- `scripts/import-gallery.sh` reads directory structure as collection hierarchy
- Extracts EXIF at import time (not request time)
- Auto-generates frontmatter from file metadata

---

## Post-Launch: Polish & Delight

### Progressive Disclosure
- Terminal/CLI easter egg (hidden interaction)
- View source messages
- Keyboard shortcuts for power users
- Hidden pages or routes for the curious

### Colophon
- `/colophon/` page: how the site was built
- Build timestamp, git hash, dependency versions
- Cloudflare Pages build log integration (if API permits)
- "Last updated" indicators on content

### Search
- Pagefind integration (static, client-side, privacy-friendly)
- Spans all content types

### Build Metadata On-Site
- Build logs and pipeline status surfaced as content
- CI health indicators

---

## Post-Launch: Operations

### Lighthouse CI
- Run on every PR, block merges that regress performance

### Environment & Secrets
- Secret rotation strategy
- Environment configuration for preview vs production
- Error monitoring (Cloudflare Analytics + GA4)

### Content Versioning
- Archival strategy for evolving content
- Permalink preservation
- "As of [date]" timestamping

---

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| GA4 over first-party analytics | Showcases GA4 mastery, sufficient for needs | 2026-02-12 |
| NotebookLM outputs publish first, review later | Reduces friction, aligns with charter 3.5 | 2026-02-12 |
| Collections sufficient for gallery (no per-image pages at launch) | Reduces Phase 2 scope by ~40% for gallery | 2026-02-12 |
| Client-side personalisation only for launch | Eliminates SSR/Functions complexity and GDPR edge cases | 2026-02-12 |
| Deferred public analytics dashboard | High complexity, low visitor value at launch | 2026-02-12 |
| Deferred generative imagery | Build complexity for marginal launch impact | 2026-02-12 |
| Deferred GitHub auto-discovery | Manual curation of 10-15 projects is better for launch quality | 2026-02-12 |

---

**Nothing here is cancelled. It's sequenced.**

---
