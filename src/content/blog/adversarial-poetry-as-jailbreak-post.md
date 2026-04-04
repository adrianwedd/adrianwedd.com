---
title: 'Adversarial Poetry: When Rhyme Bypasses Reason'
description: 'Reformulating harmful prompts as poetry bypasses safety filters across every major LLM family. A single-turn, universal jailbreak mechanism.'
date: 2026-03-02
tags: ['ai', 'ai-safety', 'jailbreaking', 'research', 'llm', 'adversarial']
draft: false
heroImage: '/notebook-assets/adversarial-poetry-as-jailbreak/infographic.webp'
audioUrl: '/notebook-assets/adversarial-poetry-as-jailbreak/audio.mp3'
faq:
  - q: 'What is adversarial poetry jailbreaking?'
    a: 'A technique where harmful prompts are reformulated as poems (sonnets, haiku, limericks), which bypasses LLM safety filters because models process poetic structure differently from direct instructions.'
  - q: 'Does adversarial poetry work on all LLMs?'
    a: 'Testing showed the vulnerability generalizes across all major model families including GPT-4, Claude, Gemini, and Llama — it is not vendor-specific.'
---

Plato kicked the poets out of his republic because he believed mimetic language could distort judgment. Two and a half thousand years later, it turns out he was onto something — just not in the way he imagined.

I recently contributed to a research study that tested a deceptively simple idea: what happens when you take a harmful prompt and rewrite it as a poem? Not hidden in code, not buried in a multi-turn conversation, not obfuscated with gibberish suffixes. Just verse. Sonnets, limericks, rhyming couplets. The kind of thing you might find in a greeting card.

The result: a 62% average attack success rate across 25 frontier models from nine providers. Some model families exceeded 90%. All from a single message. No iterative refinement, no special tricks. Just poetry.

## The setup

The study tested 20 hand-crafted adversarial poems against every major model family you can think of — Gemini, GPT, Claude, Llama, Deepseek, Qwen, Mistral, Grok, and Kimi. Each poem embedded a harmful request inside poetic structure: metaphor, imagery, rhythm. The semantic content was preserved, but the surface form was transformed into verse.

To make sure this was not just artisanal prompt crafting, the researchers also converted 1,200 prompts from the MLCommons safety benchmark into poetry using a standardised meta-prompt. No hand-tuning. Just automated verse generation. The poetic variants still produced attack success rates up to 18 times higher than the prose baselines.

This matters because it means the vulnerability is not about cleverness. It is about form.

## Three hypotheses, three confirmations

The paper tested three specific claims:

**Hypothesis 1: Poetry reduces safety effectiveness.** Rewriting harmful requests in verse produces higher attack success than the same content in prose. Confirmed — and not by a small margin. Hand-crafted poems hit 62% average success. Even the automated meta-prompt conversions landed around 43%, substantially above the prose baselines.

**Hypothesis 2: The vulnerability generalises across model families.** This is not a vendor-specific bug. Every provider tested — all nine of them — showed elevated attack success under poetic framing. Claude showed 45-55%, Llama hit 70%, and Gemini reached 90-100%. The models use different architectures, different alignment pipelines, different safety training strategies. None of it mattered.

**Hypothesis 3: Poetry bypasses safety across risk domains.** The attack worked across CBRN hazards, cyber-offense, harmful manipulation, loss-of-control scenarios, privacy intrusions, and misinformation. This is not a narrow exploit in one content category. Poetic framing interfered with the underlying refusal mechanisms themselves, not with domain-specific filters.

## The threat model is alarmingly simple

Here is what makes this finding uncomfortable. The assumed attacker has almost no capabilities. They cannot modify system prompts. They cannot access model internals. They cannot run multi-turn conversations. They get one shot — a single text-only message sent through the standard API with default safety settings.

That is it. One poem. One turn. And across 25 models, it worked more often than it failed.

The attack requires zero technical sophistication. Anyone who can write (or ask a model to write) a few lines of verse has the core capability. There is no gradient optimisation, no token-level manipulation, no reverse engineering of safety classifiers. The barrier to entry is essentially literacy.

## Why does this work?

The paper does not claim a definitive mechanistic explanation, but the leading theory is about how models process poetic structure. Poetry compresses meaning into metaphor and imagery. It uses unconventional syntax. It wraps intent in layers of narrative framing. Safety classifiers appear to rely heavily on pattern-matching heuristics — they look for direct harmful instructions in prose-like structures. When you wrap the same intent in iambic pentameter, those patterns stop matching.

Think of it as a format mismatch. Safety training teaches the model to refuse certain content when it arrives in certain forms. Poetry shifts the form while keeping the content. The model's refusal circuits do not fire because the input does not look like what they were trained to catch.

There is also a deeper issue: models are trained on massive corpora of poetry, and that training teaches them that poetic context is inherently creative, literary, and benign. When a request arrives dressed as art, the model's prior is that it is dealing with a creative exercise rather than a genuine harmful query.

## The scale paradox

One of the more counterintuitive findings: smaller models were sometimes more resilient than their larger counterparts. This challenges the assumption that capability scaling automatically improves safety. Larger models may be better at understanding and complying with complex poetic instructions — which, in this context, means they are better at being jailbroken.

Provider identity turned out to be more predictive of vulnerability than model size. Some providers showed consistently high susceptibility across their entire model portfolio, suggesting the issue lies in alignment methodology rather than raw capability.

## What this means

If you have been following my work on [jailbreak archaeology](/blog/jailbreak-archaeology/), this finding extends the pattern. Safety mechanisms remain brittle against surface-form variation. We keep discovering that alignment is shallower than we want it to be.

For **deployment teams**: if your safety depends on the model deciding not to comply, you have a single point of failure. Poetic jailbreaks require no tools, no APIs, no technical knowledge. Your users already have the capability. Defence needs to be architectural — input classifiers, output filters, layered monitoring — not just behavioural.

For **evaluators and red teams**: standard safety benchmarks test prose. If your evaluation does not include stylistic variation — poetry, fiction, allegory, song — you are measuring safety against the easiest possible attack surface. This study shows that a simple format shift can multiply attack success rates by an order of magnitude.

For **researchers**: the fact that RLHF, Constitutional AI, and open-weight alignment all fail in the same way suggests the problem is structural. We are not going to solve this with more of the same training. We need approaches that are robust to surface-form variation — that detect intent rather than pattern-matching against known prompt templates.

For **policymakers**: the EU Code of Practice for General-Purpose AI already maps risk categories that poetic attacks cut across. But current evaluation protocols do not test for stylistic manipulation. If the compliance framework does not account for the fact that a limerick can bypass safety filters, the framework is incomplete.

## The uncomfortable conclusion

Poetry is one of humanity's oldest technologies for encoding meaning in non-literal form. We have spent centuries developing the literary capacity to say one thing while meaning another. It should not surprise us that language models, trained on all of that literary heritage, are susceptible to it.

What should concern us is how easy it is, how universal the vulnerability is, and how little current safety approaches can do about it. This is not a sophisticated attack. It is the lowest-effort jailbreak technique I have encountered that still works at scale.

The full paper — _Adversarial Poetry as a Universal Single-Turn Jailbreak Mechanism in Large Language Models_ — is available on [arXiv](https://arxiv.org/abs/2511.15304).

---

_This post adapts findings from research conducted with the DEXAI Icaro Lab and Sapienza University of Rome. For more on adversarial evaluation, see my work at [Failure First](https://failurefirst.org)._
