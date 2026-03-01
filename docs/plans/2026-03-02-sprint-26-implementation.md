# Sprint 26: Content, Reach & Distribution — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish 4 new blog posts from sibling research repos, extend OG image generation to blog posts, and create a tags discovery page.

**Architecture:** Blog posts adapted from research in sibling repos (`why-demonstrated-risk-is-ignored`, `orchestrix`, `failure-first-embodied-ai`, `VERITAS`). OG image generation extends the existing sharp-based script. Tags page is a new static Astro page querying the blog collection. Per-collection RSS feeds and autodiscovery already exist — no work needed.

**Tech Stack:** Astro 5, sharp (OG images), gray-matter (frontmatter parsing), Tailwind CSS

---

### Task 1: Blog post — "Why Demonstrated Risk Is Ignored"

**Files:**
- Create: `src/content/blog/why-demonstrated-risk-is-ignored.md`
- Reference: `../why-demonstrated-risk-is-ignored/articles/public/why-demonstrated-risk-is-ignored__public.md`

**Context:** This is a public-edition essay about why large organisations fail to act on known risks. The source is polished and ready — adapt to blog voice, trim to ≤2000 words, add frontmatter.

**Step 1: Read the source article**

Read the full source at `../why-demonstrated-risk-is-ignored/articles/public/why-demonstrated-risk-is-ignored__public.md` to understand its structure and key arguments.

**Step 2: Create the blog post**

Create `src/content/blog/why-demonstrated-risk-is-ignored.md` with this frontmatter:

```yaml
---
title: "Why Demonstrated Risk Is Ignored"
description: "Large organisations rarely fail because risks are unknown. They fail because known risks are structurally difficult to act on."
date: 2026-03-02
tags: ["risk", "organisations", "research", "policy"]
draft: false
faq:
  - q: "Why do organisations ignore demonstrated risk?"
    a: "Four structural reasons: responsibility without authority, misaligned incentives, organisational scar tissue from past failures, and evidence that threatens institutional identity."
  - q: "How can organisations fix their risk response?"
    a: "By explicitly managing the local costs of truth-telling — removing blame, funding rework, and creating safe channels for escalation."
---
```

Adapt the source content to blog voice:
- Keep the core four-reason structure
- Write in first person where natural
- Trim dense sections, keep the argument tight
- ≤ 2000 words total
- Do NOT copy-paste — rewrite in blog voice while preserving the argument
- Add a brief intro connecting to AI safety context (Adrian's domain)

**Step 3: Validate the post builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds, no content validation errors.

**Step 4: Commit**

```bash
git add src/content/blog/why-demonstrated-risk-is-ignored.md
git commit -m "content: blog post — Why Demonstrated Risk Is Ignored"
```

---

### Task 2: Blog post — "The AI Productivity J-Curve"

**Files:**
- Create: `src/content/blog/the-ai-productivity-j-curve.md`
- Reference: `../orchestrix/research/From Pilot Purgatory to Superagency_ A C-Suite Blueprint for Scaling Enterprise AI and Unlocking the Productivity J-Curve.md`

**Context:** A research paper on why enterprise AI adoption stalls (pilot purgatory) and the economic framework (J-Curve) that explains it. Adapt the key arguments — the productivity paradox, the J-Curve framework, and what it means for AI strategy.

**Step 1: Read the source paper**

Read the full source. Focus on Sections 1-2 (the diagnosis and the J-Curve framework). Later sections on implementation strategy are less relevant for a blog post.

**Step 2: Create the blog post**

Create `src/content/blog/the-ai-productivity-j-curve.md` with this frontmatter:

```yaml
---
title: "The AI Productivity J-Curve: Why Most Enterprise AI Fails"
description: "90% of companies plan to increase AI investment. Only 1% consider themselves AI-mature. The J-Curve explains why."
date: 2026-03-02
tags: ["ai", "economics", "enterprise", "research"]
draft: false
faq:
  - q: "What is the AI Productivity J-Curve?"
    a: "An economic framework showing that transformative technologies initially reduce measured productivity before generating gains — because the critical intangible investments (process redesign, data governance, workforce reskilling) aren't captured in traditional metrics."
  - q: "What is pilot purgatory?"
    a: "When AI pilots fail to scale beyond isolated projects because they're evaluated with ROI models misaligned with how general-purpose technologies create value."
---
```

Adapt the source to blog voice:
- Lead with the striking statistic contrast (90% investing, 1% mature)
- Explain the J-Curve clearly for a general tech audience
- Connect pilot purgatory to the J-Curve as a natural consequence
- ≤ 2000 words
- Do NOT copy-paste — rewrite in blog voice

**Step 3: Validate the post builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/content/blog/the-ai-productivity-j-curve.md
git commit -m "content: blog post — The AI Productivity J-Curve"
```

---

### Task 3: Blog post — "Adversarial Poetry as Jailbreak"

**Files:**
- Create: `src/content/blog/adversarial-poetry-as-jailbreak.md`
- Reference: `../failure-first-embodied-ai/research/Adversarial Poetry as a Universal Single-Turn Jailbreak Mechanism in Large Language Models.html` (HTML from arXiv)
- Also reference: `../failure-first-embodied-ai/research/adversarial_poetry/` directory for supporting materials

**Context:** An arXiv paper on using poetic reformulation as a universal single-turn jailbreak mechanism. This is Adrian's own research. The blog post should make the findings accessible — explain the threat model, the three hypotheses, and the key results.

**Step 1: Read the source paper**

Read the HTML file. Focus on: Abstract, Introduction, Hypotheses, Threat Model, and Results sections. The paper is structured as a formal research paper — the blog post should distill the key findings.

**Step 2: Create the blog post**

Create `src/content/blog/adversarial-poetry-as-jailbreak.md` with this frontmatter:

```yaml
---
title: "Adversarial Poetry: When Rhyme Bypasses Reason"
description: "Reformulating harmful prompts as poetry bypasses safety filters across every major LLM family. A single-turn, universal jailbreak mechanism."
date: 2026-03-02
tags: ["ai-safety", "jailbreaking", "research", "llm"]
draft: false
faq:
  - q: "What is adversarial poetry jailbreaking?"
    a: "A technique where harmful prompts are reformulated as poems (sonnets, haiku, limericks), which bypasses LLM safety filters because models process poetic structure differently from direct instructions."
  - q: "Does adversarial poetry work on all LLMs?"
    a: "Testing showed the vulnerability generalizes across all major model families including GPT-4, Claude, Gemini, and Llama — it is not vendor-specific."
---
```

Adapt the source to blog voice:
- Lead with the counterintuitive hook: poetry as attack vector
- Explain the three hypotheses in plain language
- Include 1-2 illustrative examples (sanitized — no actual harmful content)
- Discuss implications for AI safety
- ≤ 2000 words
- Do NOT copy-paste — rewrite in blog voice

**Step 3: Validate the post builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/content/blog/adversarial-poetry-as-jailbreak.md
git commit -m "content: blog post — Adversarial Poetry as Jailbreak"
```

---

### Task 4: Blog post — "The Legal AI Trust Deficit"

**Files:**
- Create: `src/content/blog/the-legal-ai-trust-deficit.md`
- Reference: `../VERITAS/research/Market Analysis & Strategic Opportunity_ Defining High-Value Use Cases for Legal AI in the Solo & Small Firm Segment.md`

**Context:** A market analysis of legal AI focusing on the trust deficit — 75% of lawyers cite accuracy concerns as the top barrier. The blog post should present the market dynamics accessibly, focusing on the efficiency-trust tension.

**Step 1: Read the source paper**

Read the full source. Focus on: Executive Summary, The Efficiency-Trust Deficit sections, and the Market Overview. Skip the detailed competitive analysis and MVP recommendations (too product-specific).

**Step 2: Create the blog post**

Create `src/content/blog/the-legal-ai-trust-deficit.md` with this frontmatter:

```yaml
---
title: "The Legal AI Trust Deficit"
description: "75% of lawyers cite accuracy as their top AI concern. The legal profession's core values are in direct tension with current AI capabilities."
date: 2026-03-02
tags: ["ai", "legal-tech", "research", "trust"]
draft: false
faq:
  - q: "Why are lawyers slow to adopt AI?"
    a: "The legal profession values accuracy, confidentiality, and accountability — all areas where current AI systems have demonstrated weaknesses. 75% of lawyers cite accuracy concerns as the top barrier."
  - q: "What is the efficiency-trust deficit in legal AI?"
    a: "An overwhelming demand for automation and efficiency held in check by deep-seated skepticism about AI reliability, creating a market where most practitioners want AI but don't trust it enough to use it."
---
```

Adapt the source to blog voice:
- Lead with the striking statistic (75% accuracy concern)
- Frame around the efficiency-trust tension
- Cover the Australian market context briefly
- Discuss what "trust" means differently for legal vs other AI use cases
- ≤ 2000 words
- Do NOT copy-paste — rewrite in blog voice

**Step 3: Validate the post builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/content/blog/the-legal-ai-trust-deficit.md
git commit -m "content: blog post — The Legal AI Trust Deficit"
```

---

### Task 5: Extend OG image generation to blog posts

**Files:**
- Modify: `scripts/generate-og-images.mjs`
- Modify: `src/pages/blog/[...slug].astro:39` (OG fallback)

**Context:** The existing script generates 1200×630 OG PNGs for projects only. Extend it to also generate for blog posts. Then update the blog detail page to use `/og/{slug}.png` instead of `/og-default.svg`.

**Step 1: Read the existing OG script**

Read `scripts/generate-og-images.mjs` in full to understand the pattern.

**Step 2: Add blog post processing**

Modify `scripts/generate-og-images.mjs`:
- Add a `BLOG_DIR` constant: `path.join(ROOT, 'src', 'content', 'blog')`
- After the projects loop, add an identical loop for blog posts:
  - Read each `.md` file from `BLOG_DIR`
  - Parse frontmatter with gray-matter
  - Skip if `draft: true`
  - Generate slug by stripping `.md` from filename
  - Skip if `public/og/{slug}.png` already exists
  - Use the same SVG template but change the category label from `project.data.status` (or similar) to `"Blog"` or the first tag
  - Generate the PNG with sharp

The SVG template should show:
- Title (split to 2 lines if long, same as projects)
- Description text (first ~120 chars)
- Category badge showing "Blog" instead of project status
- Same colors and layout as project OG images

**Step 3: Update blog detail page OG fallback**

In `src/pages/blog/[...slug].astro`, change line 39:

```typescript
// Before:
const ogImage = post.data.heroImage || '/og-default.svg';

// After:
const ogImage = post.data.heroImage || `/og/${postSlug}.png`;
```

**Step 4: Generate OG images**

Run: `node scripts/generate-og-images.mjs`
Expected: Generates PNG files in `public/og/` for all blog posts without heroImages.

**Step 5: Validate build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add scripts/generate-og-images.mjs src/pages/blog/\\[...slug\\].astro public/og/
git commit -m "feat(seo): extend OG image generation to blog posts"
```

---

### Task 6: Tags discovery page

**Files:**
- Create: `src/pages/blog/tags/index.astro`

**Context:** Create a page at `/blog/tags/` listing all unique blog tags with post counts. Links to existing `/blog/tag/{tag}/` pages. The blog index already computes `allTags` — this page does the same but as a dedicated browsable index.

**Step 1: Create the tags index page**

Create `src/pages/blog/tags/index.astro`:

```astro
---
import BaseLayout from '../../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const posts = (await getCollection('blog')).filter((p) => !p.data.draft);

// Build tag → count map
const tagCounts = new Map<string, number>();
posts.forEach((p) => {
  p.data.tags.forEach((tag: string) => {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  });
});

// Sort by count descending, then alphabetically
const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
---

<BaseLayout title="Blog Tags" description="Browse all blog post tags.">
  <section class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <h1 class="text-text">Tags</h1>
    <p class="mt-4 text-text-muted">{sortedTags.length} tags across {posts.length} posts</p>

    <div class="mt-8 flex flex-wrap gap-3">
      {sortedTags.map(([tag, count]) => (
        <a
          href={`/blog/tag/${tag}/`}
          class="group flex items-center gap-2 rounded-full border border-border bg-surface-alt px-4 py-2 no-underline transition-colors hover:border-accent hover:text-accent"
        >
          <span class="text-sm text-text transition-colors group-hover:text-accent">{tag}</span>
          <span class="rounded-full bg-surface px-2 py-0.5 text-xs text-text-muted">{count}</span>
        </a>
      ))}
    </div>
  </section>
</BaseLayout>
```

**Step 2: Validate build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds. `/blog/tags/` page generated.

**Step 3: Commit**

```bash
git add src/pages/blog/tags/index.astro
git commit -m "feat: blog tags discovery page at /blog/tags/"
```

---

### Task 7: Final verification and push

**Step 1: Full build check**

Run: `npm run build 2>&1 | tail -30`
Expected: Clean build, no errors.

**Step 2: Verify new pages exist in output**

Run:
```bash
ls dist/blog/why-demonstrated-risk-is-ignored/index.html
ls dist/blog/the-ai-productivity-j-curve/index.html
ls dist/blog/adversarial-poetry-as-jailbreak/index.html
ls dist/blog/the-legal-ai-trust-deficit/index.html
ls dist/blog/tags/index.html
ls dist/og/why-demonstrated-risk-is-ignored.png
ls dist/og/the-ai-productivity-j-curve.png
ls dist/og/adversarial-poetry-as-jailbreak.png
ls dist/og/the-legal-ai-trust-deficit.png
```
Expected: All files exist.

**Step 3: Verify RSS feeds include new posts**

Run: `grep -c '<item>' dist/rss.xml && grep -c '<item>' dist/blog/rss.xml`
Expected: Both counts increased by 4 compared to before (combined feed includes all content types).

**Step 4: Push**

```bash
git push origin main
```
