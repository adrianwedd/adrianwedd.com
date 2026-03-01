# Sprint 24 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clear the remaining backlog — schema depth (sitemap, FAQ, VideoObject), CI quality gates (dep audit, build size, content validation), and housekeeping (preconnect hints, humans.txt).

**Architecture:** Eight isolated tasks, mostly single-file or small multi-file changes. No structural changes to the content pipeline. CI steps are additive to `.github/workflows/deploy.yml`. Schema additions are conditional JSON-LD blocks.

**Tech Stack:** Astro 5, TypeScript, GitHub Actions, Node.js (for validation script), schema.org structured data.

---

## Task 1: Add preconnect hints for GA4 (#144)

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (around line 47 — inside `<head>`)

There are currently NO preconnect or dns-prefetch hints. Add them for the two GA4 origins. These tell the browser to negotiate the TCP+TLS connection in advance, reducing analytics load latency.

**Step 1: Open `src/layouts/BaseLayout.astro` and find the `<head>` section**

Around line 46-67. The `<head>` currently has `<meta>` tags, `<SEOHead>`, a theme script, and `<ViewTransitions />`.

**Step 2: Add preconnect hints immediately after the opening `<head>` tag**

Insert after `<head>` (line 46), before `<meta name="author"...`:

```astro
    <link rel="preconnect" href="https://www.googletagmanager.com" />
    <link rel="preconnect" href="https://www.google-analytics.com" />
```

**Step 3: Build**

```bash
npm run build
```
Expected: clean build, no errors. Verify the output contains `preconnect` in a built HTML file:
```bash
grep 'preconnect' dist/index.html
```

**Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "perf: add preconnect hints for GA4 origins (#144)"
```

---

## Task 2: Add humans.txt (#136)

**Files:**
- Create: `public/humans.txt`

**Step 1: Create the file**

Create `public/humans.txt` with this exact content:

```
/* TEAM */
Adrian Wedd — Designer, Developer, Researcher
Site: https://adrianwedd.com
Location: Cygnet, Tasmania, Australia

/* SITE */
Last update: 2026-03-01
Language: English
Standards: HTML5, CSS3, WAI-ARIA
Components: Astro 5, Tailwind CSS, Preact
Hosting: GitHub Pages

/* THANKS */
Astro team — https://astro.build
```

**Step 2: Verify it's served at the right path**

```bash
npm run build && ls dist/humans.txt
```
Expected: file exists.

**Step 3: Commit**

```bash
git add public/humans.txt
git commit -m "chore: add humans.txt (#136)"
```

---

## Task 3: Enhanced sitemap — changefreq and priority (#134)

**Files:**
- Modify: `astro.config.mjs` (the `serialize()` callback, lines 42-47)

**Current state:** `serialize()` only sets `lastmod`. Extend it to also set `changefreq` and `priority`.

**Step 1: Add a helper function above the `export default defineConfig` block**

Add this function immediately after `const contentDates = buildContentDateMap();` (line 34):

```javascript
function getSitemapMeta(pathname) {
  if (pathname === '/') return { priority: 1.0, changefreq: 'daily' };
  if (/^\/blog\/[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'weekly' };
  if (/^\/projects\/[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'monthly' };
  if (/^\/audio\/[^/]+\/$/.test(pathname)) return { priority: 0.7, changefreq: 'weekly' };
  if (/^\/gallery\//.test(pathname)) return { priority: 0.6, changefreq: 'monthly' };
  if (['/services/', '/about/', '/contact/'].includes(pathname)) return { priority: 0.7, changefreq: 'monthly' };
  return { priority: 0.5, changefreq: 'monthly' };
}
```

**Step 2: Extend the serialize callback**

Replace the existing `serialize()` callback:
```javascript
serialize(item) {
  const pathname = new URL(item.url).pathname;
  const date = contentDates.get(pathname);
  if (date) item.lastmod = date;
  return item;
},
```

With:
```javascript
serialize(item) {
  const pathname = new URL(item.url).pathname;
  const date = contentDates.get(pathname);
  if (date) item.lastmod = date;
  const { priority, changefreq } = getSitemapMeta(pathname);
  item.priority = priority;
  item.changefreq = changefreq;
  return item;
},
```

**Step 3: Build and verify**

```bash
npm run build
grep -A3 '<url>' dist/sitemap-0.xml | head -30
```
Expected: each `<url>` block contains `<priority>` and `<changefreq>` tags.

**Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "feat(seo): add changefreq and priority to sitemap (#134)"
```

---

## Task 4: VideoObject schema for projects and blog posts with videoUrl (#138)

**Files:**
- Modify: `src/pages/projects/[...slug].astro` (after line 81, the existing JSON-LD block)
- Modify: `src/pages/blog/[...slug].astro` (after line 81, the existing JSON-LD block)

The `videoUrl` field is defined in `notebookAssets` in `src/content.config.ts` and is spread into both the `blog` and `projects` schemas. Several existing entries already have it (e.g. `jailbreak-archaeology.md`, `adhdo.md`, `tanda-pizza.md`).

**Step 1: Add VideoObject to `src/pages/projects/[...slug].astro`**

After the closing `/>` of the existing `<script type="application/ld+json" .../>` block (around line 81), add:

```astro
  {project.data.videoUrl && (
    <script
      type="application/ld+json"
      set:html={JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: project.data.title,
        description: project.data.description,
        contentUrl: new URL(project.data.videoUrl, Astro.site).href,
        uploadDate: project.data.date.toISOString(),
        ...(project.data.heroImage
          ? { thumbnailUrl: new URL(project.data.heroImage, Astro.site).href }
          : {}),
      })}
    />
  )}
```

**Step 2: Add VideoObject to `src/pages/blog/[...slug].astro`**

After the closing `/>` of the existing Article JSON-LD block (around line 81), add:

```astro
  {post.data.videoUrl && (
    <script
      type="application/ld+json"
      set:html={JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: post.data.title,
        description: post.data.description,
        contentUrl: new URL(post.data.videoUrl, Astro.site).href,
        uploadDate: post.data.date.toISOString(),
        ...(post.data.heroImage
          ? { thumbnailUrl: new URL(post.data.heroImage, Astro.site).href }
          : {}),
      })}
    />
  )}
```

**Step 3: Build and verify**

```bash
npm run build
# jailbreak-archaeology has videoUrl — check it gets VideoObject
grep 'VideoObject' dist/blog/jailbreak-archaeology/index.html
```
Expected: matches found.

**Step 4: Commit**

```bash
git add "src/pages/projects/[...slug].astro" "src/pages/blog/[...slug].astro"
git commit -m "feat(seo): add VideoObject schema when videoUrl present (#138)"
```

---

## Task 5: FAQ schema — content schema + blog page + seed posts (#135)

**Files:**
- Modify: `src/content.config.ts` (blog schema)
- Modify: `src/pages/blog/[...slug].astro` (add FAQPage JSON-LD)
- Modify: `src/content/blog/jailbreak-archaeology.md` (add faq frontmatter)
- Modify: `src/content/blog/the-notebooklm-pipeline.md` (add faq frontmatter)

**Step 1: Add `faq` field to blog schema in `src/content.config.ts`**

In the `blog` collection schema (around line 16-28), add `faq` as an optional field inside the `z.object({...})`:

```typescript
faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
```

Place it after `heroImage: z.string().optional(),` and before `...notebookAssets,`.

**Step 2: Add FAQPage JSON-LD to `src/pages/blog/[...slug].astro`**

After the VideoObject block added in Task 4, add:

```astro
  {post.data.faq && post.data.faq.length > 0 && (
    <script
      type="application/ld+json"
      set:html={JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.data.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.a,
          },
        })),
      })}
    />
  )}
```

**Step 3: Seed `src/content/blog/jailbreak-archaeology.md` with FAQ frontmatter**

Add to the frontmatter (after the existing fields, before the closing `---`):

```yaml
faq:
  - q: "What is jailbreak archaeology?"
    a: "Jailbreak archaeology is a research methodology that tests historical AI jailbreak techniques against current frontier models to measure how much safety progress has actually been made."
  - q: "Why do 2022 jailbreaks still work on 2026 models?"
    a: "Because many safety measures target surface patterns rather than underlying model behaviour. When the exploit bypasses pattern-matching guardrails, the model's fundamental response tendencies remain exploitable."
  - q: "What does a ~30% success rate on historical attacks mean?"
    a: "It means roughly one in three attempts using 2022-era jailbreak techniques can still bypass the safety filters of today's most advanced models — suggesting the safety stack has not fundamentally improved for this attack class."
```

**Step 4: Seed `src/content/blog/the-notebooklm-pipeline.md` with FAQ frontmatter**

Add to the frontmatter:

```yaml
faq:
  - q: "What is the NotebookLM pipeline?"
    a: "An automated system that takes structured Markdown content (blog posts, project docs) and routes it through Google's NotebookLM to produce audio overviews, video summaries, infographics, and other derived assets — all triggered from a single config file."
  - q: "Does the pipeline require manual intervention?"
    a: "No. GitHub Actions runs the pipeline on a schedule or on push. The only manual step is seeding the config file for a new notebook."
```

**Step 5: Build and verify**

```bash
npm run build
grep 'FAQPage' dist/blog/jailbreak-archaeology/index.html
grep 'FAQPage' dist/blog/the-notebooklm-pipeline/index.html
```
Expected: matches in both files.

**Step 6: Commit**

```bash
git add src/content.config.ts "src/pages/blog/[...slug].astro" \
  src/content/blog/jailbreak-archaeology.md \
  src/content/blog/the-notebooklm-pipeline.md
git commit -m "feat(seo): FAQ schema opt-in for blog posts, seed 2 posts (#135)"
```

---

## Task 6: Content validation script (#146)

**Files:**
- Create: `scripts/validate-content.js`
- Modify: `.github/workflows/deploy.yml` (add step before `npm run build`)

**Step 1: Create `scripts/validate-content.js`**

```javascript
#!/usr/bin/env node
// Content validation — checks all content collection entries for common issues.
// Exit 1 on hard errors (missing required fields, description too long).
// Prints warnings for soft issues but exits 0.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src/content');
const PUBLIC_DIR = join(ROOT, 'public');

const COLLECTIONS = {
  blog: {
    required: ['title', 'description', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: true,
  },
  projects: {
    required: ['title', 'description', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: true,
  },
  audio: {
    required: ['title', 'description', 'date', 'tags', 'audioUrl'],
    checkAudioUrl: true,
    checkDescription: true,
  },
  gallery: {
    required: ['title', 'date', 'tags'],
    checkAudioUrl: false,
    checkDescription: false,
  },
};

let errors = 0;
let warnings = 0;

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = value;
  }
  return fm;
}

for (const [collection, rules] of Object.entries(COLLECTIONS)) {
  const dir = join(CONTENT_DIR, collection);
  if (!existsSync(dir)) continue;

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const filePath = join(dir, file);
    const content = readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(content);
    const label = `${collection}/${file}`;

    // Required fields
    for (const field of rules.required) {
      if (!fm[field] || fm[field].trim() === '') {
        console.error(`ERROR [${label}]: missing required field '${field}'`);
        errors++;
      }
    }

    // Description length
    if (rules.checkDescription && fm.description && fm.description.length > 160) {
      console.error(
        `ERROR [${label}]: description is ${fm.description.length} chars (max 160): "${fm.description.slice(0, 60)}..."`
      );
      errors++;
    }

    // heroImage path existence (warn only)
    if (fm.heroImage && fm.heroImage.startsWith('/') && !fm.heroImage.startsWith('http')) {
      const imgPath = join(PUBLIC_DIR, fm.heroImage);
      if (!existsSync(imgPath)) {
        console.warn(`WARN [${label}]: heroImage not found in public/: ${fm.heroImage}`);
        warnings++;
      }
    }
  }
}

console.log(`\nValidation complete: ${errors} error(s), ${warnings} warning(s)`);
if (errors > 0) process.exit(1);
```

**Step 2: Make it executable and test locally**

```bash
node scripts/validate-content.js
```
Expected: prints results, exits 0 (assuming no real errors). If it finds description > 160 chars, fix those content files.

**Step 3: Add CI step to `.github/workflows/deploy.yml`**

After `- run: npm ci` and before `- run: npm run build`, insert:

```yaml
      - name: Validate content
        run: node scripts/validate-content.js
```

**Step 4: Build**

```bash
npm run build
```
Expected: clean build.

**Step 5: Commit**

```bash
git add scripts/validate-content.js .github/workflows/deploy.yml
git commit -m "ci: content validation script and CI gate (#146)"
```

---

## Task 7: Dependency audit in CI (#150)

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Step 1: Add npm audit step**

After `- run: npm ci` (line 26), add:

```yaml
      - name: Audit dependencies
        run: npm audit --audit-level=high
        continue-on-error: false
```

Note: `--audit-level=high` only fails on high/critical severity. Low and moderate are printed but don't fail the build.

**Step 2: Verify locally**

```bash
npm audit --audit-level=high
```
Expected: exits 0 (no high/critical vulnerabilities). If it finds issues, fix them with `npm audit fix` before committing the CI change.

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add npm audit --audit-level=high to deploy workflow (#150)"
```

---

## Task 8: Build size budget (#151)

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Step 1: Add size budget step after `npm run build`**

After `- run: npm run build` (currently around line 48), add a step:

```yaml
      - name: Check build size budget
        run: |
          DIST_MB=$(du -sm dist/ | cut -f1)
          echo "dist/ size: ${DIST_MB}MB (budget: 100MB)"
          if [ "$DIST_MB" -gt 100 ]; then
            echo "ERROR: dist/ is ${DIST_MB}MB, exceeds 100MB budget"
            exit 1
          fi
          LARGE=$(find dist/_astro -name '*.js' -size +150k 2>/dev/null)
          if [ -n "$LARGE" ]; then
            echo "WARN: Large JS chunks found (>150KB uncompressed):"
            echo "$LARGE" | while read f; do echo "  $(du -sh "$f" | cut -f1)  $f"; done
          fi
          echo "✓ Build size within budget"
```

**Step 2: Verify locally**

```bash
npm run build
du -sm dist/
find dist/_astro -name '*.js' -size +150k
```
Expected: dist/ well under 100MB. JS chunks should be fine — check any flagged ones are expected (Astro's view transitions client router is ~13KB gzipped, fine).

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add build size budget check — 100MB total, 150KB JS chunk warning (#151)"
```

---

## Verification

After all 8 tasks:

```bash
npm run build
```
Expected: clean build, all 174 pages.

```bash
grep 'preconnect' dist/index.html
curl -s https://adrianwedd.com/humans.txt  # after deploy
grep '<priority>' dist/sitemap-0.xml | sort -u
grep 'VideoObject' dist/blog/jailbreak-archaeology/index.html
grep 'FAQPage' dist/blog/jailbreak-archaeology/index.html
```

Push and confirm GitHub Actions green.
