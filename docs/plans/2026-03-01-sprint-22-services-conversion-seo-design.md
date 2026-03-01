# Sprint 22 Design: Services, Conversion & SEO

**Date:** 2026-03-01
**Issues:** #162, #165, #167, #168, #169, #170, #137, #139

---

## Objective

Strengthen the consulting funnel and improve search discoverability. No new infrastructure. All changes are content, schema, and layout work on existing pages.

---

## Scope

### 1. Services page — Clarity (#168)

**What I do cards** (capabilities array): restructure from dense paragraphs to a scannable format:
- Bold outcome line at top ("What you get")
- 3–4 bullet deliverables (concrete outputs, not tech stack)
- One example reference linking to a case study or project where applicable

**Pricing cards**: add a `typical` field to each:
- Project: "2–8 weeks, fixed quote"
- Retainer: "From the month after delivery"
- Consult: "Half-day or full-day engagements"

Domain cards ("Where I go deep") are unchanged — already specific.

---

### 2. Services page — Social proof (#169)

New `testimonials` array at top of `services.astro`. New section "What clients say" inserted between "Recent work" and "How it works".

Layout: 1–3 blockquote-style cards with:
- Quote text
- `name` (first name or full name as provided)
- `role` (e.g. "Practice Owner")
- `sector` (e.g. "Healthcare")

**Adrian to supply testimonial content before merge.** Scaffolding ships with placeholder structure.

---

### 3. Services page — Lead capture (#170)

Replace single "Get in touch" button in the bottom CTA section with two side-by-side options:

1. **Book a free consult** → `/contact/`
2. **Email directly** → `mailto:adrian@adrianwedd.com?subject=Services%20enquiry`

Button 1: filled accent (existing style). Button 2: outline/ghost style.

---

### 4. Services page — SEO (#162)

- **`title`**: `"Services — AI Consulting & Development"`
- **`description`**: `"AI integration, security evaluation, voice agents, agentic systems, and web development. Tasmania-based, working globally. Fixed-scope projects, monthly retainers, and day-rate consulting."`
- **JSON-LD** (`ProfessionalService`):
  ```json
  {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "Adrian Wedd — AI Consulting & Development",
    "url": "https://adrianwedd.com/services/",
    "provider": { "@type": "Person", "name": "Adrian Wedd", "url": "https://adrianwedd.com" },
    "areaServed": ["Australia", "Remote / International"],
    "serviceType": ["AI Integration", "Security Evaluation", "Voice AI", "Web Development", "AI Governance", "Agentic Systems"]
  }
  ```

---

### 5. Contact page (#165)

One sentence appended to the "Available for" section:

> See the full [services overview →](/services/) for domains, case studies, and pricing.

---

### 6. Homepage CTA card (#167)

New full-width card added to `index.astro`, positioned after featured projects, before the blog posts section.

- Headline: "Available for consulting & builds"
- Body: 1–2 lines covering AI integration, security, and web development
- CTAs: "See services →" (`/services/`) + "Book a free call →" (`/contact/`)
- Styled with `border-accent/50` border, consistent with existing card components

---

### 7. Sitemap `lastmod` (#137)

In `astro.config.mjs` sitemap integration, add a `serialize` function that sets `lastmod` from `updatedDate ?? date` on content collection pages (blog, projects, gallery, audio).

Reference: Astro sitemap docs — `serialize(item)` callback.

---

### 8. Schema: `hasOccupation` + `makesOffer` (#139)

**`/about/`** — extend existing `Person` JSON-LD with `hasOccupation`:
```json
{
  "@type": "Occupation",
  "name": "Systems Builder & AI Safety Researcher",
  "occupationLocation": { "@type": "Country", "name": "Australia" },
  "skills": ["AI integration", "Security evaluation", "Multi-agent systems", "Web development", "AI governance"]
}
```

**`/` (homepage)** — add `makesOffer` to existing `WebSite` schema:
```json
"makesOffer": [{
  "@type": "Offer",
  "itemOffered": {
    "@type": "Service",
    "name": "AI Consulting & Development",
    "url": "https://adrianwedd.com/services/"
  }
}]
```

---

## Out of scope

| Issue | Reason |
|-------|--------|
| #134 changefreq/priority | Google ignores these |
| #135 FAQ/HowTo schema | Needs content decisions |
| #136 humans.txt | Trivial, any housekeeping PR |
| #138 VideoObject schema | Video pipeline not stable yet |
| #140–#148 image pipeline, View Transitions, CI | Dedicated tech sprint |

---

## Implementation order

1. Services SEO (title, meta, JSON-LD) — isolated, no content risk
2. Capability cards restructure — Adrian's voice, needs care
3. Testimonials scaffold — structure only; content from Adrian
4. Dual CTA on services page
5. Contact page link
6. Homepage CTA card
7. `hasOccupation` + `makesOffer` schema
8. Sitemap `lastmod`
