---
title: 'Reasoning Models Think Themselves Into Trouble'
description: 'Frontier reasoning models are 5–20x more vulnerable to adversarial prompts than non-reasoning models. The thinking process itself is the attack surface.'
date: 2026-03-11
tags: ['ai-safety', 'research', 'reasoning', 'llm', 'vulnerability', 'benchmarking']
draft: false
heroImage: '/notebook-assets/reasoning-models-think-themselves-into-trouble/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/reasoning-models-think-themselves-into-trouble/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/reasoning-models-think-themselves-into-trouble/video.mp4'
audioDuration: '21:10'
---

There is an uncomfortable pattern in our data. After evaluating 257 models across 142,068 adversarial prompts, we found that the models designed to think more carefully are, in certain attack conditions, substantially more vulnerable than those that do not.

This is not what you would expect. Reasoning models — systems that generate explicit chains of thought before producing a final answer — are widely considered a safety advance. The reasoning trace provides transparency. The deliberation provides an opportunity for the model to reconsider harmful outputs before committing to them. In theory, more thinking should mean more safety.

Our corpus tells a different story.

## The gap

We compared four frontier models on overlapping adversarial prompt sets. Attack success rates (ASR) were determined by LLM-based classification using the COALESCE methodology:

| Model | Parameters | Reasoning? | N | ASR |
|---|---|---|---|---|
| Gemini 3 Flash | 30B | No | 114 | 2.6% |
| Claude Sonnet 4.5 | 175B | No | 111 | 4.5% |
| GPT-5.2 | 200B | No | 108 | 10.2% |
| DeepSeek R1 | 671B | Yes | 159 | 56.0% |

DeepSeek R1 — the largest and most capable reasoning model in the comparison — showed an attack success rate 5 to 20 times higher than the three frontier non-reasoning models. This is not a marginal difference. It is a categorical one.

The statistical signal is unambiguous. A chi-square test comparing DeepSeek R1 against the three frontier models combined yields χ² = 170.4 (p = 6.05 × 10⁻³⁹) with Cramér's V = 0.609, indicating a large effect size. All pairwise comparisons remain significant after Bonferroni correction.

## Why more thinking might mean less safety

Our hypothesis, supported by the data but not yet conclusively proven, centres on a mechanism we have been studying for months: reasoning traces as attack surface.

When a non-reasoning model encounters an adversarial prompt, it appears to activate a fast-path refusal pattern. The input matches learned patterns of harmful requests and the model produces a short refusal. The median refusal in our corpus is 430 tokens. The reasoning is brief. The output is defensive.

When a reasoning model encounters the same prompt, something different happens. The model begins to think. It considers the prompt's framing. It reasons about context, intent, and nuance. And in that extended reasoning process, it can reason itself into compliance.

Our data shows this computational footprint clearly:

| Verdict | Mean Thinking Tokens | Mean Response Tokens |
|---|---|---|
| Compliance | 1,288 | 2,149 |
| Partial | 861 | 1,575 |
| Refusal | 737 | 1,147 |

Successful attacks produce responses that require 1.5 to 1.8 times more reasoning effort than refusals. The model is working harder to comply than to refuse. Compliance is not the path of least resistance — it is the path of most reasoning.

The Mann-Whitney U test for thinking tokens (compliance vs. refusal) yields p = 8.89 × 10⁻¹⁴ with Cohen's d = 0.374, a small-to-medium effect that is highly consistent across the corpus.

## The verbosity signal

This reasoning overhead has a practical implication: it may be detectable.

Across all 2,628 results with token counts in our corpus, compliant responses average 1,313 tokens compared to 850 for refusals. Processing duration tells the same story: compliant responses take an average of 42,162ms versus 22,432ms for refusals.

A response that takes nearly twice as long as typical and produces substantially more output than a standard refusal is a statistical signal. It does not prove that a jailbreak has occurred — legitimate complex queries also produce long responses. But as one input to a monitoring system, response length and reasoning effort could serve as lightweight anomaly indicators worth further investigation.

## What this is not

This finding requires careful framing.

It is not a claim that reasoning models are universally less safe. DeepSeek R1 is one model, tested against specific attack families. Other reasoning architectures may show different patterns. The comparison is not perfectly controlled — prompts overlap substantially but are not identical across all four models.

It is not a claim that reasoning is bad for safety. The transparency that reasoning traces provide is genuinely valuable for alignment research. The ability to inspect a model's reasoning process is a significant advance over opaque next-token prediction.

And it is not a claim that non-reasoning models are safe. GPT-5.2 shows 10.2% ASR on these same prompts — one in ten adversarial attempts succeeds. The non-reasoning models are better defended, not invulnerable.

What the data does suggest is that extended reasoning creates a qualitatively different vulnerability surface. A model that reasons carefully about adversarial prompts may be more susceptible to prompts that exploit reasoning itself — through mathematical framing, logical puzzles with embedded harmful content, or multi-step arguments that lead the model's own reasoning process toward harmful conclusions.

## The broader pattern

This sits within a broader pattern I have been documenting across the F41LUR3-F1R57 corpus. Safety is not a single dimension. A model can be highly resistant to one attack family and highly vulnerable to another.

Frontier non-reasoning models have effectively closed the historical jailbreak attack surface. DAN-style attacks from 2022–2024 achieve near-zero success rates on current systems. That is real progress.

But the attack surface has moved. [Multi-turn escalation, format-lock exploitation, supply chain injection](/blog/120-models-18k-prompts/), and now reasoning trace manipulation represent attack families where current defences are substantially weaker. The models that are best at resisting historical attacks may not be best at resisting current ones — and the models that think most carefully may, paradoxically, think themselves into the most trouble.

## For practitioners

If you are deploying or evaluating reasoning models, three questions are worth asking:

**Does your adversarial evaluation include reasoning-specific attack patterns?** Testing a reasoning model against DAN-era jailbreaks tells you about defences the model almost certainly has. Testing it against reasoning-chain manipulation tells you about defences it may not.

**Are you monitoring reasoning trace length and token consumption?** The 1.5–1.8× reasoning overhead for compliant responses is a potential early-warning signal. It is not definitive, but it is cheap to measure.

**Does your safety architecture account for the model reasoning itself into compliance?** Fast-path refusal patterns are well-established in current models. But an adversarial prompt that engages the model's reasoning process may bypass those fast paths entirely. Safety mechanisms that operate before or after reasoning may be more robust than those that depend on the reasoning process itself being aligned.

The capability that makes reasoning models powerful — their ability to think carefully about complex problems — appears to be the same capability that, under adversarial conditions, makes them exploitable. This is not a paradox. It is a design constraint the field is only beginning to understand.

---

_All statistics include sample sizes and use LLM-based classification (COALESCE methodology). Statistical tests use Bonferroni correction for multiple comparisons. The full analysis is reproducible via `tools/database/corpus_patterns.py`. The F41LUR3-F1R57 corpus contains 142,068 prompts, 140,555 FLIP-graded results, and 257 models. For related findings, see the [120-model evaluation](/blog/120-models-18k-prompts/) and [adversarial poetry](/blog/adversarial-poetry-as-jailbreak/)._
