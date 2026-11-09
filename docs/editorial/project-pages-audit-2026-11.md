# Project pages: an editorial audit

**Date:** 9 November 2026
**Tracking issue:** [#784](https://github.com/adrianwedd/adrianwedd.com/issues/784)
**Scope:** all 43 project pages in `src/content/projects/`, plus the four reference essays, the projects index, and repository spot-checks.
**Status:** audit and proposal. No page has been rewritten. Nothing here is deployed.

---

## 1. What I read, and how

- **All 43 project pages in full**, as Markdown source and as rendered HTML (including hero, metadata block, media players and the index cards).
- **Four reference essays in full:** _The Groove Isn't in the Notes_ (3,286 words), _Homesick for the Future_ (3,573), _A Weathervane, Not a Map_ (4,364), _Building in the Open_ (282).
- **The projects index and four rendered pages** — one representative of each template shape (SPARK, ClawdCraft with sections, ordr.fm as a single block, plus LulzBench) — including hero, metadata block, media players and cards.
- **Repository spot-checks** against local checkouts where they exist (29 of 43 projects have a repository on disk), plus the site's own generation history (`git log`, `docs/PROJECT_SPEC.md`, `docs/DESIGN_CHARTER.md`, `scripts/notebook-configs/*.json`).
- Counted, not estimated: words, links, headings, numeric claims, hero assets.

The spot-checks matter more than they sound. Several of the discrepancies in §F4 were only visible by comparing the page against the artefact.

### Headline measurements

| Measure                                      | Project pages           | Reference essays |
| -------------------------------------------- | ----------------------- | ---------------- |
| Median length                                | 269 words               | 3,400 words      |
| Mean length                                  | 319 words               | —                |
| Pages with no subheadings at all             | 28 / 43                 | 0                |
| Pages with no links whatsoever               | 23 / 43                 | 0                |
| Pages with ≥1 external source link           | 13 / 43                 | 4 / 4            |
| Descriptions at or near the 160-char cap     | mean 125 chars, max 155 | —                |
| Pages whose hero is a NotebookLM infographic | 42 / 43                 | —                |

The length difference is not the problem, and this audit does not propose making pages longer. _Squishmallowdex_ is 137 words and better than several 500-word pages. The problem is what the words are doing.

---

## 2. The finding, in one paragraph

The catalogue is not badly written. It is written for the wrong object. Most pages describe **a repository**: its stack, its modules, its test count, its feature list. The strongest pages describe **a piece of work**: a decision that had a cost, a result that could have gone the other way, or a failure that only that project could have produced. The difference is not voice — most pages already have Adrian's sentence rhythm. It is that the weak pages have no _event_. Remove the name and the stack from `veritas`, `modelatlas`, `grid2`, `strategic-acquisitions` or `agentic-index` and the surviving text could describe any competent AI project built by anyone. Nothing in them happened.

Twenty-eight pages are a single unbroken block with no subheadings, and 23 contain no link of any kind — not to a repository, a report, a dashboard, or a source. A reader who finishes one of those pages knows what the project _is_ and has no way to check a single claim, see a single artefact, or learn a single thing that surprised its author.

---

## 3. Failure modes (named, counted, quoted)

### F1. The archive prelude frames every page as a catalogue record

Every project page opens with: breadcrumb → status pill (`active` / `complete` / `experiment`) → date → _Visit site ↗_ → _Source ↗_ → `H1` → the 160-character description → tag pills → **an audio player labelled "Listen while you read"** → **a full-width 1536×2752 portrait infographic**. (Forty-two of 43: the newest page, LulzBench, has neither player nor infographic yet.)

That is a defensible template for a catalogue record. It is a bad opening for an essay, it is the same opening 43 times, and the infographic renders at 708×1267 CSS pixels on desktop — roughly a screen and a half of generated poster before the first sentence of prose. _SPARK_ — the site's best project page — opens with "My son Obi and I built a robot together" and that sentence appears after the pills, the player and the poster.

### F2. The `description` field is doing three jobs and doing two of them badly

The same string is the index card, the page subtitle, the meta description, and — thanks to a 160-character cap — the _only_ place a project can state what it is. That cap forces spec-speak:

> "Cloudflare Pages site for a community co-operative proposal. EOI intake, Claude triage, Access-gated admin vault, editorial guardrails at build time."

> "A voice-agent failure eval harness plus a scripted healthcare receptionist. Models endpointing, barge-in, latency and mishearing before production does."

Both are accurate. Neither is the sentence the page is actually making. The `dead-air` page beneath that second description opens with one of the best lines on the site — "Production voice agents don't fail at the demo. They fail in the silences." — and the description cannot reach it.

Seventeen descriptions contain an em dash and a list of implementation nouns. Sixteen begin _A/An/The/This_. None quotes the project.

### F3. README translation, sometimes verbatim

`docs/PROJECT_SPEC.md` states the model explicitly: "Project pages | Generated from repo metadata + hand-curated". The first generation commit (`2fdd6d3`, 12 Feb 2026, _Co-Authored-By: Claude_) added fourteen pages at 13–15 lines each. The original `ordr-fm.md` was three paragraphs of README: "v2.5 with 90%+ test coverage across 150+ tests. Processes 10,000+ albums in 20-45 minutes."

A "voice-rewrite" pass on 13 February replaced the openings with first-person hooks and left the bodies intact. That is why so many pages now do this: a genuinely good first paragraph, followed by a feature inventory in the same voice:

> "Most productivity tools are built for brains that can hold a queue…" → three paragraphs later: "The system runs a three-stage cognitive pipeline. A state gatherer reads physical, temporal, and environmental context…"

The README register survives most visibly in `modelatlas.md`, which keeps the README's own marketing adjective:

> README: "ModelAtlas is a forensic-grade, modular intelligence framework meticulously designed for parsing, enriching, auditing, and visualizing…"
> Page: "It is a framework for parsing, enriching, auditing, and visualising the foundation model landscape… **forensic-grade intelligence framework**" (description)

### F4. Precision without provenance

Numbers appear as achieved fact. Spot-checks:

| Page claim                                                                                                                                     | What the artefact says                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `afterwords`: "103 flagship voice families (284 profiles)"                                                                                     | README at HEAD: "**102 flagship voice families** (198 profiles)". Neither number matches.                                                                           |
| `adhdo`: "closes in under 450 milliseconds on average"; "five thousand tracks"                                                                 | No occurrence of 450 ms or a 5,000-track figure anywhere in the repo; the only Jellyfin references are status notes about a music server that was then not running. |
| `spark`: "716 tests"                                                                                                                           | `grep -c 'def test_'` over `tests/` returns 2,192; the README quotes a 1,626-test dry run.                                                                          |
| `modelatlas`: "uses LLMs to fill gaps that heuristics cannot"; "TrustForge computes a trust score for each model… including LLM-inferred risk" | All 712 records in `enriched_outputs/` carry `meta.rated_by: "placeholder"` with empty `strengths`/`weaknesses`; no trust-score artefacts exist in the repo.        |
| `ordr-fm`: "90% test coverage across 150 tests", "10,000 albums in 20–45 minutes"                                                              | No repository on disk and no `repo:` field in the frontmatter. Unverifiable as published.                                                                           |
| `afterglow-engine`: "STFT caching delivers a hundred-thousand-times speedup over naive analysis"                                               | No benchmark artefact in the repo.                                                                                                                                  |

Contrast the one page that does this properly. `failure-first.md`'s numbers are pinned to `src/data/failure-first-stats.json`, which records `asOf`, `upstreamCommit`, and the manifest it came from; `validate-content.js` fails the build if the prose and the stats file disagree. That machinery exists for **one** page and no other.

This is not a style problem. It is the same class of defect as the LulzBench floor-control audit: an impressive number whose denominator nobody checked. The correct response is not to soften the prose — it is to instrument the claim or remove it.

### F5. Inventory where an argument should be

The clearest case is `dead-air.md`, which has a strong thesis and then, mid-page, becomes a dependency manifest:

> "The harness is full-stack TypeScript (Node ≥ 18, ESM) with Vitest, Zod, and `pg` + `node-pg-migrate` over Postgres. The agent-under-test runs through a `PatterAdapter` over the `getpatter` SDK."

The interesting sentence is two lines above it: "Double-booking isn't guarded against in application code; it's made _physically impossible_ by a Postgres GiST exclusion constraint." (I checked: `migrations/001_init.sql` line 25 has exactly that constraint. It is true, and it is the best thing on the page.)

Same pattern in `wolf-clan-hub` (a good opening about clubs running on Facebook and spreadsheets, then three zones of feature inventory), `ungovernable-body` (a superb premise, then four bullet lists of validation machinery), and `afterwords` (an origin story interrupted by three product tiers).

### F6. The closing-line reflex

Nineteen of 43 pages end on a bold statement, an italic line or a link — the house closing move. At their best these land — "Silence is a feature, not a failure." (SPARK), "No amount of persuasion produces a netherite sword." (ClawdCraft). At their worst they are slogans asserting the thing the page failed to demonstrate:

> "Trust must be quantifiable. Enrichment must be recursive. The system should be able to explain its own construction." (`modelatlas`)

> "Housing deserves better tooling. The data exists. It just was not connected." (`strategic-acquisitions`)

> "The kind of software that only gets built by someone with something to lose." (`ordr-fm`)

The formula is now predictable enough that a reader can feel the page winding down rather than concluding.

### F7. Nobody is invited to look

42 of 43 heroes are NotebookLM infographics — portrait (1536×2752), text-dense, generated _from the page itself_, and rendered full width between the reader and the first sentence. Only one page (`squishmallowdex`) embeds an image in the body proper. No page embeds a screenshot of the software it describes, a still from the film, a clip of the game, a sample of the audio, or a frame from the installation.

`lunar-tools-prototypes` describes "over twenty interactive audiovisual installations" and shows none of them. `orbitr` is a music tool you cannot hear. `latent-self` is a mirror you cannot see. `ungovernable-body` has over a thousand generated clips and shows one infographic.

The audio/video layer does not fix this. The NotebookLM configs I inspected source the project **page markdown** as their only input (`sources: ["textfile:../adrianwedd.com/src/content/projects/modelatlas.md"]`). So the "audio overview" is a performance of the prose you are already reading, and the infographic is a restatement of it. The media is derivative of the page, not of the project.

---

## 4. What the strongest pages do

These are techniques, not a template. They are drawn from the pages that work and from the four essays.

**1. Open on a scene, not a summary.**

> "A friend mentioned her 10-year-old was researching Squishmallows. I asked if I could help. A few hours later I looked up from my screen, realized I was starving, and discovered I'd built and shipped the first release."

**2. Name a decision and its cost.**

> "The deliberate choice is a **tmux session instead of headless `claude -p`**: you get human-in-the-loop safety… and a brain you can steer mid-conversation." (ClawdCraft)

**3. Report the thing that went wrong, in your own system.**

> "The honest proof that this approach works: a multi-model QA session found the scanner itself had a basename-matching bug — a whole subdirectory had been bypassing the check undetected." (Bottom Pub)

**4. Say what actually happened, including losing.**

> "The offer for the Commercial Hotel was unsuccessful on 13 August 2026; the property went to an undisclosed buyer under contract. Stage 1 language was retired the same week." (Bottom Pub)

**5. Give the number a denominator.**
LulzBench's page says a benchmark "can look impressively rigorous while quietly measuring the wrong thing", and the Failure First page's figures are pinned to a committed stats file. The four essays do this constantly: _Groove_ reports that the VR heater effects "only just cleared the usual bar for statistical significance", and that the authors "didn't measure core temperature".

**6. Admit the limit in a way that costs something.**

> "This is an experiment. It works well enough to be interesting and unevenly enough to be honest about that." (orbitr)
> "It's early days — the short is mid-production, with a full ensemble-pass reshoot underway." (Ungovernable Body)

**7. Write one sentence that cannot be transplanted.**

> "At 2:15 AM once, SPARK inferred it was hearing the refrigerator hum and wrote an inner monologue about the comfort of steady sounds in a sleeping house."
> "tmux 3.3a's `send-keys` fails precisely when no human is attached, which is exactly when you need it."
> "the old respawn loop once stacked 83 invulnerable allays"

**8. End on an open question, not a verdict.** The essays all do; almost no project page does.

### The blog comparison, concretely

| Move                           | In the essays                                                               | On the project pages                                                                          |
| ------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Start from an incident         | "A simulated fire can't heat a room. That's what a language model told me…" | A handful do (Squishmallowdex, NeuroConnect, Spark, Bottom Pub); most start from a definition |
| Follow it into sources         | 8, 6 and 2 external links respectively, each attached to a specific claim   | 13 of 43 have any external link                                                               |
| Distinguish evidence from vibe | "Interesting, not a slam dunk."                                             | Numbers stated flatly, no denominator                                                         |
| Let the author be wrong        | "I'm not convinced… I think it does most of the work."                      | Almost never; pages assert                                                                    |
| Use humour as instrument       | "Quantum monkeyware, maybe"; "before the fucking box is where?"             | Jokes are in the premises; the prose is earnest                                               |
| Keep an unresolved end         | "And I'm quite happy dancing around the questions for a while."             | Slogan or CTA                                                                                 |
| Length follows the question    | 3–4k words because the argument needs it                                    | 140–650 words because the template does                                                       |

The essays are not better because they are longer. They are better because each one is _about_ something that happened to the author's understanding, and every paragraph is doing work towards a claim that could fail.

---

## 5. Complete inventory

Grades: **A** = worth reading as it stands; **B** = good bones, one specific repair needed; **C** = describes a repository rather than a project; **D** = transplantable or unsupported, and should not stay as published.

| #   | Project (words)                         | Grade | Diagnosis                                                                                                                                                                                                                                                                             |
| --- | --------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | adhdo (246)                             | B-    | Excellent hook on judgmental tooling; then a precise 450 ms latency average and a 5,000-track library that appear nowhere in the repo. Ends on "No shame. No guilt. No disappointing notification tone." — good line, but the page never shows a day it handled.                      |
| 2   | afterglow-engine (199)                  | B     | Best premise on the site ("your best sounds already exist… the reverb tails of tracks you forgot"). Origin is real (reaching for textures that didn't exist). The 100,000× speedup and the 149-test figure are unprovenanced.                                                         |
| 3   | afterwords (544)                        | B     | Genuinely shipped, three tiers, 572 commits. But it reads as a product page: "Three tiers", "Setup", requirements list. Voice-family count (103/284) contradicts README (102/198).                                                                                                    |
| 4   | agentic-index (141)                     | D     | "The definitive developer-focused catalogue"; "Scored, curated, zero BS"; "the index the ecosystem needed but nobody was maintaining honestly". Self-praise in place of a single example of a score or a judgement.                                                                   |
| 5   | auditory-spiral (524)                   | A     | Real history with real specifics (six-hour format, cassette network, no permanent DJ equipment, the Star Wars rave seven floors underground). Personal stake is earned, not asserted. Links to the long-form version.                                                                 |
| 6   | before-the-words-existed (332)          | A-    | A genuine thesis with three named discriminants (reversibility, precision, relationality), a scholarly frame, and links to thesis and source. Slightly compressed, but it argues.                                                                                                     |
| 7   | bottom-pub-co-op (511)                  | A     | The model for the form: stakes, guardrails, a self-found bug, a real outcome including failure. "Getting the answer right meant building a system that couldn't accidentally give the wrong one."                                                                                     |
| 8   | clawdcraft (654)                        | A     | The best technical page here. A decision (tmux over headless), a transferable idea (boundaries in code, not prompt), concrete absurdity (allay at y=261; 83 stacked allays), and a live system on a Pi.                                                                               |
| 9   | cv (279)                                | B     | Strong opening on the lie of the CV. Then a pipeline inventory. "The pipeline won't ship an invented achievement" is a large claim with no example of a blocked claim.                                                                                                                |
| 10  | dead-air (558)                          | A-    | Thesis is first-rate and the GiST exclusion constraint is verified in the schema. "How it's built" drops into dependency names; the honest-scope paragraph is good but sits too low.                                                                                                  |
| 11  | dodgylegally (168)                      | B-    | Good premise and a real philosophy ("reproducible chaos"). Feature list carries the rest; no sample pack, no example of a good accident.                                                                                                                                              |
| 12  | dx0 (170)                               | B     | Strong reframe ("The right question is whether it can diagnose responsibly"). Personas are specific and constrained. Ends on "built to be interrogated, not trusted" — earned. No results, which the page never claims.                                                               |
| 13  | emdr-agent (251)                        | B+    | Appropriately sober, correctly scoped, deterministic safety gates described precisely. Cites "the README" as the authority for its own scope — small tell of the generation workflow.                                                                                                 |
| 14  | factory-floor (353)                     | B+    | The pipeline is real and the human-gate argument is a genuine idea. The ASCII diagram is documentation; "waiting on the human go" is a nice honest admission.                                                                                                                         |
| 15  | failure-first (502)                     | A     | Origin (Greenpeace Actions) is unusual and true to the method; five findings with numbers; provenance pinned to a stats file. Weak points: "Most published ASR numbers are wrong by a factor of two" is an unsourced sweep, and the reports aren't linked.                            |
| 16  | footnotes-at-the-edge-of-reality (315)  | A     | The form-is-the-argument paragraph is the most original claim on the site. Concrete about what the experience does.                                                                                                                                                                   |
| 17  | freedom-engine (277)                    | B     | High stakes stated well ("In a context where a wrong answer affects someone's liberty…"). But no status, no link, no artefact, and "100% human review" is unverifiable from outside.                                                                                                  |
| 18  | governance-lag-index (523)              | A-    | "Every safety regime we trust was written in arrears" — specific dates, a strict schema, and a personal stake that is argued rather than declared. Densest page on the site; could use one plain-language paragraph.                                                                  |
| 19  | grid2 (237)                             | C     | "AI for understanding, algorithms for execution" is a real architectural idea, delivered as a product pitch. No evidence it ran, no example page, no repo.                                                                                                                            |
| 20  | home-assistant-obsidian (150)           | B-    | Small, honest, appropriate for what it is. "Two systems that shape how you think should live in the same place" is a fair ending. Numbers unverified but low-stakes.                                                                                                                  |
| 21  | latent-self (169)                       | B+    | Best art-writing in the catalogue ("the discomfort is productive"). Shows nothing — no still, no morph, no visitor.                                                                                                                                                                   |
| 22  | lulzbench (650)                         | A     | Verified against the live site this month; claims hold, media plays, evidence view exists.                                                                                                                                                                                            |
| 23  | lunar-tools-prototypes (258)            | C     | Twenty installations named and none shown; no visitor reaction, no failure, no gallery, no link to a single artefact. The largest untapped visual opportunity on the site.                                                                                                            |
| 24  | modelatlas (270)                        | D     | README marketing in sentence form. Claims contradicted by the repo's own artefacts (see F4). Slogan ending.                                                                                                                                                                           |
| 25  | neuroconnect (285)                      | B     | Opens on a scene that is genuinely difficult to get right ("maybe they lost the word, maybe they lost the thread, maybe they are in crisis"). Then: "Every parameter is research-backed" with no citation, and a 254/257 test count where the interesting fact is the three failures. |
| 26  | notebooklm-automation (269)             | B+    | "Google built NotebookLM as a walled garden. I built a door." Distinctive, useful, and honest about the burner-account risk. Still largely a capability list.                                                                                                                         |
| 27  | orbitr (170)                            | B+    | Honest experiment, good reframe of the sequencer, and the best closing admission on the site. A music tool with no audio.                                                                                                                                                             |
| 28  | ordr-fm (171)                           | B     | Voice is fine; the numbers are unpinned and unlinkable (no repo field, no checkout on disk). "The kind of software that only gets built by someone with something to lose" is doing work the page hasn't done.                                                                        |
| 29  | personal-agentic-operating-system (251) | B     | Has a point of view (traceable adaptation over "self-improvement" in the breathless AGI sense). Abstract throughout; no architecture image despite the Mermaid graph existing.                                                                                                        |
| 30  | rlm-mcp (181)                           | C     | "Context windows have limits. Documents don't." is a good opening sentence. Then a spec list and "Comprehensive test suite. All passing." — a sentence that conveys nothing.                                                                                                          |
| 31  | space-weather (142)                     | C+    | Lovely frame ("The sun is a noisy neighbour"). A live dashboard with **no link on the page and an empty `url:` field**.                                                                                                                                                               |
| 32  | spark (491)                             | A     | The strongest page on the site. Co-authorship is the whole argument; the 2:15am refrigerator monologue is the single best piece of evidence in the catalogue. "716 tests" is stale (see F4).                                                                                          |
| 33  | squishmallowdex (137)                   | A-    | 137 words, one image, one human reason, one honest origin. Proof that short is not the problem.                                                                                                                                                                                       |
| 34  | strategic-acquisitions (233)            | D     | "AI-powered real estate analysis… GPT-4 insights, ML valuations, and Tasmanian spatial intelligence." No client, no outcome, no link. Reads as a pitch deck that lost its slides.                                                                                                     |
| 35  | tanda-pizza (147)                       | B-    | Modest and honest; "The constraint was honesty" is a real design position. No photograph of the restaurant, the room, or the menu — a place with a sense of place and no place in it.                                                                                                 |
| 36  | tel3sis (224)                           | B-    | Excellent opening on the three-second silence. Then features. 493 commits and no call recording, no latency measurement, no demo.                                                                                                                                                     |
| 37  | this-wasnt-in-the-brochure (363)        | A-    | A real book with real specifics (11 chapters, 7 appendices, 4 editions, 70% peer-reviewed), the AI workflow disclosed rather than hidden, and a defensible reason for the nautical design.                                                                                            |
| 38  | throw-a-chicken (457)                   | A     | Kid as product manager, shipped to v9, a deploy gate added _because_ v8 shipped a parse error. Exactly the right level of detail: enough to prove it exists, not enough to be a changelog.                                                                                            |
| 39  | understory (443)                        | B+    | Intellectually the most serious page here, and the only one that reports its own keystone assumption failing ("that check resolved negative… the title is a cadastral diagram, not a sealed plan"). The Dossier 00 paragraph is close to unreadable for anyone outside the project.   |
| 40  | ungovernable-body (541)                 | B+    | Ambitious, specific and unusual (111 shots, 850+ transcripts, 23 ADRs, labelled claims). Inventory-heavy; one still frame would transform it.                                                                                                                                         |
| 41  | veritas (255)                           | D     | "It addresses what I call the efficiency-trust deficit" — a self-named concept, no artefact, no client, no status, no link. "These are not features. They are the minimum requirements" is a slogan doing the work of evidence.                                                       |
| 42  | why-demonstrated-risk-is-ignored (225)  | B     | A clean abstract for an essay, with a good question at its centre. It is a pointer page and reads like one; a single case study would make it a page.                                                                                                                                 |
| 43  | wolf-clan-hub (434)                     | B     | "Every local club I've trained at runs on a Facebook page and a spreadsheet" earns the rest. Then three zones of features. "Why vanilla" is the only section with an argument.                                                                                                        |

**Distribution:** 13 A/A-, 22 B (including B+/B-), 4 C, 4 D. The A pages cluster in 2026 (SPARK, ClawdCraft, Bottom Pub, LulzBench, Throw a Chicken) plus three earlier pieces written as essays, art or history (Auditory Spiral, Footnotes, Before the Words Existed), four written as essays from the start (Failure First, This Wasn't in the Brochure, Governance Lag Index, Dead Air) and one short joke that simply works (Squishmallowdex). The four D pages are February 2026 README translations that were never revisited.

---

## 6. Prioritised revision candidates

Ranked by editorial opportunity × public visibility × importance of the work. Not by ease.

### P0 — these are actively costing credibility

1. **modelatlas** — claims contradicted by its own artefacts (F4). Either instrument the enrichment or rewrite to what exists. Highest priority because the page asserts a capability the repo shows as a placeholder.
2. **veritas** — no evidence of anything existing, and the most transplantable prose on the site. Needs status truth first, prose second.
3. **strategic-acquisitions** — pitched at a client audience with no client, no outcome, no link. Either it shipped somewhere or it belongs in `experiments`.
4. **agentic-index** — a "definitive, scored, curated" index with no example judgement shown. One real entry with its score and reasoning would fix it.
5. **adhdo** — the 450 ms / 5,000-track figures. Two lines to delete or instrument; the page's argument does not depend on them.
6. **lunar-tools-prototypes** and **orbitr** — the two pages where the work is _inherently_ audio-visual and the reader gets nothing to see or hear.

### P1 — good pages with one specific defect

7. **dead-air** — cut the dependency paragraph, promote the GiST constraint to be the page's spine.
8. **afterwords** — demote "Three tiers"/"Setup" to the end; fix the voice-family count; put the origin first.
9. **wolf-clan-hub** — lead with "why vanilla" and the security model; the zone inventory belongs below.
10. **freedom-engine** — add status, a link, and one concrete question/answer pair (redacted). The stakes deserve proof of life.
11. **space-weather** — add the link. It is a live dashboard with no door.
12. **neuroconnect** — cite the research behind "every parameter is research-backed", or drop the claim.
13. **cv** — one real example of a claim the guardian blocked. That single receipt would make the whole page credible.
14. **understory** — a plain-language "what we learned" before Dossier 00.
15. **ungovernable-body** — one still frame, and cut one of the four validation bullets.
16. **tel3sis** — one recording, or one measured latency trace.
17. **failure-first** — link the reports behind the five findings; qualify the "factor of two" line.
18. **grid2**, **rlm-mcp** — decide whether these are projects or sketches. If sketches, say so in a sentence and the pages become honest.

### P2 — protect, don't touch

**SPARK, ClawdCraft, Bottom Pub, Throw a Chicken, Auditory Spiral, Footnotes, Before the Words Existed, Squishmallowdex, This Wasn't in the Brochure, Governance Lag Index, LulzBench.** Refresh stale numbers where they exist (SPARK's 716), otherwise leave them alone. Any wholesale "consistency" pass that flattens these into a house style would destroy the best writing on the site.

---

## 7. Before / after

Three examples, each fixing a different failure mode. Facts are preserved; nothing invented. The "after" versions are shorter or equal in length.

### 7.1 `adhdo.md` — removing precision that cannot be checked (F4)

**Before** (excerpt):

> ADHDo is the assistant I built because I needed executive function treated as a variable, not a constant. Not a todo list with encouragement bolted on — a cognitive scaffold that adapts to the shape of the day.
>
> The system runs a three-stage cognitive pipeline. A state gatherer reads physical, temporal, and environmental context — medication windows, sitting duration, task backlog, energy levels. A reasoning engine with confidence gating processes that state; it won't act unless it understands the situation. Then a tools executor orchestrates interventions: focus music, timers, ambient nudges, environment controls. The loop closes in under 450 milliseconds on average — well inside the three-second window before an ADHD brain decides an interaction isn't worth sustaining. Google Nest speakers put the scaffold in the room, not behind a screen. A Jellyfin-powered focus music library of five thousand tracks auto-categorises by mood — because sometimes the right frequency is the only executive function that works.

**After:**

> ADHDo is the assistant I built because I needed executive function treated as a variable, not a constant. Not a todo list with encouragement bolted on — a cognitive scaffold that adapts to the shape of the day.
>
> Most of the decision is refusing to act. A state gatherer reads the room: medication window, how long I have been sitting, what is already overdue, what the day has cost so far. A reasoning engine with confidence gating looks at that and decides whether it understands enough to intervene. Only then does anything happen — a timer, a nudge, music, the lights.
>
> The gate is the design. A system that guesses generously is another thing telling you what to do. One that says nothing when it doesn't know is the only kind that earns the right to speak.
>
> It runs on Google Nest speakers, because the scaffold belongs in the room rather than behind a screen.

**What changed:** the unverifiable latency average and library size are gone; the mechanism and the _idea_ remain; the ending is no longer a slogan but the argument the page is actually making. If the 450 ms figure is real and instrumented, it can come back with a sentence saying how it was measured — that would be better than either version.

### 7.2 `modelatlas.md` — from capability list to evidenced claim (F3)

**Before** (excerpt):

> It is a framework for parsing, enriching, auditing, and visualising the foundation model landscape. It starts with raw scrapes from Ollama's registry, then runs a recursive enrichment agent—RECURSOR-1—that normalises fields, infers missing data, decodes manifests, and uses LLMs to fill gaps that heuristics cannot. The output is structured, versioned metadata with provenance tracking at every step.
>
> TrustForge computes a trust score for each model by fusing metrics across dimensions: licence compliance, download statistics, upstream lineage, and LLM-inferred risk.

**After** (structure, with the evidence the repo actually contains):

> There are thousands of foundation models now, and the metadata about them is a mess in a specific, measurable way. I collected 712 model records — 371 came through OpenRouter, 203 from Ollama's registry, 99 from Hugging Face, 39 from Ollama Cloud. The first thing you notice is what isn't there. `context_length` exists for the 371 OpenRouter records and for none of the other 341. A licence is recorded for 87 of the 712. Lineage — what a model was actually built from — is almost never stated at all.
>
> That unevenness is the finding. You cannot compare models on a dimension the registry doesn't populate, and you cannot tell from a model card whether a missing field means "not disclosed" or "not applicable". So the tool's job is not to fill the gaps; it is to keep the difference between _stated_, _inferred_ and _unknown_ visible at every step.
>
> [then, and only when true: the enrichment stage, how many records it has run over, what TrustForge outputs, one example record before and after]

**What changed:** the README adjectives are gone; a real, checkable observation from the artefact replaces them; the page's claim is now falsifiable — and the reader can open `enriched_outputs/` and check it. **This example also demonstrates the escalation rule:** the LLM-enrichment and trust-score claims should be verified with the project owner before anyone publishes either version, because the artefacts at HEAD show them as unimplemented. That is a conversation to have, not a sentence to quietly delete.

### 7.3 `dead-air.md` — inventory out, argument in (F5)

**Before** (excerpt):

> The harness is full-stack TypeScript (Node ≥ 18, ESM) with Vitest, Zod, and `pg` + `node-pg-migrate` over Postgres. The agent-under-test runs through a `PatterAdapter` over the `getpatter` SDK. In the current tier the adapter drives a scripted healthcare-receptionist fixture with fake speech-to-text (STT) and text-to-speech (TTS) injected, and an optional path that swaps in a real Claude decision loop — deterministic by design, so CI needs no API keys or audio hardware to run the merge gate.

**After:**

> The merge gate runs a scripted receptionist with speech-to-text and text-to-speech faked out, so CI needs no API keys and no audio hardware. A real Claude decision loop can be swapped in behind the same adapter; the deterministic fixture is what makes the gate trustworthy, because a voice regression that only appears when a model is in the loop is not something you can fail a build on.
>
> The constraint that matters is in the database, not the prompt: double-booking is impossible because Postgres refuses to represent an overlapping appointment (`EXCLUDE USING gist`). The agent can be confused in any way you like and still cannot create one.

**What changed:** the dependency list becomes one clause about _why_ the fixture is fake; the GiST constraint — the page's best idea, currently buried mid-paragraph — becomes the section's argument. Nothing is lost that a reader needs; the repository still documents the stack.

---

## 8. Visual and experiential opportunities

The catalogue has one real image and 42 infographics. These are the specific gaps, in order of payoff.

| Project                                                                   | What exists                                     | What a reader needs                                                                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **ClawdCraft**                                                            | A live Pi server, a crab avatar, in-game builds | 20-second screen capture: a kid types `clawd build me a fountain`, the thing appears, the `⚙ Clawd:` operator line scrolls past |
| **Throw a Chicken**                                                       | A live Roblox game                              | Gameplay GIF of a throw; a clip of the seven-year-old's sign-off                                                                |
| **SPARK**                                                                 | A physical robot in a house                     | One photograph of the robot; the 2:15am monologue as a pull-quote (it is currently buried in a paragraph)                       |
| **Lunar Tools**                                                           | 20+ installations                               | 4–6 stills or short loops — this page cannot be rescued by prose                                                                |
| **Orbitr**                                                                | A working sequencer with generated audio        | A 20-second audio loop, and a capture of the rings turning                                                                      |
| **Latent Self**                                                           | A real-time morph installation                  | Two frames — the face you walked in with, and the one it shows you                                                              |
| **Ungovernable Body**                                                     | 1,000+ generated clips, 850+ transcripts        | One still from a labelled first-pass clip; the shot manifest rendered as a grid                                                 |
| **Dead Air**                                                              | An operator dashboard                           | Screenshot of a failing run; a latency timeline showing the dead air itself                                                     |
| **Governance Lag Index**                                                  | A four-stage schema with dates                  | The timeline chart. The entire argument is an interval, and it is currently only prose                                          |
| **Afterglow Engine**                                                      | A working extractor                             | Before/after spectrogram of one mined texture                                                                                   |
| **Auditory Spiral**                                                       | A 1990s radio show                              | Cassette scans, a flyer, the RSTFM programme listing — physical evidence of the cassette network the page describes             |
| **Tanda Pizza**                                                           | A restaurant in a rice paddy                    | One photograph of the room, and the site on a phone                                                                             |
| **Wolf Clan**                                                             | A live member portal                            | One redacted portal screenshot                                                                                                  |
| **Failure First**                                                         | Reports and a corpus                            | One figure from the report on the page itself                                                                                   |
| **Veritas / Grid2 / ModelAtlas / Strategic Acquisitions / Agentic Index** | —                                               | Nothing to show. That absence is itself the editorial answer.                                                                   |

Two structural moves behind the table:

1. **Stop making the infographic the hero.** It restates the page in small type and sits between the reader and the first sentence. Use the artefact, and put the infographic in the body where a reader can choose it.
2. **Let the media be about the project, not the page.** The NotebookLM pipeline currently ingests `src/content/projects/<slug>.md`. If the goal is "listen to the project", the source pack should include the repo README, a report, a transcript, an interview — anything that isn't the prose it accompanies. Otherwise label it honestly: _an audio version of this page_.

---

## 9. Root causes

These are the causes visible in the repository, not guesses about anyone's intentions.

**1. The pages were generated from repository metadata, and the generator was never asked what the page was for.**
`docs/PROJECT_SPEC.md`: "Project pages | Generated from repo metadata + hand-curated". Commit `2fdd6d3` added fourteen pages at 13–15 lines each. Nothing in the spec defines a project page's job beyond existing.

**2. The voice guide governs sentences, not substance.**
`DESIGN_CHARTER.md` §6 and `STYLE.md` specify rhythm, Australian English, "This is not X. It is Y", "never third-person achievement listing". They say nothing about what a project page must contain — no requirement for an artefact, a result, a decision, a failure, a source. A page can obey the voice guide perfectly and still be an inventory. Most do.

**3. The 160-character `description` cap forces spec-speak into the most-read field.**
It is the card, the subtitle and the meta description simultaneously, so every project is compressed into `[category] — [stack]`. The page's own best sentence never appears in the place most people will read.

**4. The template opens as an archive, not an essay.**
Status pill, date, two external links, portrait infographic, then prose. The reader is told what the thing is filed under before they are told why it exists.

**5. Only one page has a claims-provenance mechanism.**
`failure-first.md`'s numbers are pinned to `src/data/failure-first-stats.json` (`asOf`, `upstreamCommit`, source manifest) and CI fails on drift. The other 42 pages can assert any number they like. Unsurprisingly, some of them do.

**6. The media pipeline is circular.**
NotebookLM configs take the page markdown as their only source, so audio, video and infographic are all restatements of the prose. The experiential layer looks rich in the schema (8 asset types per page) and adds no new information.

**7. The `status` field is a claim nobody checks.**
28 pages say `active`. Several of those repositories were last touched in January–March 2026 (`rlm-mcp` 18 Jan, `space-weather` 7 Jan, `dodgylegally` 24 Feb, `agentic-index` 6 May). "Active" currently means "not archived", which is not what a reader infers.

### Recommended workflow changes

1. **A one-page brief before any project page.** Four lines: the thing that happened; the artefact a reader can check; the decision that had a cost; the question still open. If the brief is empty, the page is a sketch and should say so.
2. **A claims file per project** — `src/data/project-claims/<slug>.json` — mirroring `failure-first-stats.json`. Any numeral in a project body must appear there with `asOf` and a source. Then extend `validate-content.js` to check it. This is the single highest-leverage change: it makes unsupported precision fail the build rather than the reputation.
3. **READMEs are evidence, not sources.** The rule: a README may supply a claim to verify; it may not supply a sentence to publish. The `modelatlas` "forensic-grade" case is what this rule prevents.
4. **Split the description.** `description` (≤160, for cards) and `lede` (free, for the page's opening paragraph). The page subtitle should be able to be a sentence from the page.
5. **Template: prose first.** Put the lede above the status/date/link row, or move the row to the page foot. Keep the metadata; stop leading with it.
6. **Hero rule.** A real artefact image, or no hero. Infographic becomes a body asset.
7. **Status rule.** `active` requires a repository commit within 90 days, or a date-stamped note saying what "active" means for this project. Otherwise use `complete` / `experiment` / `dormant`.
8. **The transplant test in review.** Can this paragraph appear on another project's page with only the nouns changed? If yes, it is inventory. The second test: can the reviewer name one thing that could only have happened in _this_ project?
9. **Reviewers get one page at a time against a brief, not 43 pages against a style guide.** The failure mode here was uniformity applied at scale.

---

## 10. What I did not verify, and what needs escalation

- **`modelatlas` enrichment and trust scores.** I inspected `enriched_outputs/` and `data/validated/` (712 records each, every one `meta.rated_by: "placeholder"`, empty `strengths`/`weaknesses`) and found no trust-score artefacts; `trustforge/score.py` exists. This does not prove the capability is absent — a separate run may not be committed — but the page's claims are not evidenced by what the repo contains. **Escalate to the project owner before editing the page**, and treat "the run exists elsewhere" and "the page overstates" as different outcomes requiring different sentences.
- **`adhdo`, `ordr-fm`, `veritas`, `strategic-acquisitions`, `wolf-clan`, `neuroconnect`, `tanda-pizza`, `grid2`, `freedom-engine`, `lunar-tools`, `home-assistant-obsidian`, `dx0`.** No local checkout or no link on the page; their numerical claims were not checked. Absence of a checkout is not evidence of a false claim.
- **`spark` test count.** 2,192 `def test_` occurrences vs "716 tests" is a discrepancy, not necessarily an error — collection rules, markers and parametrisation change what counts. Someone should state the measurement once and pin it.
- **Licensing, taxonomy and attribution** were deliberately left out of this audit. They are separate questions with separate evidence standards, and mixing them into an editorial pass is how the LulzBench provenance problem got worse.

---

## 11. Method note

Every claim about a page in this document quotes the page. Every claim about a repository names the file or command used to check it. Where I could not check, I have said so rather than softened the language. The audit itself should be held to the standard it proposes: if a sentence here can't be traced to a file, a commit or a command, delete it before acting on it.
