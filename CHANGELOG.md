# What's been happening

A running account of how this site has grown — what was built, why it was built, and what was learned along the way.

---

## 20 July 2026 — The Ungovernable Body, a second podcast feed for Spotify, and honest image markup

**Added:** The Ungovernable Body — project page plus a two-part blog series, with a full NotebookLM kit (20-minute audio overview, five-minute video, branded infographic hero). A second podcast feed at `/audio/podcast.xml` carrying audio episodes only.
**Fixed:** Twenty audio episodes were claiming a generic site banner as their video thumbnail; each now points at its own cover art. Three published `.mp3` files were actually MP4/AAC and were being advertised with the wrong MIME type. Sixty-nine portrait images were being served as landscape social cards and cropped.
**Changed:** OG image dimensions are now read from the file itself rather than guessed from the filename. A build gate fails the PR if a social card isn't landscape.

Spotify rejected the site's podcast feed with "We're unable to accept podcasts with videos." Apple accepts the same feed without complaint, so the fix wasn't to strip video out — it was to publish a second feed. `/audio/feed.xml` is unchanged and still carries everything; `/audio/podcast.xml` carries the 93 audio-only episodes and is the one submitted to Spotify. Both are generated from the same builder with a single flag separating them.

Chasing that turned up a set of quieter problems in how the site describes its own media. Every audio episode's structured data was telling Google the video thumbnail was `/og-default.png` — the same generic banner, twenty times over. Google requires that thumbnail be unique per video, so all twenty were failing a requirement while technically carrying the property. The NotebookLM kits had per-episode cover art sitting in the same directory as the audio the whole time; the fix was to derive the thumbnail from the media file's own location.

Three files were lying about their format. `tanda-pizza`, `jailbreak-archaeology`, and `moltbook` all end in `.mp3` but begin with `ftypdash` — they are MP4/AAC in an MP3 costume, which is what NotebookLM actually delivers. The CDN had noticed, and was serving them as `application/octet-stream`. Renaming them wasn't an option because published URLs are permanent, so the correction is an explicit override table that maps those three paths to their real container.

The image work came from the same thread. OG card dimensions had been inferred from whether the filename contained the word "infographic", which mis-sized any hero that didn't follow the convention; they're now parsed from the file's actual header bytes. Sixty-nine portrait images were being handed to social platforms as landscape cards and getting cropped through the middle. There's now a build gate that fails a pull request if a social card isn't landscape — the previous check only confirmed the file existed, which passed happily while the image was the wrong shape.

The Ungovernable Body itself is an agent-operable film studio living in a git repository — canon, claims, screenplay, and over a thousand generated shots for a feminist techno-thriller short. It published as a project page plus a two-part production diary: part one on whether an agent-operated repository can make a real film without flattening its politics, part two on the world and the codex behind it. The film has its own site at ungovernable-body.wedd.au.

---

## 17–19 July 2026 — Four project pages, a four-engine QA sweep, and automated worker deploys

**Added:** Project pages for Dead Air, Throw a Chicken at It, Factory Floor, Understory, and ClawdCraft — each with a full NotebookLM asset kit. Gated deployment automation for the Cloudflare workers, with edge verification, automatic rollback, and a nightly drift check. Crisis-alert email from the comment monitor.
**Fixed:** Around sixty findings from a four-engine QA sweep, across View Transitions, contact and lightbox behaviour, the audio player, consent handling, and CI hardening. Canonical tag URLs now 301 rather than serving duplicates.
**Changed:** Advertising consent is now separate from analytics consent. The privacy page and analytics dashboard were rewritten to describe what actually happens rather than what was intended.

Five project pages went up over two days, each with its own audio overview, video, and infographic hero. Every one of them went through the same triple review before publishing, which caught a consistent set of small errors — wrong figures, stale links, missing alt text — that a single reviewer had been missing.

The larger piece of work was a QA sweep run across four engines at once on the same broad brief. It surfaced roughly sixty findings, and the useful discovery was how differently they failed: one engine verifies claims by writing throwaway repro scripts and is usually right; another is careful about distinguishing genuinely new bugs from long-standing repo patterns; a third is a good reviewer but a risky implementer, because its own test suites can pass without ever exercising the file it generated. Two findings were refuted on inspection. The rest were fixed across seven pull requests.

The consent split matters more than it sounds. Analytics consent and advertising consent had been one switch, which meant agreeing to traffic measurement also agreed to the LinkedIn tag. They're now separate, and the privacy page says so.

Worker deployments used to be a manual `wrangler deploy` from a laptop, which meant security headers sat written-but-undeployed for days at a time. They now run through a gated workflow that verifies the change at the edge afterwards and rolls back automatically if verification fails, with a nightly check for configuration drift.

---

## 1–6 July 2026 — A test suite worth the name, and a landing page for local work

**Added:** A Playwright end-to-end suite with a fast smoke subset gating every pull request and a fuller run nightly. A unit test layer covering the pure helpers and the content validator. A `/local` landing page for Huon Valley and southern Tasmania businesses, and a `case-studies` collection for longer write-ups.
**Changed:** The 2026 H2 roadmap, covering sprints 36 through 47.

The site had CI gates for links, images, and build size, but nothing that opened a page and checked it worked. That gap closed in two parts: a smoke suite that runs against a real production build on every pull request and finishes in under three minutes, and a nightly full suite covering search, filters, pagination, and audio playback. Underneath sits a unit layer for the pure functions — slug derivation, the image header parser, the content schema validator — which run without a build at all.

The `/local` page is a deliberate split in how the work is described. The services page speaks to AI risk and governance advisory; `/local` speaks to businesses that need a website, bookings, and to show up in a Google search, with plain pricing and an agreed scope. Both start the same way, but they are not the same pitch, and pretending otherwise served neither.

---

## 3 July 2026 — Sprint 37: security close-out

**Added:** A `security.txt` disclosure contact. Rate limiting on the worker's `/api/*` routes.
**Fixed:** Five high-severity dependency advisories. A Cloudflare Pages artifact step that had been silently dropping dotfiles, which is why `security.txt` hadn't been publishing.
**Changed:** The meta-CSP fallback now matches the worker's policy.

The rate limiting is worth a note because the first implementation was inert. It used a configuration shape that Cloudflare accepts without complaint and then ignores; the limit was declared, deployed, and doing nothing. Switching to the supported binding form and verifying it with an actual burst of requests was the difference between believing it worked and knowing.

The `security.txt` problem was similar in shape — the file was correct and committed, and the upload step was quietly excluding hidden directories, so it never reached production. Both were cases where the thing looked done from every angle except the one that mattered.

---

## 19–26 June 2026 — An Agent in the Walls, pagination, and CSP violation reporting

**Added:** An Agent in the Walls — a three-part series on rebuilding a home network after a compromise, with audio, video, and infographics throughout. Pagination across the blog and audio indexes and their tag pages. Self-hosted CSP violation reporting, in report-only mode first. A blog post on AI data centres.
**Fixed:** Social posts in a series now drip in order — the scheduler had been ignoring time-of-day, so same-day posts published in arbitrary sequence. Two blog posts had metrics that didn't match their source data; the figures were corrected and one set was reframed as compliance rates rather than attack success rates.
**Changed:** Validation gates now run on pull requests, not only after merge to main.

The series was written from a real incident and published with the remediation still in progress. Getting the three parts to publish in the right order took three attempts at the scheduler: the queue honoured the publication date but discarded the time, so a series dated to a single day came out shuffled.

The CI change is the one with the longest tail. Validation had run only on push to main, which meant a pull request could be entirely green and still break main the moment it merged — which happened twice. Moving those gates onto pull requests closed it.

---

## 16–18 June 2026 — Security headers, accessibility batches, and the Governance Lag Index kit

**Added:** HSTS, COOP, and CORP headers in the CSP worker. Captions for the NotebookLM videos. A GitHub-issue alert when a social API token nears expiry. Audio, video, and a branded infographic hero for the Governance Lag Index.
**Fixed:** Search deep-linking and empty-state guidance, the mobile menu's modal behaviour, hero image alt text, series navigation, layout shift in the lightbox, and share-menu accessibility. Unbounded key scans in the worker's health endpoint.
**Changed:** Lighthouse in CI is now manual rather than per-pull-request; there's a local runner using the same configuration.

Most of this came out of a frontend audit and shipped as several small batches rather than one large change. The captions matter more than the rest — every NotebookLM video on the site had been publishing without them.

The token-expiry alert exists because the Facebook integration had gone down before from an expired credential that nobody noticed until posts stopped appearing. It now opens an issue ahead of time.

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
