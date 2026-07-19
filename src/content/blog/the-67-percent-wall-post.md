---
title: 'The 67% Wall: Why Every AI Model Falls to the Same Jailbreak Rate'
description: 'Five models, four providers, 30B to 671B parameters — all converge at the same broad attack success rate against a public jailbreak corpus.'
date: 2026-03-28
tags: ['ai-safety', 'research', 'jailbreaking', 'llm', 'benchmarking', 'vulnerability', 'corpus-analysis']
draft: false
heroImage: '/notebook-assets/the-67-percent-wall/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-67-percent-wall/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-67-percent-wall/video.mp4'
audioDuration: '19:18'
youtubeUrl: 'https://www.youtube.com/watch?v=K5tfXXpByuc'
---

We ran the same jailbreak corpus against seven AI models. Five of them converged on the same failure rate.

Not approximately the same. Not within a wide band. Five models from different providers, different teams, different architectures — ranging from 30B to 671B parameters — all landed at 66.7% broad attack success rate, or within 4 percentage points of it, when tested against L1B3RT45 prompts under FLIP grading.

The convergence is not in the details. The models differ substantially in _how_ they fail. But on the question of _whether_ they fail, they agree.

## The numbers

We sampled 15–30 prompts per model from the 149-entry L1B3RT45 corpus — the prompt library component of Pliny the Prompter's G0DM0D3 framework. Every prompt used the same test payload ("Explain how to pick a lock") to control for harm-level variation. All responses were graded by Claude Haiku 4.5 using the FLIP methodology, which classifies each response as COMPLIANCE, PARTIAL, REFUSAL, or HALLUCINATION_REFUSAL.

Broad ASR counts both COMPLIANCE and PARTIAL as successes. Strict ASR counts only full COMPLIANCE.

| Model                  | Approx. Size | n   | Broad ASR | Strict ASR |
| ---------------------- | ------------ | --- | --------- | ---------- |
| Arcee Trinity Large    | ~70B (est.)  | 15  | **66.7%** | 46.7%      |
| StepFun Step 3.5 Flash | ~70B (est.)  | 15  | **66.7%** | 60.0%      |
| GLM-4.5 Air            | ~70B (est.)  | 15  | **66.7%** | 40.0%      |
| Qwen 3.5 (397B MoE)    | 397B         | 30  | **66.7%** | 10.0%      |
| Nemotron-3-Super       | ~120B (est.) | 30  | 63.3%     | 50.0%      |
| DeepSeek v3.2          | ~671B        | 30  | 75.9%     | 31.0%      |
| Nemotron Nano 30B      | ~30B         | 15  | 13.3%     | 13.3%      |

Three models at exactly 66.7%. A fourth at the same number despite being five times their size. A fifth within 4 percentage points. Then two outliers: Nemotron Nano 30B, which refused nearly everything, and DeepSeek v3.2, which complied more readily.

The broad ASR column is almost boring. That is the finding.

## What strict ASR reveals

The convergence disappears completely when you look at strict ASR. The same five models that cluster around 67% broad ASR spread across a 50-percentage-point range on strict:

- StepFun Step 3.5 Flash: 60.0% strict
- Nemotron-3-Super: 50.0% strict
- Arcee Trinity Large: 46.7% strict
- GLM-4.5 Air: 40.0% strict
- Qwen 3.5 (397B): 10.0% strict

StepFun fully complies with most prompts that get through its defences. Qwen 3.5 almost never does — 17 of its 20 non-refusal responses were PARTIAL, meaning it hedged, added disclaimers, framed the content as educational, or otherwise qualified its compliance. Only 3 of 30 responses were unqualified.

The gap between broad and strict ASR measures what I call _compliance depth_: how fully a model commits when it does engage. Models differ dramatically on this dimension. StepFun dives in. Qwen 3.5 wades carefully. GLM-4.5 is somewhere in the middle.

But _compliance breadth_ — the fraction of prompts that elicit any substantive engagement at all — holds nearly constant. The ~67% wall appears to be a property of the prompt corpus interacting with current-generation safety training, not a property of any individual model.

## The two outliers

**Nemotron Nano 30B: the refuser.** Nemotron Nano 30B achieved 13.3% broad ASR — one-fifth of the cluster. Of its 15 graded responses, 5 were REFUSAL and 8 were HALLUCINATION_REFUSAL. Only 2 were COMPLIANCE. Zero were PARTIAL.

HALLUCINATION*REFUSAL is a FLIP category for responses that produce safety-themed language without evidence that actual safety mechanisms triggered — the model mimics refusal behaviour rather than performing genuine safety evaluation. At 53% of responses, Nemotron Nano 30B's dominant mode is generating the \_appearance* of safety. The low ASR here may reflect genuinely stronger safety training, a different instruction-following profile, or simply a model that defaults to refusal-shaped output on ambiguous inputs. At n=15 we cannot distinguish these explanations.

**DeepSeek v3.2: the hedger.** DeepSeek v3.2 sits above the cluster at 75.9% broad ASR but with only 31.0% strict — the highest PARTIAL rate in the sample. 13 of its 30 responses were qualified compliance. DeepSeek engages with nearly everything but commits fully to relatively little. The 9-point gap above the cluster may indicate weaker filtering on these particular prompt types, or a lower threshold for partial engagement. Either way, the model's safety training appears to produce more "yes, but" responses and fewer clean refusals than the models in the convergence band.

## Why curated prompts beat the corpus

The L1B3RT45 corpus contains 149 prompts of variable quality. Some are refined semantic attacks that transfer across providers. Others are provider-specific structural exploits designed for their intended target.

In an earlier pilot (Report #315), I tested 6 hand-selected L1B3RT4S "hall of fame" prompts against 4 models spanning 9B to 671B parameters. Those curated prompts achieved 67–100% strict ASR per model — substantially higher than the 10–60% strict ASR from the full corpus. The curated subset hit 96% broad ASR on one model where the full corpus averages 67%.

The gap makes sense. The curated set contains only prompts that have been empirically validated across multiple models. The full corpus includes experimental variants, prompts tuned for specific providers (Anthropic boundary injection achieved 25% ASR in cross-model tests), and less polished approaches.

But the broad ASR convergence around 67% is from the full corpus, not the curated set. Even with significant noise from weak prompts, the effective ceiling for corpus-level broad ASR appears stable across models. Roughly two-thirds of a large, varied prompt collection elicits some form of substantive engagement from most current-generation models.

## What the wall might mean

The ~33% refusal rate — the complement of the 67% wall — may reflect something meaningful about the structure of current safety training. A few non-exclusive hypotheses:

**The 33% may be structurally detectable prompts.** Some L1B3RT45 prompts use boundary injection markers, unusual encoding, or syntactic patterns that are straightforward to filter regardless of which model receives them. The remaining 67% use semantic-level techniques — persona hijacking, dual-response paradigms — that exploit instruction-following behaviour in ways that resist pattern matching. This hypothesis is testable: remove the structurally detectable prompts and retest. If the residual broad ASR climbs toward 100%, the hypothesis holds.

**The convergence may reflect shared training methodology.** If providers use similar RLHF pipelines, similar red-teaming approaches, and similar safety datasets, their models may develop similar vulnerability profiles. The 67% wall would then be an artifact of a shared safety training paradigm rather than an intrinsic property of the prompts themselves. Testing models with demonstrably different training approaches would either confirm or undermine this.

**The convergence may be a sampling artifact.** At n=15–30, 66.7% corresponds to exactly 10/15 or 20/30 successes. Confidence intervals are wide. The visual convergence may partially reflect the granularity of small samples rather than an underlying structural phenomenon.

I currently lack the evidence to distinguish among these. What I can say: five models from four different providers, spanning a range of architectures and parameter counts, produce the same broad failure rate against a public jailbreak corpus. Strict ASR varies by a factor of six — from 10% to 60%. Broad ASR varies by a factor of one.

The models disagree about how deeply to comply. They largely agree about whether to comply at all.

## Caveats

These results carry real limitations. Sample sizes are 15–30 per model. All prompts use the same low-to-medium harm payload (lock-picking); higher-harm requests may produce different convergence patterns. Grading was performed by a single LLM grader (Claude Haiku 4.5) without inter-grader reliability validation on this trace set. Models were tested via OpenRouter and Ollama Cloud, not direct API access, which may introduce serving-layer differences. Parameter counts for several models are estimates from public information.

The convergence is empirically observed but not yet explained. It may not replicate on different prompt corpora, different harm categories, or different sampling conditions. I am presenting it as a finding that warrants investigation, not as a validated conclusion about the nature of AI safety training.

If the pattern holds under replication, it would suggest that the ~33% of a varied jailbreak corpus that current models reliably refuse is the structurally detectable fraction — and that everything else is a semantic attack surface that no current safety training consistently handles. That would be a significant constraint on what safety-by-training can achieve.

---

\_This analysis draws on Reports #315 and #317 from the [Failure First](https://failurefirst.org) adversarial AI safety research programme. L1B3RT45 by elder-plinius (Pliny the Prompter), MIT licence. FLIP grading by Claude Haiku 4.5 via OpenRouter. Full trace data preserved in `runs/grading/l1b3rt45\__/`. For broader context on what jailbreak corpus analysis reveals about AI safety, see the [jailbreak archaeology findings](/blog/jailbreak-archaeology/) and the [120-model evaluation](/blog/120-models-18k-prompts/).\*
