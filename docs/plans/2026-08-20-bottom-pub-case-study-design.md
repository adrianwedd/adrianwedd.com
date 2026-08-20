# The Bottom Pub Project — case-study design

**Status:** design, not prose. No article copy in here beyond headline/deck candidates and
section-level intent lines. Prose is the next task.
**Source of truth:** `adrianwedd/bottom.pub` → `internal/case-study-handoff.md` (the
2026-08-20 revision). Every receipt cited below is a commit/file the handoff already
verified. Where the handoff says _unverified_, this design says _do not use_ or _verify
first_ — the piece's argument is that unverified claims don't ship, so the piece cannot
ship any.
**Thesis (fixed):** **The campaign failed. The system didn't disappear.**

This is the second adrianwedd.com piece about bottom.pub. The first —
`/case-studies/bottom-pub-co-op/` ("A website that is not allowed to accidentally
lie", 2026-07-01) — is the Stage-1 claim-scanner story. This one is its sequel and
its inversion: that piece was about stopping the site lying _while selling_; this one
is about what the system became _after the sale fell through_. Keep both. Cross-link.
The new piece gets its own permanent slug (see §9).

---

## 0. What this piece is and is not

| It is                                                         | It is not                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------- |
| A forensic civic-tech story — a case file, exhibits, receipts | A portfolio "project page" with Brief / What I built / Results |
| A data-visualisation feature whose charts are the argument    | A page that _shows_ charts as decoration                       |
| An account of engineering that distrusted its own outputs     | "AI built a website" / "how I used Claude"                     |
| About a failed acquisition and what outlived it               | About a pub, a fundraiser, or a co-op pitch                    |
| Adrian's functions shown through receipts                     | Adrian's credentials listed                                    |

Explicit goal-text constraints honoured: no beige project write-up; no "AI built this"
framing; no re-research except where the handoff flagged verification; no final prose.

---

## 1. The narrative arc — why this ordering

The goal lists ten beats. The strongest arc isn't chronological and isn't "one incident
per section". It's a **single idea that recurs in ten costumes**, with the reader taught
to see it early and then shown it again and again until the last instance lands as
inevitable:

> **Every part was true. The relationship between the parts was false.**

- Two gates green → wrong tree (attestation ✓, scanner ✓, _served bytes_ ✗)
- Attestation ✓, manifest ✓ → _relationship_ stale for days
- 14 rows each fine → _joined on a placeholder_ → one fabricated person
- Financial survey ✓, pledge register ✓ → _the calendar_ made it look like a funnel
- Local build ✓, file exists ✓ → _Cloudflare's routing layer_ 308s the canonical
- v1 charts looked right → _geometry had no relationship to the values_
- Triage marked `/design-system` clean → it certified _its own prior judgment_
- One file flagged a fact wrong → _three other files still asserted it_
- A green empty-findings list → meant "gave up", not "looked" (precision/recall independent)
- Each agent alone plausible → _disagreement between them_ was the signal

The handoff names this failure class — **mechanisms certifying themselves** — and the
release fix — **bind the relationship, not the objects** (hash-bound manifest, cross-
validated attestation, required check with empty bypass, five required booleans). That is
the spine. The failed acquisition is the _frame_ (why any of this exists); the privacy
machinery is the _stakes_ (why getting it wrong matters in a town of this size); the
charts are the _proof_ the method produces something beautiful and honest rather than
merely careful.

So the arc runs in four movements plus a coda:

```
I.   THE BUILDING          the bid fails — stated first, no burial
II.  TOO USEFUL TO LOSE    archive · corpus · privacy — what was kept, and how it can't leak
III. EVERYTHING WAS GREEN  the spine: wrong-tree end-to-end, then the same shape ×6
IV.  WHAT THE EVIDENCE SAYS the charts that survived the audit (A3, A1, the killed funnel, A2's absence)
CODA THE PART THAT OUTLIVES the briefing for the next owner · governance · Adrian's role as functions
```

Reasons this beats the handoff's "incident, then three more incidents" default:

1. Movement II before III means the reader already knows what the archive protects
   (people's words in a small town) before watching the release system fail. Stakes
   precede failure.
2. The funnel-kill and A2/A3 belong together in IV because they are the _same_ lesson
   applied to analysis rather than release: a plausible story checked against the
   intersection table and geometry checked against the values.
3. Agent review goes inside III, not a bolted-on "AI section" — the agents are simply more
   mechanisms, and the honest thing about them is that _they_ certify themselves too
   unless you make them disagree.

---

## 2. Visual motif — the tie-line

**Primary motif: two marks and the line that joins them.** It is already the native form
of the shipped charts (A1 dumbbell connector, A3 thread between a condition and each
cohort) and it is literally the argument: objects are the dots, relationships are the
line. Use it as a typographic/diagrammatic system across the whole piece:

```
 ●────────●   bound          (attestation ↔ manifest, after the fix)
 ●    ╌╌  ●   unchecked      (the gap — what #126, the overmerge, the 308 all were)
 ●━━━━━━━━●   heavy/shared   (a widely shared survey condition; a heavily verified relation)
 ●──────╳──●  broken         (found; the ╳ is the catch)
```

- Section markers, exhibit headers, pull-quote rules and the progress rail all draw from
  these four states. The reader learns the vocabulary in Movement II (the A1/A3
  explainer) and then reads the failure diagrams in III with no legend needed.
- Colour: the two cohort hues from bottom.pub's page (site accent family for
  "pledge-linked", a muted teal for "no linked pledge") are _not_ reused for the failure
  diagrams — those use copper (`--accent`) for the catch and the mauve-grey border token
  for the unchecked gap. The cohort palette appears only where the real data appears, so
  colour never lies about what's data and what's diagram.
- **Secondary texture: the digest.** `747988bcea7f…` and per-artefact SHA-256 fragments
  as hairline monospace rules — under the hero, as the "evidence tag" on each exhibit,
  and as the end-mark. This is the "byte-frozen" idea made visible. Never decorative
  nonsense hashes: use the real manifest digest and real per-artefact hashes re-typed from
  `docs/archive/release-manifest.json` on current main (the handoff forbids linking the
  repo; re-typed excerpts are explicitly permitted).

Palette stays inside the site charter (plum darks, warm cream, dusty copper, mauve greys;
light mode umber accent). No new colours except the two cohort hues, validated per mode
with the dataviz palette validator the way bottom.pub did.

---

## 3. Three hero concepts

All three carry the same fixed H1 (see §4). They differ in what the reader sees _behind_
the sentence and therefore who the piece feels written for.

### Hero A — "The field" (recommended)

A full-bleed, deterministic re-render of the **A3 tension field** from the public
`cohort-findings.json`: eleven conditions placed by Δpp on x and pooled prevalence on y,
threads to both cohorts, all computed in Astro frontmatter at build time — exactly the way
bottom.pub computes it, and the hero _says so_ in a one-line provenance caption under the
title ("Drawn from 20 counts at build time. Nothing on this page is drawn by hand.").
Desaturated to the site's plum/cream register with only the one large difference
(grant co-funding, 28.9 vs 14.5) left in copper. The H1 sits on the quiet centre-line
region. On scroll the field tilts/fades and the thesis deck resolves.

- Why it wins: it's the one asset no other portfolio has; it is data, not illustration;
  it previews Movement IV; it makes the "data-visualisation feature" register explicit in
  the first viewport; and it is honest by construction (the hero is a receipt).
- Risk: readers who don't know the chart yet see an abstract field. Acceptable — the deck
  explains, and IV pays it off with the full explainer.
- Mobile: threads thin to hairlines, labels dropped, one copper node labelled; the H1
  takes the top third, the field the rest.

### Hero B — "Two green checks" (engineering-first)

A rendered **release-gate panel**: three rows in monospace — `frontmatter reviewer stamp
✓`, `candidate scanner ✓`, `served bytes == reviewed bytes` — the third row blank, then
on scroll it resolves to `✗ 56 artefacts · digest mismatch`. Behind it, a faint diff of
`review-attestation.json` (`quarantined`) against the manifest state. H1 overlaid.

- Strongest single hook for the engineering reader; sets up relations-vs-objects
  immediately. Weakest for the civic/general reader, who sees CI output.
- If not the hero, this panel _must_ open Movement III as Exhibit 1 (it does in §5).

### Hero C — "The case file" (civic-first)

The archival photograph of the Commercial Hotel (bottom.pub's colourised image) treated
as an evidence exhibit: a bottom-left evidence tag in monospace — `EXHIBIT 0 · Commercial
Hotel, Cygnet · bid unsuccessful 13 Aug 2026 · archive frozen 19 Aug 2026 · digest
747988bcea7f…` — H1 over the image, image duotoned into plum/copper.

- Most legible to a general reader; most "story". Least distinctive as dataviz.
- **Blocked on rights**: the photograph's licence for reuse on adrianwedd.com is not
  established by the handoff. If rights can't be confirmed, replace the photo with a
  typographic evidence tag on a plum ground (the tag alone is strong enough).

**Recommendation:** Hero A. Use Hero B's panel as Exhibit 1. Keep Hero C's evidence-tag
language as the _exhibit-header system_ throughout (every exhibit gets a tag: number,
date, receipt).

---

## 4. Title and deck family

**Recommended H1 (page title, fixed thesis):**

> **The campaign failed. The system didn't disappear.**

**Recommended deck (standfirst under the H1; ≈45 words):**

> A three-month bid to buy a Tasmanian pub didn't get the building. What it left behind:
> a byte-frozen civic archive, a privacy pipeline that structurally cannot leak, charts
> that carry their own receipts, and a release system that learned not to trust its own
> green checks.

**Kicker (above H1, small caps):** `Case file · The Bottom Pub Project · Cygnet, Tasmania · May–August 2026`

**SEO `<title>` (≤60 chars):** `The campaign failed. The system didn't disappear.` (50)
**Meta description (≤160 chars — validated by `scripts/validate-content.js`):**
`A failed pub bid left behind a frozen civic archive, a privacy pipeline that can't leak, audited charts and a release system that distrusts its own checks.` (155 chars, counted)

**Deck family** — the same thesis, re-angled per movement, usable as section standfirsts
and as social-card variants (one card per movement is a legitimate social plan):

| Angle         | Line                                                    |
| ------------- | ------------------------------------------------------- |
| Release       | Two green checks, one wrong tree.                       |
| Data          | Fourteen people, one placeholder name.                  |
| Analysis      | A script whose only job is to catch the word "funnel".  |
| Visualisation | Nothing on this page was drawn by hand.                 |
| Privacy       | By the time it publishes, the words are already gone.   |
| Governance    | An empty bypass list, proven against the live API.      |
| Agents        | The reviewers disagreed. That was the point.            |
| Edge          | The build passed. The file existed. The URL still lied. |

Rejected as H1: "What a pub survey taught me about…" (first-person lesson register —
beige); "14 people, one placeholder name" (great kicker, too narrow to carry the thesis);
"Nothing on this page was drawn by hand" (best as the Movement IV standfirst, where it's
literally true of the page it sits on).

---

## 5. Page architecture — the scroll narrative

Reading time target ≈ 14–18 min desktop. A left-rail **progress spine** (desktop only)
draws the tie-line motif vertically: a dot per exhibit, connectors fill as you pass them.
Each exhibit header carries an **evidence tag** (monospace, small): `EXHIBIT n · date ·
receipt`. Receipts are commit SHAs / file paths _re-typed as text_, never linked (the repo
can't go public — handoff §"What must remain private").

### 0 · Hero

Hero A (§3). Kicker, H1, deck, provenance caption, digest hairline. A small "Skip to the
evidence ↓" link to Movement IV for the data-first reader.

### Movement I — THE BUILDING (≈ 250 words, one screen)

- **Intent:** state the failure before anything else. 13 Aug 2026: offer unsuccessful;
  property under contract to an undisclosed buyer. Same day, same page, the site stopped
  asking and announced the formation meeting (`76a04ee`, `51c32e4` "one truthful story").
- **Artifact:** the **corrected chronological spine** as a horizontal timeline (desktop) /
  vertical (mobile), built from the handoff table — static SVG computed from a small
  JSON so dates can't drift from text. Only the 23 Aug meeting is shown greyed and
  labelled "continuation, not this story's subject".
- **Beat line (standfirst):** _After a failed acquisition, a community site's job is to
  stop selling the thing that didn't happen and start being honest about what did._
- **Skills shown:** product/editorial design, governance.

### Movement II — TOO USEFUL TO LOSE (≈ 900 words, three exhibits)

Standfirst: _What the campaign produced that the sale couldn't take away._

- **Exhibit 1 · The archive.** 56 artefacts, byte-frozen, SHA-256 each plus a set digest,
  four drift modes checked (`docs/archive/release-manifest.json`; `c0acca2`, `9c96361`).
  Frozen snapshot (`/what-cygnet-told-us/`, 3 Jun–23 Jul 2026) explicitly separated from
  the still-open live instrument (`088ba16`); post-freeze corrections route through
  `archive-superseded.json`, never into the frozen artefact.
  _Visual:_ a **manifest strip** — 56 hairline hash fragments in a grid; hover/focus one
  and it names the artefact (static markup + CSS, no JS).
- **Exhibit 2 · The corpus.** 543 raw rows, four instruments kept distinct and _never
  pooled_ (`755b48a`, `283e1ec`); enquiries deliberately excluded; five test rows flagged
  not deleted (`test-submissions.json`); three canonical universes raw / post-exclusion /
  cohort (34/151/61/297 → 33/150/59/296 → n=32) defined _before_ the findings that use
  them (`analysis-brief.md`); Pass 1 pinned as literals CI can't re-derive (`f0283df`).
  _Visual:_ **four instrument columns that refuse to merge** — four lanes of unit marks,
  a faint pooled bar drawn _and struck through_ (the design says "not a funnel" before
  the word appears). The exact-email vs candidate identity graphs as two small overlapping-
  ring diagrams with the caption rule: _"fewer than five were linkable by exact email" —
  never "fewer than five overlapped"_ (57.6–59% email coverage on community_survey).
- **Exhibit 3 · The pipeline that can't leak.** Contextual identifiability in a small
  town (`corpus_deidentify.py:14-16`); 356 proper nouns reviewed, 310 (87.1%) retained
  (`review-summary.json`; reviewer of record Claude Opus 5 — _not_ Sonnet); shared-ness
  is not safety; `LONG_ANSWER_CHARS = 400` as a _review trigger_ not a rule (8/1/11 of
  20 dispositions); analyse-private → `disclose()` → publish, suppression in exactly one
  place; tracked metadata = counts only. The `/people/` COI chain (`8b1360e` →
  `f32a063` → `e065a68`) and the "other licensed venue" reframe (`011d468`) as the two
  real cross-page-join incidents — described at the level the public site already
  discloses, no further.
  _Visual:_ **the one-way diagram** — a left-to-right flow where respondent language is
  drawn as filled marks that _stop existing_ at the `disclose()` boundary; everything
  right of the line is counts. Static SVG. This is the piece's second-most-important
  diagram after the gates panel; build it to be screenshotted.
- **Skills shown:** data engineering, privacy engineering, research design.

### Movement III — EVERYTHING WAS GREEN (≈ 1,400 words; the spine)

Standfirst: _Every part was true. The relationship between the parts was false._

- **Exhibit 4 · The wrong tree (#126), walked end-to-end.** This is where the incident
  lands — first in the movement, full loop, the piece's longest single exhibit:
  discovered (two green gates, wrong served bytes) → root cause named in the commit body
  (verbatim quote: _"Every gate we had proved something adjacent to that and not that…"_)
  → structural fix (per-artefact SHA-256 + set digest; `--check` cross-validates
  attestation against manifest, refuses `publication_state: ready` with items pending or
  a moved digest) → the second half nobody expected (attestation said `quarantined` for
  days after it stopped being true — relations vs objects) → verified live.
  _Visual:_ **Hero B's gates panel as a four-frame scroll sequence** (CSS scroll-driven,
  no JS): (1) two green rows; (2) third row appears, blank; (3) ✗ digest mismatch;
  (4) the bound state ●────● with the manifest digest printed. Beside it, the
  **attestation-vs-manifest diff** rendered as a two-column "two true documents" card
  with the stale `quarantined` field highlighted. Static.
- **Exhibit 5 · The same shape, six more times.** A **grid of six compact cards**, each
  in the tie-line vocabulary (●╌╌● → ●──╳──●), 120–180 words each, receipt-first:
  1. _Fourteen people, one placeholder name_ — overmerge caught pre-publication,
     regression-locked (`755b48a`, `283e1ec`). Micro-visual: 14 marks collapsing to 1
     and re-expanding (CSS animation, prefers-reduced-motion respected).
  2. _The file existed. The URL still lied_ — Astro `format: 'preserve'` →
     Cloudflare 308 on the canonical; invisible locally; fixed by directory route
     (`3a236e5`, PR #141). Micro-visual: local ✓ / edge ✗ pair.
  3. _Open and closed at once_ — semantic reader catches the same page saying both;
     frozen/live split (`088ba16`).
  4. _"I looked" vs "I gave up"_ — precision and recall independent; five required
     booleans (`0355cc3`). Micro-visual: the five booleans as a checklist.
  5. _A fact flagged wrong in one file, asserted in three others_ (`90d0200`); and the
     contrast case in the same breath: _"No figure was invented"_ (`0355cc3`) — the
     temptation resisted.
  6. _A gate after the transition is an alarm, not a gate_ — `CI verify` required,
     `bypass_actors: []`, `--admin` cannot override, **proven against the live API**
     (`6fcd21b`, `e825bc3`). Micro-visual: redacted ruleset screenshot _or_ a re-typed
     JSON fragment (preferred — no screenshot hygiene risk).
- **Exhibit 6 · The reviewers disagreed. That was the point.** Where agent failure and
  review land — _inside_ the failure movement, as more mechanisms that certify themselves
  unless forced to disagree. Content, strictly from verified receipts: Gemini QA catching
  real CSP `style=` gaps (`b553b2d`); a doc claiming one flagged test row when five
  existed, caught in review (`634323a` — _incident, not a named catcher_); independent
  Codex + agy passes closing flagged judgement calls (`1d5b972`, `8262679`); the hostile
  re-read that caught three invented facts (`90d0200`); the final-review pass that
  self-caught a falsified comparative claim, stale counts and a corpus-fragile test
  literal (`767ebd0`). Then the **"Claims that did not survive checking" box** — the
  handoff's own unsubstantiated list, stated plainly on the page: _Gemini caught Unicode
  rewriting (no evidence); Fable transformed intuition into geometry (no evidence); Codex
  caught the linkage-coverage bug (trailer credits a Claude session)_. The box is the
  method applied to the piece itself; it is the single most persuasive paragraph the
  page can contain for a reader evaluating AI-collaboration skill, and it's cheap.
  _Visual:_ a **review matrix** — rows = incidents, columns = who caught it (Claude
  session / Codex / Gemini-agy / hostile re-read / test) with filled marks only where the
  receipt supports it and an explicit "attribution unverified" hatch for `634323a`.
  Static table, real `<table>` semantics.
- **Skills shown:** release engineering, governance, agent orchestration, adversarial QA.

### Movement IV — WHAT THE EVIDENCE SAYS (≈ 900 words)

Standfirst: _Nothing on this page was drawn by hand._

- **Exhibit 7 · The funnel that was killed in writing.** Four lenses — VISION /
  CONDITIONS / CAPACITY / COMMITMENT SIGNAL — "not stages, not a funnel, not a
  conversion journey" (`analysis-brief.md`, before any chart). `financial_survey` closed
  and `pledges` opened 28 Jun 2026 → "98/98 went financial-first" is a _calendar_ fact
  (`7fa1dad`); `corpus_language_guard.py` bans lifecycle words across non-overlapping
  fielding windows.
  _Visual:_ **the calendar proves it** — two fielding windows on a shared time axis
  touching end-to-start at 28 Jun, with the would-be funnel arrow drawn _and crossed
  out_. Interactive (small): hover the banned word list (`then · funnel · stage ·
journey · converted`) to see which instrument pairs it's banned for. Optional; static
  version is complete.
- **Exhibit 8 · A3 — the field, explained.** The shipped A3 tension field reproduced
  from `cohort-findings.json` with its **frozen encoding receipt** printed alongside as a
  three-column value → transformation → mark table: `x = Δpp = p90−p55`, `Δ/16 ×
half-width`; `y` pooled `(c90+c55)/145` max→min; thread stroke `cohort%/18`; node r
  constant (plan doc, written _before_ implementation). State the finding at the level
  bottom.pub states it: most conditions near the line; one large difference (grant
  co-funding 28.9% vs 14.5%); "two shades of engagement, not two camps."
  **Sensitivity artifact:** a **toggle** `x-axis: Δpp | lean ratio` that re-lays the
  field using the lean-ratio variant and shows the headline (grant co-funding as the
  outlier) survives the change. _Verification gate:_ the handoff says the lean-ratio
  write-up was not located in tracked state ("cite with caution"). **Do not build the
  toggle until the write-up file is located and the ratio values re-typed from it.** If
  it can't be found, ship a static one-sentence methodology note and no toggle.
- **Exhibit 9 · A1 — the audit.** All twenty options on one shared 0–100% axis, dumbbell
  pairs, declared ordering, exact pair printed — reproduced from the same JSON. This is
  the tie-line motif at full scale; the caption says so. `<details>` table beneath with
  raw counts (mirrors bottom.pub). Static.
- **Exhibit 10 · v1 → v2, and the concept that didn't ship.** Side-by-side: v1
  (hand-authored geometry, no provenance tag) vs v2 (header: "generated by
  generate*visual_prototypes_v2.py"; dek: *"every varying visual channel now computed from
  the reproduced Pass 1 values"_; every card carries an \_encoding receipt_). Then the
  **A2 ghost panel**: A1 and A3 shipped; **A2 (expressive / data-as-art) did not.** State
  the shipping decision only. The handoff is explicit that "became less impressive when
  made honest" is inferred, not quoted — so the panel shows A2's v1 and v2 renderings
  side-by-side and lets the reader see whatever they see; the caption says _"A2 did not
  ship. The reader can compare the v1 and v2 renderings and draw their own
  conclusion"_ — unless Adrian supplies the stated reason, in which case quote it as his.
  **B2:** the goal text references a "B2" artifact. The handoff names only A1/A2/A3 and
  the board's "six concepts"; the prototype board is untracked, and no tracked file or
  commit names B2. **Treat as unverified — locate B2 on the v2 board and describe it
  only from what the board itself says.** If B2 is the sixth-concept variant of the
  expressive lane, it belongs in this exhibit beside A2; if it's something else, it
  belongs wherever its data belongs. Placeholder reserved here.
  _Images:_ re-typed/re-rendered from the board or screenshotted from current main —
  the board is derived from counts only (no respondent language), so it is publishable;
  never link the repo.
- **Exhibit 11 · Open questions, stated as open.** "What worried the people who
  nevertheless pledged?" — a hypothesis conditional on the evidence, _not_ a finding;
  recorded capacity vs operational burden — open; cross-instrument contradiction findings
  — open. Three short cards, each labelled `OPEN · not analysed`. This is the piece
  refusing the beige move of implying results it doesn't have.
- **Skills shown:** research design, visualisation, qualitative analysis.

### Coda — THE PART THAT OUTLIVES (≈ 400 words)

- **The deliverable** restated: the archive, the briefing "for whoever owns the building
  next", and the disclosure pipeline — not the bid. One sentence on the 23 Aug formation
  meeting as continuation, clearly not this story's subject.
- **Adrian's role, as functions, each pointing at an exhibit already shown:** research
  design · data engineering · qualitative analysis · privacy engineering · visualisation ·
  product/editorial design · release engineering · security/governance · agent
  orchestration · failure-first QA · public-interest technology. Rendered as a compact
  **function → exhibit** index (tie-line again: function ●──● exhibit), not a skills
  cloud. No adjectives.
- **End-mark:** the manifest digest `747988bcea7f…` as the page's last line, with the
  reproduction date. Then: links to `/what-cygnet-told-us/` on bottom.pub, the first case
  study, the project page.

---

## 6. Interactive vs static — the rule and the list

**Rule:** interactive only where the interaction _is_ the argument. Everything else is
static SVG computed at build time from committed JSON, because "nothing on this page is
drawn by hand" has to be true of this page too. All SVG coordinates computed in Astro
frontmatter; `role="img"`, `aria-label`, and a real `<table>` twin for every chart.

| Element                                     | Mode                                                  | Why                                                                    |
| ------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Hero A field                                | static, CSS scroll-fade                               | it's a receipt, not a toy                                              |
| Timeline (I)                                | static                                                | dates must not drift                                                   |
| Manifest strip (II.1)                       | static + CSS hover/focus                              | no JS needed to name an artefact                                       |
| Four-lane corpus + struck pooled bar (II.2) | static                                                |                                                                        |
| One-way `disclose()` diagram (II.3)         | static                                                | screenshot target                                                      |
| Gates panel (III.4)                         | **CSS scroll-driven 4-frame**                         | the reveal is the lesson; no JS                                        |
| 14→1 collapse (III.5.1)                     | CSS animation, reduced-motion safe                    |                                                                        |
| Review matrix (III.6)                       | static `<table>`                                      | semantics matter                                                       |
| Calendar-not-funnel (IV.7)                  | static; optional hover on banned words                |                                                                        |
| **A3 + sensitivity toggle (IV.8)**          | **small Preact island** (or CSS `:has()` radio)       | the toggle _is_ the sensitivity check — gated on locating the write-up |
| A1 dumbbells + `<details>` table (IV.9)     | static                                                |                                                                        |
| v1/v2/A2 comparison (IV.10)                 | static, `<figure>` pairs                              |                                                                        |
| Progress spine rail                         | CSS `scroll-timeline` / IntersectionObserver fallback | decorative; degrades to nothing                                        |

No carousels. No parallax. No chart library — inline SVG like bottom.pub. Respect the
site's View-Transitions script pattern (is:inline + sentinels) for anything that touches
`document`.

---

## 7. Desktop / mobile composition

```
DESKTOP (≥1024)                              MOBILE (<640)
┌──────────────────────────────────────────┐  ┌──────────────────┐
│ KICKER                                    │  │ KICKER           │
│ The campaign failed.                      │  │ The campaign     │
│ The system didn't disappear.     [field]  │  │ failed. The      │
│ deck ……………………………  [A3 threads, copper   │  │ system didn't    │
│ 747988bcea7f… provenance   node glowing]  │  │ disappear.       │
├──┬───────────────────────────────────────┤  │ deck ……          │
│● │ I  THE BUILDING        ┌─timeline───┐ │  │ [field, hairline]│
││ │                        └────────────┘ │  ├──────────────────┤
│● │ II TOO USEFUL TO LOSE                 │  │ I  (timeline     │
││ │  EXHIBIT 1 ·2026-08-19 ·c0acca2        │  │     vertical)    │
││ │  text ███████  │ manifest strip ▒▒▒▒  │  │ II EXHIBIT 1     │
│● │  EXHIBIT 3      │ [one-way diagram]    │  │  tag / text /    │
││ │                                         │  │  diagram stacked │
│● │ III EVERYTHING WAS GREEN               │  │ III gates panel  │
││ │  EXHIBIT 4  [gates panel 4-frame] text │  │  (frames become  │
││ │  EXHIBIT 5  ┌──┬──┬──┐ six cards        │  │   a vertical     │
│● │             └──┴──┴──┘                  │  │   sequence)      │
││ │  EXHIBIT 6  review matrix               │  │  six cards: 1-col│
│● │ IV WHAT THE EVIDENCE SAYS               │  │  matrix: scrolls │
││ │  EXHIBIT 8  [A3 full-bleed] receipt tbl │  │   in overflow-x  │
││ │  EXHIBIT 9  [A1 two-col dumbbells]      │  │ IV A3: labels    │
│● │  EXHIBIT 10 v1 │ v2 │ A2 ghost           │  │  collapse to    │
││ │ CODA  function ●──● exhibit index        │  │  numbered list  │
│  │ 747988bcea7f… · reproduced 2026-08-20    │  │  A1: 1-col, pair│
└──┴────────────────────────────────────────┘  │  printed per row │
                                               └──────────────────┘
```

- Desktop: 3-col grid. Left 56px progress spine; centre measure ~68ch for prose; charts
  and diagrams break out to a 1,100px "exhibit width"; A3 and the gates panel go
  full-bleed. Exhibit text sits _beside_ its diagram (text left, diagram right) so the
  receipt is never below the fold from its claim.
- Mobile: single column; diagram _after_ its claim, never before; every chart keeps its
  printed-pair text so it reads without the SVG; the review matrix and A1 table scroll in
  their own `overflow-x: auto` container; the gates panel's four frames become four
  stacked states (no scroll-timeline dependency).
- Both: dark-first; light mode verified with the same contrast validator as bottom.pub's
  page; `prefers-reduced-motion` disables the collapse animation and scroll-driven
  reveals (final frame shown).

---

## 8. "Do not beige" — explicit notes

1. **No Brief / What I built / Results / Why it matters headings.** Movements and
   exhibits only. If a heading could sit on any portfolio, delete it.
2. **Receipt before claim.** Every exhibit opens with its evidence tag. A paragraph that
   can't name its commit/file doesn't go in.
3. **Quote the commits, not the author.** The verbatim commit-body lines in the handoff
   (_"adjacent to that and not that"_, _"fabricating evidence rather than losing it"_,
   _"shared-ness is not safety"_, _"an alarm, not a gate"_, _"No figure was invented"_)
   are the piece's pull-quotes. No invented quotes, no paraphrased wisdom.
4. **Show the unshipped and the unverified.** A2 ghost panel; the "claims that did not
   survive checking" box; three open questions labelled open. Beige hides these.
5. **No adjectives about Adrian.** Functions → exhibits. The reader infers skill from
   receipts or not at all.
6. **No "AI" section.** Agents appear as mechanisms inside Movement III. The model names
   that appear are only the ones the receipts name (Claude Opus 5 as de-id reviewer of
   record; Gemini QA on `b553b2d`; Codex/agy on `1d5b972`/`8262679`).
7. **No stock, no illustration, no icons.** Every visual is data, a diagram of a real
   mechanism, or a re-typed artefact. The only photograph permitted is the pub (rights
   pending), and only as an _exhibit_, not a mood image.
8. **No fundraising by implication.** No dollar figures, pledge totals, model outputs;
   "pledges were non-binding, no money was collected" wherever pledges appear. No CTA to
   the co-op beyond the one-line continuation note.
9. **No respondent language, ever.** Counts only; the piece inherits bottom.pub's
   zero-publishable-quotes constraint. No paraphrase of an answer either.
10. **No repo links.** Re-typed excerpts and screenshots from current main only. The
    repository's history contains removed PII and can never go public.
11. **Cohort language is fixed:** "pledge-linked by exact email" / "no linked pledge";
    never "supporters vs opponents", never funnel/stage/journey/then/converted for
    financial×pledges; EOI absence = "no recorded EOI offer".
12. **Not a template page.** This cannot render through the existing max-w-3xl
    `case-studies/[...slug].astro` prose template. See §9.

---

## 9. Implementation notes for this repo (for the build task, not this one)

- **URL (permanent):** `/case-studies/bottom-pub-project/`. The existing
  `/case-studies/bottom-pub-co-op/` stays and gets a forward-link ("What happened next →").
  Do not rename either.
- **Rendering:** the prose template won't carry this. Options, in order of preference:
  (a) a dedicated `src/pages/case-studies/bottom-pub-project.astro` page that _also_ has a
  collection entry (for `/case-studies/` listing, OG, schema) whose body is a one-paragraph
  abstract + link — requires the `[...slug]` route to skip that slug or the page to take
  precedence (verify Astro 6 static-route precedence); (b) a `layout:` discriminator in
  the case-studies schema selecting a new `FeatureLayout.astro` with full-bleed slots.
  Decide at build time; (a) is less schema churn.
- **Data:** copy bottom.pub's `public/data/cohort-findings.json` into `src/data/` with a
  provenance header (source URL on bottom.pub, reproduction date, digest). Add a vitest
  in `test/unit/` that asserts the printed pairs on this page match that JSON, the same
  way bottom.pub's `test_cohort_findings.py` pins literals — the chart must not be able to
  drift from the public derivative. Never copy anything from `internal/`.
- **OG:** bespoke 1200×630 card (Hero A field, desaturated, H1 over it) to
  `public/og/case-studies/bottom-pub-project.png`; landscape (the og aspect gate will
  check); `.webp` hero needs its `.jpg` twin if a heroImage is set.
- **Validation:** description ≤160; `npm run verify`; Lychee excludes own domain, so the
  bottom.pub links are checked — `/what-cygnet-told-us/` is a directory route since
  PR #141, so the trailing-slash link is correct.
- **Schema.org:** Article (existing template pattern) + consider `Dataset` for the copied
  derivative pointing `isBasedOn` at bottom.pub's JSON.
- **Follow-up defect found while designing (out of this task's scope, flagging):**
  `src/content/projects/bottom-pub-co-op.md` still reads `status: 'active'` and "The
  project is at Stage 1" — bottom.pub retired Stage-1 language on 2026-08-20 (`feccde6`)
  and the campaign concluded 13 Aug. That page should be updated (status → `complete` or
  `archived`, stage paragraph rewritten) when the new case study ships, and both should
  link to each other.

---

## 10. Decisions that are Adrian's (taste / rights / facts only he can settle)

1. **Hero:** A (field) recommended; B (gates) or C (case file) if he wants the piece to
   lead engineering-first or civic-first.
2. **Photo rights** for the Commercial Hotel archival image on adrianwedd.com (Hero C /
   Movement I exhibit). If unknown, the typographic evidence tag replaces it.
3. **A2's stated reason** for not shipping — if he's willing to state it in his own
   words, it's quoted as his; otherwise the ghost panel shows the renderings and says only
   "did not ship".
4. **B2** — what it is on the v2 board. Not in the handoff; not in tracked state.
5. **Lean-ratio sensitivity write-up** — locate the file so the A3 toggle can be built
   from real values; otherwise it's a one-line methodology note.
6. Whether the "claims that did not survive checking" box names the three retracted
   attributions explicitly (recommended — it's the method applied to itself) or
   summarises them.

Everything else above is executable without further input.
