# Sprint 24 Design: Schema Depth, CI Quality Gates & Housekeeping

**Date:** 2026-03-01
**Issues:** #134, #135, #136, #138, #144, #146, #150, #151

---

## Objective

Clear the remaining backlog (excluding explicitly deferred/blocked items). Eight issues, all small-to-medium. Three themes: schema/SEO depth, CI quality gates, quick housekeeping wins.

---

## Scope

### 1. dns-prefetch → preconnect (#144)

**Current state:** `BaseLayout.astro` uses `<link rel="dns-prefetch">` for third-party origins.

**What ships:**
Replace with `<link rel="preconnect">` for known origins (Google Analytics). Preconnect performs DNS + TCP + TLS handshake in advance — strictly better than dns-prefetch. One-line change.

---

### 2. humans.txt (#136)

Static file at `public/humans.txt`. Standard web convention crediting the humans behind a site.

```
/* TEAM */
Adrian Wedd, Tasmania, Australia
Site: adrianwedd.com

/* TECHNOLOGY */
Astro 5, Tailwind CSS, GitHub Pages

/* THANKS */
Last update: 2026-03-01
```

---

### 3. Enhanced sitemap (#134)

`astro.config.mjs` serialize callback already sets `lastmod`. Extend to also set `changefreq` and `priority` by URL pattern:

| URL pattern | priority | changefreq |
|-------------|----------|------------|
| `/` | 1.0 | daily |
| `/blog/*` (individual posts) | 0.8 | weekly |
| `/projects/*` (individual) | 0.8 | monthly |
| `/audio/*` (individual) | 0.7 | weekly |
| `/gallery/*` | 0.6 | monthly |
| `/services/`, `/about/`, `/contact/` | 0.7 | monthly |
| everything else | 0.5 | monthly |

Logic added to the existing `serialize()` callback — no structural changes to astro.config.mjs.

---

### 4. FAQ schema on blog posts (#135)

**Approach:** Opt-in per post via frontmatter. No HowTo (requires structured step data — out of scope).

Add optional `faq` field to blog content schema (`src/content.config.ts`):
```typescript
faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
```

In `blog/[...slug].astro`: when `post.data.faq` is present and non-empty, emit a `FAQPage` JSON-LD block alongside the existing schema.

Seed 2–3 existing blog posts with sample FAQ arrays to validate the schema renders correctly.

**Out of scope:** HowTo schema, automatic FAQ extraction from content.

---

### 5. VideoObject schema (#138)

The `projects` collection supports `videoUrl` in frontmatter (used by NotebookLM MP4 exports). In `projects/[...slug].astro`, when `project.data.videoUrl` is set, emit a `VideoObject` JSON-LD block:

```json
{
  "@type": "VideoObject",
  "name": "{project.data.title}",
  "description": "{project.data.description}",
  "contentUrl": "{project.data.videoUrl}",
  "uploadDate": "{project.data.date.toISOString()}",
  "thumbnailUrl": "{project.data.heroImage ?? og-default}"
}
```

Added alongside the existing Article/project schema — no changes to existing schema blocks.

---

### 6. Content validation script (#146)

`scripts/validate-content.js` — Node.js script, no dependencies beyond `node:fs`.

**Checks (hard errors — exit 1):**
- Required fields non-empty: `title`, `description`, `date`, `tags` for all collections
- `description` ≤ 160 characters (SEO limit)
- Audio entries: `audioUrl` must be non-empty

**Checks (warnings — exit 0 but printed):**
- Blog `heroImage` paths starting with `/` should exist in `public/`
- Projects without `description`

**CI:** Step added to `deploy.yml` before `npm run build`.
**Local:** `node scripts/validate-content.js`

---

### 7. Dependency audit (#150)

One CI step in `deploy.yml` after `npm ci`:

```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
```

Fails on high/critical severity only. Low/moderate are suppressed (too noisy, too many false positives from transitive deps).

---

### 8. Build size budget (#151)

Bash step in `deploy.yml` after `npm run build`:

```bash
# Total dist/ size must not exceed 100 MB
DIST_SIZE=$(du -sm dist/ | cut -f1)
if [ "$DIST_SIZE" -gt 100 ]; then
  echo "ERROR: dist/ is ${DIST_SIZE}MB, exceeds 100MB budget"
  exit 1
fi

# No single JS chunk > 150 KB (uncompressed)
find dist/_astro -name '*.js' -size +150k | while read f; do
  echo "WARNING: Large JS chunk: $f ($(du -sh "$f" | cut -f1))"
done
echo "✓ Build size within budget (${DIST_SIZE}MB / 100MB)"
```

Warns on large JS chunks but only hard-fails on total size. Designed to catch accidental large dependency additions.

---

## Out of scope

| Issue | Reason |
|-------|--------|
| #141 LQIP blur placeholders | Requires moving assets from public/ → src/assets/ first |
| #143 Scroll-driven animations | Cross-browser risk, needs content decisions |
| #169 Testimonials | Blocked — awaiting quotes |
| #166 failurefirst.org verify | Manual check, not a code task |

---

## Implementation order

1. dns-prefetch → preconnect (BaseLayout.astro, trivial)
2. humans.txt (new static file, trivial)
3. Enhanced sitemap changefreq/priority (astro.config.mjs)
4. VideoObject schema on project detail (projects/[...slug].astro)
5. FAQ schema — content schema + blog detail page + seed 2-3 posts
6. Content validation script (scripts/validate-content.js + CI step)
7. Dependency audit CI step (deploy.yml)
8. Build size budget CI step (deploy.yml)
