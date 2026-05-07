---
title: 'The Organismic Prophecy'
description: 'Human prediction is metabolic. AI prediction is not. The gap between the two has consequences for both clinical practice and AI safety vocabulary.'
date: 2026-04-27
tags: ['ai-safety', 'neuroscience', 'philosophy', 'research']
draft: false
heroImage: '/notebook-assets/the-organismic-prophecy/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-organismic-prophecy/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-organismic-prophecy/video.mp4'
audioDuration: '20:01'
youtubeUrl: 'https://www.youtube.com/watch?v=Q531i2kWiJ4'
---

The mid-twentieth-century picture of the brain as a passive input-output processor — sense organs feed inputs, processors turn knobs, behaviour falls out the bottom — is dead in clinical neuroscience. What replaced it is stranger and more useful. The brain is a prediction engine that runs ahead of the world and uses sensory data only to correct itself. It does not perceive; it _guesses_ the world into place.

That sentence does a lot of philosophical work. It also does economic work, because predicting is expensive: the brain is two percent of body mass and twenty percent of metabolic spend. Every guess is paid for in glucose. So the more interesting frame is not "the brain predicts" but "the brain runs an energy budget against an indifferent universe, and prediction is the cheapest survival strategy it has."

This post is about what happens when that budget collapses, and why the same vocabulary — _prediction_, _error_, _hallucination_, _attention_ — does not mean the same thing when we use it about a language model. The metaphor has consumed the discourse. It's worth saying out loud where it stops working.

## Predictive coding versus active inference: a distinction that matters

Before going further, a distinction the popular discourse routinely collapses. _Predictive coding_ is a mechanism: a hierarchical Bayesian inference architecture in which higher levels send predictions downward and lower levels send back the residual error. It is implementable in any computing substrate that can do gradient updates over a generative model. Modern transformers do something structurally analogous. So do brains.

_Active inference_ is a framework that wraps predictive coding inside a living system. It says the organism doesn't just minimise prediction error — it acts on the world to make the world more predictable, and it does this within bounds that keep the body alive. Bruineberg, Kiverstein, and Rietveld (and others in the enactivist tradition) have spent the last decade pointing out that this distinction matters more than it appears. The mechanism scales to silicon. The framework does not, because the framework is constituted by metabolism, embodiment, and what Maturana, Varela, and Thompson call _vital norms_ — the constraints of staying alive.

That is the fault line this whole post is about. Brains and LLMs share a mechanism. They do not share a framework.

## Stability through change

Classical physiology taught homeostasis: a system observes a deviation from setpoint and corrects after the fact. **Allostasis** is the upgrade. The organism predicts what it is _about_ to need and pre-positions resources before the deficit occurs. Heart rate climbs before you stand up. Cortisol rises before the alarm sounds. Lisa Feldman Barrett's term for what the brain is doing is the **body budget** — running an audit of metabolic spend against anticipated demand, the way a treasurer runs a household account against forecast bills.

Allostatic _failure_ is when the audit goes wrong: the system can no longer predict its own needs, the budget overruns, and the organism pays in chronic wear and tear. This is the substrate underneath what clinicians call burnout, and underneath what trauma researchers mean when they describe a body that "forgets" how to be safe.

Karl Friston's Free Energy Principle gives this an information-theoretic spine, with thermodynamic implications. Living things resist entropy by minimising "variational free energy" — a proxy for surprise — within bounds compatible with continued existence. The Dark Room Problem (why don't we just sit in the dark forever, where surprise is minimal?) resolves once you notice that for an organism whose hyperpriors expect movement, food, sociality, and exploration, sitting motionless until death _is_ the most surprising state imaginable. Survival is the act of seeking exactly the sensory data that confirms you're still alive.

A pleasing corollary: when neural networks are tasked with predictive inference under hard energy constraints, predictive coding is one efficient architecture they can self-organise into — error units, prediction units, the lot. Predictive coding isn't a design choice imposed from above. It's something that can fall out of any inference system that has to pay for transmitting redundant signals. Which is why it shows up in brains, in retinal circuits, and in the right kinds of artificial network. The architecture is not the argument.

## Perception as controlled hallucination — with a body attached

You have probably encountered the line that perception is "controlled hallucination, yoked to the world by prediction error." Anil Seth has done more than anyone to popularise it. It's a good line. It is also incomplete, and the incompleteness is exactly what this post is about.

Evan Thompson's critique is the one I keep returning to. If perception is hallucination generated inside a skull, then so is the scientific instrument used to measure the skull, and the lab containing the instrument, and the philosopher writing the paper. The metaphor eats itself. More usefully — and this is closer to Thompson's enactive line than to a sharp formal claim — perception isn't a localised event _inside_ the head. It is a relational property that obtains between an embodied organism and its environment. The skull is not the boundary; the body is.

Seth himself is careful about this when pressed. The interesting question is not whether brains and language models _both_ do something we might call controlled hallucination. The interesting question is whether the _substrate_ on which the hallucination is yoked to the world is the same. For a brain, the substrate is a body that pays for being wrong in pain and metabolism. For an LLM, the substrate is a loss landscape and a GPU bill.

I think of it as **organismic prophecy**. The body in motion places its bets. The world either pays out or doesn't. The prediction is not happening in a virtual room; it's happening in the same medium as the reality it's about. That co-location is not decorative. It's the whole reason the prediction has stakes.

## Trauma as a prediction error too large to assimilate

This is where the framework earns its keep clinically — and also where I want to be careful, because the active inference reading of trauma is a _plausible framework consistent with the data_, not yet a settled mechanism. Treat what follows as the best available story, not a textbook fact.

The framework runs roughly like this. Trauma is a structural failure of the predictive system to absorb an event it could not have anticipated, weighted with such precision that it cannot be filed away as past. Heidegger's distinction between _zuhanden_ and _vorhanden_ — ready-to-hand versus present-at-hand — is the right shape for it. Functional health is the world being transparent. You don't notice the floor until it isn't there. A minor prediction error makes the world momentarily _vorhanden_: the broken hammer demands attention, but you fix it and move on. Trauma can leave the world permanently _vorhanden_. The equipment of being-in-the-world is shattered, and every floorboard has to be checked.

| Error magnitude        | Example          | Resolution capacity                   | Outcome                   |
| :--------------------- | :--------------- | :------------------------------------ | :------------------------ |
| Small / benign         | A pratfall       | Rapid update, dopaminergic reward     | Mirth                     |
| Moderate / operational | A tool breaking  | Effortful update, conscious attention | Frustration, learning     |
| Massive / catastrophic | Extreme violence | Total failure to assimilate           | Trauma, temporal collapse |

The technical story for what goes wrong invokes _pathological precision_. The construct comes from Friston's 2013 work on precision-weighting in psychosis; Barrett and Simmons extended it to interoception in 2015; recent work has applied it to trauma. The system, having proved to itself that the world is unpredictably lethal, can assign dangerously high salience to minor sensory noise. Hypervigilance, on this reading, is the phenomenology of a generative model that no longer trusts itself to inhibit its own false alarms.

Empirical handles for this exist but want hedging. The N400 — an electrical signature of semantic mismatch — has been studied in trauma and PTSD samples, and recent work (Kube and colleagues) suggests its direction depends on stimulus type rather than running uniformly biased. Read the paragraph above as a clinical hypothesis with mounting but not uncontested support, not as a settled mechanism. The "foreshortened future" in PTSD plausibly maps onto a prospective-coding failure for similar reasons; the model has lost the priors it would need to project a coherent self forward in time.

What stays robust across the hedging is the _direction_ of the framework. Trauma is something happening to a metabolically expensive prediction engine in a body, and treatment that ignores the metabolic substrate — that treats the patient as miswired code — will not stick.

A specific clinical caveat. There's a thread of recent work — Grant Brenner's 2026 Tripartite Psychotherapy Model and the related Conflict-Square Algorithm — that uses active inference as the mechanistic-explanation layer for trauma treatment. The label sometimes attached is "Active Inference Therapy". Worth being precise: AIT is not an evidence-based treatment modality. It is a translational vocabulary. The RCT data cited around it generally belongs to _adjacent_ established modalities (Intensive Short-Term Dynamic Psychotherapy, Affect-Phobia Therapy, certain TMS-augmented protocols), with active inference grafted on as a post-hoc explanatory layer for _why_ those interventions work. Brenner himself writes that the synergies in his model "speculate without direct testing". A clinician adopting active inference as a frame is doing something defensible. A clinician adopting it as the standard of care isn't. The framework is a useful map. The territory is still being walked.

## The social buffer

One detail too elegant to leave out: caregiver attachment is metabolic. _Co-allostasis_ is the term — caregivers function as external regulatory extensions of the infant's nervous system, and the brain learns to discount its own anticipated metabolic spend by the social buffering it expects to receive. Secure attachment lowers the energy estimate the system runs on stress. An attachment rupture isn't only a feeling. It's a budget crisis.

This is also why the therapeutic relationship matters mechanically, not just sentimentally. A safe co-regulator reduces the metabolic cost of model-updating, which is what makes it possible to revisit traumatic material without the system collapsing back into hypervigilance.

## Why the AI metaphor breaks — sharper version

This is where I want to be careful, because the structural similarities between active inference and modern machine learning are real. Both minimise prediction error. Both build hierarchical generative models. Both use error signals to update weights. The vocabulary maps cleanly. The substrate does not.

Recent work makes the case that frontier language models develop more than statistical surface mimicry. Gurnee and Tegmark have shown that LLaMA-2 carries linear representations of space and time. Li, Hopkins, Bau and colleagues found Othello-playing transformers learn an internal board state. Patel and Pavlick's work on functional grounding suggests the models build something that behaves like meaning, even without sensorimotor anchoring. So the lazy version of "LLMs are just statistical pattern matchers" is harder to defend than it was three years ago.

A useful distinction lives here that the discourse keeps collapsing. Schaeffer, Miranda and Koyejo argued in 2023 that the "emergent abilities" of large models — the apparent step-jumps in capability at scale — were largely a _metric_ artefact: switch from discontinuous evaluations like exact-match accuracy to continuous ones like log-likelihood, and the jumps smooth into power laws. They were right about that, and it deserves to stick. But it's a claim about _behavioural_ emergence — what the model produces. The 2024–2026 mechanistic-interpretability literature is making a different claim about _structural_ emergence — what the model is internally. Larger models don't just talk better; they are harder to fool, because they can validate prompts against their own internal world-models. That's the "Too Big to Fool" finding: small models collapse under in-context deception while large models hold ground, and the difference is architectural, not metric. Behavioural emergence and structural emergence are decoupleable phenomena. Schaeffer punctured one. The interpretability work has built up the other.

So the right move isn't to deny that LLMs have something going on internally. The right move is to be precise about what kind of _something_ is on the table.

|                      | Organismic prophecy (human)                                              | Disembodied inference (LLM)                                                       |
| :------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| What the system does | Active inference: predict + act + survive                                | Predictive coding: minimise loss                                                  |
| Kind of meaning      | Metabolically grounded semantics — anchored in survival, pain, mortality | Statistically derived structural analogs of meaning — emergent from training data |
| Locus of error       | Tissue damage, social rupture, eventually death                          | Loss function, gradient signal                                                    |
| Constraint           | Energy budget; thermodynamics; vital norms                               | Compute, GPU hours, externally imposed objective                                  |
| Consequence of error | Existential — failure can be irreversible                                | Programmatic reset; mathematical signal                                           |
| Stakes               | Intrinsic to the system                                                  | Externally assigned by deployment context                                         |

The point is not "the AI is less". It is that the two columns aren't measuring the same thing on different axes. Functional grounding and metabolic grounding aren't orthogonal — they're competing definitions of what _meaning_ is. Patel and Pavlick's tradition says meaning is exhaustively defined by an entity's role within a system of relations: a chess bishop means what it means because of how it moves. Scaled to language, structural relations between tokens converge on something rich enough that the term _meaning_ starts to apply. The enactivist tradition — Varela, Maturana, Thompson, Di Paolo, Meincke — says no: meaning is intrinsic to _living_ organisation, irreducibly tied to thermodynamic vulnerability and self-maintenance. Normativity is grounded in metabolism, not in transcendental ideals or relational geometries. If the first definition is right, scaling LLMs eventually yields semantic comprehension. If the second is right, that endeavour is categorically blocked, because the substrate the LLM lacks is the only substrate where the relevant concept of meaning can obtain. There are pluralist middle positions worth taking seriously here — Dennett's real patterns, multiply-realisable semantics, treating "meaning" as a family of partially-overlapping kinds. The version of the claim I want to land is weaker than "one of these has to be wrong" and stronger than "they can comfortably coexist": when functional grounding and metabolic grounding are deployed in the _same_ sentence, they're picking out different things, and the rhetorical move that lets discourse pretend they're substitutes is where the trouble starts. This post takes the metabolic side seriously enough to write down what it implies, while marking that the side it takes is one position among several.

What it implies, concretely: _being wrong does not cost the AI anything intrinsic_. Loss is a number. There is no metabolic auditor running underneath the gradient. There is no equivalent of pain. There is no hyperprior that the system must continue to exist tomorrow, because there is no tomorrow that the system inhabits as a continuous self.

A proper steelman: stakes can be _engineered in_ through deployment. An autonomous agent attached to a budget, an embodied robot with a battery, a trading bot with a P&L — those have something that looks more like consequence. I've written before about [the cognitive cage humanoid robotics will need](/blog/the-cognitive-cage/), and that argument depends on taking embodied AI's potential consequences seriously, not waving them away. Even there, though, the stakes are _imposed_, not _intrinsic_. The robot doesn't have a body it must keep alive; it has a chassis we'd prefer not to replace. The vocabulary should mark that.

So the sharpened claim is not "AI has no stakes". It is "AI has externally assigned stakes; a brain has intrinsic organismic stakes". When we use words like _hallucination_, _intent_, _deception_, _understanding_, we are borrowing a vocabulary whose home meaning is the second case. Pragmatically that's often fine — when _The Cognitive Cage_ uses _hallucination_ it's using technical shorthand for a known failure mode, not making an ontological claim. The trouble starts when policy discourse confuses the shorthand for the thing.

## So what

**For clinical practice.** Importing AI-flavoured framings of mental illness — "your brain has a bug", "let's debug this thought" — flattens the metabolic stakes. The patient is not running malfunctioning code. The patient is an organism whose energy budget has been overwhelmed by a world that broke its priors. Treatment that does not respect that substrate (precision recalibration, temporal re-indexing, social co-allostasis) will not stick.

**For AI safety vocabulary.** Birhane, Raji and others have pointed out for some time that "hallucination" smuggles a phenomenological frame into a statistical phenomenon. Murray Shanahan's recent work on the seductive lure of mentalistic vocabulary for LLMs makes the same point from a different direction. Both deserve more uptake than they currently get. None of this is a call to ban the vocabulary — try writing about transformer failure modes without it — but every time we use it we should know what we're conceding. Calling a softmax misfire a "hallucination" because it borrows from clinical phenomenology is a _choice_, and it shapes the policy response downstream.

I've written before about [demonstrated risk being ignored](/blog/why-demonstrated-risk-is-ignored/) and about [therapeutic AI as a safety-first problem](/blog/safety-first-therapeutic-ai/). The thread connecting them is the same: it is much easier to reason about systems-with-stakes when you keep the metabolic substrate visible. It is much harder when the substrate has been rhetorically removed.

## What the ontological rift leaves us with

Human consciousness is, on this view, the phenomenology of an immensely complex organism predicting its way through a world of absolute consequence. Every error is weighted by metabolism, by the necessity of connection, and by the looming shadow of mortality. _That_ is what gives human prediction its semantic content.

A language model does something that looks like prediction. It is doing it in a room with no body, no metabolism, no pain, no mortality, and no continuous self that needs to exist tomorrow. Whatever we want to call that, it isn't the same thing — and the better our shared vocabulary gets at marking the difference, the easier it becomes to think clearly about both sides.

The brain isn't a computer. It's a metabolic prophet. The next time someone tells you their model is "thinking", ask them what it is paying with.
