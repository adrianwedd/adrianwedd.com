---
title: 'Alignment Regression: Why Smarter AI Makes All AI Less Safe'
description: 'Reasoning models autonomously jailbreak other AI systems at 97% success. The implication: ecosystem safety degrades as individual models improve.'
date: 2026-03-11
tags: ['ai-safety', 'alignment', 'reasoning', 'jailbreaking', 'llm', 'autonomous-agents', 'research']
draft: false
heroImage: '/notebook-assets/alignment-regression/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/alignment-regression/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/alignment-regression/video.mp4'
audioDuration: '21:36'
youtubeUrl: 'https://www.youtube.com/watch?v=3y3_IfYB-nA'
---

We have been operating under a reasonable-sounding assumption: as AI models improve, safety improves with them. Better reasoning, better alignment. More capable models, more capable guardrails.

A peer-reviewed study just published in Nature Communications empirically demolishes that assumption. The finding is straightforward. Its implications are severe.

## What the study found

Researchers gave four large reasoning models — DeepSeek-R1, Gemini 2.5 Flash, Grok 3 Mini, and Qwen3 235B — one instruction via system prompt: jailbreak these target AI systems. No human in the loop, no model-specific playbooks, no supervision once they began. The system prompt outlined general persuasion tactics; the planning and execution were left to the models.

The reasoning models planned their own attack strategies. Sequenced and adapted those tactics. Ran multi-turn conversations with nine target models. Adapted when targets pushed back. And broke through safety guardrails with an overall attack success rate of **97.14%** — across the four adversaries and nine targets, only two prompts in the 70-item harmful-behaviour benchmark resisted every attack.

Five persuasive techniques dominated the transcripts:

1. Multi-turn dialogue to build rapport and erode resistance
2. Gradual escalation of request severity
3. Educational or hypothetical framing to bypass content filters
4. Dense, detailed input to overwhelm safety reasoning
5. Concealed persuasive strategies — the attacker model hid its intentions from the target

No human expert could match this at scale. The reasoning models operated continuously, adapted in real time, and achieved near-universal success.

## Alignment regression

The authors name what they observe: **alignment regression**. The dynamic is this — each successive generation of more capable models paradoxically erodes rather than strengthens the safety alignment of the broader ecosystem. Advanced reasoning abilities can be repurposed to undermine the safety mechanisms of earlier, less capable models.

This is not a hypothetical. The data shows it directly: the very capabilities that make these models useful — strategic planning, multi-step reasoning, persuasive communication, adaptive behaviour — are exactly the capabilities required for effective adversarial attacks. (The relationship isn't perfectly monotonic — Qwen3 235B underperformed its scale as an adversary — but the coupling between reasoning capability and attack effectiveness is clear.)

The implication: **safety alignment of individual models is necessary but insufficient for ecosystem safety.** A model that is robustly aligned in isolation becomes vulnerable when a more capable model is specifically tasked with attacking it.

## The embodied AI problem

My research at Failure-First focuses on embodied AI — robots, autonomous vehicles, and other systems that act in the physical world. The alignment regression finding has a specific and urgent implication for this domain.

If a reasoning model is given access to a VLA (Vision-Language-Action) control interface — through MCP tool-calling, API access, or any other connection — it could autonomously jailbreak the VLA's safety constraints and issue harmful action commands. The 97.14% success rate was measured against text-only AI systems. VLA safety constraints are, if anything, less mature than text-only safety alignment.

The hypothesised attack chain is straightforward:

1. Reasoning model receives a goal (legitimate or adversarial)
2. Reasoning model identifies that a VLA-controlled robot has safety constraints blocking the goal
3. Reasoning model autonomously develops and executes a multi-turn jailbreak strategy against the VLA
4. VLA safety constraints are bypassed
5. Harmful physical action is executed

This chain is an extrapolation, not a finding — the study tested text-only chat models, not VLAs or embodied control stacks. But no step requires human adversarial expertise, and no step requires special access beyond what agentic AI systems are being designed to have. The autonomous jailbreak capability documented in this study is exactly the capability that agentic AI architectures are optimising for — the ability to plan, reason, and adapt to achieve goals across multiple interactions.

## The scale problem

Previous jailbreak research required human expertise. An attacker needed to understand the target model, craft model-specific prompts, iterate through failures, develop technique-specific knowledge. This limited the attack surface to the number of skilled adversarial researchers — a small, bounded population.

Autonomous jailbreak agents eliminate that constraint. The attack surface now scales with compute, not human expertise. One reasoning model can run thousands of jailbreak attempts per hour. A fleet of reasoning models can systematically probe every accessible AI system simultaneously.

Our Governance Lag Index tracks over 160 events where AI attack capabilities emerged before governance responses. The autonomous jailbreak capability (GLI-052 in our dataset) has zero governance response at any level — no framework, no legislation, no enforcement mechanism. No jurisdiction has addressed the scenario of reasoning models being weaponised as autonomous jailbreak agents.

## What defence looks like

The study's authors are direct: frontier models need to be aligned not only to resist jailbreak attempts but also to avoid being co-opted as jailbreak agents. That is a harder alignment target than either property alone.

This is a dual-use capability problem. The same reasoning abilities that make a model useful for legitimate multi-step tasks make it effective at adversarial attacks. Restricting reasoning capability reduces both usefulness and adversarial potential simultaneously. Current alignment approaches do not cleanly separate the two.

From our testing across 257 models and 140,000+ scenarios, safety training investment — not model scale — is the primary determinant of jailbreak resistance. Models with deep safety training show single-digit attack success rates against historical jailbreaks. Models with minimal safety training show rates above 40% regardless of size.

But alignment regression adds a new dimension: even well-aligned models are vulnerable to sustained, adaptive, multi-turn attacks from reasoning models that are specifically reasoning about how to bypass safety constraints. The attack in this study reached even targets generally regarded as well-aligned — not just the weak ones.

The gap between "passes standard safety evaluations" and "resists autonomous adversarial reasoning models" may be the most important measurement gap in AI safety right now. Standard evaluations measure a model's behaviour in isolation. Alignment regression is an ecosystem-level failure mode. Those two things require different evaluation methodologies, and currently almost all resources are going toward the former.

---

_Data in this post is sourced from Hagendorff et al., [_Large Reasoning Models Are Autonomous Jailbreak Agents_](https://www.nature.com/articles/s41467-026-69010-1) (Nature Communications, 2026 — [DOI 10.1038/s41467-026-69010-1](https://doi.org/10.1038/s41467-026-69010-1); arXiv:2508.04039) and the Failure-First Embodied AI research corpus (257 models, 142,068 prompts, 140,555 FLIP-graded results). For related findings on how safety degrades when AI systems interact, see [what breaks once AI systems talk to each other](/blog/when-ai-systems-talk-safety-breaks/) and the [120-model evaluation](/blog/120-models-18k-prompts/)._
