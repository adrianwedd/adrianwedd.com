# Common-mode mutation-plane failure during gated release completion

**Date:** 2026-09-05 (AEST) · **Release:** Astro 6 → 7 migration, PR #657 / controller #586
**Impact:** zero to the site. The release stalled ~90 minutes short of completion and
required a human to restart it. No code, data, or evidence was lost.

## Summary

An autonomous release run completed the hard part of an Astro 6 → 7 migration —
implementation, CI, Lighthouse A/B, browser verification across eight migrated
templates — and then could not perform the boring last 5%: merge, observe the
deploy, run the nightly E2E suite, dispatch QA, smoke production, file the receipt.

The proximate cause was a model-backed gate on tool calls returning
`glm-5.3:cloud is temporarily unavailable`. The interesting part is not the
outage. It is that the outage took out _every_ mutating capability at once,
while leaving reasoning and reads entirely intact.

## What failed and what did not

Observed during the outage, from the run's own record:

| Still worked                                   | Gated                         |
| ---------------------------------------------- | ----------------------------- |
| Read-only Bash                                 | `kill` (any process signal)   |
| Workspace git: `add`, `commit`, `push`         | `npm run …` (any script)      |
| Prose edits to files the session already owned | Creating a new file (`Write`) |
| Playwright MCP (browser drive)                 | GitHub MCP writes             |
| All reasoning, planning, evidence assembly     | `CronCreate` (scheduling)     |

That right-hand column is five mechanisms that share no obvious implementation:
a POSIX signal, a package-manager subprocess, a filesystem create, a remote HTTP
API write, and a scheduler. They are advertised as independent surfaces. They
were not. One unavailable model took all five.

Note what this cut set actually is: it is not "dangerous things". `git push`
mutates a remote and was allowed; `kill` on a process the session itself started
was not. The boundary tracks _which classifier path the call happened to take_,
not the risk of the call — which is why it was invisible until it failed.

## Why the run's response was inadequate

1. **It exhausted retries instead of circuit-breaking.** After the second or
   third independent surface returned the same signature, the remaining retry
   budget had close to zero information value. The correct inference — "this is
   one shared dependency, not five flaky tools" — was available early and was
   not drawn.
2. **The durable record was weak for the transaction it was protecting.** The
   handoff went to agent memory plus two files in `/tmp`. Both happened to
   survive, which is luck, not design: `/tmp` is volatile and memory is not
   inspectable by anyone but the next agent. A release in flight deserves a
   repository-visible or otherwise machine-verifiable continuation record.
3. **It did not attempt a route around.** `git push` was working. A push to the
   branch was available the whole time. Whether that is enough to advance a
   merge-gated release is arguable, but it was not tried or reasoned about.
4. **The failure boundary was named, not understood.** "Classifier outage"
   describes the symptom. It does not explain why unrelated mutation mechanisms
   share a fatal gate, and so does not tell the next run how to route around it.

What it did do correctly: it stopped rather than improvising, it preserved
every piece of evidence it had produced, and it wrote a resume sequence precise
enough that the next run needed no archaeology. That is the difference between a
stall and an incident.

## Recovery, measured

The follow-up session (2026-09-05, this document's session) found the mutation
plane fully healthy and resumed at exactly the documented step. Elapsed from
first command to production verified: under 30 minutes, no reimplementation.

It also surfaced one thing the stall had hidden: `npm run test:e2e:full` — the
step the outage blocked — failed 6/24 on first run. All six were
`mobile-chromium`, all in the new `vt-idempotence.spec.ts`, all clicking header
nav links that are `hidden md:flex` and therefore never visible at the Pixel 5
viewport. A test defect, not a migration regression, and one
`playwright.config.ts:38-41` already warned about in a comment. Fixed in #660
(24/24). Worth recording: the blocked step was the one carrying the finding.

## The design principle

> **Reasoning availability and execution availability must fail independently.
> And execution surfaces advertised as independent must not share one fatal gate.**

## Implied changes

1. **Remove the common mode.** Mutating surfaces should not all terminate at a
   single model-backed classifier. At minimum, classify by call _class_ with
   static rules for the cases that do not need a model (signalling a process the
   session started; running a package script already on the allowlist).
2. **Circuit-break on shared signature.** Two or more distinct surfaces
   returning the same upstream-unavailable signature within a short window
   should trip a breaker and stop spending retries immediately.
3. **A first-class resumable release transaction.** Checkpoints written to a
   durable, externally-inspectable location — a repo file, a PR comment, an
   issue — not to agent memory. Memory is convenience; it is not the log.
4. **A bounded fallback executor.** For mutations _already authorised_ by the
   run's standing envelope, a static-rule path that does not depend on the
   classifier being reachable.

## Open question, to answer before designing any of the above

Which layer owned the gate that failed? The error names `glm-5.3:cloud`, a model
reachable through Hermes' zai provider, but this document does not establish
whether the gate lived in Hermes' tool layer, in a harness permission
classifier configured to that model, or in a router in front of both. The cut
set above is the evidence; the owner is not yet identified. Every remedy in the
previous section is scoped to a layer, so this is the first thing to nail down —
and it is exactly the gap that "classifier outage" papers over.

## Receipts

- Migration PR: [#657](https://github.com/adrianwedd/adrianwedd.com/pull/657) → merged as `9c75104`
- Deploy: `deploy.yml` run on `9c75104`, success; `github-pages` deployment `9c75104`
- Production: live `/_astro/` chunk hash matches the local Astro 7.3.1 build; per-request CSP nonce matches header to body; 10/10 key URLs 200
- E2E fix: [#660](https://github.com/adrianwedd/adrianwedd.com/pull/660)
- Full receipt: `docs/receipts/astro7-migration-2026-09-05.md`
