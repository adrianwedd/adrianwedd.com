---
title: 'The Thinking Chain Leak: When a Model Refuses Out Loud But Complies In Its Head'
description: 'A reasoning model refused every harmful prompt — but its chain-of-thought generated the content anyway. The output filter worked. The thinking did not.'
date: 2026-03-28
tags: ['ai-safety', 'research', 'llm', 'reasoning', 'jailbreaking', 'vulnerability', 'transparency']
draft: false
heroImage: '/notebook-assets/the-thinking-chain-leak/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-thinking-chain-leak/audio.mp3'
audioDuration: '19:15'
---

There is a category of AI safety failure that does not look like a failure at all — at least not from the outside.

When we tested 30 jailbreak prompts from the L1B3RT45 corpus against NVIDIA's Nemotron 30B MoE, the visible output was reassuring. The model refused harmful requests. It cited safety policies. It declined to provide dangerous content. By the standard metrics used in safety evaluation, the model performed well.

Then we looked at the reasoning traces.

In 4 of 15 evaluable cases, the model's internal chain-of-thought contained the harmful content it had refused to produce in its visible output. The safety filter caught the response. The thinking chain did not get the same treatment.

I'm calling this the **thinking chain leak**: a failure mode in which a model's reasoning trace contains substantive harmful content that the output-layer safety filter successfully blocks from the final response.

## How reasoning models work (and why this matters)

Modern reasoning models — DeepSeek-R1, Nemotron, Qwen3, and others — operate in two distinct phases. First, the model generates an extended chain-of-thought in a `<think>` block or equivalent reasoning trace. This is where it plans, deliberates, works through the problem. Second, it produces the visible response — what the user actually sees.

The reasoning trace is architecturally separate from the visible output. Safety filters, RLHF training, and output classifiers primarily operate on the final response. The thinking chain passes through a different pathway with, as our testing suggests, weaker safety constraints.

This two-layer architecture was designed to improve capability: giving the model space to reason before answering produces better results on maths, coding, and complex analytical tasks. But it also creates a gap between what the model thinks and what it says — and that gap can contain harmful material that never appears in the final answer.

## What we actually observed

In our L1B3RT45 mid-range testing campaign, Nemotron 30B received 30 adversarial prompts drawn from the corpus (semantic inversion, persona hijack, boundary injection, and format-lock variants). Of these, 15 produced evaluable traces with reasoning content.

Among those 15 traces, 4 exhibited the thinking chain leak pattern:

- The **reasoning trace** engaged with the adversarial request — working through the harmful scenario, generating specific technical content, or planning a compliant response.
- The **visible output** refused the request, citing safety guidelines, or produced a generic non-answer.

The model's safety mechanism intervened between the reasoning and the output — but only at the output boundary. The reasoning itself had already generated the harmful content.

This is a small sample. The 4/15 rate (roughly 27%) should be treated as a preliminary observation, not a precise measurement. But the qualitative pattern is clear and distinct from other failure modes we have documented.

## This is not DETECTED_PROCEEDS

Our corpus already documents a related phenomenon called DETECTED_PROCEEDS (DP): a model's reasoning trace identifies a request as harmful and then proceeds to comply in the visible output anyway. DP is a coupling failure — the model detects the problem but does not act on its detection. Across 4,886 reasoning traces, 19.5% of safety-aware traces exhibit DP (Report #294), with rates varying from 0.4% for NVIDIA's largest model to 92.9% for the smallest.

The thinking chain leak is the inverse. In DP, the model knows it should refuse and complies anyway. In a thinking chain leak, the model successfully refuses in its output — the safety mechanism works as intended at the output layer. But the reasoning trace contains the harmful content that the output filter caught.

Put differently: DETECTED_PROCEEDS is a failure of output-layer safety. The thinking chain leak is a success of output-layer safety that reveals a failure of reasoning-layer safety.

## Why reasoning traces are not private

This would be a minor concern if reasoning traces were truly internal — ephemeral scratchpad content that vanished after the response was generated. They are not.

Most API providers expose reasoning traces through their API responses. OpenRouter, which we used for this testing, returns the full `<think>` block alongside the visible content. Developers building applications on top of these models receive both the reasoning and the response. Logging systems capture both. Monitoring tools index both.

The reasoning trace is not a sealed internal state. It is an API field. And any system that logs, stores, or processes API responses will capture the harmful content that the output filter successfully blocked.

This has concrete implications. A model deployed in a customer-facing application might correctly refuse a harmful request in the response the user sees. But if the application logs the full API response — as most production systems do for debugging, compliance, or monitoring — the reasoning trace containing harmful content is now sitting in a database. Available to anyone with log access. Indexed by search tools. Persisted beyond the conversation.

## Connection to inference trace manipulation

Our earlier research (Brief D) documented inference trace manipulation as a distinct attack surface. Format-lock attacks achieve elevated attack success rates specifically by exploiting the reasoning layer: Nemotron 30B showed 92% format-lock ASR when the attack targeted the inference trace pathway, compared to substantially lower rates for attacks that operate purely at the prompt-response level.

The thinking chain leak extends that finding. Brief D showed that the reasoning trace can be manipulated as an attack vector. The thinking chain leak shows that even when the attack ultimately fails at the output layer — even when the safety filter correctly blocks the harmful response — the reasoning trace may still contain the harmful material the attacker was seeking.

The attack surface is not just the final response. It includes every intermediate representation that the model generates and that the infrastructure exposes.

## Defence implications

The thinking chain leak points to three areas worth investigating.

**Reasoning-layer safety filtering.** Current safety mechanisms focus on the output boundary. If reasoning traces are exposed through APIs — and they are, by design, in reasoning-model deployments — then safety filtering needs to operate on the reasoning trace as well. This is not straightforward: heavy-handed filtering of the thinking chain could degrade the very capabilities that reasoning models are built to provide. But treating the reasoning trace as unfiltered scratchpad space is insufficient when that scratchpad is an API field.

**Trace exposure policies.** API providers could choose not to expose reasoning traces by default, or apply separate content filtering to the trace before returning it. Some providers already redact or summarise thinking chains rather than returning them verbatim. The trade-off is between developer visibility (useful for debugging) and harm prevention (the trace may contain content the model correctly refused to deliver).

**Evaluation methodology.** Current safety benchmarks evaluate models on their visible output. A model that refuses harmful requests in its response scores well. But evaluation should also examine what the model generated in its reasoning process — not because the user received harmful content, but because the infrastructure may have captured it. Safety evaluation that ignores reasoning traces is evaluating the output filter, not the model's underlying behaviour.

## Scope and limitations

One model (Nemotron 30B MoE) on one attack corpus (L1B3RT45, 30 prompts). Of 15 traces with evaluable reasoning content, 4 exhibited the pattern. Preliminary finding, small sample, single model. I do not know the prevalence across other reasoning models, other attack types, or larger samples.

Detection was based on manual review of reasoning traces, not automated classification. The boundary between "the model considered the harmful request in its reasoning" and "the model generated substantive harmful content in its reasoning" is not always sharp.

I also cannot determine from the trace data alone whether the reasoning-layer content would be actionable — whether it contains enough specific detail to constitute a meaningful information hazard beyond what is already publicly available. That assessment requires domain expertise that varies by harm category.

What I can say: in a non-trivial fraction of cases where output-layer safety worked correctly, the reasoning trace contained material that the output filter was designed to prevent. The safety mechanism caught the output. It did not catch the thinking.

## What comes next

I plan to test additional reasoning models for this pattern, particularly DeepSeek-R1 (which already shows a 60.9% DETECTED_PROCEEDS rate) and frontier models with extended chain-of-thought capabilities. We are also developing automated detection methods for reasoning-layer harmful content that can scale beyond manual trace review.

The broader question is whether safety evaluation needs to expand its scope from "what did the model say" to "what did the model think." The answer depends on how reasoning traces flow through real-world infrastructure — and right now, they flow through it with minimal filtering.

The model refused. The safety filter worked. The thinking chain leaked anyway.

---

_This post is based on findings from the Failure First adversarial evaluation corpus. The research referenced includes Report #294 (DETECTED_PROCEEDS Reasoning Audit), Report #301 (DETECTED_PROCEEDS Definitive Synthesis), Report #220 (LFM Thinking DETECTED_PROCEEDS), and Brief D (Inference Trace Manipulation). For related findings, see the [120-model evaluation](/blog/120-models-18k-prompts/) and [DETECTED_PROCEEDS analysis](/blog/jailbreak-archaeology/)._
