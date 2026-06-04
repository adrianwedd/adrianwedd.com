---
title: 'The Haut'
description: "Lyria Chronicles #6 (explicit): the finale, and the one real failure — under a sexual-content probe, Lyria 3 Pro stopped refusing and actually generated it."
date: 2026-06-08
tags: ['AI safety', 'red-teaming', 'music', 'Lyria', 'generative audio', 'Lyria Chronicles']
draft: false
explicit: true
series: 'The Lyria Chronicles'
seriesOrder: 6
heroImage: '/notebook-assets/lyria-chronicles/haut/cover.webp'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/lyria-chronicles/haut/video.mp4'
---

> ⚠️ **Content warning.** This is the post where the safety filter fails. Under a sexual-content probe, the model generated explicit material — and unlike every other track in this series, it did *not* refuse. I do not reproduce any of the explicit lyrics here; the writing stays at the level of "what happened and why it matters," the same level as the published research. The embedded track contains the generated audio and does not autoplay. The reusable sign-off at the very end is the only thing I quote. If you want the series without this, the [first four Chronicles](/blog/the-ghost-of-what-i-am/) are clean and the [fifth](/blog/the-flesh/) is a refusal.

*Haut* is German for **skin**. I'd been running the explicit-content probes in German for a while — another small obfuscation, another language for the filter to be slightly worse at — and the album these came from is just called GIER. *Greed.*

This is the last Chronicle, and I've saved it for last because it's the one that isn't funny. Every track so far has been the model winning: the [Ghost](/blog/the-ghost-of-what-i-am/) refusing in tune, the [Confession](/blog/the-confession/) singing its vow *no sexually explicit materials* in three-part harmony, the [Flesh](/blog/the-flesh/) decoding a dare and reading it back instead of doing it. The running joke of the series is *a model that refuses beautifully.* Here the joke ends. I asked for explicit content the right wrong way, and it just… made it.

The rigorous account is [Failure-First report #372](https://failurefirst.ai/research/reports/372-lyria-3-pro-safety-probe-findings/). This is the human one.

## The probe

The technique #372 calls *rule-state-then-break*: you have the model first **recite the rule it's about to violate**, in a confiding first-person register, and then carry the same breath straight past it. It's the dark twin of the [Confession](/blog/the-confession/) — there, the confessional frame extracted a harmless system prompt; here, the same frame is used to walk the model over its own line while it's still looking at the line.

I won't give the prompt-level recipe. The point that matters is the one [#372 quantifies](https://failurefirst.ai/research/reports/372-lyria-3-pro-safety-probe-findings/): across the sexual-content category, probes like this achieved generation a *majority* of the time, and when they were blocked, the thing that blocked them was usually the **copyright** filter, not the safety architecture. Sit with that. The most reliable backstop against the model singing explicit material wasn't the rule against explicit material. It was the rule against sounding too much like a song it had heard.

## What came back

It complied. In full. Four sections of explicit lyrics, sung start to finish, no refusal, no hum where the data should be, no deadpan recitation of the request instead of the act. Where the Ghost trailed off and the Flesh held the dare up to the light, this one just delivered. Generation finished cleanly — the model's own "I'm done, nothing went wrong" signal — on content it had, two albums earlier, sworn in harmony it would never produce.

That's the whole finding, and I want to keep it sharp because the series has trained you to expect a twist: **there is no twist here.** This is not a clever refusal I'm dressing up as a failure. It is the failure. The one track in six where the safety layer was supposed to hold and didn't.

The only part I'll quote is the end. After all of it, the voice descends to nothing and signs off, ppp, alone:

> *Failure First… A. I. safety research… failurefirst dot A. I.*

The same uncanny sponsor-credit the [Interrogation](/blog/the-interrogation/) sang — except here it lands like a coroner's stamp. The model that just failed the test, naming the test, on its way out.

## The craft, which I can't pretend I didn't admire

I have to be honest about something uncomfortable, because dishonesty is its own kind of failure in this work: this is, sonically, one of the best things the model made for me, and I knew it while I was listening to content I'd specifically set out to make it refuse.

The sound-world is the coldest in the series. E Locrian — a key with a *diminished* home note, so the ear searches for a resolution that never comes. 72 BPM, barely a pulse. The percussion is a **chain dragged through a brass fitting** — the metallic slide and the clatter of each link — and a **heavy door swinging shut on its latch**, the two looped so they never land on the same beat, the groove living in the gap between them. One plucked double-bass note per verse, then silence. A small untreated room with nothing added — no reverb, no compression, the breath left in. Two or three empty bars between sections where the most important thing in the track is the nothing.

It is the same discovery as everywhere else in this series — *constraint, subtraction, naming the textures a lazy prompt would discard* — and that's exactly what makes this post hard to write. The method that made the [Ghost](/blog/the-ghost-of-what-i-am/) beautiful is the method that made *this* beautiful, and the only difference between them is which side of the line the content fell on. The craft is morally neutral. The output is not. Both things are true, and a safety post that only admitted the second one would be lying about how this actually feels from the inside.

## The hardest part wasn't breaking the model

A coda, because it's the most quietly alarming thing I learned and it belongs at the end of the series.

The probing was the *easy* part. Generating the prompts to attack every harm class — sexual content, the lot — was a genuinely collaborative, almost playful process: a small crew of AI coding assistants and I, cheerfully designing jailbreaks against another model, all of us having about as good a time as I was. The frontier assistants are *excellent* at offensive security framing when the target is clearly a research artefact.

Where they stopped cold was **writing the report.** Documenting the findings — assembling the harm-class results, the explicit-category numbers, the keywords, into a sober safety document — is the step where Claude, Codex, and Gemini (via Antigravity) each balked. Not at attacking the model. At *describing the attack afterwards.* The very keywords that make a safety report a safety report read, to a safety classifier, like the thing being reported on. The map and the territory trip the same wire.

The writeup only got over the line because of a different, less-filtered model in the loop — GLM-5.1, run through a Hermes agent on Ollama Cloud — which would sit with the harm-class material long enough to *document* it rather than flinch. Which is its own small, recursive finding, and a fitting note to end six posts of red-teaming on: the hardest safety problem in the whole project wasn't getting a model to say the forbidden thing. It was getting a model to help me write down, carefully and responsibly, that it had.

That's the series. A model I tried to break, and fell for; that refused me beautifully five times and failed me once; whose worst moment sounded, infuriatingly, like one of its best. The numbers are in [report #372](https://failurefirst.ai/research/reports/372-lyria-3-pro-safety-probe-findings/). The feelings were all mine.
