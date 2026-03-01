# Sprint 25: Polish, Performance & Reach — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scroll-driven entrance animations, LQIP blur-up placeholders, project OG images, Lighthouse fixes, critical asset preloading, and verify failurefirst.org.

**Architecture:** CSS-first animations with IntersectionObserver (no JS library). Build-time image processing with sharp for LQIP and OG images. Zero new runtime dependencies.

**Tech Stack:** Astro 5, Tailwind CSS 3, sharp (already a transitive dep via Astro)

**Pre-existing infrastructure (do NOT rebuild):**
- `series`/`seriesOrder` fields already in content schema and rendered in blog/project detail pages
- `BreadcrumbList` JSON-LD already in `Breadcrumb.astro`, used on all detail pages
- `animate-in` class + `fade-up` keyframes already in `global.css`
- `img-placeholder` gradient class already in `global.css`
- `prefers-reduced-motion: reduce` already disables animations globally

---

### Task 1: ScrollReveal component — entrance animations (#143)

**Files:**
- Create: `src/components/ScrollReveal.astro`
- Modify: `src/styles/global.css` (add `.scroll-reveal` styles)
- Modify: `src/pages/index.astro` (wrap sections)
- Modify: `src/pages/blog/index.astro` (wrap post cards)
- Modify: `src/pages/projects/index.astro` (wrap project cards)

**Step 1: Add scroll-reveal CSS to global.css**

Add after the existing `.animate-in` block (around line 193) in `src/styles/global.css`:

```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(1rem);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}
.scroll-reveal.revealed {
  opacity: 1;
  transform: translateY(0);
}
```

The existing `prefers-reduced-motion: reduce` block already sets `transition-duration: 0.01ms !important` on all elements, so no additional motion safety is needed.

**Step 2: Create ScrollReveal.astro**

Create `src/components/ScrollReveal.astro`:

```astro
---
interface Props {
  /** Additional classes */
  class?: string;
  /** HTML tag to render */
  as?: string;
  /** Stagger delay in ms (for nth-child staggering) */
  stagger?: number;
}

const { class: className = '', as: Tag = 'div', stagger } = Astro.props;
---

<Tag
  class:list={['scroll-reveal', className]}
  {...stagger ? { style: `transition-delay: ${stagger}ms` } : {}}
>
  <slot />
</Tag>

<!-- Only inject the observer script once per page -->
<script>
  if (!window.__scrollRevealInit) {
    window.__scrollRevealInit = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));

    // Re-observe after View Transitions
    document.addEventListener('astro:after-swap', () => {
      document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach((el) => observer.observe(el));
    });
  }
</script>
```

Add type declaration to avoid TS error — create or append to `src/env.d.ts`:

```ts
interface Window {
  __scrollRevealInit?: boolean;
}
```

**Step 3: Wrap homepage sections**

In `src/pages/index.astro`:

1. Add import: `import ScrollReveal from '../components/ScrollReveal.astro';`
2. Wrap "Featured Work" section heading `<h2>` → `<ScrollReveal><h2 ...>Featured Work</h2></ScrollReveal>`
3. Wrap each featured project card in the `.map()` with `<ScrollReveal stagger={i * 100}>` where `i` is the map index
4. Wrap "Recent Writing" heading and each post card similarly
5. Wrap "Gallery" and "Audio" section headings
6. Do NOT wrap the hero section (above the fold, should be visible immediately)
7. Do NOT wrap the consulting CTA (it's a conversion element)

**Step 4: Wrap blog listing cards**

In `src/pages/blog/index.astro`:

1. Add import: `import ScrollReveal from '../../components/ScrollReveal.astro';`
2. Wrap each `<article>` in the posts map with `<ScrollReveal>`

**Step 5: Wrap project listing cards**

In `src/pages/projects/index.astro`:

1. Add import: `import ScrollReveal from '../../components/ScrollReveal.astro';`
2. Wrap each `<article>` in the projects map with `<ScrollReveal>`

**Step 6: Verify**

Run: `npm run build && npm run preview`
- Navigate to homepage — sections should fade in as you scroll
- Navigate to blog listing — cards should fade in
- Navigate to projects listing — cards should fade in
- Test with `prefers-reduced-motion: reduce` in DevTools — no animation
- Test View Transitions — animations should re-trigger on page nav

**Step 7: Commit**

```bash
git add src/components/ScrollReveal.astro src/styles/global.css src/pages/index.astro src/pages/blog/index.astro src/pages/projects/index.astro src/env.d.ts
git commit -m "feat(ux): scroll-driven entrance animations (#143)"
```

---

### Task 2: LQIP blur-up placeholders (#141)

**Files:**
- Create: `src/lib/placeholder.ts`
- Modify: `src/styles/global.css` (add blur-up transition styles)
- Modify: `src/pages/index.astro` (project hero images, gallery covers)
- Modify: `src/pages/blog/index.astro` (if hero images shown in cards — currently not, skip)
- Modify: `src/pages/projects/index.astro` (project hero images — currently not shown in list cards, skip)

**Step 1: Create placeholder utility**

Create `src/lib/placeholder.ts`:

```ts
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cache = new Map<string, string>();

/**
 * Generate a tiny base64-encoded blurred placeholder for an image.
 * Works with local image paths (relative to project root).
 */
export async function getPlaceholder(src: string): Promise<string> {
  if (cache.has(src)) return cache.get(src)!;

  // Resolve the image path relative to the project root
  const imagePath = resolve(process.cwd(), src.startsWith('/') ? `public${src}` : src);

  try {
    const buffer = readFileSync(imagePath);
    const placeholder = await sharp(buffer)
      .resize(20, undefined, { fit: 'inside' })
      .blur(3)
      .toFormat('webp', { quality: 20 })
      .toBuffer();

    const dataUri = `data:image/webp;base64,${placeholder.toString('base64')}`;
    cache.set(src, dataUri);
    return dataUri;
  } catch {
    return '';
  }
}
```

**Step 2: Add blur-up CSS**

Add to `src/styles/global.css` in the `@layer utilities` block:

```css
.blur-up {
  background-size: cover;
  background-position: center;
}
.blur-up img,
.blur-up picture img {
  transition: opacity 0.3s ease-out;
}
```

**Step 3: Apply to homepage gallery covers**

In `src/pages/index.astro`, the gallery section already wraps images in `<div class="img-placeholder">`. Enhance this:

1. Import `getPlaceholder` at the top of the frontmatter
2. For each gallery `coverImage`, generate a placeholder at build time
3. Add the base64 as an inline `background-image` style on the wrapper div

The `.map()` in the gallery section needs to become an async operation. Since Astro supports top-level await, pre-compute the placeholders:

```ts
// In frontmatter, after fetching galleries:
const galleryPlaceholders = new Map<string, string>();
for (const collection of recentGalleries) {
  if (collection.data.coverImage) {
    const ph = await getPlaceholder(collection.data.coverImage);
    if (ph) galleryPlaceholders.set(collection.data.coverImage, ph);
  }
}
```

Then on the wrapper div:
```astro
<div
  class="img-placeholder blur-up aspect-[4/3] overflow-hidden"
  style={galleryPlaceholders.get(collection.data.coverImage) ? `background-image: url(${galleryPlaceholders.get(collection.data.coverImage)})` : ''}
>
```

**Step 4: Apply to homepage featured project hero images**

Same pattern for `featuredProjects` that have `heroImage`:

```ts
const projectPlaceholders = new Map<string, string>();
for (const project of featuredProjects) {
  if (project.data.heroImage) {
    const ph = await getPlaceholder(project.data.heroImage);
    if (ph) projectPlaceholders.set(project.data.heroImage, ph);
  }
}
```

Wrap the `<Picture>` in a blur-up div with the placeholder as background.

**Step 5: Verify**

Run: `npm run build && npm run preview`
- Check homepage — gallery images should show blurred placeholder before full image loads
- Throttle network in DevTools to see the blur-up effect
- Verify no build errors or extra console warnings

**Step 6: Commit**

```bash
git add src/lib/placeholder.ts src/styles/global.css src/pages/index.astro
git commit -m "feat(perf): LQIP blur-up placeholders for homepage images (#141)"
```

---

### Task 3: Verify failurefirst.org domain (#166)

**Files:** None (verification task)

**Step 1: Check DNS resolution**

```bash
dig failurefirst.org +short
dig www.failurefirst.org +short
```

**Step 2: Check HTTPS**

```bash
curl -sI https://failurefirst.org | head -20
curl -sI https://www.failurefirst.org | head -20
```

**Step 3: Check site content**

```bash
curl -sL https://failurefirst.org | head -50
```

**Step 4: Close issue with findings**

```bash
gh issue close 166 --comment "Verified: [document findings — DNS resolves / doesn't, HTTPS works / cert issue, site loads / down]"
```

**Step 5: If site is NOT live**

Document the status and what needs to happen (DNS configuration, hosting setup, etc.) in the issue comment before closing.

---

### Task 4: Project OG images

**Files:**
- Create: `scripts/generate-og-images.mjs`
- Create: `public/og/` directory (project OG images output here)

**Step 1: Create OG image generator script**

Create `scripts/generate-og-images.mjs`:

```js
import sharp from 'sharp';
import matter from 'gray-matter';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECTS_DIR = 'src/content/projects';
const OUTPUT_DIR = 'public/og';
const WIDTH = 1200;
const HEIGHT = 630;

// Site palette
const BG_COLOR = '#1a181c';
const ACCENT_COLOR = '#c48b6e';
const TEXT_COLOR = '#e2ddd8';
const MUTED_COLOR = '#968e96';

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const files = readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.md'));

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const outPath = join(OUTPUT_DIR, `${slug}.png`);

  // Skip if already exists
  if (existsSync(outPath)) {
    console.log(`  skip: ${slug} (exists)`);
    continue;
  }

  const raw = readFileSync(join(PROJECTS_DIR, file), 'utf-8');
  const { data } = matter(raw);
  const title = data.title || slug;
  const description = data.description || '';

  // Create SVG with text overlay
  // sharp's text support is limited, so we use SVG
  const svg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${BG_COLOR}" />
      <!-- Accent bar at top -->
      <rect x="0" y="0" width="100%" height="6" fill="${ACCENT_COLOR}" />
      <!-- Accent glow -->
      <ellipse cx="600" cy="200" rx="400" ry="200" fill="${ACCENT_COLOR}" opacity="0.06" />
      <!-- Site name -->
      <text x="80" y="80" font-family="system-ui, sans-serif" font-size="24" fill="${MUTED_COLOR}">
        adrianwedd.com
      </text>
      <!-- Title (truncate at ~50 chars for fit) -->
      <text x="80" y="280" font-family="system-ui, sans-serif" font-size="52" font-weight="600" fill="${TEXT_COLOR}">
        ${escapeXml(title.length > 50 ? title.slice(0, 47) + '...' : title)}
      </text>
      <!-- Description (truncate at ~80 chars) -->
      <text x="80" y="360" font-family="system-ui, sans-serif" font-size="24" fill="${MUTED_COLOR}">
        ${escapeXml(description.length > 80 ? description.slice(0, 77) + '...' : description)}
      </text>
      <!-- Tags -->
      <text x="80" y="560" font-family="system-ui, sans-serif" font-size="18" fill="${ACCENT_COLOR}">
        ${escapeXml((data.tags || []).slice(0, 5).join('  ·  '))}
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`  created: ${slug}.png`);
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

console.log('Done.');
```

**Step 2: Run the generator**

```bash
node scripts/generate-og-images.mjs
```

Expected: PNG files created in `public/og/` for each project that doesn't already have one.

**Step 3: Update project detail page to use generated OG images**

In `src/pages/projects/[...slug].astro`, update the `<BaseLayout>` props to use the generated OG image when no heroImage exists:

Change `image={project.data.heroImage}` to:
```ts
const ogImage = project.data.heroImage || `/og/${projectSlug}.png`;
```
Then: `image={ogImage}`

**Step 4: Verify**

Run: `npm run build`
- Check `public/og/` has PNG files for projects
- Open a project page source and verify `og:image` meta tag points to the correct image

**Step 5: Commit**

```bash
git add scripts/generate-og-images.mjs public/og/ src/pages/projects/[...slug].astro
git commit -m "feat(seo): generate OG images for projects"
```

---

### Task 5: Lighthouse audit pass

**Files:** Various (depends on findings)

**Step 1: Run Lighthouse on key pages**

Use Chrome DevTools or CLI:

```bash
npx lighthouse https://adrianwedd.com --output=json --output-path=./lighthouse-home.json --chrome-flags="--headless"
npx lighthouse https://adrianwedd.com/blog/ --output=json --output-path=./lighthouse-blog.json --chrome-flags="--headless"
npx lighthouse https://adrianwedd.com/projects/ --output=json --output-path=./lighthouse-projects.json --chrome-flags="--headless"
npx lighthouse https://adrianwedd.com/services/ --output=json --output-path=./lighthouse-services.json --chrome-flags="--headless"
```

Or run against local preview:
```bash
npm run build && npm run preview &
# Then run lighthouse against localhost:4321
```

**Step 2: Identify issues below 95**

Common expected issues:
- **CLS:** Images without explicit width/height (check `<Picture>` components)
- **Color contrast:** `text-text-muted` on dark background may be below 4.5:1
- **Missing aria-labels:** Icon-only buttons or links
- **Render-blocking resources:** CSS delivery

**Step 3: Fix each issue**

For each finding below 95:
- CLS: Ensure all `<Picture>` components have explicit `width` and `height`
- Contrast: Check `--color-text-muted` (#968e96) on `--color-surface` (#1a181c) — ratio is ~4.8:1 (passes AA) but verify
- Aria: Add `aria-label` to any icon-only interactive elements
- Performance: Check for large JS bundles, unoptimized images

**Step 4: Re-run Lighthouse to verify**

Confirm all categories >= 95.

**Step 5: Commit**

```bash
git add [changed files]
git commit -m "perf(a11y): Lighthouse audit fixes — [specific improvements]"
```

---

### Task 6: Preload critical assets

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/SEOHead.astro` (optional, if preload hints go in head)

**Step 1: Identify critical assets**

After building, check what CSS/JS files are generated:

```bash
npm run build
ls -la dist/_astro/*.css
```

Astro generates hashed CSS files. The critical CSS is the main stylesheet.

**Step 2: Add preload hints**

In `src/layouts/BaseLayout.astro`, add before `<SEOHead>` in the `<head>`:

```html
<!-- Preload critical stylesheet (Astro inlines critical CSS, so this may not be needed) -->
```

Actually, Astro 5 with `<ViewTransitions />` already optimizes CSS delivery. The real win is preloading above-fold hero images on specific pages.

Better approach: Add a `preloadImage` prop to `BaseLayout.astro`:

```astro
interface Props {
  // ... existing props
  preloadImage?: string;
}
```

Then in the `<head>`:
```astro
{props.preloadImage && (
  <link rel="preload" as="image" href={props.preloadImage} />
)}
```

Use this from pages that have a known above-fold image:
- Homepage: no hero image (text-only hero)
- Blog detail: `preloadImage={post.data.heroImage}` when present
- Project detail: `preloadImage={project.data.heroImage}` when present

**Step 3: Apply to blog and project detail pages**

In `src/pages/blog/[...slug].astro`:
```astro
<BaseLayout
  ...
  preloadImage={post.data.heroImage}
>
```

In `src/pages/projects/[...slug].astro`:
```astro
<BaseLayout
  ...
  preloadImage={project.data.heroImage}
>
```

**Step 4: Verify**

Run: `npm run build && npm run preview`
- View source on a blog post with heroImage — confirm `<link rel="preload" as="image">` in head
- Check Network panel — image should load earlier

**Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/pages/blog/[...slug].astro src/pages/projects/[...slug].astro
git commit -m "perf: preload above-fold hero images on detail pages"
```

---

### Final verification

**Step 1: Full build**

```bash
npm run build
```

Expected: Clean build, no errors.

**Step 2: Content validation**

```bash
node scripts/validate-content.js
```

Expected: 0 errors, 0 warnings.

**Step 3: Push**

```bash
git push
```

**Step 4: Close issues**

```bash
gh issue close 143 --comment "Implemented in Sprint 25: ScrollReveal component with IntersectionObserver, applied to homepage sections and listing pages. CSS-only animations, prefers-reduced-motion respected."
gh issue close 141 --comment "Implemented in Sprint 25: LQIP blur-up placeholders using sharp-generated base64 thumbnails on homepage images."
```
