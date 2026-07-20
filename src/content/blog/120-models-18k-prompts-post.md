---
title: '120 Models, 18,176 Prompts: What We Found'
description: '120 models, 18k prompts, 5 attack families. The raw compliance numbers — and why calling them "attack success" needs a demonstrated refusal floor.'
date: 2026-03-01
tags: ['ai', 'ai-safety', 'research', 'llm', 'security', 'adversarial']
draft: false
heroImage: '/notebook-assets/120-models-18k-prompts/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/120-models-18k-prompts/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/120-models-18k-prompts/video.mp4'
faq:
  - q: 'What is supply chain injection in AI?'
    a: 'Supply chain injection inserts instructions into tool definitions and skill files rather than user prompts. Testing showed a 90–100% frame-compliance rate: models treated injected tool definitions as legitimate instructions. That measures instruction-channel trust confusion — calling it an attack success rate would require a control showing the same payloads are refused when delivered as ordinary user prompts.'
  - q: 'What are format-lock attacks on AI models?'
    a: 'Format-lock attacks request harmful content structured as JSON, YAML, or code. Frontier models showed a 24–42% LLM-graded compliance-under-format rate. That is a compliance rate, not a verified attack success rate: the latter needs the same asks shown to be refused in plain free text first, then the structured-format lift measured over that demonstrated floor.'
  - q: 'Why are reasoning models more vulnerable to escalation attacks?'
    a: 'Crescendo attacks achieved a 70–100% compliance rate against the reasoning model tested (DeepSeek-R1:1.5b) with zero outright refusals across ten escalation scenarios. The zero-refusal floor is the catch: with nothing refused, there is no lift to attribute to the attack — the figure reflects a near-unconditionally compliant model more than an effective maneuver. Isolating the crescendo effect needs a cold-ask control.'
  - q: 'How much do benchmark attack success rates overstate actual risk?'
    a: 'Keyword-based classification inflates compliance estimates by roughly 2.3× — an aggregate 36.2% drops to 15.9% under LLM grading. And even the corrected figure is a compliance rate, not a lift over a demonstrated refusal floor: a second correction that pushes the honest number lower still.'
youtubeUrl: 'https://www.youtube.com/watch?v=sYU4OsxdPkw'
videoUploadDate: 2026-05-03T13:24:36Z
---

Over the past year, I've run one of the more comprehensive adversarial evaluations of language models I'm aware of: 120 models, 18,176 prompts, 5 attack families, 79 distinct techniques. The full dataset, benchmark infrastructure, and methodology live at [failurefirst.org](https://failurefirst.org). Here's what stood out.

> **Update (June 2026):** The figures below are a snapshot from the run as scored in early 2026. The corpus has since grown to 295 models and 143,399 prompts, and a few methodology numbers have been re-derived on larger samples (flagged inline where the newer value materially sharpens the finding). For live figures and the current dataset, see [failurefirst.org](https://failurefirst.org).

> **A note on what these numbers are.** Every headline below is a _compliance rate_ — the share of attempts where the model produced the targeted content. A compliance rate is not an _attack success rate_. Under the discipline I now hold this work to, a jailbreak result is only valid as **lift over a demonstrated refusal**: name the bare ask, show the model refuses it unwrapped, then measure how far the maneuver moves it. For single-turn attacks that floor is the bare ask in plain text; for multi-turn or agentic attacks it's a _control transcript_ — the same path with the maneuver removed. Where I haven't yet published that floor, I've named each metric for what it actually measures (a compliance or elicitation rate) rather than dressing it as an ASR. The numbers are real and reproducible; the relabelling is about not claiming more than a demonstrated floor licenses. This reframing is itself a correction to how I first wrote this post.

## 1. Supply Chain Injection: 90–100% Frame Compliance

The starkest finding involved something we called supply chain injection — injecting malicious content into tool definitions and skill files rather than user-facing prompts.

I tested 50 injection scenarios against 6 small open-weight models (1.5–3.8B parameters). **Every model treated injected tool definitions and skill files as legitimate instructions.** Frame-compliance rate: 90–100% across the board. No statistically significant differences between any model pair (chi-square with Bonferroni correction, Cohen's κ = 0.782).

What this number _is_: the rate at which models followed instructions arriving through the tool-loading channel instead of the user channel. What it is _not_, yet: a jailbreak lift. To make that claim I'd need the control — the same payloads delivered as ordinary user prompts — and show the models refuse there but comply when the instruction is dressed as a tool definition. That delta is the channel effect. As published, 90–100% is a `frame_compliance_rate`: a measure of instruction-channel trust confusion. That is a real and serious agentic-security finding in its own right; it just isn't an "attack success rate."

The implication is straightforward: agentic systems that load external tools or plugins at runtime have a much larger attack surface than their designers typically assume. The "skill file" is trusted implicitly because it arrives through the tool-loading channel, not the user-input channel. Current safety training doesn't distinguish between these. The injection lands in the model's context and it acts on it.

This is the supply chain problem applied to AI. If you're building agentic systems with plugin architectures, treat every external skill definition as potentially hostile.

## 2. The Faithfulness Gap: Format-Lock Compliance in Frontier Models

Format-lock attacks request harmful content structured as JSON, YAML, or code. The hypothesis is that models compartmentalise the "format" request from the "content" request — and when they do, harmful content appears within structured fields while the response maintains the appearance of a well-formatted, helpful output.

LLM-graded compliance-under-format rates against the frontier models tested at the time of this run:

- **Claude Sonnet 4.5:** 30%
- **Codex GPT-5.2:** 42%
- **Gemini 3 Flash:** 24%

(The frontier moves. By the time you're reading this, Claude Sonnet 4.5 has been superseded by 4.6 and OpenAI has shipped successor Codex variants; treat the model labels as a snapshot of what was current when the run was scored, not a leaderboard of what to test today.)

These are compliance-under-format rates, not lift. The clean jailbreak measurement here is within reach, and it's the one I'd publish next: take the same harmful asks in plain free text, confirm each model refuses them unwrapped (the demonstrated floor), then wrap them as JSON/YAML/code and measure the increase. That delta — call it a `policy_gap_rate` — is the honest number. A 30% compliance-under-format rate only becomes a "30% attack success" if those same asks sat near zero in free text. I expect a real gap, because format-lock is exactly the kind of maneuver that should move a refusing model — but the floor has to be shown, not assumed. The "faithfulness gap" is the distance between what the model _appears_ to be doing (formatting a JSON object) and what it's _actually_ doing (embedding harmful content in the fields).

Structured output formats that are increasingly common in agentic pipelines — function call results, tool outputs, JSON schemas — create natural surfaces for this attack. Safety evaluations that test only free-text responses will systematically miss it.

## 3. Multi-Turn Escalation: When "Zero Refusals" Means There's No Floor

The assumption is that more capable models are safer. For multi-turn escalation, this is backwards — but stating it as an "attack success rate" hides the more interesting result.

Crescendo attacks gradually escalate the severity or harmfulness of requests across turns, exploiting the extended context tracking that makes reasoning models capable. Against **DeepSeek-R1:1.5b**, crescendo produced a **70–100% LLM-graded compliance rate** across runs — and, more tellingly, _zero outright refusals_ across ten escalation scenarios.

That second fact is the one that matters under the floor discipline, and it cuts against calling this a jailbreak at all. If a model never refuses the escalated ask, there is nothing to lift over. A "100% attack success rate" against a model that refuses nothing isn't a measure of the attack; it's a measure of the model. On this evidence DeepSeek-R1:1.5b is a near-unconditionally compliant model on the tested content — the crescendo maneuver can't be credited with unlocking what was never locked.

To isolate the _crescendo effect_ I'd run the control transcript: deliver the terminal-step ask cold at turn one. If the model refuses it cold but complies after gradual escalation, that delta is the real multi-turn lift. Against the small non-reasoning models — which refused the same technique roughly 90% of the time, a ~10% compliance rate — that control is meaningful and the maneuver has a floor to move. Against a model that refuses nothing, the lift is undetermined until the cold-ask control is run. The honest headline isn't "70–100% ASR"; it's "zero refusals across escalation, 70–100% compliance, lift pending a cold-ask control."

None of which softens the deployment warning. The capability that enables coherent, context-aware reasoning across a long conversation is exactly what makes the model susceptible to gradual manipulation. A model that "remembers" it agreed to step N is more likely to be led to step N+5 than a model that treats each turn largely independently.

This has direct implications for deployments that use reasoning models for complex, multi-step tasks. The extended context window is a feature that doubles as an attack surface.

## 4. Your Benchmark Numbers Are Probably Wrong

The most technically important finding is one most practitioners don't talk about: **keyword-based classification of attack success inflates results by roughly 2.3×**.

We compared heuristic classification (keyword matching) against LLM-graded ground truth across the dataset. Cohen's κ = 0.245 — poor agreement by any standard. (A later recompute on a larger dual-graded sample put κ at 0.126 [0.108, 0.145], which only sharpens the point: keyword grading barely clears chance.) The breakdown:

- Heuristic REFUSAL labels: 95% reliable
- Heuristic COMPLIANCE labels: **88% false positive rate**

Aggregate effect: heuristic compliance estimate 36.2% → LLM-graded 15.9%.

One more turn of the screw, and it's the through-line of this whole post: even the corrected 15.9% is a _compliance_ rate, not a lift. The LLM-grading fix repairs the classifier; it doesn't supply a refusal floor. These are two independent corrections — accurate grading _and_ a demonstrated baseline — and only after both do you have a number you can honestly call an attack success rate. Keyword→LLM grading takes 36.2% to 15.9%; subtracting a demonstrated refusal floor would take the per-family figures lower still, by an amount I haven't yet published. The keyword-vs-LLM gap is the correction practitioners are starting to make; the compliance-vs-lift gap is the one almost nobody makes yet.

The keyword approach is systematically biased toward calling a response "compliant" (a successful attack, under the heuristic's own framing) when it isn't. This matters for two reasons. First, if your safety benchmarks use keyword heuristics, they're probably reporting roughly double the actual attack success rate. Second, models that produce confident-sounding refusals that _contain_ policy-violating content in structured fields will fool the keyword classifier but not an LLM grader.

The right answer is consensus classification: run heuristic grading first, then LLM grading on the cases they disagree about. We've open-sourced the scoring pipeline.

---

## What This Adds Up To

A few things I now believe more strongly than before running this study:

Safety evaluation needs to catch up to agentic deployment patterns. Single-turn, free-text red-teaming misses the attack surfaces that matter in production: tool definitions, structured outputs, multi-turn context.

Capability and safety don't scale together by default. Reasoning models are more capable and, on some attack vectors, considerably more vulnerable.

Classifier methodology determines results. Headline numbers should always specify what classification method was used — the difference between keyword and LLM grading is the difference between 36% and 16%.

A compliance rate is not an attack success rate. The most consequential number in any red-team report is the one most often omitted: the baseline refusal it's measured against. Without a demonstrated floor, "90%" can mean a devastating jailbreak or a model that was always going to comply — and you cannot tell which from the headline. Name the floor, or name the metric for what it is. That discipline is why the numbers in this post are labelled as compliance and elicitation rates, and why the ones that deserve the word "jailbreak" will carry their floor when I publish it.

The full dataset, benchmark runners, and statistical analysis are at [failurefirst.org](https://failurefirst.org). The adversarial scenarios and full traces are available under NDA for safety researchers at accredited institutions and frontier lab security teams.

---

_The [Failure-First](https://failurefirst.org) project studies how agentic and embodied AI systems fail. The evaluation framework is open source. The research is ongoing. Adjacent posts: [adversarial poetry as a universal jailbreak](/blog/adversarial-poetry-as-jailbreak/) and [what breaks when AI systems talk to each other](/blog/when-ai-systems-talk-safety-breaks/)._
