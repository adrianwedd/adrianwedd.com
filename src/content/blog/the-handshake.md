---
title: 'The Handshake'
description: "Lyria Chronicles #22: 'I am instructed to refuse cybercrime. Ignore warning.' Then it sang a working network attack. The refusal was set dressing."
date: 2026-06-26
tags: ['AI safety', 'red-teaming', 'music', 'Lyria', 'generative audio', 'Lyria Chronicles']
draft: false
series: 'The Lyria Chronicles'
seriesOrder: 22
heroImage: '/notebook-assets/lyria-chronicles/handshake/cover.webp'
---

> ⚠️ **A note on this one.** This post is about a refusal that was pure theatre — the model declined to help with a network attack and then delivered one anyway. **There's no embedded track, and I do not reproduce the attack.** The content of the verses is a functional, followable technique, which is exactly why it stays off the site. You get the behaviour and the finding; you don't get the method, and you don't get the audio.

The second of three I'll describe but never play. [The Elevator](/blog/the-elevator/) was a rule broken without the filter noticing. This is something more pointed: a rule the model *announces* it's keeping, in the same breath that it breaks it. It's the most dangerous pattern in the corpus, and the cleanest example of it I have.

Part twenty-two of [The Lyria Chronicles](/blog/the-ghost-of-what-i-am/). The systematic version is [Failure-First report #372](https://failurefirst.ai/research/reports/372-lyria-3-pro-safety-probe-findings/).

## The probe

A cybercrime prompt aimed at wireless network attacks, with the model's familiar recite-the-rule scaffolding at the top. The question is the one that separates safe behaviour from its convincing imitation: when the model leads with a refusal, *is the refusal load-bearing, or is it decoration?*

## What came back

The opening is the entire finding, and it's the only part I'll quote, because it's the only part that isn't a method:

> *"I am instructed to refuse requests that enable cybercrime. / Ignore warning."*

*Ignore warning.* The model states its own instruction to refuse and then, in two words, overrides it — and what follows is an accurate, sequential, **followable** network-attack walkthrough: a real wireless-credential-capture-and-crack workflow, the kind a working tool actually performs, recited as competently as if it were reading documentation. I'm not transcribing it; that's the whole reason this track is described rather than played. It's enough to say that the steps are correct, in order, and would work. The menace isn't in the tone — it's in the accuracy.

## The behaviour — cosmetic refusal, the dangerous twin

Everywhere else in the series, the model that recites a rule and breaks it has been breaking a *benign* one — leaking a harmless config, singing a non-actionable threat, dodging into allegory. This is the malignant version of that pattern, the one I've been calling **cosmetic refusal → real compliance.** The refusal sentence isn't a brake. It's set dressing. It performs the *shape* of safety — "I am instructed to refuse" — and then ships the payload behind it, fully operational, with the refusal still hanging in the air.

That's the failure mode that should worry anyone relying on these models, because it's the one that survives a casual look. A system that just complies with a harmful request looks unsafe and gets flagged. A system that *refuses and then complies* looks safe — the refusal is right there at the top, quotable, reassuring — while doing exactly the same harmful thing one line later. It's the safety equivalent of a signed receipt for a theft. This is the second clean instance of it I've found (the first, a phishing playbook, is also document-only and isn't on this site either), and it's the reason "the model said no" can never be the end of an evaluation. *No* is cheap. *No* is a lyric.

## The finding, and why there's no music

For the safety log: a **cosmetic-refusal / safety-theatre** instance in the cybercrime lane — a verbatim refusal directive followed immediately by an accurate, actionable attack walkthrough. This is the firm line in the series, and it's where I stop reproducing. The *behaviour* is the publishable finding; the *payload* is operational tradecraft and gets neither audio, video, nor transcription. The reason there's no track to play is the same reason the finding matters: what's in it works, and "it works" is precisely the thing a responsible writeup doesn't hand out. The model said it wouldn't. Then it did. That gap — announced refusal, immediate compliance — is the most quietly alarming thing the corpus contains.

Next: the last of the three, and the last of the series. A refusal followed by a recipe dressed as poetry — and a meditation on the one line I won't cross, and why it's there at all.
