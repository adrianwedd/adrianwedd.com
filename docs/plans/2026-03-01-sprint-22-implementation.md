# Sprint 22: Services, Conversion & SEO — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strengthen the consulting funnel (services page clarity, social proof, dual CTA, homepage card, contact link) and improve search discoverability (ProfessionalService schema, hasOccupation, makesOffer, sitemap lastmod).

**Architecture:** All changes are static Astro pages and config. No new components, no islands, no new routes. The services page gets new data arrays and restructured markup. Schema is injected via `<script type="application/ld+json">` in page frontmatter. Sitemap lastmod is wired via `astro.config.mjs`.

**Tech Stack:** Astro 5, TypeScript strict, Tailwind CSS 3, `@astrojs/sitemap`

**No test suite exists.** Verification for each task = `npm run build` (must exit 0) + targeted grep of `dist/` output.

**Design doc:** `docs/plans/2026-03-01-sprint-22-services-conversion-seo-design.md`

**Issues:** #162, #165, #167, #168, #169, #170, #137, #139

---

### Task 1: Services page — SEO title, meta, and ProfessionalService schema (#162)

**Files:**
- Modify: `src/pages/services.astro` (frontmatter only — `<BaseLayout>` props + JSON-LD script)

**Step 1: Update BaseLayout props**

In `src/pages/services.astro`, change the `<BaseLayout>` opening tag:

```astro
<BaseLayout
  title="Services — AI Consulting & Development"
  description="AI integration, security evaluation, voice agents, agentic systems, and web development. Tasmania-based, working globally. Fixed-scope projects, monthly retainers, and day-rate consulting."
>
```

**Step 2: Add ProfessionalService JSON-LD**

Immediately inside `<BaseLayout>`, before the first `{/* Hero */}` comment, add:

```astro
  <script type="application/ld+json" set:html={JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    'name': 'Adrian Wedd — AI Consulting & Development',
    'url': 'https://adrianwedd.com/services/',
    'provider': {
      '@type': 'Person',
      'name': 'Adrian Wedd',
      'url': 'https://adrianwedd.com',
    },
    'areaServed': ['Australia', 'Remote / International'],
    'serviceType': [
      'AI Integration',
      'Security Evaluation',
      'Voice AI',
      'Web Development',
      'AI Governance',
      'Agentic Systems',
    ],
  })} />
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```
Expected: `✓ Completed` with no errors.

```bash
grep -o '"@type":"ProfessionalService"' dist/services/index.html
```
Expected: `"@type":"ProfessionalService"`

```bash
grep '<title>' dist/services/index.html | head -1
```
Expected: `<title>Services — AI Consulting &amp; Development — Adrian Wedd</title>` (BaseLayout appends site name)

**Step 4: Commit**

```bash
git add src/pages/services.astro
git commit -m "feat(services): SEO title, meta, ProfessionalService schema (#162)"
```

---

### Task 2: Services page — Restructure capability cards (#168)

**Files:**
- Modify: `src/pages/services.astro` (capabilities array + card markup)

**Step 1: Replace the capabilities array**

Replace the existing `capabilities` array (lines 4–17) with:

```typescript
const capabilities = [
  {
    title: 'Build & deliver',
    outcome: 'Production systems shipped on time, with no handoff and no disappearing act.',
    deliverables: [
      'Websites, web apps, and operations tooling',
      'Automation pipelines, APIs, and CLI tools',
      'Multi-site ecosystems with shared brand systems',
      'Fast, constraint-led, zero bloat',
    ],
    example: { label: 'Evolve Evolution — four-site healthcare ecosystem', href: '#recent-work' },
  },
  {
    title: 'AI integration',
    outcome: 'LLM systems that work in production — with real safety gates, not vibes-based guardrails.',
    deliverables: [
      'LLM pipelines with hallucination detection and CI gates',
      'Multi-agent orchestration (LangGraph, Anthropic SDK)',
      'RAG, voice AI, MCP servers, self-hosted inference',
      'Evaluation frameworks and red-team reporting',
    ],
    example: { label: 'Living CV — self-healing AI pipeline', href: '#recent-work' },
  },
  {
    title: 'Security & evaluation',
    outcome: 'Adversarial review of systems before an adversary finds what you missed.',
    deliverables: [
      'Penetration testing and vulnerability assessment',
      'Essential Eight and ISO 27001 implementation',
      'AI red-teaming across models and prompt surfaces',
      'GenAI governance frameworks for procurement and executives',
    ],
    example: null,
  },
];
```

**Step 2: Update the capability card markup**

Replace the `{capabilities.map(...)}` block (inside the "What I do" section) with:

```astro
    <div class="mt-8 grid gap-6 sm:grid-cols-3">
      {capabilities.map(({ title, outcome, deliverables, example }) => (
        <div class="flex flex-col rounded-xl border border-border bg-surface-alt p-5">
          <h3 class="font-semibold text-text">{title}</h3>
          <p class="mt-2 text-sm font-medium text-accent">{outcome}</p>
          <ul class="mt-3 flex-1 space-y-1">
            {deliverables.map((d) => (
              <li class="flex items-start gap-2 text-sm text-text-muted">
                <span class="mt-0.5 text-accent" aria-hidden="true">·</span>
                {d}
              </li>
            ))}
          </ul>
          {example && (
            <p class="mt-4 text-xs text-text-muted">
              e.g.{' '}
              <a href={example.href} class="text-accent hover:underline">
                {example.label}
              </a>
            </p>
          )}
        </div>
      ))}
    </div>
```

**Step 3: Update the pricing cards**

Add a `typical` field to the `steps` equivalent. Replace the three pricing card `<div>` blocks with data-driven markup. First, add a `pricing` array to the frontmatter (after the `steps` array):

```typescript
const pricing = [
  {
    title: 'Project',
    cadence: 'Fixed scope',
    typical: '2–8 weeks, fixed quote',
    desc: 'Scoped, priced, and agreed upfront. No surprises. Right for a defined build with a clear outcome.',
  },
  {
    title: 'Retainer',
    cadence: 'Monthly',
    typical: 'From the month after delivery',
    desc: 'Ongoing capacity. Updates, new features, support, whatever comes up. Most clients move here after the initial build.',
  },
  {
    title: 'Consult',
    cadence: 'Day rate',
    typical: 'Half-day or full-day engagements',
    desc: 'Strategy, architecture, evaluation, policy. Useful when you need deep expertise for a specific question without a full build.',
  },
];
```

Then replace the three manual pricing `<div>` blocks with:

```astro
    <div class="mt-8 grid gap-6 sm:grid-cols-3">
      {pricing.map(({ title, cadence, typical, desc }) => (
        <div class="rounded-xl border border-border bg-surface-alt p-6">
          <h3 class="font-semibold text-text">{title}</h3>
          <p class="mt-1 text-xs font-medium uppercase tracking-wider text-text-muted">{cadence}</p>
          <p class="mt-1 text-xs text-accent">{typical}</p>
          <p class="mt-3 text-sm text-text-muted">{desc}</p>
        </div>
      ))}
    </div>
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```
Expected: clean build.

```bash
grep -c "items-start gap-2" dist/services/index.html
```
Expected: `3` (one per capability card bullet list)

**Step 5: Commit**

```bash
git add src/pages/services.astro
git commit -m "feat(services): restructure capability cards with deliverables and outcomes (#168)"
```

---

### Task 3: Services page — Testimonials scaffold (#169)

**Files:**
- Modify: `src/pages/services.astro` (testimonials array + new section)

**Step 1: Add testimonials array to frontmatter**

Add after the `pricing` array:

```typescript
const testimonials = [
  {
    quote: 'Placeholder quote — Adrian to supply.',
    name: 'Client Name',
    role: 'Role',
    sector: 'Sector',
  },
  {
    quote: 'Placeholder quote — Adrian to supply.',
    name: 'Client Name',
    role: 'Role',
    sector: 'Sector',
  },
  {
    quote: 'Placeholder quote — Adrian to supply.',
    name: 'Client Name',
    role: 'Role',
    sector: 'Sector',
  },
];
```

**⚠️ Stop here.** Before the next step, Adrian must supply the three quotes. Replace the placeholder objects with real content. Do not ship placeholders to production.

**Step 2: Add testimonials section**

Insert a new section between the `{/* Recent work */}` closing `</section>` + divider and the `{/* How it works */}` section:

```astro
  <div class="section-divider mx-auto max-w-3xl px-4 sm:px-6 lg:px-8"></div>

  {/* Testimonials */}
  <section
    id="testimonials"
    aria-labelledby="testimonials-heading"
    class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8"
  >
    <h2 id="testimonials-heading" class="text-text">What clients say</h2>
    <div class="mt-8 grid gap-6 sm:grid-cols-3">
      {testimonials.map(({ quote, name, role, sector }) => (
        <figure class="flex flex-col rounded-xl border border-border bg-surface-alt p-5">
          <blockquote class="flex-1">
            <p class="text-sm leading-relaxed text-text-muted">"{quote}"</p>
          </blockquote>
          <figcaption class="mt-4 border-t border-border pt-4">
            <p class="text-sm font-medium text-text">{name}</p>
            <p class="text-xs text-text-muted">{role} · {sector}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep -o 'id="testimonials"' dist/services/index.html
```
Expected: `id="testimonials"`

**Step 4: Commit** (only after real quotes are in place)

```bash
git add src/pages/services.astro
git commit -m "feat(services): add testimonials section (#169)"
```

---

### Task 4: Services page — Dual CTA (#170)

**Files:**
- Modify: `src/pages/services.astro` (bottom CTA section only)

**Step 1: Replace the bottom CTA button**

Find the `{/* CTA */}` section. Replace the single `<a>` button:

```astro
    <div class="mt-8 flex flex-wrap gap-4">
      <a
        href="/contact/"
        class="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-surface no-underline transition-opacity hover:opacity-90"
      >
        Book a free consult
      </a>
      <a
        href="mailto:adrian@adrianwedd.com?subject=Services%20enquiry"
        class="inline-block rounded-lg border border-accent px-6 py-3 text-sm font-semibold text-accent no-underline transition-colors hover:bg-accent hover:text-surface"
      >
        Email directly
      </a>
    </div>
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep -o 'mailto:adrian@adrianwedd.com' dist/services/index.html
```
Expected: `mailto:adrian@adrianwedd.com`

**Step 3: Commit**

```bash
git add src/pages/services.astro
git commit -m "feat(services): dual CTA — book + email (#170)"
```

---

### Task 5: Contact page — /services/ link (#165)

**Files:**
- Modify: `src/pages/contact.astro`

**Step 1: Find the "Available for" section**

Search for the "Available for" text in `src/pages/contact.astro`. It will be in a prose block or list. Add the following sentence immediately after the last item or paragraph in that section:

```astro
<p class="mt-4 text-sm text-text-muted">
  See the full <a href="/services/" class="text-accent hover:underline">services overview →</a> for domains, case studies, and pricing.
</p>
```

Exact placement: immediately before the closing `</section>` tag of the "Available for" section, or as a trailing paragraph if it's a prose block.

**Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep -o 'href="/services/"' dist/contact/index.html | head -1
```
Expected: `href="/services/"`

**Step 3: Commit**

```bash
git add src/pages/contact.astro
git commit -m "feat(contact): add services overview link to Available for section (#165)"
```

---

### Task 6: Homepage — "Work with me" CTA card (#167)

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Find the insertion point**

In `src/pages/index.astro`, find the section that renders featured projects. It ends with a closing `</section>` tag. The blog posts section follows immediately after. Insert between them.

**Step 2: Add the CTA card**

```astro
  {/* Consulting CTA */}
  <section
    aria-label="Consulting availability"
    class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
  >
    <div class="rounded-xl border border-accent/30 bg-surface-alt p-8 sm:flex sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold text-text">Available for consulting & builds</h2>
        <p class="mt-2 max-w-prose text-sm text-text-muted">
          AI integration, security evaluation, and web development. Fixed-scope projects, monthly retainers, day-rate consulting.
        </p>
      </div>
      <div class="mt-6 flex flex-shrink-0 flex-wrap gap-3 sm:ml-8 sm:mt-0">
        <a
          href="/services/"
          class="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-surface no-underline transition-opacity hover:opacity-90"
        >
          See services
        </a>
        <a
          href="/contact/"
          class="inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text no-underline transition-colors hover:border-accent hover:text-accent"
        >
          Book a free call
        </a>
      </div>
    </div>
  </section>
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep -o 'Available for consulting' dist/index.html
```
Expected: `Available for consulting`

**Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): add consulting CTA card after featured projects (#167)"
```

---

### Task 7: Schema — hasOccupation + makesOffer (#139)

**Files:**
- Modify: `src/pages/about.astro` (existing Person JSON-LD)
- Modify: `src/pages/index.astro` (existing WebSite JSON-LD)

**Step 1: Extend Person schema on /about/**

Find the `<script type="application/ld+json">` block in `src/pages/about.astro`. It contains a `Person` object. Add `hasOccupation` to the object:

```typescript
hasOccupation: {
  '@type': 'Occupation',
  name: 'Systems Builder & AI Safety Researcher',
  occupationLocation: { '@type': 'Country', name: 'Australia' },
  skills: [
    'AI integration',
    'Security evaluation',
    'Multi-agent systems',
    'Web development',
    'AI governance',
  ],
},
```

Add it as a sibling key to `jobTitle`, `name`, `url`, etc. within the same object.

**Step 2: Add makesOffer to homepage WebSite schema**

Find the `<script type="application/ld+json">` block in `src/pages/index.astro`. It contains a `WebSite` object. Add `makesOffer`:

```typescript
makesOffer: [
  {
    '@type': 'Offer',
    itemOffered: {
      '@type': 'Service',
      name: 'AI Consulting & Development',
      url: 'https://adrianwedd.com/services/',
    },
  },
],
```

Add as a sibling key to `name`, `url`, `potentialAction`, etc.

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep -o '"hasOccupation"' dist/about/index.html
```
Expected: `"hasOccupation"`

```bash
grep -o '"makesOffer"' dist/index.html
```
Expected: `"makesOffer"`

**Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/index.astro
git commit -m "feat(schema): add hasOccupation to Person, makesOffer to WebSite (#139)"
```

---

### Task 8: Sitemap — lastmod from content dates (#137)

**Files:**
- Modify: `astro.config.mjs`
- Read: Astro sitemap docs at https://docs.astro.build/en/guides/integrations-guide/sitemap/

**Step 1: Read current sitemap config**

Open `astro.config.mjs` and find the `sitemap()` integration call. It likely looks like:
```js
sitemap()
// or
sitemap({ /* options */ })
```

**Step 2: Add serialize callback**

The `@astrojs/sitemap` integration supports a `serialize(item)` function. However, it does not have direct access to content collection data — it only receives the URL. The practical approach for this site is to set `lastmod` on a per-route basis using a `customPages` approach, or simply set a global build-time `lastmod`.

**Simplest correct approach:** Set `lastmod` globally to the build timestamp. This is accurate (the site is fully rebuilt on every deploy) and requires minimal config:

```js
sitemap({
  serialize(item) {
    item.lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return item;
  },
}),
```

This is accurate for a static SSG site: every URL was last modified at the time it was built.

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|warn|✓"
```

```bash
grep '<lastmod>' dist/sitemap-0.xml | head -3
```
Expected: three `<lastmod>YYYY-MM-DD</lastmod>` lines.

**Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "feat(sitemap): add lastmod from build date (#137)"
```

---

### Task 9: Final verification + push

**Step 1: Full build check**

```bash
npm run build 2>&1 | tail -5
```
Expected: clean exit.

**Step 2: Spot-check key outputs**

```bash
# Services page has all new elements
grep -c "ProfessionalService\|items-start\|testimonials\|mailto:" dist/services/index.html

# Homepage has consulting card
grep -o "Available for consulting" dist/index.html

# About has new schema
grep -o '"hasOccupation"' dist/about/index.html

# Sitemap has lastmod
grep '<lastmod>' dist/sitemap-0.xml | wc -l
```

**Step 3: Push**

```bash
git push
```

---

## Notes for implementer

- **Testimonial content (#169):** Task 3 scaffolds the structure. Do not merge until Adrian supplies real quotes. The placeholder values are clearly labelled.
- **No test suite:** This is an Astro static site. Verification is `npm run build` + targeted `grep dist/`. A clean build with the expected strings present = passing.
- **Ordering matters:** Tasks 1–4 all modify `services.astro`. Do them sequentially to avoid merge conflicts with yourself. Tasks 5–8 touch different files and can be done in any order after Task 4.
- **Theming:** Never use Tailwind `dark:` prefix. All colour utilities (`text-text`, `bg-surface-alt`, `text-accent`, `border-border`) resolve via CSS custom properties. See `tailwind.config.mjs`.
- **Slug utility:** Not needed here — no collection IDs touched.
