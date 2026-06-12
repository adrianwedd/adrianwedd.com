# What's been happening

A running account of how this site has grown — what was built, why it was built, and what was learned along the way.

---

## 11–12 June 2026 — Audio quality sweep, Eight Minutes publishes, The Index goes live

**Added:** Eight Minutes three-part phishing series (The Trap, The Fall, The Fight) — each with Lyria music video, branded infographic, audio deep dive. The Index long-form companion essay. `replyTo` support on `POST /api/publish` (worker).
**Fixed:** All 78 audio episodes restored to original 256kbps quality (34 from kept originals, 44 regenerated). The Index video re-cut (glitchy tail). The Index audio duration display.
**Changed:** 64kbps compression step deleted from the pipeline permanently. Dependency sweep: Astro 6.4.2, Vitest 4, Hono 4.12.25, Wrangler 4.99.

Three things landed in rapid succession, each connected to the previous one.

The immediate trigger was the audio quality problem. For most of the site's life, NotebookLM audio overviews had been compressed to 64kbps mono MP3 for storage reasons that no longer applied once the media moved to R2. That decision was wrong — the originals that NotebookLM delivers are 256kbps stereo AAC, and the compression had been silently degrading every audio episode on the site. 34 tracks could be restored from originals that had been kept; the other 44 had to be regenerated from NotebookLM and replaced. All 78 are now served at original quality. The 64kbps compression step was deleted from the pipeline and the documentation updated to make it explicit: never compress published audio.

Eight Minutes is a three-part blog series about a Google AiTM phishing incident that happened on 10 June 2026 — the day before publication. The series covers the technical anatomy of the attack (The Trap), how it almost succeeded (The Fall), and how the abuse-report process works after the fact (The Fight). Writing and publishing on the day after the incident was a deliberate choice: the material was still live, the abuse reports were in flight, and the series documented both the event and the institutional response in real time. Each part got its own Lyria music video, branded infographic hero, and audio deep dive; the Fight instalment also got a focused 20-minute audio overview on top of the series recap. The social drip was wired to stagger the posts over three days from publication.

The Index landed the same day. It is a companion to the phishing series — a long-form essay about what the incident revealed about how contemporary AI tools reason about identity, authority, and manipulation. The video had a glitchy tail that required a re-cut before it could go up; the audio duration display had been broken because the frontmatter was pointing at an old URL. Both were fixed the same session.

---

## 5–6 June 2026 — Lyria Chronicles completes

**Added:** Lyria Chronicles #1–27 live on daily drip (1–25 June). Video podcast feed. 37 YouTube URLs wired across the series.
**Fixed:** Post numbering gaps (Tell + Recital dropped, remainder renumbered). Series date range corrected to one-per-day.
**Changed:** Social autopublish rewired from push-triggered to date-triggered; `autopublish:true` guard added to prevent re-broadcasting hand-posted content.

The Lyria Chronicles is a 27-post series documenting a music production project using Google's Lyria AI audio model. Posts went live on a daily drip from 1 June through 25 June, with each entry leading with the track's video rather than a static hero image.

The series ran into several structural issues that required repair before publication. A numbering gap had opened up when two posts (Tell and Recital) were dropped from the sequence; the remaining posts were renumbered to close it. The date range was redated to spread one post per day across the series arc. The social autopublish system needed to be rewired to trigger on a post's publication `date` field rather than immediately, which also required adding a guard against re-broadcasting posts that had already been hand-posted to Facebook and Twitter.

The finale — The Source (#27) and The Affirmative (#26) — were the last to be written and the hardest. The Source is a homage to Matthew Herbert's found-sound tradition; The Affirmative closes the arc with a statement about what the project meant to make. 37 posts across the series received YouTube URLs wiring them to the @adrianwedd channel, and a video podcast feed was published alongside the YouTube uploads.

The social publishing infrastructure also got a structural change here: date-triggered posting replaced immediate publishing, so future series with daily drips can be set up in advance without manual scheduling.

---

## 26–30 May 2026 — AI safety series, portfolio refresh, services rewrite, internal-link checker

**Added:** 11 AI safety posts (each with cinematic video + audio). Build-time internal-link checker (`npm run check:links`). Tasmania 2026-27 budget analysis post.
**Fixed:** 16 dead internal links. Dead YouTube embed and broken gallery reference.
**Changed:** Project pages rewritten as problem/constraint/punchline case studies. Services copy, pricing, and case studies tightened. Homepage, contact, and about aligned to current positioning.

Eleven AI safety posts went up in a single batch, covering compute governance, AI alignment, and several posts that had been drafted over the preceding weeks. Each got a cinematic NotebookLM video and its own audio collection entry.

The portfolio got a significant content pass. Project pages were rewritten from narrative summaries to something closer to case studies — the pattern across all of them is problem/constraint/punchline. The services, contact, homepage, and about pages were rewritten together as a single positioning pass, aligning the copy across all four to match the operational picture in the internal ops docs. Pricing copy was tightened with a scoped retainer definition and accurate day rates.

A build-time internal-link checker was added to CI. Lychee had been the external link checker, but it deliberately skips same-origin links to avoid pre-deploy 404 false positives. The new checker scans the built HTML for same-origin links that don't resolve to anything in `dist/` — it closed 16 dead internal links that had accumulated unnoticed, including a dead YouTube embed and a broken gallery reference.

---

## 15–23 May 2026 — Worker hardening, OG pipeline, Bluesky video embeds

**Added:** Bluesky video and image embed support. `adrianwedd.com` Bluesky custom handle. `youtubeUrl` → VideoObject JSON-LD with `embedUrl` + `url`.
**Fixed:** SSRF defense on Bluesky federated PDS endpoint. Cron filter ordering. `CronLock` fencing token race condition. `forceRetry` record-type confusion. OG generator not being called at build time. Project JSON-LD canonical URL override.
**Changed:** OG image dimensions now read from file headers at build time (replaced filename heuristic).

The social worker received two hardening passes driven by multi-engine QA findings. The first batch closed five critical gaps: SSRF defense on the Bluesky federated PDS endpoint, cron filter ordering, a race condition in the `CronLock` Durable Object's fencing token logic, and a `forceRetry` bypass that wasn't correctly distinguishing failed records from published ones. The second pass folded in findings from a parallel Codex + Hermes review, tightening the worker test contract and the CI `.jpg`-twin guard.

The OG image pipeline had been broken in two ways: the generator wasn't being called during the build, and the project JSON-LD was overriding canonical URLs with a hardcoded value. Both were fixed together. OG image dimensions are now read from actual file headers at build time via a small PNG/JPEG/WebP parser — this replaced an older heuristic that guessed dimensions from the filename and had been silently setting wrong sizes for any hero image that didn't match the naming convention.

---

## 4–9 May 2026 — YouTube, Apple Podcasts, cinematic videos at scale

**Added:** `youtubeUrl` frontmatter field. YouTube + Apple Podcasts links in footer. 16 cinematic videos wired across content.
**Changed:** Failure-first repo links updated to `failurefirst` GitHub org. CI pages artifact retention cut from 7 days to 1 day.

A batch of 16 content items received cinematic NotebookLM YouTube URLs, and the footer gained links to the YouTube channel and Apple Podcasts feed. The `youtubeUrl` frontmatter field was introduced to connect individual posts to their corresponding YouTube uploads; the JSON-LD on posts with a `youtubeUrl` now emits a full VideoObject with `embedUrl` and `url` fields.

The failure-first project links were updated to point at the new `failurefirst` GitHub organisation rather than the original personal repo. Artifact storage in CI was reduced — pages artifacts had been retaining for 7 days, accumulating significant storage; this was cut to 1 day.

---

## 14–15 May 2026 — Bottom Pub Co-op post, NLM pipeline hardening

**Added:** Bottom Pub Co-op blog post + audio overview.
**Fixed:** NLM export scripts — atomic writes, tab-delimited output, `--update` mode for incremental runs.

The Bottom Pub Co-op got its own blog post and audio overview — a piece about the community effort to purchase a heritage pub in Tasmania. This was the first post to fully exercise the end-to-end NLM pipeline: notebook creation, audio generation, upload to R2, frontmatter update, and OG infographic committed alongside a `.jpg` twin.

The NotebookLM export scripts received a hardening pass around the same time: atomic writes to prevent partial-file corruption on interrupted runs, tab-delimited output to handle multi-line content correctly, and an `--update` mode for incremental runs on large batches.

---

## 27–30 April 2026 — Astro 6 + Tailwind 4 migration

**Changed:** Astro 5 → 6, Tailwind 3 → 4. `tailwind.config.mjs` replaced by `@theme` block in `global.css`.
**Added:** `worker-csp/` — Cloudflare Worker for per-request CSP nonce injection (deployed dormant).

The site migrated from Astro 5 + Tailwind 3 to Astro 6 + Tailwind 4. The Tailwind migration was the more structural of the two: the old `tailwind.config.mjs` was replaced entirely by an `@theme` block inside `src/styles/global.css`, collapsing the theming system into a single file. All colour utilities (`bg-surface`, `text-accent`, etc.) continue to resolve through CSS custom properties; the migration didn't change any component code or HTML.

A CSP nonce worker (`worker-csp/`) was built alongside the migration — a Cloudflare Worker that injects per-request nonces into the HTML at the edge and sets a strict `Content-Security-Policy` response header with `strict-dynamic`, `form-action`, and `frame-ancestors`. It was built and tested but deployed dormant during the migration, to be activated once the rest of the migration stabilised.

---

## April 2026 — Cinematic videos, CDN audio fixes, Bluesky infrastructure

**Added:** 20+ cinematic NotebookLM video summaries across posts and projects. Bluesky posting support in the social worker.
**Fixed:** R2 CORS configuration gap causing Safari audio playback failures. Audio URLs migrated from git-tracked paths to CDN URLs.

A batch run of NotebookLM cinematic video summaries went up for a wide range of posts and projects — 20+ videos across two sessions. The media CDN had a CORS configuration gap that was causing audio playback failures in Safari; this was fixed in the R2 bucket policy alongside an audio URL migration that moved several posts from git-tracked paths to CDN URLs.

The CSP hash infrastructure for the static site was reviewed and a separate `worker-csp/` codebase was initialised for the edge nonce injection approach.

---

## February 2026 — The site launches

**Added:** Everything — Astro 6 static site on GitHub Pages with full content pipeline, NotebookLM integration, social worker, consent-gated analytics, and 14 sprints of features delivered in four days.
**Changed:** Hosting migrated from Cloudflare Pages to GitHub Pages on day 3 (Cloudflare's 25 MB asset limit required compressing audio — unacceptable).

The site went from nothing to fully published across four days.

**12 February:** The foundation landed in four phases. Phase 1 was the Astro project itself — layout, design tokens, the dark botanical palette with dusty copper accent. Phase 2 was the content layer: blog, projects, gallery, audio, about, with NotebookLM studio assets embedded in each. Phase 3 wired in the intelligence layer: consent-gated GA4 analytics with rich event tracking, personalisation, and transparency disclosures. Phase 4 was polish — performance, accessibility, SEO, and the GitHub Pages deployment.

**13–14 February:** The first content sprint filled in 11 project pages, audio cross-links, voice rewrites, NotebookLM infographics as hero images for 13 projects, and the analytics dashboard wired to real GA4 data. The site moved from Cloudflare Pages to GitHub Pages on the 14th — the 25 MB asset limit on Cloudflare Pages had required compressing the ADHDo audio, which was unacceptable; GitHub Pages has no equivalent limit.

**15 February:** Six sprints ran in rapid succession, covering Pagefind search, table of contents, breadcrumbs, reading time, project tag filters, a `/now` page with GitHub activity, gallery pages, keyboard shortcuts, and a terminal easter egg. Three blog posts and three gallery collections went up the same day.

The site launched with a design system built entirely on CSS custom properties — no hardcoded colours anywhere, dark mode as the baseline, light mode as the `.light` class variation. The decision to use system fonts only (no web font loading) was made on day one and has held. NotebookLM was integrated from launch as the audio/video/infographic pipeline for every post; the automation scripts for batch generation were written during the same week.
