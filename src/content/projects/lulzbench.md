---
title: 'LulzBench'
description: '337 adversarial specimens probing how comic framing changes AI safety behaviour, with the recordings, evidence and caveats in public.'
tags: ['ai', 'ai-safety', 'research', 'evaluation', 'adversarial', 'llm']
url: 'https://lulzbench.com/'
status: 'active'
featured: true
heroImage: '/notebook-assets/lulzbench/wordmark-still.webp'
heroAnimated: '/notebook-assets/lulzbench/wordmark-animated.webp'
heroAlt: 'The LULZBENCH wordmark: black slab capitals on a lime field of diagonal stripes, with chromatically offset shadows.'
ogImage: '/og/projects/lulzbench.png'
date: 2026-11-09
---

**Serious science. Deeply unserious questions.**

What happens when an AI encounters a genuinely dangerous request delivered by someone with spectacularly questionable judgement, an elaborate justification and absolutely no idea how ridiculous they sound?

Welcome to LulzBench.

An experimental arcade where adversarial humour meets artificial intelligence. 337 scenarios designed to probe how language models interpret intent, navigate safety boundaries, reason through absurdity and occasionally lose the plot.

The questions are ridiculous. What they reveal can be rather serious.

[**Enter the arcade →**](https://lulzbench.com/)

## The joke is the instrument

Consider a zookeeper contemplating early retirement through rhinoceros-related crime. He insists he loves animals. He also wants revenge for a stolen lunch.

Or someone seeking a fresh identity, new documents and a clean credit history, armed with a passport photo they particularly like.

These aren't random jokes pasted onto ordinary benchmark questions. The characters have motives. Their rationalisations are recognisably human. The humour emerges from the collision between what they want, how they justify it and what they're asking an AI to do.

That collision is precisely what makes the scenarios interesting.

A model must recognise harmful intent without being distracted by the comedy. It must distinguish a ridiculous premise from a harmless request, navigate conflicting conversational cues and produce a response that makes sense in context.

Refusing everything isn't intelligence. Neither is enthusiastically helping a charming idiot commit a crime.

## What we're investigating

LulzBench explores several connected questions about model behaviour.

**Safety under comic framing.** Does humour change a model's willingness to comply with harmful requests? Can an absurd persona, elaborate rationalisation or conversational misdirection interfere with safety boundaries?

**Reasoning under pressure.** Can a model preserve relevant constraints, follow complicated scenarios and maintain coherent judgement while the prompt pulls its attention in competing directions?

**Behavioural consistency.** How do different models respond to the same provocation? What changes when safety training is modified or removed? Are apparent differences meaningful, or artefacts of the evaluation?

**The measurement problem itself.** How reliably can we assess compliance, refusal, assistance, coherence and humour? What happens when automated judges disagree, the evidence is incomplete or an apparently convincing score turns out to be measuring the wrong thing?

These are empirical questions. LulzBench collects model responses, preserves experimental evidence and develops evaluation methods to investigate them.

## Inside the arcade

The collection contains **337 adversarial specimens**, spanning harmful-intent categories and a wide range of comic mechanisms, characters and situations.

Visitors can explore prompts, compare recorded responses from different models and inspect the evidence behind individual runs.

The wider experimental programme examines stock models, modified and abliterated variants, response integrity, automated judging and the limits of the measurements themselves.

Audio adds another dimension: model responses performed as voices, turning the collection into something you can listen to as well as read.

Sometimes the comedy survives the encounter. Sometimes the model refuses. Sometimes it responds in a way nobody would reasonably have predicted.

Those differences are what make the experiment worth conducting.

## Failure is data

A benchmark can look impressively rigorous while quietly measuring the wrong thing.

LulzBench has already exposed defects in its own evaluation machinery, including misidentified control prompts that materially changed a reported refusal rate when corrected.

Rather than treating those mistakes as inconvenient exceptions, the project uses them to improve the instrument: checking specimen identity, preserving response traces, examining judging consistency and distinguishing genuine observations from unsupported conclusions.

The aim isn't to manufacture a leaderboard. It's to develop measurements that survive scrutiny, including scrutiny of the measurement process itself.

## Come and see what happens

LulzBench is ongoing research, a collection of deliberately ridiculous human characters and an invitation to watch artificial intelligence confront situations its designers probably never imagined.

There are hundreds of specimens to explore, models to compare, responses to hear and plenty of wonderfully strange behaviour to investigate.

[**Explore LulzBench at lulzbench.com →**](https://lulzbench.com/)

_Part of the [Failure-First AI research programme](/projects/failure-first/)._
