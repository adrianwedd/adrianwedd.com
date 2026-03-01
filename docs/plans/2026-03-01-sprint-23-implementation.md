# Sprint 23 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship image pipeline (responsive srcset via `<Picture>`), CI quality gates (img enforcement + link checker), 404 analytics, View Transitions, and CV data sync.

**Architecture:** Astro 5 static site on GitHub Pages. No test suite — verification is `npm run build` (must succeed) plus grep checks on `dist/`. Images are in `public/notebook-assets/` as `.webp` strings; Astro's `<Picture>` component with string paths processes them through sharp to generate srcset. CV data comes from `../cv/data/base-cv.json` (sibling repo on CI, checked out via GHA).

**Tech Stack:** Astro 5 (`astro:assets` for `<Picture>`), GitHub Actions (lychee-action, checkout), `window.gtag` consent pattern (existing), `astro:transitions` (built-in).

---

### Task 1: `<Picture>` migration — project hero images (#140, #145)

**Files:**
- Modify: `src/pages/index.astro` (line ~122)
- Modify: `src/pages/projects/[...slug].astro` (line ~149)

**Context:** Both files use raw `<img src={project.data.heroImage} ...>`. `heroImage` values are strings like `/notebook-assets/adhdo/infographic.webp` (files in `public/`). Astro's `<Picture>` component accepts string paths and generates `srcset` at multiple widths via sharp.

**Step 1: Add `<Picture>` import to `src/pages/index.astro`**

At the top of the frontmatter (after existing imports):
```astro
import { Picture } from 'astro:assets';
```

**Step 2: Replace the `<img>` in the featured projects loop (index.astro ~line 121)**

Replace:
```astro
{project.data.heroImage && (
  <img src={project.data.heroImage} alt={`${project.data.title} hero image`} width="600" height="160" class="h-40 w-full object-cover" loading="lazy" decoding="async" />
)}
```

With:
```astro
{project.data.heroImage && (
  <Picture
    src={project.data.heroImage}
    width={600}
    height={160}
    widths={[320, 600, 900]}
    formats={['avif', 'webp']}
    alt={`${project.data.title} hero image`}
    class="h-40 w-full object-cover"
    loading="lazy"
    decoding="async"
  />
)}
```

**Step 3: Repeat for `src/pages/projects/[...slug].astro`**

Find the `<img src={project.data.heroImage}` block (~line 149) and apply the same pattern:
```astro
import { Picture } from 'astro:assets';
```
Then replace:
```astro
{project.data.heroImage && (
  <img
    src={project.data.heroImage}
    ...
  />
)}
```
With:
```astro
{project.data.heroImage && (
  <Picture
    src={project.data.heroImage}
    width={1200}
    height={630}
    widths={[640, 1200, 1920]}
    formats={['avif', 'webp']}
    alt={project.data.title}
    class="mt-8 w-full rounded-lg border border-border"
    loading="eager"
    fetchpriority="high"
  />
)}
```

**Step 4: Verify build succeeds**

```bash
npm run build 2>&1 | tail -5
```
Expected: no errors, build completes.

**Step 5: Spot-check srcset in dist**

```bash
grep -o 'srcset="[^"]*"' dist/index.html | head -3
```
Expected: srcset attribute with multiple width variants.

**Step 6: Commit**

```bash
git add src/pages/index.astro src/pages/projects/\[...slug\].astro
git commit -m "feat(perf): responsive Picture srcset for project hero images (#140, #145)"
```

---

### Task 2: `<Picture>` migration — gallery cover images (#140, #145)

**Files:**
- Modify: `src/pages/gallery/index.astro` (line ~99)
- Modify: `src/pages/gallery/[...slug].astro` (line ~104, grid thumbnails)

**Context:** Gallery covers and grid thumbnails use raw `<img>`. The Lightbox island (`<Lightbox images={...} />`) renders its own `<img>` tags dynamically — leave those alone (they're in `src/components/islands/`, not pages).

**Step 1: Add import to `src/pages/gallery/index.astro`**

```astro
import { Picture } from 'astro:assets';
```

**Step 2: Replace cover image in gallery/index.astro (~line 99)**

Replace:
```astro
<img
  src={collection.data.coverImage}
  alt={collection.data.title}
  width="400"
  height="300"
  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
  loading="lazy"
  decoding="async"
/>
```
With:
```astro
<Picture
  src={collection.data.coverImage}
  width={400}
  height={300}
  widths={[200, 400, 800]}
  formats={['avif', 'webp']}
  alt={collection.data.title}
  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
  loading="lazy"
  decoding="async"
/>
```

**Step 3: Replace grid thumbnails in gallery/[...slug].astro (~line 104)**

Same pattern — add `Picture` import, replace `<img>` in the `gallery.data.images.map(...)` block:
```astro
<Picture
  src={image.src}
  width={400}
  height={300}
  widths={[200, 400, 800]}
  formats={['avif', 'webp']}
  alt={image.alt}
  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
  loading="lazy"
  decoding="async"
/>
```

**Step 4: Build and verify**

```bash
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add src/pages/gallery/index.astro "src/pages/gallery/[...slug].astro"
git commit -m "feat(perf): responsive Picture srcset for gallery images (#140, #145)"
```

---

### Task 3: CI — raw `<img>` enforcement (#148)

**Files:**
- Modify: `.github/workflows/deploy.yml`

**Context:** After the `<Picture>` migration, add a CI step that fails if any raw `<img src=` with local paths are found in page/layout files. This prevents regression. Excludes the `src/components/islands/` directory (Lightbox renders `<img>` dynamically and is exempt).

**Step 1: Add enforcement step to `.github/workflows/deploy.yml`**

After the `npm run build` step and before `actions/upload-pages-artifact`, add:

```yaml
      - name: Check for raw img tags (local paths)
        run: |
          # Fail if any .astro files in pages/layouts use raw <img with local src
          if grep -rn '<img ' src/pages/ src/layouts/ --include="*.astro" | \
             grep -v 'http' | \
             grep -v '<!--' | \
             grep -qv '^Binary'; then
            echo "ERROR: Raw <img> tags with local paths found. Use <Picture> from astro:assets."
            grep -rn '<img ' src/pages/ src/layouts/ --include="*.astro" | grep -v 'http'
            exit 1
          fi
          echo "✓ No raw local <img> tags found"
```

**Step 2: Verify locally (simulate the check)**

```bash
grep -rn '<img ' src/pages/ src/layouts/ --include="*.astro" | grep -v 'http'
```
Expected: no output (all local `<img>` have been replaced).

If any appear, fix them in this task before committing.

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: enforce no raw local img tags in pages and layouts (#148)"
```

---

### Task 4: CI — lychee link checker (#147)

**Files:**
- Create: `.lychee.toml`
- Modify: `.github/workflows/deploy.yml`

**Context:** Lychee is a fast Rust-based link checker. The `lycheeverse/lychee-action` GitHub Action checks all links in the built `dist/` directory. Internal 404s fail the build; external link failures are warnings only (external sites go down).

**Step 1: Create `.lychee.toml`**

```toml
# Lychee link checker configuration
# https://github.com/lycheeverse/lychee

# Only fail on these status codes (not external timeouts)
accept = [200, 206, 429]

# Timeout per request
timeout = 10

# Retry failed requests
max_retries = 2

# Skip external links that are known to be rate-limited or login-walled
exclude = [
  "https://www.linkedin.com",
  "https://linkedin.com",
  "https://twitter.com",
  "https://x.com",
  "https://facebook.com",
  "https://web.archive.org",
  "mailto:",
  "tel:",
]

# Don't check these file patterns
exclude_path = [
  "dist/pagefind",
  "dist/notebook-assets",
]
```

**Step 2: Add lychee step to `.github/workflows/deploy.yml`**

In the `build` job, after `npm run build`, before upload:

```yaml
      - name: Check links
        uses: lycheeverse/lychee-action@v2
        with:
          args: --config .lychee.toml --base dist dist/**/*.html
          fail: true
```

**Step 3: Verify locally (optional — requires lychee installed)**

```bash
# If lychee is available:
# lychee --config .lychee.toml dist/**/*.html
# Otherwise skip — CI will catch it on push
echo "Lychee runs in CI"
```

**Step 4: Commit**

```bash
git add .lychee.toml .github/workflows/deploy.yml
git commit -m "ci: add lychee link checker to build pipeline (#147)"
```

---

### Task 5: 404 page — GA4 `page_not_found` event (#149)

**Files:**
- Modify: `src/pages/404.astro`

**Context:** The 404 page already exists with search and CTAs. The existing `Analytics.astro` pattern uses `window.gtag` after checking `localStorage.getItem('adrianwedd_consent')` for `analytics: true`. Mirror that pattern. The event fires on DOMContentLoaded (or consent-updated if the user grants consent during the 404 visit).

**Step 1: Add analytics script to `src/pages/404.astro`**

After the existing `<script is:inline>` pagefind block, add:

```astro
<script>
  const GA_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '';
  if (!GA_ID) console.warn('404: GA_ID not set, page_not_found event skipped');

  function fire404Event() {
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') {
      gtag('event', 'page_not_found', {
        page_path: document.location.pathname,
        page_referrer: document.referrer || '',
      });
    }
  }

  function checkConsentAndFire() {
    try {
      const raw = localStorage.getItem('adrianwedd_consent');
      const consent = raw ? JSON.parse(raw) : null;
      if (consent?.analytics) fire404Event();
    } catch {
      // ignore
    }
  }

  // Fire on load if already consented
  window.addEventListener('DOMContentLoaded', checkConsentAndFire);

  // Fire if user grants consent during this 404 visit
  window.addEventListener('consent-updated', ((e: CustomEvent) => {
    if (e.detail?.analytics) fire404Event();
  }) as EventListener);
</script>
```

Note: `window.gtag` is set by `Analytics.astro` (loaded via `BaseLayout`). The event fires after gtag is initialised, so it will be queued correctly.

**Step 2: Build and verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -i error | head -5
```
Expected: no errors.

**Step 3: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat(analytics): fire page_not_found GA4 event on 404 (#149)"
```

---

### Task 6: View Transitions (#142)

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Context:** Astro's built-in `<ViewTransitions />` enables smooth fade transitions between pages. Added once to `BaseLayout`, it applies everywhere. Falls back gracefully in unsupported browsers. Known interaction: the `<AudioPlayer>` Preact island may unmount on navigation — add `transition:persist` if that's a problem.

**Step 1: Add ViewTransitions to `src/layouts/BaseLayout.astro`**

In the frontmatter imports (after existing imports):
```astro
import { ViewTransitions } from 'astro:transitions';
```

In the `<head>` section (after `<SEOHead ... />`):
```astro
<ViewTransitions />
```

**Step 2: Build**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Smoke test AudioPlayer**

Run `npm run preview`, navigate between pages, and check whether the AudioPlayer (if visible) persists correctly. If it unmounts unexpectedly on navigation, find the AudioPlayer island in the layout/components and add `transition:persist`:

```astro
<AudioPlayerIsland transition:persist />
```

Only add `transition:persist` if the AudioPlayer actually breaks. Don't add it pre-emptively.

**Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(ux): add Astro View Transitions for smooth page navigation (#142)"
```

---

### Task 7: CV sync — GHA step + `src/data/cv.ts` (#164)

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `src/data/cv.ts`
- Modify: `.gitignore`

**Context:** `base-cv.json` lives at `../cv/data/base-cv.json` locally (sibling repo `adrianwedd/cv`). On CI, add a GHA `actions/checkout` step that checks out the cv repo. `src/data/cv.ts` reads the JSON at build time and exports typed values. A local fallback ensures the build doesn't break when the cv repo isn't present (local dev).

**Step 1: Add GHA checkout step for cv repo**

In `.github/workflows/deploy.yml`, in the `build` job after the existing `actions/checkout@v4` step:

```yaml
      - name: Checkout cv data
        uses: actions/checkout@v4
        with:
          repository: adrianwedd/cv
          path: cv
          token: ${{ secrets.GITHUB_TOKEN }}
```

Then after the checkout, copy the data file:

```yaml
      - name: Copy base-cv.json
        run: cp cv/data/base-cv.json src/data/base-cv.json
```

**Step 2: Add `src/data/base-cv.json` to `.gitignore`**

```bash
echo "src/data/base-cv.json" >> .gitignore
```

**Step 3: Create `src/data/cv.ts`**

```typescript
// CV data sourced from adrianwedd/cv repo at build time.
// Falls back to defaults if base-cv.json is not present (local dev without cv repo).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface CvData {
  jobTitle: string;
  knowsAbout: string[];
  occupationName: string;
}

const DEFAULTS: CvData = {
  jobTitle: 'Systems Builder & AI Safety Researcher',
  knowsAbout: ['AI Safety', 'Systems Analysis', 'Cybersecurity', 'Multi-agent Systems', 'Infrastructure Management'],
  occupationName: 'Systems Builder & AI Safety Researcher',
};

function loadCvData(): CvData {
  const cvPath = join(process.cwd(), 'src/data/base-cv.json');
  if (!existsSync(cvPath)) {
    return DEFAULTS;
  }
  try {
    const raw = JSON.parse(readFileSync(cvPath, 'utf8'));
    const pi = raw.personal_info || {};
    const skills: Array<{ name: string; tier: string }> = raw.skills || [];
    const primarySkills = skills
      .filter((s) => s.tier === 'Primary')
      .map((s) => s.name)
      .slice(0, 8);

    return {
      jobTitle: pi.title || DEFAULTS.jobTitle,
      knowsAbout: primarySkills.length > 0 ? primarySkills : DEFAULTS.knowsAbout,
      occupationName: pi.title || DEFAULTS.occupationName,
    };
  } catch {
    return DEFAULTS;
  }
}

export const cv = loadCvData();
```

**Step 4: Create `src/data/` directory if it doesn't exist**

```bash
mkdir -p src/data
```

**Step 5: Build locally to verify fallback works (without cv repo)**

```bash
npm run build 2>&1 | tail -5
```
Expected: succeeds (uses defaults, no cv/data/base-cv.json present locally).

**Step 6: Commit**

```bash
git add .github/workflows/deploy.yml src/data/cv.ts .gitignore
git commit -m "feat(cv): GHA checkout of cv repo + cv.ts data module with fallback (#164)"
```

---

### Task 8: Wire CV data into `about.astro` (#164)

**Files:**
- Modify: `src/pages/about.astro`

**Context:** `about.astro` currently has hardcoded values for `jobTitle`, `knowsAbout`, and `hasOccupation.name` in the JSON-LD block. Replace with values from `src/data/cv.ts`.

**Step 1: Import cv data in `src/pages/about.astro` frontmatter**

Add after existing imports:
```astro
import { cv } from '../data/cv';
```

**Step 2: Replace hardcoded values in the JSON-LD block**

Current hardcoded (lines ~30, 35–41, 45):
```js
jobTitle: 'Systems Builder & AI Safety Researcher',
knowsAbout: [
  'AI Safety',
  'Systems Analysis',
  'Cybersecurity',
  'Multi-agent Systems',
  'Infrastructure Management',
],
hasOccupation: {
  '@type': 'Occupation',
  name: 'Systems Builder & AI Safety Researcher',
  occupationLocation: { '@type': 'Country', name: 'Australia' },
},
```

Replace with:
```js
jobTitle: cv.jobTitle,
knowsAbout: cv.knowsAbout,
hasOccupation: {
  '@type': 'Occupation',
  name: cv.occupationName,
  occupationLocation: { '@type': 'Country', name: 'Australia' },
},
```

**Step 3: Build and verify**

```bash
npm run build 2>&1 | tail -5
```

Spot-check the about page JSON-LD in the build output:
```bash
grep -o '"jobTitle":"[^"]*"' dist/about/index.html
```
Expected: `"jobTitle":"Systems Builder & AI Safety Researcher"` (defaults, since cv repo not present locally).

**Step 4: Verify fallback is transparent** — the output should be identical to the previous hardcoded values when cv repo is absent.

**Step 5: Commit and push**

```bash
git add src/pages/about.astro
git commit -m "feat(cv): wire CV data into about.astro JSON-LD (#164)"
git push
```

---

## Verification checklist (after all tasks)

```bash
npm run build                                          # must succeed
grep -c 'srcset' dist/index.html                       # should be > 0
grep -c 'page_not_found' dist/404/index.html           # should be 1
grep -c 'ViewTransitions' dist/index.html              # look for transition markers
grep '"jobTitle"' dist/about/index.html                # should show CV value
```
