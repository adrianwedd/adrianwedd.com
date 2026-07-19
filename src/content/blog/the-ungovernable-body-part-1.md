---
title: 'A Film Studio in a Git Repo'
description: 'Building The Ungovernable Body: can an agent-operated repository make a real film without flattening its politics? Part 1 of a production diary.'
date: 2026-07-20
tags: ['ai', 'filmmaking', 'agents', 'storytelling', 'generative-video']
series: 'The Ungovernable Body'
seriesOrder: 1
updatedDate: 2026-07-21
---

I'm making a film in a git repository.

I'd been sitting with this world for over a year — the research dossier, the characters, drafts of the screenplay — the way you sit with something you assume will stay on the shelf, because films are things other people with other budgets get to make. Then one day recently the thought arrived fully formed: _I can probably just make a film now._ The tools had crossed a line while I wasn't looking. I love that feeling — doing a thing that was flatly impossible the last time I seriously considered it. Imagine next year.

So: not the marketing materials for a film, not a pipeline demo — the film itself: a roughly 20-minute proof-of-concept short called _The Right to Rot_, the seed of a limited series titled _The Ungovernable Body_. It's a near-future feminist techno-thriller about biological governance and the right to finitude. Elara Vance, the architect of a citywide biometric legibility system, has her own menopause classified as catastrophic asset depreciation. To survive, she has to erase the compliant digital replica the state prefers to her — and become unreadable.

The story is about a body that refuses to be reduced to its data. The production method, with no irony lost on me, is a repository full of structured data operated by AI agents. Holding those two things honestly against each other is most of the work, and it's why I'm writing this series.

## The problem with generative filmmaking

Generative video tools have made footage nearly free and drama no cheaper at all. You can produce an infinite pile of beautiful, incoherent clips: characters whose faces drift between shots, props that teleport, scenes that look like cinema but don't _cause_ anything. The failure mode isn't ugliness — it's a film-shaped object with no story load-bearing anywhere in it.

Software engineering hit a version of this problem when code generation got cheap, and its answer wasn't better prompts. It was constraints as code, decisions as records, validation as a gate, and adversarial review. So that's the bet: treat the film like a system under test.

## What's actually in the repo

The repository is designed so that any agent — or any human — can pick up a task and produce work that survives contact with the rest of the production:

- **Non-negotiables at the top of the authority stack.** A single short document of thematic, dramatic, visual, and accuracy red lines. "The body is not a faulty copy of its data." "No generic neon cyberpunk." "Aging is neither punishment nor magical enlightenment." When sources conflict, agents must log the conflict or propose a decision — never silently pick a side.
- **Claims discipline.** Every technical or social mechanism in the story is registered and tagged: `existing`, `plausible_extrapolation`, `speculative`, or `poetic_nonliteral`. The film about surveillance doesn't get to lie about how surveillance works. A prohibited-language scanner backs this up — the script may not claim, for instance, that coordinated inactivity literally overheats servers.
- **Decision records.** Twenty-three ADRs so far, run exactly like architecture decision records: character lock gates, structured dialogue, screenplay revisions, reshoot designs. The decision log is the memory that keeps every agent session from quietly making a different film.
- **A screenplay the machine can check.** Every dialogue shot carries structured speaker/cue/line records, and the validator checks them against the screenplay draft: verbatim token fidelity, speech runs scoped to their scenes, marked elisions in order, a spoken-word budget per second of footage. An empty dialogue block is a compile error.

## One clip, one action

The generation rule that has earned its keep more than any other: **one Flow clip = one visible action**, with one emotional vector and an explicit continuity state. Multi-beat prompts are where generative video goes to die — the model averages the beats into mush. The shot manifest currently holds 111 shots across the short's eleven scenes, each compiled into a prompt package that states what changes on screen and what must not.

Continuity is handled the way software handles state: character reference assets are gated behind lock files, and the validator rejects any reference asset recorded as approved while a character's locks were still open — generation itself stays operator discipline, but the record can't lie. When the pile of generated media grew past a thousand files, QA became a swarm — multiple agents auditing clips and stills for identity drift, teleportation, hallucinated UI text — and an ASR pass transcribed 649 clips to catch the model quietly inventing dialogue that was never written.

## Early days

I want to be clear about where this is: mid-production, third screenplay draft, a full ensemble-pass reshoot in flight, and a salvage ledger that admits most of an early generation wave didn't pass. The interesting result so far isn't the footage. It's that the discipline holds — that agents operating under a constitution of non-negotiables, claims tags, and machine validation produce work that stays _one_ film.

Whether that film is any good is the question the rest of this series has to answer. Next up: before more scaffolding, a look at the world itself — the near-future the film is set in, and how a 25,000-word novelization draft became something you can explore from every angle.

[Project page →](/projects/ungovernable-body/) · [Production site →](https://ungovernable-body.wedd.au/)
