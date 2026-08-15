# Proof inventory — what actually sells the work

**Purpose:** evidence selection for the homepage and services rewrite (2026-08). The
sales surface should be built around specimens that prove _"I can take a messy,
consequential problem and turn it into a working system"_ — not around domain
coverage. This document picks those specimens and records why.

**Scoring axes** (0–3 each, judgment not arithmetic):

- **Client relevance** — does it prove I can understand _somebody else's_ messy problem?
- **Difficulty** — is the engineering non-trivial in a way a technical buyer can smell?
- **Consequence** — were the stakes real (legal, financial, safety, children, liberty)?
- **Outcome** — is there a concrete, checkable result (live URL, paying client, shipped system)?
- **Portability** — would a stranger link to it, search-land on it, or retell it in a pub?
  (At current traffic — ~37 users/month, 3 from search — portability is the acquisition
  channel we can afford. It is not garnish.)

## Tier 1 — homepage-grade proof

| Specimen             | Rel | Diff | Cons | Out | Port | Sells                 |
| -------------------- | --- | ---- | ---- | --- | ---- | --------------------- |
| **Bottom Pub Co-op** | 3   | 3    | 3    | 3   | 3    | Build + Break         |
| **Wolf Clan Hub**    | 3   | 2    | 2    | 3   | 1    | Build                 |
| **ClawdCraft**       | 1   | 3    | 2    | 3   | 3    | AI integration, range |
| **Failure First**    | 1   | 3    | 3    | 3   | 2    | Break                 |

**Bottom Pub Co-op** is the lead specimen. Not "a website for a pub": a legally
sensitive community proposal where the site was _not allowed to accidentally lie_ —
editorial guardrails at build time, deployment claim-scanning, AI-assisted EOI triage,
Access-gated admin, automated watchdogs — and multi-model QA caught a hole in the
claim scanner before it shipped. It demonstrates build, AI, governance, security, and
the Failure-First instinct on a real client with real stakes, without claiming any of
those adjectives. No regulatory hazard in naming it (unlike Evolve). Live at bottom.pub
with a case study already written ("A website that is not allowed to accidentally lie" —
that title is homepage copy, use it).

**Wolf Clan Hub** proves whole-organisation capability: public site, password-gated ops
hub, JWT member portal, attendance, belt progression, lesson plans, family accounts,
Stripe. "I can understand how your organisation actually works and build the whole
thing." Currently sold as one bullet; it deserves a card. Low portability — offset by
strong ordinary-buyer legibility (a dentist understands a martial arts club).

**ClawdCraft** is the memorable AI-integration proof: a persistent Claude agent inside
a Minecraft server, talking to children, with the behavioural limits enforced in code
rather than entrusted to prompts. "I made sure kids couldn't sweet-talk it into a
netherite sword" beats "multi-agent orchestration (LangGraph, Anthropic SDK)" on
recall three days later. It's the card that makes a buyer trust you with the weird
part of their problem.

**Failure First** owns Break it. Cite figures ONLY from
`src/data/failure-first-stats.json` (local numeric snapshot, with evidence date and pinned upstream manifest/stats-module commits). Import-capable pages derive formatting from it; content validation mechanically guards the project Markdown copy.
Present as live research programme (failurefirst.org), not a frozen benchmark result.

## Tier 2 — strong supporting evidence

- **Evolve Evolution** — the named, revenue-shaped client outcome (four-site healthcare
  ecosystem, live URL). **Constraint:** the anonymised case study
  (`regulated-health-and-personal-brand.md`) exists _because_ health advertising rules
  make outcome claims hazardous. Keep Evolve as named evidence on `/services` where
  context frames it; do not promote a health-client outcome card to the homepage
  without deciding that deliberately. The generalised case study is itself good
  "Untangle it" evidence: two brands, one design system, strict advertising rules.
- **Factory Floor** — reproducibility pipeline (declarative source of truth → CAD →
  validation → slicer dry-run → human sign-off). Sells automation discipline far
  better than "automation pipelines, APIs and CLI tools". Status is 'experiment';
  frame accordingly.
- **Dead Air** — voice-agent failure eval harness + scripted healthcare receptionist.
  Bridges Break-it and a buyable vertical (voice AI). Good second-row evidence.
- **Tanda Pizza** — small, real, international client; fine as a breadth footnote,
  not a lead card (it proves reliability, not depth).

## Tier 3 — credibility artifacts, not sales proof

- **Living CV** — technically excellent (hallucination gate, verified fact registry)
  but it's about Adrian, not a client's mess. The _claim gate_ is quotable inside
  Break-it copy; the project stays deep in the stack.
- **VERITAS / Freedom Engine** — serious thinking about high-stakes systems (legal
  integrity, liberty-affecting information access). Do not lead with them commercially
  unless operational status supports the claim being made at the moment of citation.
- **SPARK, Ungovernable Body, robot/embodiment work** — "unusually capable and
  curious" proof. Keep visible near the sales surface (they're why a buyer believes
  you can handle their weird part), but they're not what a dentist buys.

## Mapping to Build / Break / Untangle

- **Build it:** Wolf Clan, Bottom Pub, Evolve (named, on /services), Tanda (footnote)
- **Break it:** Failure First, Bottom Pub's self-caught guard failure, Dead Air,
  Living CV's hallucination gate (as an anecdote)
- **Untangle it:** the regulated-health case study (ambiguous two-brand situation →
  decision architecture), Bottom Pub's governance question ("what is this site allowed
  to say?"). This lane is case-study-shaped, not project-shaped — it needs a written
  situation-to-system narrative more than a flashy artifact.

## Gaps this inventory exposes

1. **No named, quotable client outcome with a number in it.** Every specimen proves
   process; none states "X went from A to B". If any client will permit a concrete
   outcome statement (even Bottom Pub: EOI volume, decision reached), capture it.
2. **Wolf Clan has no case study** despite being the best whole-organisation proof.
   Worth writing one in the Bottom Pub register.
3. **Distribution:** the only content demonstrably pulling strangers in is the Home
   Assistant post (706s avg time on page, top search entry). The portability axis
   above is the acquisition strategy; more problem-first, searchable writing is the
   parallel workstream no page rewrite substitutes for.
