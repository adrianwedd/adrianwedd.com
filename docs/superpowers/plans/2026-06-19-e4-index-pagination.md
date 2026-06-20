# E4 — Index Pagination + Carousel Crop Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paginate the blog and audio indexes (main lists and tag pages) at 12 items/page while preserving every existing URL, and fix the featured carousel so portrait infographics display uncropped in both themes.

**Architecture:** Replace each `index.astro` / `[tag].astro` with an Astro `[...page].astro` rest-parameter route driven by `paginate()` inside `getStaticPaths()`. Astro maps page 1 to the bare base URL (`/blog/`) and pages 2+ to `/2/`, `/3/`… A new presentational `Pagination.astro` (zero-JS) renders the nav. The carousel renders on page 1 only and switches from `object-cover` to `object-contain` over a fixed dark backdrop.

**Tech Stack:** Astro 6.4.6, Tailwind CSS 4 (CSS-custom-property theming), `astro:assets` `<Picture>`, `@astrojs/sitemap`. No client framework for these routes (server-rendered, zero-JS except existing `is:inline` toggles).

## Global Constraints

These apply to **every** task. Copy them verbatim; do not paraphrase.

- **Page size: 12 items/page** — `paginate(items, { pageSize: 12 })`.
- **Permalinks are immutable.** After this change `/blog/`, `/audio/`, `/blog/tag/<t>/`, `/audio/tag/<t>/` must render page 1 byte-for-byte at the same URL. Only **new** `/N/` URLs are added. No redirects.
- **`index.astro` / `[tag].astro` MUST be deleted**, not left in place — a leftover `index.astro` produces a build WARN (`/blog/[...page] conflicts with higher priority route /blog`). A clean build with **no** `[...page]`-conflict warning is the proof the delete happened.
- **Tag pages keep `noindex`.** The existing blog/audio tag routes set `noindex`; the paginated replacements keep it. Main blog/audio paginated pages stay indexable.
- **Page-2+ titles compose in the page** before passing `title` to `BaseLayout` (SEOHead has no suffix prop; it only appends `" — Adrian Wedd"`). Page 1 titles are unchanged.
- **No Tailwind `dark:` prefix** — theming is driven by CSS custom properties. Theme-independent colours use arbitrary values (`bg-[#1a181c]`).
- **Use `<Picture>` from `astro:assets`** for local images — never raw `<img>` (CI gate enforces this).
- **VT-safe:** Pagination is plain `<a>` links only; any `is:inline` script keeps its `documentElement.dataset` sentinel + `astro:after-swap` pattern.
- **`rel="prev"/"next"` is OPTIONAL / de-scoped** (Google retired it in 2019). This plan emits `rel="prev"`/`rel="next"` only on the Pagination component's own Prev/Next `<a>` links (free, harmless). It does **not** add `<link rel="prev/next">` to `<head>` — so `SEOHead.astro` / `BaseLayout.astro` are **not** touched.
- **No Astro unit-test suite exists** (per CLAUDE.md). The test cycle for these tasks is: `npm run build` → inspect `dist/` output → `npm run check:links` → screenshot where visual. That replaces the usual unit-test red/green loop.

**Derived page counts (sanity only — derive from collection size, do not hardcode in code):** blog ≈ `ceil(79/12)` = 7 pages; audio ≈ `ceil(103/12)` = 9 pages. Counts shift as content is added; always compute, never assume.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/Pagination.astro` | **NEW.** Presentational zero-JS page nav. Prev/Next + numbered window with ellipsis. Hidden when `lastPage === 1`. |
| `src/pages/blog/[...page].astro` | **NEW** (replaces `blog/index.astro`). Paginated blog main index; hero + carousel on page 1 only. |
| `src/pages/blog/tag/[tag]/[...page].astro` | **NEW** (replaces `blog/tag/[tag].astro`). Paginated per-tag blog list, `noindex`. |
| `src/pages/audio/[...page].astro` | **NEW** (replaces `audio/index.astro`). Paginated audio index; link-based tag chips; filter + sort scripts removed. |
| `src/pages/audio/tag/[tag]/[...page].astro` | **NEW** (replaces `audio/tag/[tag].astro`). Paginated per-tag audio list, `noindex`. |
| `src/components/ContentCarousel.astro` | **MODIFY.** `object-contain` + fixed dark backdrop + remove hover scale. |
| `astro.config.mjs` | **MODIFY.** Sitemap priority regex excludes bare-integer pagination slugs. |
| `src/pages/blog/index.astro` | **DELETE** (with Task 2). |
| `src/pages/blog/tag/[tag].astro` | **DELETE** (with Task 3). |
| `src/pages/audio/index.astro` | **DELETE** (with Task 4). |
| `src/pages/audio/tag/[tag].astro` | **DELETE** (with Task 5). |

**Verify-only (read to confirm decoupling, do not edit):** `src/pages/blog/rss.xml.ts`, `src/pages/audio/feed.xml.ts`, `src/pages/blog/tags/index.astro`, `src/components/SEOHead.astro`, `src/layouts/BaseLayout.astro`.

---

## Task 1: Pagination component

The shared presentational nav. Built first because every paginated route consumes it. It compiles but is not emitted to `dist/` until a route imports it (Task 2), so its standalone verification is `astro check` for type/syntax; its rendered verification happens in Task 2.

**Files:**
- Create: `src/components/Pagination.astro`

**Interfaces:**
- Consumes: nothing (leaf component).
- Produces: an Astro component with this exact prop shape, imported by Tasks 2–5:
  ```ts
  interface Props {
    currentPage: number;   // 1-based
    lastPage: number;      // total pages
    prevUrl?: string;      // href for previous page; undefined on page 1
    nextUrl?: string;      // href for next page; undefined on last page
    basePath: string;      // base URL WITH trailing slash, e.g. "/blog/" or "/blog/tag/ai/"
  }
  ```
  Callers compute `prevUrl`/`nextUrl` themselves (see Task 2) so the component never depends on Astro's undocumented `page.url.prev/next` formatting. The component builds numbered hrefs internally as `n === 1 ? basePath : `${basePath}${n}/``.

- [ ] **Step 1: Write the component**

Create `src/components/Pagination.astro`:

```astro
---
/**
 * Pagination — presentational, zero-JS page navigation for paginated indexes.
 *
 * Props:
 *   currentPage: number — 1-based current page
 *   lastPage: number — total number of pages
 *   prevUrl: string | undefined — href for the previous page (undefined on page 1)
 *   nextUrl: string | undefined — href for the next page (undefined on last page)
 *   basePath: string — base URL WITH trailing slash, e.g. "/blog/" or "/blog/tag/ai/"
 *
 * Renders nothing when lastPage === 1. Numbered window shows first, last, and
 * current ±1 with an ellipsis for gaps. VT-safe (plain <a> links only).
 */
interface Props {
  currentPage: number;
  lastPage: number;
  prevUrl?: string;
  nextUrl?: string;
  basePath: string;
}

const { currentPage, lastPage, prevUrl, nextUrl, basePath } = Astro.props;

const hrefFor = (n: number) => (n === 1 ? basePath : `${basePath}${n}/`);

// Numbered window: first, last, current ±1, sorted & de-duped, in range.
const windowPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, lastPage])]
  .filter((n) => n >= 1 && n <= lastPage)
  .sort((a, b) => a - b);

// Insert ellipsis markers (n === 0) where there is a gap > 1 between numbers.
const items: number[] = [];
let last = 0;
for (const n of windowPages) {
  if (last && n - last > 1) items.push(0);
  items.push(n);
  last = n;
}

const linkClass =
  'hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent';
const currentClass = 'bg-accent/15 rounded-full px-3 py-1 text-xs font-medium text-accent no-underline';
const disabledClass = 'rounded-full px-3 py-1 text-xs text-text-muted opacity-40';
---

{
  lastPage > 1 && (
    <nav aria-label="Pagination" class="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      {prevUrl ? (
        <a href={prevUrl} rel="prev" class={linkClass}>
          ← Prev
        </a>
      ) : (
        <span aria-disabled="true" class={disabledClass}>
          ← Prev
        </span>
      )}

      {items.map((n) =>
        n === 0 ? (
          <span class="px-2 py-1 text-xs text-text-muted">…</span>
        ) : n === currentPage ? (
          <a href={hrefFor(n)} aria-current="page" class={currentClass}>
            {n}
          </a>
        ) : (
          <a href={hrefFor(n)} class={linkClass}>
            {n}
          </a>
        ),
      )}

      {nextUrl ? (
        <a href={nextUrl} rel="next" class={linkClass}>
          Next →
        </a>
      ) : (
        <span aria-disabled="true" class={disabledClass}>
          Next →
        </span>
      )}
    </nav>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx astro check 2>&1 | tail -20`
Expected: no new errors referencing `Pagination.astro`. (Pre-existing repo warnings unrelated to this file are acceptable — compare against a baseline if unsure.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Pagination.astro
git commit -m "feat(e4): add zero-JS Pagination component"
```

---

## Task 2: Paginate the blog main index

Replace `blog/index.astro` with a rest-param route. Page 1 keeps the full-viewport hero + carousel + tag nav + list; pages 2+ drop the hero and carousel but keep tag nav + list + Pagination. This task is where the first real `dist/blog/2/` appears, so it also proves the Pagination component renders.

**Files:**
- Create: `src/pages/blog/[...page].astro`
- Delete: `src/pages/blog/index.astro`

**Interfaces:**
- Consumes: `Pagination` (Task 1) — props `{ currentPage, lastPage, prevUrl, nextUrl, basePath }`; `ContentCarousel` (existing); `HeroCanvas`, `ScrollReveal`, `slug` (existing).
- Produces: URLs `/blog/` (p1), `/blog/2/` … `/blog/N/`. `basePath` passed to Pagination is `"/blog/"`.

- [ ] **Step 1: Confirm the pre-change state (the "failing" baseline)**

Run: `ls src/pages/blog/`
Expected: shows `index.astro` (will be deleted) and `[...slug].astro`, `rss.xml.ts`, `tag/`, `tags/`. No `[...page].astro` yet — `/blog/2/` does not exist.

- [ ] **Step 2: Create `src/pages/blog/[...page].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import HeroCanvas from '../../components/HeroCanvas.astro';
import ContentCarousel from '../../components/ContentCarousel.astro';
import Pagination from '../../components/Pagination.astro';
import ScrollReveal from '../../components/ScrollReveal.astro';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';

export async function getStaticPaths({ paginate }) {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(posts, { pageSize: 12 });
}

const { page } = Astro.props;
const isFirst = page.currentPage === 1;

// Tag chips (and the page-1 carousel) need the full post set, not this page's slice.
const allPosts = (await getCollection('blog'))
  .filter((p) => !p.data.draft)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
const allTags = [...new Set(allPosts.flatMap((p) => p.data.tags))].sort();

const carouselItems = isFirst
  ? allPosts
      .filter((p) => p.data.heroImage)
      .map((p) => ({
        href: `/blog/${slug(p.id)}/`,
        title: p.data.title,
        description: p.data.description,
        heroImage: p.data.heroImage as string,
        date: p.data.date,
        tags: p.data.tags,
      }))
  : [];

const pageTitle = isFirst ? 'Blog' : `Blog — Page ${page.currentPage}`;
const prevUrl = page.currentPage > 1 ? (page.currentPage - 1 === 1 ? '/blog/' : `/blog/${page.currentPage - 1}/`) : undefined;
const nextUrl = page.currentPage < page.lastPage ? `/blog/${page.currentPage + 1}/` : undefined;
---

<BaseLayout
  title={pageTitle}
  description="Writing where the thinking shows. Research notes, failure analysis, and ideas still taking shape."
>
  {
    isFirst && (
      <section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
        <div class="relative z-10 mx-auto max-w-3xl">
          <h1 class="text-text">
            Writing where the thinking shows.
            <br />
            <span class="text-text-muted">Research notes, failure analysis, and ideas still taking shape.</span>
          </h1>
          <p class="mt-6 max-w-prose text-text-muted">
            What actually breaks, and why. Who knew about it before it broke. What the gap between demonstrated risk and
            organisational response looks like from the inside.
          </p>
        </div>
        <HeroCanvas animation="ink" />
      </section>
    )
  }

  {isFirst && carouselItems.length > 0 && <ContentCarousel items={carouselItems} id="blog-carousel" label="Featured blog posts" />}

  <section class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
    {/* Tag filter */}
    {
      allTags.length > 0 && (
        <nav class="mt-8" aria-label="Filter by tag">
          <div class="flex flex-wrap gap-2" id="blog-tags">
            <a href="/blog/" class="bg-accent/15 rounded-full px-3 py-1 text-xs font-medium text-accent no-underline">
              All
            </a>
            {allTags.map((tag, i) => (
              <a
                href={`/blog/tag/${tag}/`}
                class:list={[
                  'hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent',
                  i >= 10 && 'blog-tag-overflow hidden',
                ]}
              >
                {tag}
              </a>
            ))}
            {allTags.length > 10 && (
              <button
                type="button"
                id="blog-tags-toggle"
                aria-expanded="false"
                class="hover:bg-accent/15 cursor-pointer rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted transition-colors hover:text-accent"
              >
                +{allTags.length - 10} more
              </button>
            )}
            <a
              href="/blog/tags/"
              class="hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent"
            >
              Browse all tags
            </a>
          </div>
        </nav>
      )
    }

    {/* Post list */}
    <div class="mt-10 space-y-8">
      {
        page.data.map((post) => {
          const words = post.body ? post.body.split(/\s+/).length : 0;
          const readingTime = Math.max(1, Math.ceil(words / 200));
          return (
            <article>
              <ScrollReveal>
                <a
                  href={`/blog/${slug(post.id)}/`}
                  class="card-hover hover:border-accent/50 group block rounded-xl border border-border bg-surface-alt p-6 no-underline shadow-subtle transition-all hover:shadow-card"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h2 class="text-xl font-semibold text-text transition-colors group-hover:text-accent">
                        {post.data.title}
                      </h2>
                      <p class="mt-1 text-sm leading-relaxed text-text-muted">{post.data.description}</p>
                      <div class="mt-3 flex flex-wrap items-center gap-2">
                        {post.data.tags.map((tag: string) => (
                          <span class="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-text-muted">
                            {tag}
                          </span>
                        ))}
                        <span class="text-xs text-text-muted">&middot; {readingTime} min read</span>
                      </div>
                    </div>
                    <time class="whitespace-nowrap text-xs text-text-muted" datetime={post.data.date.toISOString()}>
                      {post.data.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </div>
                </a>
              </ScrollReveal>
            </article>
          );
        })
      }
    </div>

    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath="/blog/"
    />
  </section>

  <script is:inline>
    (function () {
      var blogTagExpanded = false;

      function initBlogToggle() {
        var toggle = document.getElementById('blog-tags-toggle');
        if (toggle && !toggle.dataset.label) toggle.dataset.label = toggle.textContent || '';
        blogTagExpanded = false;
      }

      if (!document.documentElement.dataset.blogTagInit) {
        document.documentElement.dataset.blogTagInit = '1';

        document.addEventListener('click', function (e) {
          var target = e.target;
          if (!target || typeof target.closest !== 'function') return;
          if (target.closest('#blog-tags-toggle')) {
            blogTagExpanded = !blogTagExpanded;
            document.querySelectorAll('.blog-tag-overflow').forEach(function (el) {
              el.classList.toggle('hidden', !blogTagExpanded);
            });
            var toggle = document.getElementById('blog-tags-toggle');
            if (toggle) {
              toggle.textContent = blogTagExpanded ? 'Show less' : toggle.dataset.label || '';
              toggle.setAttribute('aria-expanded', String(blogTagExpanded));
            }
          }
        });

        document.addEventListener('astro:after-swap', initBlogToggle);
      }

      initBlogToggle();
    })();
  </script>
</BaseLayout>
```

- [ ] **Step 3: Delete the old index**

```bash
git rm src/pages/blog/index.astro
```

- [ ] **Step 4: Build and confirm no route-conflict warning**

Run: `npm run build 2>&1 | tee /tmp/e4-blog-build.txt | grep -iE "conflict|warn|error" || echo "NO WARNINGS"`
Expected: **no** line mentioning `/blog/[...page] conflicts`. (A clean run prints `NO WARNINGS` or only unrelated warnings.) Build exits 0.

- [ ] **Step 5: Confirm the paginated pages were emitted and page 1 did not move**

Run: `ls dist/blog/index.html dist/blog/2/index.html && echo "---last page---" && ls -d dist/blog/[0-9]*/`
Expected: `dist/blog/index.html` exists (page 1, URL unchanged), `dist/blog/2/index.html` exists, and numbered dirs run `2/`…`7/` (or whatever `ceil(nBlog/12)` currently is). There must be **no** `dist/blog/1/` directory.

- [ ] **Step 6: Confirm the carousel is page-1-only**

Run: `grep -c 'data-carousel="blog-carousel"' dist/blog/index.html dist/blog/2/index.html`
Expected: `dist/blog/index.html:1` and `dist/blog/2/index.html:0`.

- [ ] **Step 7: Link check**

Run: `npm run check:links`
Expected: passes — catches any bad pagination href (e.g. an accidental `/blog/1/`) or a `/blog/` regression.

- [ ] **Step 8: Commit**

```bash
git add src/pages/blog/[...page].astro
git commit -m "feat(e4): paginate blog index via [...page] route (12/page, carousel page-1 only)"
```

---

## Task 3: Paginate the blog tag pages

Replace `blog/tag/[tag].astro` with a paginated rest-param route nested one level deeper. Keep `noindex`, the breadcrumb, the all-tags nav, and the total-count line.

**Files:**
- Create: `src/pages/blog/tag/[tag]/[...page].astro`
- Delete: `src/pages/blog/tag/[tag].astro`

**Interfaces:**
- Consumes: `Pagination` (Task 1); `Breadcrumb`, `slug` (existing). Import depth is **four** levels up (`../../../../`) because the file sits at `blog/tag/[tag]/[...page].astro`.
- Produces: URLs `/blog/tag/<t>/` (p1), `/blog/tag/<t>/2/` … `basePath` passed to Pagination is `` `/blog/tag/${tag}/` ``. `tag` is supplied in **both** `params` and `props`.

- [ ] **Step 1: Create `src/pages/blog/tag/[tag]/[...page].astro`**

```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Breadcrumb from '../../../../components/Breadcrumb.astro';
import Pagination from '../../../../components/Pagination.astro';
import { getCollection } from 'astro:content';
import { slug } from '../../../../lib/utils';

export async function getStaticPaths({ paginate }) {
  const all = (await getCollection('blog')).filter((p) => !p.data.draft);
  const tags = [...new Set(all.flatMap((p) => p.data.tags))];
  return tags.flatMap((tag) => {
    const posts = all
      .filter((p) => p.data.tags.includes(tag))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    return paginate(posts, { params: { tag }, props: { tag }, pageSize: 12 });
  });
}

const { page, tag } = Astro.props;
const isFirst = page.currentPage === 1;

const allPosts = await getCollection('blog');
const allTags = [...new Set(allPosts.filter((p) => !p.data.draft).flatMap((p) => p.data.tags))].sort();

const basePath = `/blog/tag/${tag}/`;
const pageTitle = isFirst ? `Posts tagged "${tag}"` : `Posts tagged "${tag}" — Page ${page.currentPage}`;
const prevUrl = page.currentPage > 1 ? (page.currentPage - 1 === 1 ? basePath : `${basePath}${page.currentPage - 1}/`) : undefined;
const nextUrl = page.currentPage < page.lastPage ? `${basePath}${page.currentPage + 1}/` : undefined;
---

<BaseLayout
  title={pageTitle}
  description={`Blog posts tagged with ${tag} — research, engineering, and analysis.`}
  noindex
>
  <section class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <Breadcrumb
      crumbs={[
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog/' },
        { label: 'Tags', href: '/blog/tags/' },
        { label: tag },
      ]}
    />
    <h1 class="text-text">Tag: {tag}</h1>
    <p class="mt-2 text-text-muted">{page.total} post{page.total !== 1 ? 's' : ''}</p>

    <nav class="mt-8 flex flex-wrap gap-2" aria-label="Filter by tag">
      <a
        href="/blog/"
        class="hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent"
      >
        All
      </a>
      {
        allTags.map((t) => (
          <a
            href={`/blog/tag/${t}/`}
            class:list={[
              'rounded-full px-3 py-1 text-xs no-underline',
              t === tag
                ? 'bg-accent/15 font-medium text-accent'
                : 'hover:bg-accent/15 bg-surface-raised text-text-muted transition-colors hover:text-accent',
            ]}
          >
            {t}
          </a>
        ))
      }
    </nav>

    <div class="mt-10 space-y-8">
      {
        page.data.map((post) => (
          <article>
            <a
              href={`/blog/${slug(post.id)}/`}
              class="card-hover hover:border-accent/50 group block rounded-xl border border-border bg-surface-alt p-6 no-underline shadow-subtle transition-all hover:shadow-card"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-xl font-semibold text-text transition-colors group-hover:text-accent">
                    {post.data.title}
                  </h2>
                  <p class="mt-1 text-sm leading-relaxed text-text-muted">{post.data.description}</p>
                </div>
                <time class="whitespace-nowrap text-xs text-text-muted" datetime={post.data.date.toISOString()}>
                  {post.data.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </time>
              </div>
            </a>
          </article>
        ))
      }
    </div>

    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath={basePath}
    />
  </section>
</BaseLayout>
```

- [ ] **Step 2: Delete the old tag route**

```bash
git rm src/pages/blog/tag/[tag].astro
```

- [ ] **Step 3: Build and check for conflicts**

Run: `npm run build 2>&1 | grep -iE "conflict|error" || echo "CLEAN"`
Expected: `CLEAN`. Build exits 0.

- [ ] **Step 4: Confirm tag page 1 URL unchanged + a big tag paginated**

Run: `ls dist/blog/tag/research/index.html dist/blog/tag/research/2/index.html`
Expected: both exist — `research` (32 posts) keeps `/blog/tag/research/` for page 1 and gains `/2/`/`/3/`. No `dist/blog/tag/research/1/`.

- [ ] **Step 5: Confirm noindex preserved**

Run: `grep -c 'noindex' dist/blog/tag/research/index.html dist/blog/tag/research/2/index.html`
Expected: `1` on each (the robots meta tag is present on both page 1 and page 2).

- [ ] **Step 6: Link check + commit**

```bash
npm run check:links
git add src/pages/blog/tag/[tag]/[...page].astro
git commit -m "feat(e4): paginate blog tag pages (noindex preserved)"
```

---

## Task 4: Paginate the audio index + strip filter & sort scripts

Replace `audio/index.astro`. The client-side tag filter and the sort `<select>` cannot work across server-paginated pages, so both are removed. Tag chips become links to `/audio/tag/<t>/` (mirroring the blog index, including a `+N more` overflow toggle). There is **no** `/audio/tags/` page — do not add a "Browse all tags" link. Episode cards lose their `data-tags`/`data-date`/`data-title` attributes (they existed only for the removed scripts).

**Files:**
- Create: `src/pages/audio/[...page].astro`
- Delete: `src/pages/audio/index.astro`

**Interfaces:**
- Consumes: `Pagination` (Task 1); `HeroCanvas`, `slug` (existing).
- Produces: URLs `/audio/` (p1), `/audio/2/` … `basePath` is `"/audio/"`.

- [ ] **Step 1: Create `src/pages/audio/[...page].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import HeroCanvas from '../../components/HeroCanvas.astro';
import Pagination from '../../components/Pagination.astro';
import { getCollection } from 'astro:content';
import { slug } from '../../lib/utils';

export async function getStaticPaths({ paginate }) {
  const episodes = (await getCollection('audio'))
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(episodes, { pageSize: 12 });
}

const { page } = Astro.props;
const isFirst = page.currentPage === 1;

const allEpisodes = (await getCollection('audio')).filter((e) => !e.data.draft);
const allTags = [...new Set(allEpisodes.flatMap((e) => e.data.tags))].sort();

const pageTitle = isFirst ? 'Audio' : `Audio — Page ${page.currentPage}`;
const prevUrl = page.currentPage > 1 ? (page.currentPage - 1 === 1 ? '/audio/' : `/audio/${page.currentPage - 1}/`) : undefined;
const nextUrl = page.currentPage < page.lastPage ? `/audio/${page.currentPage + 1}/` : undefined;
---

<BaseLayout
  title={pageTitle}
  description="Conversations with AI tools about failure modes, risk frameworks, and ideas too raw for text. The workshop extended—thinking aloud."
>
  {
    isFirst && (
      <section class="relative flex min-h-[100dvh] items-center px-4 sm:px-6 lg:px-8">
        <div class="relative z-10 mx-auto max-w-3xl">
          <h1 class="text-text">
            The workshop extended — thinking aloud.
            <br />
            <span class="text-text-muted">
              Conversations about failure modes, risk frameworks, and ideas too raw for text.
            </span>
          </h1>
          <p class="mt-6">
            <a href="/audio/feed.xml" class="text-sm text-text-muted transition-colors hover:text-accent">
              Podcast RSS &nearr;
            </a>
          </p>
        </div>
        <HeroCanvas animation="soundwave" />
      </section>
    )
  }

  <section class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
    {/* Tag chips → per-tag pages (link-based; replaces the old client-side filter) */}
    {
      allTags.length > 0 && (
        <nav class="mt-8" aria-label="Filter by tag">
          <div class="flex flex-wrap gap-2" id="audio-tags">
            <a href="/audio/" class="bg-accent/15 rounded-full px-3 py-1 text-xs font-medium text-accent no-underline">
              All
            </a>
            {allTags.map((tag, i) => (
              <a
                href={`/audio/tag/${tag}/`}
                class:list={[
                  'hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent',
                  i >= 10 && 'audio-tag-overflow hidden',
                ]}
              >
                {tag}
              </a>
            ))}
            {allTags.length > 10 && (
              <button
                type="button"
                id="audio-tags-toggle"
                aria-expanded="false"
                class="hover:bg-accent/15 cursor-pointer rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted transition-colors hover:text-accent"
              >
                +{allTags.length - 10} more
              </button>
            )}
          </div>
        </nav>
      )
    }

    <div class="mt-10 space-y-6">
      {
        page.data.map((episode) => (
          <article>
            <a
              href={`/audio/${slug(episode.id)}/`}
              class="card-hover hover:border-accent/50 group block rounded-xl border border-border bg-surface-alt p-6 no-underline shadow-subtle transition-all hover:shadow-card"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-text transition-colors group-hover:text-accent">
                    {episode.data.title}
                  </h2>
                  <p class="mt-1 text-sm leading-relaxed text-text-muted">{episode.data.description}</p>
                  <div class="mt-2 flex items-center gap-3 text-xs text-text-muted">
                    {episode.data.duration && <span>{episode.data.duration}</span>}
                    <div class="flex gap-2">
                      {episode.data.tags.map((tag: string) => (
                        <span class="rounded-full bg-surface-raised px-2.5 py-0.5">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <time class="whitespace-nowrap text-xs text-text-muted" datetime={episode.data.date.toISOString()}>
                  {episode.data.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </time>
              </div>
            </a>
          </article>
        ))
      }
    </div>

    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath="/audio/"
    />
  </section>

  <script is:inline>
    (function () {
      var audioTagExpanded = false;

      function initAudioToggle() {
        var toggle = document.getElementById('audio-tags-toggle');
        if (toggle && !toggle.dataset.label) toggle.dataset.label = toggle.textContent || '';
        audioTagExpanded = false;
      }

      if (!document.documentElement.dataset.audioTagInit) {
        document.documentElement.dataset.audioTagInit = '1';

        document.addEventListener('click', function (e) {
          var target = e.target;
          if (!target || typeof target.closest !== 'function') return;
          if (target.closest('#audio-tags-toggle')) {
            audioTagExpanded = !audioTagExpanded;
            document.querySelectorAll('.audio-tag-overflow').forEach(function (el) {
              el.classList.toggle('hidden', !audioTagExpanded);
            });
            var toggle = document.getElementById('audio-tags-toggle');
            if (toggle) {
              toggle.textContent = audioTagExpanded ? 'Show less' : toggle.dataset.label || '';
              toggle.setAttribute('aria-expanded', String(audioTagExpanded));
            }
          }
        });

        document.addEventListener('astro:after-swap', initAudioToggle);
      }

      initAudioToggle();
    })();
  </script>
</BaseLayout>
```

- [ ] **Step 2: Delete the old index**

```bash
git rm src/pages/audio/index.astro
```

- [ ] **Step 3: Build, then confirm removed machinery is gone**

Run: `npm run build 2>&1 | grep -iE "conflict|error" || echo "CLEAN"`
Expected: `CLEAN`, exit 0.

Run: `grep -cE "sort-select|tag-filter|applySort|data-tags=" dist/audio/index.html`
Expected: `0` — the sort `<select>`, the old filter buttons, the `applySort` script, and the `data-tags` card attributes are all absent.

- [ ] **Step 4: Confirm pagination + page-1 URL stability**

Run: `ls dist/audio/index.html dist/audio/2/index.html && ls -d dist/audio/[0-9]*/`
Expected: page 1 at `dist/audio/index.html` (unchanged), `dist/audio/2/` … through `ceil(nAudio/12)` (≈9). No `dist/audio/1/`.

- [ ] **Step 5: Confirm tag chips link out (no broken `/audio/tags/` link)**

Run: `grep -o '/audio/tag/[^"]*"' dist/audio/index.html | head -3 && grep -c '/audio/tags/' dist/audio/index.html`
Expected: chip hrefs like `/audio/tag/notebooklm/"` appear; the `/audio/tags/` count is `0` (that page does not exist — we must not link it).

- [ ] **Step 6: Link check + commit**

```bash
npm run check:links
git add src/pages/audio/[...page].astro
git commit -m "feat(e4): paginate audio index; remove client filter+sort, tag chips link out"
```

---

## Task 5: Paginate the audio tag pages

Replace `audio/tag/[tag].astro`. Mirrors Task 3 but for audio (no breadcrumb in the original — keep it that way), `noindex` preserved.

**Files:**
- Create: `src/pages/audio/tag/[tag]/[...page].astro`
- Delete: `src/pages/audio/tag/[tag].astro`

**Interfaces:**
- Consumes: `Pagination` (Task 1); `slug` (existing). Import depth is **four** levels up (`../../../../`).
- Produces: URLs `/audio/tag/<t>/` (p1), `/audio/tag/<t>/2/` … `basePath` is `` `/audio/tag/${tag}/` ``. `tag` supplied in both `params` and `props`.

- [ ] **Step 1: Create `src/pages/audio/tag/[tag]/[...page].astro`**

```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import Pagination from '../../../../components/Pagination.astro';
import { getCollection } from 'astro:content';
import { slug } from '../../../../lib/utils';

export async function getStaticPaths({ paginate }) {
  const episodes = (await getCollection('audio')).filter((e) => !e.data.draft);
  const tags = [...new Set(episodes.flatMap((e) => e.data.tags))];
  return tags.flatMap((tag) => {
    const tagged = episodes
      .filter((e) => e.data.tags.includes(tag))
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
    return paginate(tagged, { params: { tag }, props: { tag }, pageSize: 12 });
  });
}

const { page, tag } = Astro.props;
const isFirst = page.currentPage === 1;

const allEpisodes = (await getCollection('audio')).filter((e) => !e.data.draft);
const allTags = [...new Set(allEpisodes.flatMap((e) => e.data.tags))].sort();

const basePath = `/audio/tag/${tag}/`;
const pageTitle = isFirst ? `Audio tagged "${tag}"` : `Audio tagged "${tag}" — Page ${page.currentPage}`;
const prevUrl = page.currentPage > 1 ? (page.currentPage - 1 === 1 ? basePath : `${basePath}${page.currentPage - 1}/`) : undefined;
const nextUrl = page.currentPage < page.lastPage ? `${basePath}${page.currentPage + 1}/` : undefined;
---

<BaseLayout title={pageTitle} description={`Audio episodes tagged with ${tag}.`} noindex>
  <section class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 class="text-text">Tag: {tag}</h1>
    <p class="mt-2 text-text-muted">{page.total} episode{page.total !== 1 ? 's' : ''}</p>

    <nav class="mt-8 flex flex-wrap gap-2" aria-label="Filter by tag">
      <a
        href="/audio/"
        class="hover:bg-accent/15 rounded-full bg-surface-raised px-3 py-1 text-xs text-text-muted no-underline transition-colors hover:text-accent"
      >
        All
      </a>
      {
        allTags.map((t) => (
          <a
            href={`/audio/tag/${t}/`}
            class:list={[
              'rounded-full px-3 py-1 text-xs no-underline',
              t === tag
                ? 'bg-accent/15 font-medium text-accent'
                : 'hover:bg-accent/15 bg-surface-raised text-text-muted transition-colors hover:text-accent',
            ]}
          >
            {t}
          </a>
        ))
      }
    </nav>

    <div class="mt-10 space-y-6">
      {
        page.data.map((episode) => (
          <article>
            <a
              href={`/audio/${slug(episode.id)}/`}
              class="card-hover hover:border-accent/50 group block rounded-xl border border-border bg-surface-alt p-6 no-underline shadow-subtle transition-all hover:shadow-card"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-text transition-colors group-hover:text-accent">
                    {episode.data.title}
                  </h2>
                  <p class="mt-1 text-sm leading-relaxed text-text-muted">{episode.data.description}</p>
                  {episode.data.duration && (
                    <span class="mt-2 inline-block text-xs text-text-muted">{episode.data.duration}</span>
                  )}
                </div>
                <time class="whitespace-nowrap text-xs text-text-muted" datetime={episode.data.date.toISOString()}>
                  {episode.data.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </time>
              </div>
            </a>
          </article>
        ))
      }
    </div>

    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={prevUrl}
      nextUrl={nextUrl}
      basePath={basePath}
    />
  </section>
</BaseLayout>
```

- [ ] **Step 2: Delete the old tag route**

```bash
git rm src/pages/audio/tag/[tag].astro
```

- [ ] **Step 3: Build, confirm pagination + noindex on a big tag**

Run: `npm run build 2>&1 | grep -iE "conflict|error" || echo "CLEAN"`
Expected: `CLEAN`, exit 0.

Run: `ls dist/audio/tag/notebooklm/index.html dist/audio/tag/notebooklm/2/index.html && grep -c noindex dist/audio/tag/notebooklm/2/index.html`
Expected: both pages exist (`notebooklm` = 79 episodes → 7 pages); noindex count `1` on page 2.

- [ ] **Step 4: Link check + commit**

```bash
npm run check:links
git add src/pages/audio/tag/[tag]/[...page].astro
git commit -m "feat(e4): paginate audio tag pages (noindex preserved)"
```

---

## Task 6: Carousel crop fix

Make the featured carousel show portrait infographics whole, with a fixed dark backdrop that reads correctly in both themes, and stop the hover zoom from magnifying the letterbox. The exact frame proportion is a visual call: the hard constraints are nothing cropped, fixed dark backdrop, both themes OK, landscape heroes not absurdly letterboxed. Build + screenshot, then tune the aspect/backdrop if the screenshot looks wrong.

**Files:**
- Modify: `src/components/ContentCarousel.astro:42-53` (the image cell `<div>` + its `<Picture>`).

**Interfaces:**
- Consumes: nothing new. Same `CarouselItem[]` props.
- Produces: same component contract — only the image-cell markup changes.

- [ ] **Step 1: Replace the image-cell div + Picture classes**

In `src/components/ContentCarousel.astro`, replace this block:

```astro
                <div class="aspect-[16/9] overflow-hidden sm:aspect-[4/3] sm:w-1/2">
                  <Picture
                    src={item.heroImage}
                    width={600}
                    height={400}
                    widths={[320, 600, 900]}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    formats={['webp']}
                    alt={item.title}
                    class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
```

with (fixed dark backdrop `#1a181c`; `object-contain`; hover scale removed):

```astro
                <div class="aspect-[16/9] overflow-hidden bg-[#1a181c] sm:aspect-[4/3] sm:w-1/2">
                  <Picture
                    src={item.heroImage}
                    width={600}
                    height={400}
                    widths={[320, 600, 900]}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    formats={['webp']}
                    alt={item.title}
                    class="h-full w-full object-contain"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | grep -iE "error" || echo "CLEAN"`
Expected: `CLEAN`, exit 0.

- [ ] **Step 3: Confirm the crop is gone in the built HTML**

Run: `grep -o 'object-contain\|object-cover\|bg-\[#1a181c\]' dist/blog/index.html | sort | uniq -c`
Expected: `object-contain` and `bg-[#1a181c]` present; **no** `object-cover` inside the carousel. (Note: other components may still legitimately use `object-cover` elsewhere on other pages — this grep is scoped to `/blog/` where the carousel lives.)

- [ ] **Step 4: Visual check in both themes (the call the owner wants to eyeball)**

Run: `npm run preview` (serves `dist/` on http://localhost:4321), then screenshot `/blog/` in dark mode and in light mode (toggle the theme). Use the browser tooling to capture both.

Expected & **constraints to satisfy**:
- A portrait infographic shows **whole / uncropped** (no thin horizontal band).
- The backdrop around it is **dark** (`#1a181c`-ish), **not** cream, in **both** dark and light themes.
- Landscape (photo) heroes are not absurdly letterboxed.

If a portrait infographic looks too narrow/letterboxed in the `4/3` cell, tune the cell aspect (e.g. try `sm:aspect-[3/4]` or `aspect-square`) and/or keep the dark backdrop — re-screenshot until the constraints hold. Surface the before/after screenshots to the owner for the final framing call.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentCarousel.astro
git commit -m "fix(e4): carousel shows infographics uncropped on dark backdrop in both themes"
```

---

## Task 7: Sitemap priority for paginated pages

The sitemap priority regex currently treats `/blog/2/` as a blog post (0.8) and `/audio/2/` as an episode (0.7). Exclude bare-integer slugs so paginated pages get the default low priority (0.5).

**Files:**
- Modify: `astro.config.mjs:44,46` (the two regexes in `getSitemapMeta`).

**Interfaces:**
- Consumes / Produces: nothing — pure config change affecting `dist/sitemap-0.xml` priorities.

- [ ] **Step 1: Edit the two regexes**

In `astro.config.mjs`, change line 44 from:

```js
  if (/^\/blog\/(?!tag\/)[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'weekly' };
```

to:

```js
  if (/^\/blog\/(?!tag\/)(?!\d+\/)[^/]+\/$/.test(pathname)) return { priority: 0.8, changefreq: 'weekly' };
```

and change line 46 from:

```js
  if (/^\/audio\/[^/]+\/$/.test(pathname)) return { priority: 0.7, changefreq: 'weekly' };
```

to:

```js
  if (/^\/audio\/(?!\d+\/)[^/]+\/$/.test(pathname)) return { priority: 0.7, changefreq: 'weekly' };
```

- [ ] **Step 2: Build**

Run: `npm run build 2>&1 | grep -iE "error" || echo "CLEAN"`
Expected: `CLEAN`, exit 0.

- [ ] **Step 3: Confirm paginated pages get low priority, real posts keep theirs**

Run: `grep -A1 '<loc>https://adrianwedd.com/blog/2/</loc>' dist/sitemap-0.xml`
Expected: the following `<priority>` is `0.5` (not `0.8`).

Run: `grep -A1 '<loc>https://adrianwedd.com/audio/2/</loc>' dist/sitemap-0.xml`
Expected: `<priority>0.5</priority>`.

Run: `grep -A1 '<loc>https://adrianwedd.com/blog/</loc>' dist/sitemap-0.xml`
Expected: the blog index `<priority>` is still `0.8` (the `['/blog/','/projects/']` exact-match rule on line 43 runs before the regex, so the index is unaffected).

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "fix(e4): sitemap gives paginated /N/ pages default priority, not post priority"
```

---

## Task 8: Full-suite verification

Final sweep proving the whole feature holds together, the verify-only files are genuinely decoupled, and nothing regressed.

**Files:** none modified — verification only.

- [ ] **Step 1: Clean build from scratch**

Run: `rm -rf dist && npm run build 2>&1 | tee /tmp/e4-final-build.txt; grep -iE "conflict|warn|error" /tmp/e4-final-build.txt || echo "NO WARNINGS/ERRORS"`
Expected: exit 0; **no** `[...page]` conflict warning (proves all four `index.astro`/`[tag].astro` were deleted).

- [ ] **Step 2: Permalink invariant — page-1 URLs did not move**

Run: `ls dist/blog/index.html dist/audio/index.html dist/blog/tag/research/index.html dist/audio/tag/notebooklm/index.html`
Expected: all four exist. No `dist/blog/1/`, `dist/audio/1/`, or `.../tag/.../1/` directories anywhere:

Run: `find dist -type d -name 1 -path '*/blog/*' -o -type d -name 1 -path '*/audio/*' | grep -E '/(blog|audio)(/tag/[^/]+)?/1$' || echo "NO STRAY /1/ DIRS"`
Expected: `NO STRAY /1/ DIRS`.

- [ ] **Step 3: Page counts match the collections (derived, not hardcoded)**

Run:
```bash
NB=$(ls src/content/blog/*.md src/content/blog/*.mdx 2>/dev/null | wc -l)
echo "blog source files: $NB (note: drafts are filtered out, so pages may be fewer)"
ls -d dist/blog/[0-9]*/ 2>/dev/null | wc -l
```
Expected: the count of numbered blog dirs equals `ceil(nPublishedBlog/12) - 1` (page 1 has no numbered dir). Confirm it is internally consistent with the highest-numbered dir present.

- [ ] **Step 4: RSS / feed decoupling (verify-only files untouched)**

Run: `git status --porcelain src/pages/blog/rss.xml.ts src/pages/audio/feed.xml.ts && ls dist/blog/rss.xml dist/audio/feed.xml`
Expected: no modifications to either feed source; both feed files still emitted. (They read the collection directly, not the index pages.)

- [ ] **Step 5: Blog "Browse all tags" page still works**

Run: `ls dist/blog/tags/index.html && npm run check:links`
Expected: the tags index exists; link check passes (no broken pagination hrefs, no `/audio/tags/` link, no `/N/1/`).

- [ ] **Step 6: Optional — local Lighthouse on `/blog/`**

Run: `npm run build && npm run lighthouse` (uses the repo's lhci config). 
Expected: blog index meets the 90% thresholds (no regression). This is optional per the spec; skip if Lighthouse deps aren't set up locally.

- [ ] **Step 7: Final commit (only if Step 1–6 surfaced any fix; otherwise nothing to commit)**

If all green with no changes, there is nothing to commit — the feature is complete across Tasks 1–7. If a verification step forced a fix, commit it with a `fix(e4): ...` message describing the correction.

---

## Self-Review (completed against the spec)

**Spec coverage:**
- Paginate blog + audio main + tag pages → Tasks 2–5. ✓
- Page size 12 → Global Constraints + every `getStaticPaths`. ✓
- Page 1 at base URL, 2+ at `/N/` → rest-param routes; verified in Tasks 2/4/8. ✓
- Audio filter → links, sort removed → Task 4 (grep proves removal). ✓
- Carousel page-1-only + uncrop + fixed dark backdrop + hover fix → Tasks 2 (page-1 gate) & 6. ✓
- Page-2+ titles composed in-page → every paginated route's `pageTitle`. ✓
- noindex preserved on tag pages → Tasks 3/5 + grep checks. ✓
- Pagination component shape, ellipsis window, hidden when 1 page, a11y → Task 1. ✓
- Sitemap priority fix → Task 7. ✓
- Self-canonical, RSS decoupling, permalink invariant → verified in Task 8. ✓
- `rel=prev/next` de-scoped → emitted only on Pagination's own Prev/Next links; no `<head>` link, so SEOHead/BaseLayout untouched (per Global Constraints). ✓
- Delete old routes (no leftover index.astro) → `git rm` in Tasks 2–5; conflict-warning check in Tasks 2 & 8. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". All code blocks are complete and copy-able.

**Type consistency:** `Pagination` prop names (`currentPage`, `lastPage`, `prevUrl`, `nextUrl`, `basePath`) are identical in Task 1's interface and every call site in Tasks 2–5. `page.total` (not `posts.length`) used for tag counts since the list is now sliced. `prevUrl`/`nextUrl` computed with the same `n === 1 ? base : base+n+'/'` formula everywhere.

**One open visual decision (intentional, flagged in spec):** the carousel cell aspect ratio for portrait infographics is tuned by screenshot in Task 6 Step 4, not fixed on paper — the hard constraints are enumerated so any chosen ratio is checkable.
