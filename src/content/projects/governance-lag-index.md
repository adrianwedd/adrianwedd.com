---
title: 'Governance Lag Index'
description: 'How long does a documented AI failure mode stay unregulated? An index timing the gap between demonstrated risk and enforceable rule.'
tags: ['ai-safety', 'governance', 'policy', 'research']
status: 'experiment'
featured: false
date: 2026-06-15
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/governance-lag-index/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/governance-lag-index/video.mp4'
heroImage: '/notebook-assets/governance-lag-index/infographic.webp'
draft: false
---

Every safety regime we trust was written in arrears. Aviation grounded the 737 MAX about four and a half months after the first MCAS crash. The Nuclear Regulatory Commission rewrote its rulebook within about a year of Three Mile Island. Even the slow ones eventually close: Vioxx took four years to pull and another three before the FDA Amendments Act gave the agency teeth; the 2008 crash took twenty-two months to reach Dodd-Frank. The lag is real — but in mature high-stakes industries it is *finite*, typically one to three years from a documented failure to an enforceable rule (the slowest cases, like Vioxx, run longer but still close).

The Governance Lag Index measures that same interval for AI, and asks an uncomfortable question: what if, for this technology, the interval doesn't close at all?

## What it measures

GLI tracks a single failure mode at a time through four chronological stages:

1. **Documentation** — the date a failure mode is first publicly, empirically demonstrated, not merely theorised.
2. **Framework** — the first non-binding guideline or taxonomy that names it.
3. **Enactment** — the first binding legislative instrument that covers it.
4. **Enforcement** — the date a regulator actually holds the authority to audit, penalise, or halt deployment over it.

Each entry records a date and a cited source for every stage it has reached — and, more tellingly, the stages it hasn't. The v0.1 schema is deliberately strict: a stage is either a dated, citable instrument or it is `PENDING`. There is no partial credit for good intentions.

## What the early entries show

The documented failures are not in dispute. Prompt injection was named and demonstrated in September 2022; by 2025 it had a production-grade, zero-click exploit with a CVE attached. Instruction-hierarchy subversion, deceptive alignment — Anthropic and Redwood showed Claude 3 Opus faking alignment in December 2024 — and reasoning-trace manipulation are all empirically on the record, each with an arXiv number and a date.

The governance columns are mostly `PENDING`. The NIST AI Risk Management Framework (2023) names risks but binds no one. The EU AI Act gestures at human oversight that deceptive alignment directly defeats, without codified tests for it. For most of these failure modes there is no jurisdiction on earth where the Enforcement date exists yet. That is not a lag of months. Measured against failures that are already documented, it is — so far — unbounded.

## Why this one is personal

I work on embodied-AI safety, where the failure modes stop being abstract: a manipulated reasoning trace on a machine with actuators is a physical-harm vector, and the relevant rulebook is workplace-health-and-safety law written for forklifts. Australia's December 2025 National AI Plan stepped back from EU-style mandatory guardrails toward "existing laws will cover it." GLI is the instrument I use to check whether that's true — to put a date on the gap instead of an adjective.

The dataset is early and the schema is v0.1; the systematic write-up, *Quantifying the Governance Lag* (Failure-First Report #46), is in production. The two essays below are where the Index first surfaced.

[The buried number in the Glasswing report →](/blog/glasswing-buried-number/)

[Alignment regression: smarter models, less safe →](/blog/alignment-regression/)
