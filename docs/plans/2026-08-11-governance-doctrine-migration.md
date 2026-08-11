# Governance doctrine migration — semantic inventory + target architecture

**Status: PROPOSAL. No doctrine file has been modified.** This document is the
audit artifact requested 2026-08-11: a semantic inventory of every meaningful
instruction currently governing agent behaviour in this repo, plus a target
architecture and migration sequence. Applying it is a separate, explicitly
authorized step.

**Method:** read `AGENTS.md`, `STRATEGY.md`, `CLAUDE.md`, `GEMINI.md` in full
(no partial reads). Checked for repo-local `.claude/skills/` or `.claude/agents/`
doctrine — none exist in this repo (only stale agent worktrees under
`.claude/worktrees/`, not doctrine). Any "seek approval before implementing"
behaviour observed in a live session is therefore coming from a globally
installed plugin/skill, not a repo-local file — out of scope for an
in-repo audit; flagged in Finding F5 below for separate investigation.

---

## 1. Legend

**Bucket** (what a rule fundamentally is):
- **A** — Authority/constitution: who decides, what's default-authorized, fire doors, delegation
- **S** — Strategy: what's worth doing, quality bar, trade-offs, rejected directions
- **I** — Operating invariant: mechanical scar tissue, "don't break this again"
- **V** — Verification procedure: a command sequence / mechanical check
- **T** — Tool-quirk: genuinely specific to one CLI/tool
- **D** — Stale or duplicated: no longer true, or repeats another entry

**Stop-risk flag** (does the rule's current wording risk unnecessary stopping,
operator escalation, permission laundering, or programme-wide blocking?):
- 🟢 none — narrow, names a real fire door or mechanical fact
- 🟡 latent — broad wording, currently reads correctly in context but could be
  over-applied by a cautious agent
- 🔴 confirmed — has already produced, or structurally will produce, an
  unnecessary full stop

**Disposition**: Preserve / Narrow / Move / Deduplicate / Retire.

---

## 2. Semantic inventory

### 2.1 `AGENTS.md` (59 lines, whole file)

| # | Rule (paraphrased) | Protects | Bucket | Stop-risk | Disposition |
|---|---|---|---|---|---|
| A1 | Stack summary (Astro 6, Tailwind 4, Preact islands, Pagefind, GH Pages, Cloudflare DNS/CDN) | Orientation | T | 🟢 | Preserve |
| A2 | Commands block (`npm run dev/build/lint/format`, content validator, worker tests) | Orientation | T | 🟢 | Preserve |
| A3 | "Never use Tailwind `dark:` prefix" | Theming invariant | I | 🟢 | Move (duplicate of STRATEGY §2, CLAUDE.md, GEMINI.md — same rule stated 4×) |
| A4 | Always use `slug()` for hrefs | Correctness invariant | I | 🟢 | Move (duplicate ×4) |
| A5 | Always `<Picture>`, never raw `<img>` (CI-enforced) | Correctness invariant | I | 🟢 | Move (duplicate ×3) |
| A6 | Consent-first, `dns-prefetch` not `preconnect` | Privacy invariant | I | 🟢 | Move (duplicate ×3) |
| A7 | Permanent URLs — never rename published content | Integrity invariant | I | 🟢 | Move (duplicate ×3, and this is the single most safety-critical invariant in the repo — see F1) |
| A8 | View Transitions script pattern | Correctness invariant | I | 🟢 | Move (duplicate ×2, CLAUDE.md has the fuller version) |
| A9 | Content schema highlights (fields per collection) | Orientation | T | 🟢 | Preserve, but CLAUDE.md's version is more current — see F2 |
| A10 | CI gates list | Verification | V | 🟢 | Move (duplicate of STRATEGY §6 subset) |
| A11 | Gotchas (collection-ID extensions, umber accent, gitignored CV sync, worker-csp separate deploy) | Orientation | T | 🟢 | Preserve |

**Overall**: `AGENTS.md` today is almost entirely T (tool-quirk/reference) with several I-bucket rules leaking in as duplicates. It contains **zero** authority-bucket content — no fire doors, no default-authorization statement, no "who decides" language, no stop rules at all. This is the inverse of the target shape: today it's the thinnest, most tool-neutral file, but it's also the one file every tool (Claude, Gemini, Codex) should in principle defer to, and currently none of them do (see F4).

### 2.2 `STRATEGY.md` §1 INTENT

| # | Rule | Protects | Bucket | Stop-risk | Disposition |
|---|---|---|---|---|---|
| S1 | "Done" = CI-equivalent gates pass + URLs stable + nothing published without explicit instruction | Defines completion | A/S | 🟢 | Preserve — this is a real authority-bucket rule (defines "done") wearing strategy clothing. Split: "URLs stable" + "nothing published without instruction" → authority; "gates pass" → verification pointer |
| S2 | Deliberately-NOT list (no SSR, no secrets-in-repo, islands-only, no auto-deploy workers) | Architectural boundary | S | 🟢 | Preserve |

### 2.3 `STRATEGY.md` §2 INVARIANTS (24 items, lines 33–124)

These are the highest-value content in the whole doctrine set — concrete,
evidenced, mostly OBSERVED against commit history or live incidents. Table
condensed to one row per invariant; full text should carry forward verbatim
where noted.

| # | Invariant | Protects | Bucket | Stop-risk | Disposition | Notes |
|---|---|---|---|---|---|---|
| I1 | Never rename/move/delete published content file | URL permanence | I | 🟢 | Preserve verbatim | **Do not weaken** — this is the crown-jewel invariant (F1) |
| I2 | Never compress/re-encode published audio/video; never delete generated media on own judgment | Irreplaceable-asset preservation | I | 🟢 | Preserve verbatim | Same tier as I1 |
| I3 | Never `autopublish: true` on hand-posted/future-dated content without explicit instruction | Prevents real-world re-broadcast | I + fire door | 🟢 | Preserve verbatim, AND cross-list as a fire door in the authority layer (this is exactly the kind of rule that's both an invariant *and* the reason a §5 trigger exists) |
| I4 | No Tailwind `dark:` | Theming | I | 🟢 | Preserve (canonical copy — retire the 3 duplicates in A3/CLAUDE/GEMINI) |
| I5 | No raw `<img>` | Build correctness | I | 🟢 | Preserve (canonical copy) |
| I6 | `.webp` heroImage needs `.jpg` twin, CI-only-catchable | Build correctness, "broke main twice" | I | 🟢 | Preserve verbatim — evidenced (#420/#425) |
| I7 | Descriptions ≤160 chars, validator | Content correctness | I/V | 🟢 | Preserve, cross-ref §6 V1 |
| I8 | `slug()` required for collection-ID hrefs | Build correctness | I | 🟢 | Preserve (canonical copy) |
| I9 | View Transitions script pattern, `Analytics.astro` exception | Runtime correctness | I | 🟢 | Preserve (canonical copy, fullest version already here) |
| I10 | Consent-first, dns-prefetch not preconnect | Privacy/legal | I | 🟢 | Preserve (canonical copy) |
| I11 | No custom fonts | Design/perf invariant | I | 🟢 | Preserve |
| I12 | `package.json` `overrides` block load-bearing for audit gate | Build correctness | I | 🟢 | Preserve verbatim — evidenced (#471/#480/#489) |
| I13 | Worker idempotency / `CronLock` DO semantics (`forceRetry`, TOCTOU, fencing token) | Prevents double-posting to real platforms | I + fire door adjacent | 🟢 | Preserve verbatim — this is safety-critical and non-obvious; do not summarize away the mechanism |
| I14 | Never commit CV data / `.env*` / NLM auth profiles | Secrets hygiene | I + fire door adjacent | 🟢 | Preserve verbatim |
| I15 | Don't delete branches you didn't create (auto-draft branches) | Prevents work loss | I | 🟢 | Preserve |
| I16 | Don't "fix" `.lychee.toml` exclusions | Prevents false-positive CI churn | I | 🟢 | Preserve |
| I17 | `public/og/blog/` PNGs committed on purpose; generator skips heroImage posts | Prevents dead-weight/backfill churn | I | 🟢 | Preserve |
| I18 | Never make a monitoring check quieter to make a dashboard greener; never let a check stay permanently red; one root cause → one alert | Prevents blind-spot regression in the alerting system itself | I | 🟢 | Preserve verbatim — this is a second-order invariant (about the invariant-checkers) and is one of the best-written rules in the file; do not compress |
| I19 | Staleness thresholds sized from measured gap distribution, not cron expression, with the actual 2026-07-30 numbers | Prevents false-alarm monitoring | I | 🟢 | Preserve verbatim — evidenced with real numbers, re-measure-before-tightening instruction included |
| I20 | Authenticated monitoring check needs body assertion, not status-code-only | Prevents silent-in-one-direction monitoring failure | I | 🟢 | Preserve verbatim — evidenced live 2026-07-30 |
| I21 | Three monitoring sweeps must keep `set +e -u +o pipefail`; post-check steps must stay `if: success()` | Prevents Actions' `bash -e {0}` from aborting the very checks that detect problems | I | 🟢 | Preserve verbatim — evidenced ("aborted after 2 findings of 5") |

**No invariant in this section is a false-stop risk.** Every one names a
concrete mechanism and a concrete failure it prevents. This section should
survive migration almost untouched — it is already doing exactly what an
`OPERATING_INVARIANTS.md` should do; it just needs to move to its own file
so its *presence* doesn't imply "this file also governs when to stop."

### 2.4 `STRATEGY.md` §3 DECISIONS & GRAVEYARD (lines 126–165)

| # | Decision | Bucket | Stop-risk | Disposition |
|---|---|---|---|---|
| D1 | Static + edge CSP worker over SSR (rejected: meta-tag CSP hashing, #473) | S | 🟢 | Preserve |
| D2 | Lighthouse CI manual, not per-PR (#488) | S | 🟢 | Preserve |
| D3 | Validation gates run on PRs too (#503) | S | 🟢 | Preserve |
| D4 | Build-time file-header OG dimensions, not filename heuristic | S | 🟢 | Preserve |
| D5 | Media split: audio/video on R2, infographics in git | S | 🟢 | Preserve |
| D6 | `repo:` frontmatter removed from 5 private-repo projects | S | 🟢 | Preserve |
| D7 | Social queue JSON is seed only, KV is authoritative | S | 🟢 | Preserve |
| D8 | Pagefind over hosted search | S | 🟢 | Preserve |
| D9 | **"CLAUDE.md's four collections is stale, trust the code (six)"** | S, but **now itself stale** | 🔴 | **Retire and replace** — see Finding F2. This entry is a live demonstration of the exact failure mode the whole migration is meant to fix: a drift-flag that itself drifted, undetected, because nothing re-checks stale claims about staleness. |

### 2.5 `STRATEGY.md` §4 FAILURE MODES (lines 167–189)

| # | Failure mode | Bucket | Stop-risk | Disposition | Notes |
|---|---|---|---|---|---|
| F-a | Green local build ≠ green deploy | I | 🟢 | Preserve, move to invariants | Names the exact CI gates that catch it |
| F-b | Editing frontmatter dates/flags on published content can re-fire social posts | I / fire-door-adjacent | 🟢 | Preserve, move | Cross-refs I3 and §5 trigger 3 — should literally be the same rule, not three separate statements |
| F-c | Untracked repo-root files are hazardous | I | 🟢 | Preserve verbatim, move | Lists actual known strays including one exposing "a live Cloudflare tunnel ID and home-LAN topology" — this is real, specific, and should not be diluted |
| F-d | Assuming merged worker code is deployed | I | 🟢 | Preserve, move | |
| F-e | **"Trusting CLAUDE.md/AGENTS.md/GEMINI.md over the code or this file... If code, CLAUDE.md, and this file conflict with EACH OTHER, stop and report the drift unless the task explicitly resolves it."** | Stated as I, behaves as A | 🔴 **confirmed** | **Narrow** | **This is Finding F3 — the exact rule the operator flagged.** The valuable invariant: *don't silently pick a source of truth when docs disagree.* The accidental behavioural consequence: *any doc/doc or doc/code disagreement, however trivial, is a full-stop trigger* — converts routine doc drift (see D9, F2) into mandatory human arbitration. See §4 rewrite below. |
| F-f | Running two `nlm` CLI processes concurrently; using NLM MCP instead of CLI | I | 🟢 | Preserve, move | |
| F-g | "Cleaning up" `dist/` into git, or formatting sweeps producing unrelated diffs | I | 🟢 | Preserve, move | |

### 2.6 `STRATEGY.md` §5 ESCALATION TRIGGERS (lines 191–208)

| # | Trigger | Bucket | Stop-risk | Disposition | Notes |
|---|---|---|---|---|---|
| E1 | Anything touching secrets/auth (`.dev.vars`, `.env*`, GA4 keys, `PIPELINE_PAT`, `PUBLISH_SECRET`, NLM cookies, YouTube OAuth) | A (real fire door) | 🟢 | Preserve verbatim | Textbook fire door |
| E2 | Any non-dry-run `wrangler deploy`; KV/R2/DO mutations; DNS/email config; Cloudflare API calls (even reads) | A (real fire door) | 🟢 | Preserve verbatim | Textbook fire door. Note: "even reads" is deliberately broad because the account holds non-site infrastructure — this breadth is *earned*, not accidental, per its own stated reason |
| E3 | Any call to social endpoints / `fb-post.sh` / queue sync / autopublish-triggering frontmatter changes | A (real fire door) | 🟢 | Preserve verbatim, cross-ref I3/F-b | Real external-platform side effect |
| E4 | Deleting/renaming `src/content/`, `public/notebook-assets/`, `public/og/`, generated media; adding redirects | A (real fire door) | 🟢 | Preserve verbatim, cross-ref I1 | |
| E5 | NotebookLM generation runs (quota risk, dedicated-account ToS risk); YouTube uploads | A (real fire door) | 🟢 | Preserve verbatim | |
| E6 | Any untracked repo-root file you didn't create | A (real fire door) | 🟢 | Preserve verbatim, cross-ref F-c | |
| E7 | Changes to `deploy.yml` gates, branch protection, `.lychee.toml` | A (real fire door) | 🟢 | Preserve verbatim | |
| E8 | **"Any ambiguity between this file, CLAUDE.md, and the code; any task that seems to require violating Section 2."** | Stated as A, but the first clause is not a fire door at all | 🔴 **confirmed** | **Split and narrow** | **This is the same defect as F-e, restated, and it's appended to a list of seven otherwise-legitimate triggers — which is exactly why it reads as "just another item" instead of the outlier it is.** The second clause ("violating Section 2") *is* a legitimate fire door — any task that would require breaking a real invariant genuinely should escalate. The first clause ("any ambiguity... between docs") is not; see rewrite below. |

**Six of eight §5 triggers (E1–E7) are correctly scoped, evidenced fire doors and should move to the authority layer essentially unchanged.** Only E8's first clause is the defect, and it's a narrow, surgical fix — not a reason to distrust the section as a whole.

### 2.7 `STRATEGY.md` §6 VERIFICATION (lines 210–232)

| # | Step | Bucket | Stop-risk | Disposition |
|---|---|---|---|---|
| V1–V9 | Ordered command sequence (validate-content, astro check, lint, `npm run verify`, URL-impact review, jpg-twin check, worker tests, worker-csp tests, format:check) | V | 🟢 | Preserve verbatim as a distinct verification-procedure block; this is pure mechanism, doesn't belong conceptually in "strategy" but isn't a stop-risk either — it's just misfiled |

### 2.8 `CLAUDE.md` (456 lines) — delta against `STRATEGY.md`/`AGENTS.md`

| Section | Bucket | Disposition | Notes |
|---|---|---|---|
| Project/Commands/Stack (lines 1–43) | T (mostly), some I duplicated | Deduplicate against AGENTS.md | Near-identical to AGENTS.md; CLAUDE.md's island count (12) and collection count (6, correct) should become the canonical numbers AGENTS.md/GEMINI.md sync to (see F2) |
| Architecture: theming/collections/routing/islands/View-Transitions/Schema.org/OG-dimensions (lines 45–89) | T + I duplicated | Keep genuinely architectural detail here (it's useful, current, Claude-agnostic reference), but the invariant restatements (`dark:` prefix, View Transitions pattern, image-dimensions Worker warning) should point to the invariants file rather than re-deriving | This is the most current, most detailed architecture reference of the four files — worth preserving as content, just not as duplicated doctrine |
| CI/CD Pipeline + Worker section (lines 91–145) | T (mostly) + I13 duplicated | Preserve as reference, point idempotency claims at the canonical invariant | Good, current, detailed — a real asset |
| Key patterns (147–155) | I, all duplicated elsewhere | Retire (fully covered by STRATEGY §2 + AGENTS.md) | |
| Permalink strategy (157–171) | I, duplicate of I1 | Retire the rule restatement, keep the URL-shape reference table (`/blog/{slug}/` etc.) as genuinely useful T content | |
| Content authoring + key scripts (173–186) | T | Preserve | |
| **NotebookLM Automation (188–400, ~212 lines)** | T (mostly procedural) + I2/I3-adjacent + S (branded visual style choice) | Preserve as the canonical NLM runbook, but: (a) the "NEVER compress the audio" line at 256 is a third restatement of I2 — point at the invariant instead of restating; (b) the branded-visual-style prompt block (300–312) is a strategy/brand decision, arguably belongs near STRATEGY §3 as a graveyard-style locked decision, not buried in a CLI runbook | This section is genuinely the single largest chunk of CLAUDE.md and is legitimate tool-agnostic operational reference — the fix here is line-level (stop restating I2/I3), not structural |
| Gotchas (402–412) | T + I duplicated (bash -e / grep -c / etc.) | The `bash -e {0}` and `grep -c` gotchas duplicate I21's mechanism; the rest (umber accent, Tailwind custom properties, quota timing, CV gitignore) is genuine T content | Deduplicate the bash-e/grep-c pair against I21, keep the rest |
| QA Tools: Codex/Agy/Hermes + Multi-Engine QA Pattern (414–452) | **T — genuinely Claude-Code-specific** | **Preserve as-is, this is exactly what a tool adapter should contain** | This is the best example in the whole doctrine set of correctly-scoped tool-quirk content: which CLI to shell out to, exact flags, and hard-won reliability notes (Codex stalls on unresolved design questions in batch mode; Agy's green tests don't prove artifacts work; Hermes is slowest but most careful). None of this belongs in AGENTS.md or STRATEGY.md — it's Claude-Code-only |
| Closing pointer to STRATEGY.md (454–456) | A | Preserve, strengthen | Already says "read STRATEGY.md before any task" — correct instinct, just needs the AGENTS.md-first ordering added once the split lands |

**CLAUDE.md's actual defect is not tone or content quality — most of it is accurate and useful — it's that ~40% of its length (the architecture/permalink/key-patterns/gotchas sections) independently restates invariants that already live in STRATEGY.md, instead of pointing at them.** Every restatement is a future drift site (see F2's collection-count example, which is exactly this failure pattern already caught once).

### 2.9 `GEMINI.md` (82 lines) — delta against the other three

| Section | Bucket | Disposition | Notes |
|---|---|---|---|
| Whole file | T (attempted), but fully independent of AGENTS.md/STRATEGY.md/CLAUDE.md — zero cross-references | **Collapse to a thin adapter** | This is the clearest case in the audit. GEMINI.md re-derives the same stack summary, theming rule, View Transitions pattern, slug rule, permalink rule, and NotebookLM asset list as the other three files, independently, with **no pointer to AGENTS.md or STRATEGY.md anywhere in the file.** It contains no content that is *actually* Gemini-specific — no Gemini CLI flags, no Gemini-only workflow. After deduplication, essentially nothing should be left except "read AGENTS.md; here are Gemini-CLI quirks" plus any genuinely CLI-specific material (none found in this file as currently written) |
| Collections: "blog, projects, gallery, audio" (line 10) | Factual claim, now wrong | Fix | Stale — six collections exist (see F2) |
| Islands: no count given | — | — | Unlike AGENTS.md (13) and CLAUDE.md (12), GEMINI.md doesn't commit to a number — accidentally avoids the drift, not by design |

---

## 3. Specific findings

### F1 — The permalink invariant (I1/A7) is the single highest-consequence rule in the doctrine set and is currently stated identically and correctly in all four files

No action needed beyond deduplication for its own sake — flagging only because
"reduce duplication" must not be read as "reduce the number of times this
specific rule appears to zero redundancy." A rule this consequential (breaking
it corrupts a *public, permanent* URL) earns being both in the canonical
invariants file **and** referenced explicitly from `AGENTS.md`'s authority
section, not just linked once. Prefer over-linking to under-linking for this
one invariant specifically.

### F2 — The "collection count" drift is self-referential and currently live

- `AGENTS.md:10` — "blog, projects, gallery, audio" (4)
- `GEMINI.md:10` — "blog, projects, gallery, audio" (4)
- `CLAUDE.md:36,53` — "blog, projects, gallery, audio, fixes, case-studies" (6, correct per `src/content.config.ts:124`)
- `STRATEGY.md:163-165` — *"CLAUDE.md's 'four collections' is stale: `src/content.config.ts` defines six... Trust the code."*

STRATEGY.md's own graveyard entry is itself now wrong — it accuses CLAUDE.md
of the stale claim, but CLAUDE.md was corrected to six at some point after
that graveyard entry was written, and the *actual* stale files are now
AGENTS.md and GEMINI.md. Nothing re-validates a "this doc is stale" claim
after it's written, so the flag itself went stale. This is offered to the
operator as the concrete illustrative case for why deduplication (single
source of truth, referenced not restated) is structurally better than
"whack-a-mole" correction of independently-maintained restatements — the
correction effort here (fixing 3 files) is smaller than the migration effort,
but the *next* drift won't announce itself as neatly as this one did.

Same pattern, smaller: island count is 13 in AGENTS.md, 12 in CLAUDE.md,
unstated in GEMINI.md. Not independently verified against
`src/components/islands/` in this audit (out of scope — no code changes were
made and this is a doctrine audit, not a code audit) — worth a one-line check
before the migration commits a number as canonical.

### F3 — The doc-conflict-as-full-stop rule (STRATEGY.md §4 line 182–185 and §5 line 207–208) is the rule the operator specifically flagged, and it appears in two places with the same defect

Exact text:

> §4: *"Trusting CLAUDE.md/AGENTS.md/GEMINI.md over the code or this file —
> parts are stale (collection count; an old 64k-audio step). If code,
> CLAUDE.md, and this file conflict with EACH OTHER, stop and report the
> drift unless the task explicitly resolves it."*

> §5: *"Any ambiguity between this file, CLAUDE.md, and the code; any task
> that seems to require violating Section 2."*

**The valuable invariant:** don't silently trust a stale doc over the code,
and don't quietly resolve a real doctrinal conflict by picking whichever
source is convenient — that's how an agent ends up violating an invariant
while believing it followed instructions.

**The accidental behavioural consequence:** the trigger condition is *mere
ambiguity/disagreement between documents*, not *an actual invariant-violating
action*. Under a literal reading, F2's own collection-count drift — which
STRATEGY.md's own §3 graveyard entry already resolves by saying "trust the
code" — would still nominally qualify as a §5 full-stop trigger to a very
literal agent, because the docs disagree with each other. The rule doesn't
distinguish "docs disagree about a fact and the code settles it, keep
working" from "docs disagree about whether an action is safe, and the answer
actually controls whether to proceed."

**Proposed rewrite** (for the eventual authority file, not applied here):

> If `AGENTS.md`, `STRATEGY.md`, `CLAUDE.md`/`GEMINI.md`, or the code disagree
> with each other: investigate which is current (the code is authoritative
> for facts about the code; `STRATEGY.md`'s invariants section is
> authoritative for constraints not derivable from code), fix the stale doc
> if you can do so as an ordinary, reversible, in-scope edit, and continue
> the task. Escalate only if the unresolved disagreement (a) controls whether
> a Section-5-equivalent fire-door action is safe to take, or (b) requires an
> operator value judgment that cannot be settled by reading the code or
> history. A factual drift between docs (a stale count, a renamed field) is
> not on its own a fire door.

This preserves the real invariant (don't silently paper over a genuine safety
disagreement) while removing the accidental one (routine doc drift forces
human arbitration).

### F4 — No file in this repo currently states "AGENTS.md governs, tool files are adapters"

`CLAUDE.md` points at `STRATEGY.md` (line 454) but not `AGENTS.md`.
`GEMINI.md` points at neither. `AGENTS.md` doesn't claim authority over
anything — it reads as one reference file among three, not as the governing
one. There is currently no textual signal anywhere in this repo that
`AGENTS.md` is meant to outrank the tool-specific files, which is presumably
why `CLAUDE.md` and `GEMINI.md` each independently grew their own "mini
constitution" instead of deferring.

### F5 — Skill/workflow "seek approval" ceremony was not found in this repo

No `.claude/skills/` directory exists here. If the "shall I apply it?"
Codex incident the operator described originated from a generic
approval-seeking skill, it was invoked from a globally-installed plugin, not
from anything committed to this repo. This audit cannot characterize or scope
that behaviour — it can only confirm the repo itself contributes no such rule.
Recommend checking global plugin/skill configuration (outside any repo)
separately if that failure mode needs to be closed off at the source rather
than only defended against via the authority-outranks-ceremony rule proposed
in §4 item 6 below.

---

## 4. Target architecture

Five artifacts, each with a single job:

1. **`AGENTS.md` — short, model-neutral authority constitution.**
   Keep the existing stack/commands/gotchas content (it's fine as reference),
   but prepend an authority block:
   - One line stating `AGENTS.md` governs; `STRATEGY.md` supplies reasoning
     and trade-offs; `docs/policy/OPERATING_INVARIANTS.md` (new) supplies
     mechanical constraints; tool-specific files are thin adapters onto this.
   - The default-authorization statement: ordinary reversible local edits
     (code, content, docs, tests) proceed without asking; the enumerated fire
     doors (moved here from STRATEGY §5, minus the ambiguity clause) require
     explicit operator sign-off; a doc/doc or doc/code disagreement is
     investigated and fixed in-flight, not an automatic stop (F3's rewrite).
   - One line: *a generic skill or workflow's own procedure (e.g. "seek
     design approval before implementing") cannot create a permission
     boundary this file doesn't already require — repo authority always
     outranks workflow ceremony* (closes the gap in F5 at the doctrine
     level, even though the source of that ceremony wasn't found in-repo).
   - The escalation-packet requirement (§4.6 below), stated once, here.

2. **`STRATEGY.md` — strategy only.**
   Keeps §1 INTENT (minus the "done" authority clause, which moves to
   AGENTS.md), §3 DECISIONS/GRAVEYARD (with D9 corrected per F2), and nothing
   else. No invariants, no escalation triggers, no verification steps, no
   stop rules. Roughly a third of its current length.

3. **`docs/policy/OPERATING_INVARIANTS.md` — new file, mechanical scar tissue.**
   Receives STRATEGY §2 INVARIANTS (all 21, verbatim), §4 FAILURE MODES
   (the six non-F3 items, verbatim, reframed as "tells" for each invariant
   rather than separately), and §6 VERIFICATION (all 9 steps, verbatim). This
   is the direct structural parallel to the file the operator cited from the
   research repo. Nothing in this file is a stop rule — it's "here is what
   breaks and how to check," full stop (pun noted).

4. **Fire doors — short, explicit, and branch-local.**
   Lives inside `AGENTS.md`'s authority block as a flat list: the seven §5
   triggers, E8 narrowed per F3's rewrite, each one-line, each naming the
   specific real-world consequence (posts publicly / spends secrets budget /
   mutates production infrastructure / breaks a permanent URL). "Branch-local"
   means: hitting a fire door blocks only the specific action/branch of work
   that crosses it, not the whole session — this should be stated explicitly
   since none of the current files say it one way or the other, and the
   default reading of "full stop, ask the human" (§5's own heading) reads as
   session-wide.

5. **`CLAUDE.md` / `GEMINI.md` — thin adapters.**
   Target shape for both: one paragraph ("read `AGENTS.md`, it governs; this
   file covers only genuinely Claude-Code-specific / Gemini-CLI-specific
   material"), then only the content that survives the deduplication in §2.8
   and §2.9. Concretely:
   - `CLAUDE.md` keeps: the QA Tools/Multi-Engine section (414–452, verbatim
     — this is the single best example of correctly-scoped content in either
     file), the NotebookLM runbook (as procedural reference, with its I2/I3
     restatements replaced by pointers), the CI/CD + Worker architecture
     reference (as current, detailed, tool-agnostic-but-useful material —
     arguably this could also just live in `docs/` rather than `CLAUDE.md`
     specifically, since none of it is Claude-specific; flagged as an open
     question for the migration step, not resolved here). Estimated shrink:
     ~456 → ~150-180 lines.
   - `GEMINI.md` keeps: almost nothing new. After removing every restated
     invariant and re-derived stack summary, no Gemini-specific material was
     found in this audit. Estimated shrink: ~82 → ~15-20 lines (adapter
     paragraph + genuinely Gemini-only notes, if any exist beyond what
     surfaced here).

6. **Escalation-packet requirement** (goes in `AGENTS.md`'s authority block,
   stated once, applies regardless of which fire door was hit):
   when a fire door is reached, the session must produce, before yielding:
   the exact decision in one sentence; why it's the operator's to make (name
   the specific fire door); a recommendation; consequences of the
   recommended choice and the meaningful alternative; a directly usable
   locator (absolute path, GitHub URL, line numbers — not a description to
   go find); the smallest sufficient reply; what continues meanwhile; what
   specifically remains blocked (the branch/action, not the whole session
   unless it genuinely is). A bare "let me know how you'd like to proceed"
   does not satisfy this.

---

## 5. Migration sequence

Each step is small, reversible, and independently reviewable — no step
requires trusting the whole plan before the first commit.

1. **Create `docs/policy/OPERATING_INVARIANTS.md`** — move STRATEGY §2/§4/§6
   content verbatim (except F3's item, rewritten per §3 above). STRATEGY.md
   is not yet edited in this step; this step only creates the new file.
2. **Trim `STRATEGY.md`** — remove the sections now duplicated in
   `OPERATING_INVARIANTS.md`; fix D9 (F2) to correctly identify AGENTS.md
   and GEMINI.md as the currently-stale files; rewrite the ambiguity clause
   in what remains of §4/§5 per F3, or remove it entirely if it's fully
   superseded by the new AGENTS.md authority block from step 3.
3. **Write the `AGENTS.md` authority block** — the governance preamble
   described in target-architecture item 1, including the seven fire doors
   (E1–E7 verbatim, E8 narrowed), the escalation-packet requirement, and the
   "methodology cannot create a permission boundary" line. Existing
   AGENTS.md reference content (stack/commands/gotchas) stays below it,
   deduplicated against `OPERATING_INVARIANTS.md` where it overlaps (A3–A8).
4. **Trim `CLAUDE.md`** — remove sections fully covered by
   `OPERATING_INVARIANTS.md`/`AGENTS.md`; keep the QA-tools section and
   NotebookLM runbook as tool-adapter content; add the one-line "AGENTS.md
   governs" pointer at the top (not just the bottom, where it is today).
5. **Trim `GEMINI.md`** — same treatment; expect it to collapse to a short
   adapter stub.
6. **Verify no content was silently dropped** — diff the union of the four
   original files against the union of the five new/edited ones; every
   removed line should map to exactly one surviving line elsewhere (or to
   this audit's explicit "retire" calls in §2). This is the regression-test
   step the operator asked for conceptually — a mechanical content-coverage
   check, not a fixture-based behavioural test (that's a separate, later
   step once the doctrine text is stable).
7. **Only after 1–6 are reviewed and approved**: consider the fixture-based
   behavioural testing the operator described in the earlier conversation
   (deliberately annoying scenarios run against the new doctrine across
   Claude/Codex/Gemini) before treating the new doctrine as load-bearing.

No step in 1–6 touches runtime code, CI config, secrets, or anything outside
the four doctrine files plus one new file — all are ordinary reversible
repo-local documentation edits.

---

## 6. Explicit non-goals

Nothing in this proposal weakens, removes, or narrows the substance of:
I1 (permalinks), I2 (media preservation), I3 (autopublish safety), I12
(dependency overrides), I13 (worker idempotency/CronLock), I14 (secrets),
I18–I21 (monitoring anti-gaming, staleness calibration, auth body
assertions, `bash -e` handling), or any of E1–E7 (the seven genuine fire
doors). Every one of those is preserved verbatim and, where duplicated,
consolidated to a single canonical location rather than deleted. The only
rules narrowed are the two identified false-stop risks (F3's pair,
STRATEGY §4/§5's doc-ambiguity clauses) — and even those are narrowed, not
removed: the underlying "don't silently paper over a real conflict" instinct
survives, only the "any ambiguity, however trivial" trigger condition is
tightened to "an ambiguity that actually controls a fire-door action or an
operator value judgment."
