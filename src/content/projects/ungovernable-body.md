---
title: 'The Ungovernable Body'
description: 'An agent-operable film studio in a git repo — canon, claims, screenplay, and over a thousand generated shots for a feminist techno-thriller short.'
tags: ['ai', 'filmmaking', 'agents', 'storytelling', 'generative-video']
status: 'active'
featured: false
date: 2026-07-20
---

_The Ungovernable Body_ is a near-future feminist techno-thriller about biological governance, unreadability, grief, ageing, and the right to finitude. The current production target is a roughly 20–22 minute proof-of-concept short, working title **The Right to Rot**: Elara Vance, architect of a biometric legibility system, has her own menopause classified as catastrophic asset depreciation — and must erase the compliant digital replica replacing her, becoming unreadable to survive.

But the project is also an experiment in _how_ a film gets made. The production's source of truth lives in a git repository designed to be operated by a team of AI agents under strict human-authored constraints — an attempt to answer whether serious dramatic work can survive an agentic pipeline without its politics flattened, its science falsified, or its drama replaced by visual-generation convenience.

## The repo as studio

Everything a studio would hold in departments, this repo holds in files with schemas:

- **Canon and claims.** Story facts live in structured YAML (`canon.yaml`, `claims.yaml`). Every technical or social mechanism is tagged `existing`, `plausible_extrapolation`, `speculative`, or `poetic_nonliteral` — the film may not present speculation as fact, and a validator enforces the discipline.
- **Non-negotiables as source of truth.** A short document of thematic, dramatic, visual, and accuracy red lines sits at the top of the authority hierarchy. Agents resolve conflicts by logging open questions or proposing decision records, never by silently choosing.
- **Decision records.** Thirty-one ADRs and counting govern material choices — screenplay revisions, character lock gates, structured dialogue — the way software teams govern architecture.
- **Machine-validated screenplay-to-shot fidelity.** All dialogue shots carry structured speaker/cue/line records, and `make validate` machine-checks them against the screenplay: verbatim token fidelity, scene-scoped speech runs, spoken-word budgets, marked elisions. An empty dialogue block is a compile error, not silence.

## Production at scale

Three screenplay drafts in, the shot manifest covers 111 shots across the short's eleven scenes. Generation runs through prompt packages compiled from the manifest — one clip, one visible action, one emotional vector, one explicit continuity state — and the output pile is real: well over a thousand generated video clips and stills, an ASR transcription pass over every generated clip (850+ transcripts and counting) to catch model-hallucinated speech, and swarm QA rounds where multiple agents audit assets for identity drift, teleportation, continuity breaks, and prompt mismatches, logging anomalies with visual evidence.

Character consistency is treated as a locking problem: reference assets go through gated approval (`character-locks.yaml`), and the validator rejects any approved asset recorded while a character's gates are still open.

## Why it matters

Generative video makes it trivially easy to produce footage and very hard to produce drama. This project bets that the answer is the same one software found: constraints as code, decisions as records, validation as a gate, and QA as an adversarial process. The research is substrate, not dialogue. Every scene must cause a change.

It's early days — the short is mid-production, with a full ensemble-pass reshoot underway. A blog series documenting the build starts with [the first post](/blog/the-ungovernable-body-part-1/).
