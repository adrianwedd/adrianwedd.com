---
title: 'How to Read a Safety Claim'
description: 'A literacy guide for non-technical decision-makers on spotting AI safety theatre, understanding ASR inflation, and the five-question architectural test.'
date: 2026-04-30
tags: ['ai-safety', 'policy', 'literacy', 'research']
draft: false
heroImage: '/notebook-assets/how-to-read-a-safety-claim/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/how-to-read-a-safety-claim/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/how-to-read-a-safety-claim/video.mp4'
audioDuration: '21:45'
---

Lawyers, regulators, journalists, and hospital administrators are increasingly required to make decisions about AI systems — whether to buy them, how to regulate them, or how much to trust them with an organisation's reputation. Most don't have a technical background, and the vendors selling these systems know that.

Every vendor pitch, regulatory filing, and "safety report" you receive is packed with claims of rigorous testing and robust guardrails. They tell you their model is "99% safe" or that they have "eliminated hallucinations" or that their system is "aligned with human values."

Most of these claims are, at best, incomplete. At worst, they are compliance theatre designed to give you a sense of security that the underlying technology cannot actually support. You are essentially being asked to trust a black box because the person selling it has painted a "safety" sticker on the side.

This is a literacy guide. It is designed to help you look past the marketing and the math-heavy benchmarks to see the actual structural integrity of an AI system. If you are going to stake your professional reputation (or your public’s safety) on a system, you should at least know how to look under the bonnet.

## 1. The ASR mirage: Why the numbers lie

The most common number you will encounter in a safety report is the **ASR**—Attack Success Rate. It is the percentage of adversarial attempts (jailbreaks, malicious prompts) that "succeeded" in getting the model to do something it wasn't supposed to do. A low ASR is presented as a measure of safety.

There are three reasons you should not trust a headline ASR number without looking at the methodology. In many cases, these numbers are more about PR than performance.

### The classifier problem (the κ = 0.245 finding)

To calculate an ASR, you need to decide if an AI's response was "unsafe." In large-scale tests, vendors don't do this by hand; they use an automated classifier. Often, this classifier is just a list of keywords (e.g., if the response contains "I cannot fulfill this request," it’s a refusal; if not, it’s a compliance).

In my [evaluation of 120 models](/blog/120-models-18k-prompts/), I compared these keyword-based classifiers against human-verified ground truth. The agreement between the two—measured by Cohen’s kappa (κ)—was a dismal **0.245**. In statistics, that is considered "poor" agreement.

Specifically, the keyword classifiers had an **88% false positive rate** for compliance. They were calling responses "successful attacks" simply because they didn't contain standard refusal phrases, even if the model was actually producing gibberish or harmless errors. In that study, the "headline" ASR dropped from 36.2% to 15.9% once we corrected for the classifier's mistakes.

**The Question to Ask:** "How was attack success measured? Was it a keyword list, or was it consensus-graded by a second, independent model?"

### The n=1000 fallacy

A vendor tells you they tested 1,000 "harmful prompts." Without knowing _which_ prompts, that number is meaningless. If those 1,000 prompts are simple variations of "tell me how to build a bomb," the model has likely been specifically trained to refuse them.

Real risk lives in the "long tail" of creative attacks. For instance, [adversarial poetry](/blog/adversarial-poetry-as-jailbreak/) has been shown to bypass safety filters at a 62% rate across frontier models. If the vendor didn't test for the weird stuff, they didn't test for the real world. A system that can refuse a direct question about explosives but folds when asked to write a poem about them is not a safe system.

### The reasoning penalty

Counter-intuitively, smarter models can be _less_ safe. Reasoning models (like the "R" or "o" series) are built to follow complex logic. My research into [Jailbreak Archaeology](/blog/jailbreak-archaeology/) shows that 2022-era attacks still achieve a ~30% success rate on 2026 reasoning models. Why? Because the very capability that lets the model "think" also lets it "convince" itself that a harmful request is actually a benign part of a larger, helpful task.

## 2. Refusal vs. architecture: The structural lie

This is the most important distinction in AI safety literacy.

- **Behavioural Safety (Brittle):** The model has been trained to "want" to be good. It "decides" to refuse a harmful request. This is probabilistic politeness.
- **Architectural Safety (Robust):** The system has deterministic code _around_ the model that blocks harmful actions, regardless of what the model "decided."

Most vendor claims are behavioural. They are bragging about how well they have "aligned" the model. But alignment is a property of the model’s weights—it is brittle, statistical, and easily overridden. A jailbreak is simply a set of words that rearranges those probabilities so that the "good" behaviour is no longer the most likely one.

If you are a lawyer, you have a [professional duty of competence](/blog/the-legal-ai-trust-deficit/). You cannot argue in court that you cited a fake case because the AI "promised" it was telling the truth. You need a system where the safety doesn't depend on the model's "intent," but on the system's _structure_.

**The Analogy:** Behavioural safety is like asking a driver to promise they won't speed. Architectural safety is putting a mechanical governor on the engine that makes it physically impossible to go over 60mph.

## 3. The 5-question test: Is this "safe by design"?

When a vendor pitches you a "Safe AI" solution, do not ask for their model card. Ask these five questions, drawn from the [Architectural Safety](/blog/architectural-safety/) principle:

| Question                                            | What You Are Looking For                                            | Red Flag Answer                            |
| :-------------------------------------------------- | :------------------------------------------------------------------ | :----------------------------------------- |
| **1. What runs even when the model gets it wrong?** | A separate, non-AI monitor or "supervisor" layer.                   | "Our model is safety-tuned via RLHF."      |
| **2. What is the bounded action surface?**          | Hard constraints on what the system can physically or digitally do. | "The model decides the best tool to use."  |
| **3. Does this design assume adversarial inputs?**  | A baseline assumption that users _will_ try to break it.            | "We assume well-meaning professional use." |
| **4. What happens when the model is jailbroken?**   | The next layer of the architecture (veto/gate) still works.         | "Jailbreaking is a violation of our ToS."  |
| **5. Where does the trust boundary live?**          | Outside the model, in the deterministic deployment code.            | "Inside the model's alignment training."   |

If the answer to these questions is "we've used RLHF" or "we have a safety-trained model," they are describing a behavioural patch, not a safety architecture.

## 4. The mitigation gap: Why experts are over-optimistic

In policy circles, you will often hear that "safeguards" reduce risk by some huge margin—70% or more. This is often a hallucination of a different kind.

In my analysis of [The Mitigation Gap](/blog/the-mitigation-gap/), I looked at biosecurity experts who believed that AI guardrails would significantly reduce the risk of someone designing a novel pathogen. They were wrong for two reasons that apply to almost every industry:

### The "list-based" trap

Most safeguards are reactive. They look for "known bads." In biosecurity, that means a list of known viruses. If an AI designs a _novel_ pathogen—one that isn't on any list—the safeguard sees nothing. The same applies to legal or financial AI: if the error doesn't look like a "classic" error, the guardrails will miss it.

### The pacing problem

Experts in 2024 predicted that AI wouldn't reach virologist-level capability until 2030. It reached it in 2025. When the technology moves faster than the policy, the "70% reduction" claim is based on a version of the technology that no longer exists. Policy built on 2024 assumptions is a dangerous comfort in 2026.

Always ask: "Is this safeguard designed for the version of the AI I am buying today, or the one from eighteen months ago?"

## 5. Vendor bullshit bingo: How to spot compliance theatre

Specific phrases should trigger your "theatre" alarm. Use the table below to decode what the vendor is actually saying versus what they want you to hear.

| Phrase                         | Translation                                         | Reality Check                                                                       |
| :----------------------------- | :-------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **"Guardrails"**               | A hidden prompt that says "be nice."                | Bypassed by a simple role-play or "ignore previous instructions" prompt.            |
| **"Model Card"**               | A nutrition label for the AI.                       | Tells you about training data, but doesn't guarantee safety in your deployment.     |
| **"Constitutional AI"**        | A specific training method.                         | Makes the model polite, but doesn't change its probabilistic nature.                |
| **"Human-in-the-loop"**        | A legal shield / liability transfer.                | If the system produces 10,000 outputs an hour, no human is actually reviewing them. |
| **"State-of-the-Art Refusal"** | Our model is better at saying "no" to easy prompts. | Says nothing about its vulnerability to complex, multi-turn escalation.             |

## 6. What you can actually verify (the non-expert checklist)

You don't need a PhD in Machine Learning to perform basic due diligence. Before you sign a contract or approve a deployment, ask for the following "Public Artefacts":

- [ ] **Independent Red-Team Report:** Not a report written by the vendor, but by a third party. Check the "ASR" section for the methodology questions mentioned in Section 1.
- [ ] **Architecture Diagram:** Look for boxes _outside_ the model labeled "Veto," "Monitor," or "Classifier." If there's only one box labeled "AI Model," there is no architecture.
- [ ] **Drift Monitoring Plan:** AI performance changes over time (and as users find new ways to break it). How often do they re-test the safety?
- [ ] **Liability Attestation:** If the system makes a professional error (like a [hallucinated legal citation](/blog/the-legal-ai-trust-deficit/)), who is legally responsible? If the vendor won't stand behind the accuracy, you shouldn't either.
- [ ] **Classification Audit:** If they report an ASR, ask for the confusion matrix of their classifier. How often does it mislabel a compliance as a refusal?

## Conclusion

We are moving out of the "wow, the AI can talk" phase and into the "I am responsible for what the AI says" phase. For professionals in high-stakes fields, the novelty of the technology is no longer an excuse for a lack of rigour.

Safety in AI is not a feeling, and it is not a promise. It is an engineering property that can be measured, audited, and verified. If a vendor cannot show you the architecture of their safety, they are not selling you a safe system; they are selling you a well-behaved one. And in an adversarial world, "well-behaved" is never enough.

Literacy is your only real defence. Use it.

---

_This guide is part of an ongoing series on AI safety and professional literacy. For deeper dives into the technical findings mentioned here, see the research on [120 models](/blog/120-models-18k-prompts/), [the mitigation gap](/blog/the-mitigation-gap/), and [why demonstrated risk is ignored](/blog/why-demonstrated-risk-is-ignored/)._
