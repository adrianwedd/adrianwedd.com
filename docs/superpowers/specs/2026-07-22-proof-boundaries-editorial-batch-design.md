# Proof Boundaries Editorial Batch — Design

**Date:** 2026-07-22
**Status:** Editorial shape and publishing order approved by Adrian; publishability gate pending
**Target:** `src/content/blog/` and two existing entries in `src/content/projects/`
**Through-line:** Do not let the interface, model, or prose claim more than the machinery can prove.

## Outcome

Publish three new pieces in this order:

1. Dead Air phantom-adapter post — the concrete burn.
2. Robotics Specs + Factory Floor post — the architectural generalisation and batch anchor.
3. *The Ungovernable Body*, Part 4 — the philosophical culmination.

Alongside them, update the existing ADHDo and Lunar Tools project pages in place. Those two
updates retain their permanent URLs and receive an `updatedDate`; they are not new feed entries.
ADHDo 2.0 does not receive a standalone essay in this batch.

The sequence is deliberately self-demonstrating. Every piece states what the implementation can
support, identifies the boundary where evidence stops, and refuses the more impressive sentence
that the available evidence cannot yet carry.

## Hard pre-draft gates

No article or project-page prose is drafted until both gates below are complete. Verification
notes should be recorded as a compact evidence ledger in the implementation work so later edits
can distinguish a checked claim from an inherited one.

### Gate 1: publishability and link policy

GitHub visibility was machine-checked with `gh repo view` on 2026-07-22. Visibility is evidence
about access, not blanket editorial permission; Adrian must still approve the treatment below
before drafting starts.

| Repository | Visibility checked 2026-07-22 | Proposed publication treatment | Author clearance |
|---|---|---|---|
| `adrianwedd/robotics-specs` | Public | Link the repository and public specification/conformance artifacts. Describe it as an open v0 boundary, not an adopted standard. | Pending |
| `adrianwedd/factory-floor` | Private | Do not link the repository. Refer to Factory Floor as implementation #1 only at the level Adrian approves; prefer public evidence in `robotics-specs/examples/factory-floor.yaml` and the existing public project page/site. | Pending |
| `adrianwedd/dead-air` | Private | Do not link the repository or private PRs. The public package/documentation discrepancy may be described by package name, but private implementation detail must be either independently public or paraphrased at an approved level. | Pending |
| `adrianwedd/ADHDo` | Public | Retain the existing `repo:` link. Clearly separate merged foundation work from open PR #117 and unfinished device gates. | Pending |
| `adrianwedd/lunar_tools_prototypes` | Public | Retain the existing `repo:` link and cite only merged/current capabilities. | Pending |

Additional link rules:

- A private GitHub URL is never emitted into frontmatter, body copy, footnotes, or generated
  notebook assets.
- Private PR numbers may be used in the internal evidence ledger but not the published copy.
- Public package claims must be rechecked against the public registry and public documentation,
  not inferred solely from a private-repository decision record.
- Existing public project-site links may remain only if a pre-publish link check confirms that
  they resolve to the intended material.

### Gate 2: source and claim verification

Before writing prose, verify the repository state and the current site copy. A PR title, audit
summary, memory note, or earlier agent report is a lead, not evidence.

| Artifact | Required verification before drafting |
|---|---|
| Dead Air post | Read merged private PR #57 and its executed Phase-0 artifacts in full; confirm PR #58 is still planning/open rather than shipped behaviour; rerun or inspect the recorded workerd, raw-PCM, G.711, and handwritten-WebSocket gate results; independently check the named package publication state; compare the findings with the existing Dead Air project page so the two do not contradict each other. |
| Robotics Specs post | Read the public v0 specifications, governance documents, conformance implementation, examples, and current README at an exact commit; run the conformance test suite; confirm that Factory Floor's manifest and fail-closed test gate exist at the cited private-repository commit; confirm whether each Factory Floor fact is also safe to publish. The repository currently has direct commits rather than PR evidence, so the post must cite commits/artifacts rather than inventing a PR narrative. |
| Ungovernable Body Part 4 | Read ADR-035, the take registry schema/data, the observation quarantine, public-storyboard allowlist, human-attestation path, and negative dependency tests at an exact commit; run the relevant tests; compare the proposed claims with Parts 1–3 so Part 4 advances rather than repeats the series. |
| ADHDo page | Read the existing page line by line; read merged public PR #112 and verify its landed files/tests; read open PR #117 only to mark it as in flight; separately verify the actual on-device/audible and service state. Remove or qualify any existing latency, speaker, crisis-detection, or behavioural claim that the current evidence does not support. |
| Lunar Tools page | Read the existing page line by line; verify merged public PRs #26, #27, and #28 against current `main`; run the documented validation; confirm the installation count, status counts, local-only default, MLX backends, Afterwords integration, headless mode, CLI, and test count from current artifacts rather than the audit summary. |

For every material claim, the evidence ledger records:

- the exact source repository and commit;
- the file, test, or merged PR that supports it;
- whether the evidence is public or private;
- the strongest publishable wording it permits; and
- the tempting stronger wording that must not appear.

If verification weakens a premise, the prose follows the evidence. The gate does not become a
box-ticking exercise that preserves the audit's original story.

## Article 1: Dead Air phantom adapter

**Role in batch:** opener; a concrete dependency failure with a useful engineering resolution.
**Working title:** *The Voice Adapter That Wasn't There*
**Form:** standalone post, not a Dead Air project-page rewrite.
**Target length:** approximately 1,400–2,000 words.

### Story spine

The planned carrier stack appeared to have documented adapters. Installation revealed that one
named package was an empty `0.0.0` stub and others were unpublished. Instead of quietly rewriting
that discovery as a completed integration, the project stopped and ran a Phase-0 feasibility
gate in the intended runtime: structural provider composition, explicit PCM rather than an MP3
default, G.711 round-trip, raw audio through the pipeline, and hand-built WebSocket frames.

The result is not a triumphalist “we shipped telephony anyway.” It is a narrower and more useful
finding: the missing adapter layer is reconstructible, and the architecture may proceed without
pretending the production slice already exists.

### Precision clause

> **Proved:** the required transport boundary is reconstructible; the executed gate supports a
> `PROCEED` decision. **Not proved:** a production PSTN implementation, a live carrier path, or
> shipped Deepgram/ElevenLabs/Twilio behaviour.

Every section must remain inside that clause. PR #58's plan is future work, not retrospective
evidence.

### Beat structure

1. Open on the install, not on generic voice-agent context: the dependency exists in the
   architecture and documentation, then fails to exist as usable software.
2. Establish why a phantom abstraction is dangerous: it lets diagrams and plans silently claim
   an implementation boundary no one has exercised.
3. Show the gate as a sequence of falsifiable questions, with the actual result of each.
4. Explain the handwritten transport conclusion without inflating it into a carrier integration.
5. Close on the batch principle: an interface name is not evidence that an interface exists.

### Publication constraints

- The Dead Air repository and private PR URLs are not linked.
- Package names may appear only after public registry/documentation verification.
- Do not imply misconduct or intent; describe observable publication state and its engineering
  consequence.
- Reconcile any contradictory language on the existing Dead Air project page before publication.
  A corrective consistency edit may be proposed separately if verification shows one is needed.

## Article 2: Robotics Specs + Factory Floor

**Role in batch:** anchor; generalises the opener's dependency lesson into an architectural method.
**Working title:** *When the Specification Can Say No*
**Form:** standalone post linking the public Robotics Specs repository.
**Target length:** approximately 1,800–2,500 words.

### Story spine

Prose requirements are useful but permissive: an implementation can describe itself as compliant
without anything mechanically testing that description. Robotics Specs v0 turns selected
requirements into schemas, semantic checks, composite checks, examples, and a fail-closed
conformance command. Factory Floor then becomes implementation #1: a real system forced to state
its capabilities and prohibitions in a manifest and pass the boundary it claims to satisfy.

The post is about the movement from doctrine to rejection. It is not an announcement that a new
industry standard has won adoption.

### Precision clause

> **Proved:** requirements have been compiled into a conformance boundary that can reject
> unsupported claims, and Factory Floor is implementation #1 against that boundary. **Not
> proved:** external adoption, ecosystem consensus, interoperability across independent vendors,
> or standards-body status.

Use “specification,” “open v0,” “conformance package,” and “implementation #1.” Avoid an
unqualified “standard” where readers could reasonably hear adoption or institutional authority.

### Beat structure

1. Bridge from Dead Air: documentation can name an abstraction that reality cannot supply.
2. Ask what changes when a requirement becomes executable and capable of refusal.
3. Show the safety classes and module manifest at the conceptual level, then the strict loader,
   schema, semantic, and composite gates that enforce them.
4. Introduce Factory Floor as implementation #1, including a useful example of a declaration or
   prohibition the conformance boundary can reject.
5. Name what remains unproved: one implementation validates the boundary's usefulness, not its
   adoption.
6. Hand off to Part 4: machinery can reject unsupported system claims, but generated media raises
   the harder question of who is authorised to judge evidence.

### Publication constraints

- Link public Robotics Specs artifacts at stable GitHub paths or exact commits where practical.
- Do not link the private Factory Floor repository.
- Prefer the public Factory Floor example bundled with Robotics Specs for inspectable detail.
- Treat private implementation details as unavailable unless Adrian explicitly clears them.
- “Factory Floor is implementation #1” is descriptive provenance, not a claim of independent
  validation.

## Article 3: The Ungovernable Body, Part 4

**Role in batch:** culmination; moves from executable system claims to authority over perception.
**Working title:** *Who Grades the Take?*
**Form:** Part 4 of the existing series, using the established `series` value and `seriesOrder: 4`.
**Target length:** approximately 1,800–2,500 words.

### Story spine

Generated footage creates a circular evaluation problem: the same class of system that generated
a take can produce fluent reasons why that take works. Those observations may be useful without
being authoritative. The production therefore separates deterministic facts, perception-derived
observations, and accountable publication decisions. Observation output is quarantined exhaust;
the take registry does not read it as evidence; public storyboard claims pass through an allowlist
and a human-reviewed attestation path.

The essay should not collapse into “humans good, models bad.” Its claim is about authority and
promotion: a model may observe, compare, or flag, but it may not silently upgrade its own account
into the evidence that grades the work.

### Precision clause

> **Proved:** the repository prevents quarantined observations from silently promoting themselves
> into grading or public evidence, and makes human-reviewed authority explicit. **Not proved:**
> that the resulting human judgement is objectively correct, that model observations are useless,
> or that the finished film is good.

### Beat structure

1. Open with the question: “How do you grade a generated take without letting the model mark its
   own homework?”
2. Show the seductive failure: a generated clip receives a confident generated rationale and the
   rationale becomes a score by administrative drift.
3. Define the evidence classes without turning the essay into schema documentation.
4. Walk the authority path: media → measurements/observations → quarantine → human ruling →
   registry/public statement.
5. Show the negative dependency test as the key move: the public path proves which files it does
   not read.
6. Admit the remaining human problem. Explicit authority creates accountability; it does not make
   taste deterministic.
7. Close the three-post arc: interfaces, specifications, and evaluators all need boundaries that
   can refuse the stronger claim.

### Series continuity

- Link Parts 1–3 and the project page using existing permanent URLs.
- Match the first-person, technically literate, restrained register of the series.
- Avoid re-explaining the entire production pipeline, world, or research corpus.
- Start with `draft: true`; publication date and supporting assets are assigned only after prose
  review.

## Project-page update: ADHDo 2.0

**File:** `src/content/projects/adhdo.md`
**URL:** unchanged
**Metadata:** preserve original `date`; add or update `updatedDate` when the rewrite lands.

Rewrite the page as a status document with an explicit evidence boundary:

1. Why the original request/response assistant is being replaced.
2. **Landed:** the merged PR #112 foundation, described only to the level verified in `main` and
   on the device.
3. **In flight:** PR #117's personalization, Telegram, and dashboard work, clearly labelled open.
4. **Still gated:** audible end-to-end behaviour, cron/service operation, or other on-device claims
   that have not been independently checked.
5. The design principle that quiet hours, rate limits, serialization, and auditability belong in
   tools and services rather than model discretion.

The page may say “the 2.0 rewrite is underway” and identify the architecture. It must not narrate
the in-flight system as settled behaviour. A standalone ADHDo 2.0 essay remains deferred until PR
#117 is merged and the on-device gates are observed running.

## Project-page update: Lunar Tools

**File:** `src/content/projects/lunar-tools-prototypes.md`
**URL:** unchanged
**Metadata:** preserve original `date`; add or update `updatedDate` when the refresh lands.

Replace the GPT-4/DALL-E-era inventory with the verified current system:

- 29 installations and their checked status breakdown;
- MLX-native Apple Silicon defaults;
- local-only privacy mode and the explicit cloud opt-in boundary;
- pluggable language, speech, and image backends;
- Afterwords/Qwen3-TTS integration;
- deterministic headless fakes and CI operation;
- the `list`, `doctor`, and `run` CLI surface; and
- the current test/validation result.

Retain some concrete installation examples so the page remains about artworks rather than becoming
a framework README. Counts and test totals are point-in-time claims and must be verified immediately
before drafting.

## Shared editorial rules

- Use first person and concrete failure/recovery beats; do not turn the through-line into a slogan
  repeated verbatim in every introduction.
- Place the precision clause in each article's drafting notes. It need not appear as a labelled box
  in the published prose, but every claim must fit inside it.
- Distinguish executed tests, merged code, deployed behaviour, planned work, and author judgement.
- Never convert a private source into a public link merely because the author owns both repos.
- Never rename an existing content file. New post slugs are locked only after final titles are
  approved because published URLs are permanent.
- New posts begin with `draft: true`. `date`, `autopublish`, social distribution, and NotebookLM
  assets are separate release decisions, not drafting defaults.
- Descriptions remain at or below 160 characters. Local images, if later added, use Astro's image
  pipeline conventions.

## Draft and review order

After both pre-draft gates are cleared:

1. Draft Dead Air and verify every public package reference.
2. Review Dead Air's precision clause before starting the anchor.
3. Draft Robotics Specs + Factory Floor and verify every linked artifact plus every privately
   sourced Factory Floor sentence.
4. Review the anchor's precision clause before starting Part 4.
5. Draft Part 4 and run the series-continuity read across Parts 1–4.
6. Rewrite ADHDo in place.
7. Refresh Lunar Tools in place.
8. Run a cross-batch claims review: each piece must label its evidence boundary without copying
   language from the others.

This order preserves the approved public arc while allowing the two non-feed pages to describe the
latest verified state at the end of the drafting pass.

## Acceptance criteria

- The publishability table has an explicit author decision in every row before drafting begins.
- Every material technical claim has an exact, inspected source; every cited PR has been read, not
  inferred from its title or audit summary.
- The existing ADHDo and Lunar Tools pages have been compared line by line with current repository
  state before they are rewritten.
- Dead Air says `PROCEED`/reconstructible and never implies production PSTN shipped.
- Robotics Specs says executable conformance boundary and implementation #1, never adoption.
- Part 4 prevents silent promotion of observations into evidence without claiming infallible human
  judgement.
- ADHDo visibly separates landed, in-flight, and still-gated work.
- Lunar Tools contains only current, rerun counts and capabilities.
- Existing page URLs remain unchanged; private repositories receive no public repository links.
- Content validation, lint, production build, and relevant link checks pass before publication.

## Out of scope

- A standalone ADHDo 2.0 essay before PR #117 and the device gates are complete.
- A new Lunar Tools essay.
- Claims that Robotics Specs is adopted beyond its first implementation.
- Claims that Dead Air has shipped production telephony.
- NotebookLM companions, infographics, audio/video, social scheduling, or publication dates. These
  begin only after the text is approved and receive their own artifact QA.
