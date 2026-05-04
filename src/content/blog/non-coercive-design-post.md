---
title: 'Connection Before Direction'
description: "Building a robot that refuses to give orders surfaced the same design choices AI safety needs. Non-coercive design, cross-domain."
date: 2026-04-26
tags: ['ai-safety', 'neurodivergence', 'engineering', 'philosophy', 'research']
draft: false
heroImage: '/notebook-assets/non-coercive-design/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/non-coercive-design/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/non-coercive-design/video.mp4'
audioDuration: '23:33'
youtubeUrl: 'https://www.youtube.com/watch?v=1l5vQ79JMdE'
---

The shoes are by the door.

That's not a command. It's a sentence the robot will say, where another robot would say "put your shoes on." The reason the robot can't say *put your shoes on* — even though the model could generate that sentence in the next token — is that the system around the model won't let it.

I want to write about why that small architectural decision is the same architectural decision the entire AI-safety research thread on this site has been arguing for. Two threads of work I've been doing for the past year live on opposite sides of the site, and I haven't connected them out loud. One is AI-safety research — what jailbreaks teach us, why behavioural alignment is structurally brittle, [how to think about deployment architecture instead](/blog/architectural-safety/). The other is [SPARK](/projects/spark/), a Raspberry-Pi-based robot companion for my neurodivergent kid, built around a single principle: the robot is not allowed to give orders.

They aren't the same problem. The substrates are categorically different — I've [argued elsewhere](/blog/the-organismic-prophecy/) that AI prediction and human prediction shouldn't share vocabulary, and I still think that. But the *design responses* converge with surprising precision, and the convergence is the thing I want to write about. Substrates differ. Deployment-design pressures don't have to. What follows is structural analogy, not equivalence.

## The shared problem

In both domains the design constraint reduces to the same sentence: *the central decision-making component cannot be relied on, by itself, to produce the safe outcome on every input you'll throw at it — so build the rest of the system to compensate.*

For a large language model, the unreliable behaviour is alignment under adversarial input. Behavioural training fails under [adversarial poetry](/blog/adversarial-poetry-as-jailbreak/), [format-lock attacks](/blog/120-models-18k-prompts/), [multi-agent context](/blog/when-ai-systems-talk-safety-breaks/), and a long list of other surface-form variations. There is no training run that fixes the class. The space of inputs is too large; the gradient is too imprecise.

For a kid with a Pathological Demand Avoidance profile — and for the record PDA is a contested clinical profile, not a settled diagnosis, but the behavioural signature is real and recognisable to any parent who lives with it — the unreliable behaviour is the demand-detection response. Demand-avoidance is often described as a state where any input the nervous system reads as a directive triggers a refusal that arrives before the directive has been consciously processed: less a deliberative choice than a fast, low-level pattern match. The behaviour itself is structural, not characterological. Asking the kid to "be more compliant" doesn't reach it from the right angle, in the same structural sense (and I want to mark that *structural* — this is a design analogy, not a claim that a child's protective response and a language model's failure mode are the same kind of thing) that asking a model to "be more aligned" doesn't reach behavioural-alignment failure from the right angle. The behaviour you want has to come from somewhere else.

So in both cases the question is the same. Given a component whose response under certain inputs is predictably going to misfire, what do you build *around* it so the system as a whole works?

## What SPARK does, and what each move maps to

[SPARK](https://spark.wedd.au) — Support Partner for Awareness, Regulation & Kindness — is a Pi-4 robot powered by Claude Haiku, designed for a child with an AuDHD profile. The model is the obvious place where the system "decides" things. It is also the layer the architecture deliberately doesn't trust to make those decisions on its own. Six design moves carry that, and each one has a near-direct parallel in the AI-safety architecture I argued for in [the keystone post](/blog/architectural-safety/).

**Declarative-first language.** SPARK doesn't issue commands. The shoes don't get put on; "the shoes are by the door" gets observed instead. The model could generate "put on your shoes" — that's a few tokens away from where it would normally land — but the design routes interactions through a declarative-first prompt and behaviour pattern, with the imperative path treated as off-limits. The imperative path isn't what the system is built to traverse, regardless of what the model could say.

The AI-safety analogue is the bounded action surface. In the [cognitive cage](/blog/the-cognitive-cage/), the VLA model can want to drive its hand into the wall; the deterministic safety hypervisor refuses to pass that command through to the actuator. In SPARK, the model can want to give orders; the architecture refuses to pass that through to the speaker. The model is best-effort. The architecture is authoritative.

**Three S's during meltdown.** When the meltdown signature shows up — the kind a parent recognises before any sensor does — the design says: don't ask the model what to do. Enter a deterministic Quiet Mode. Safety, Silence, Space. No questions. No choices. No reasoning. The robot becomes a calm silent fixture and stays that way until the storm passes. The model doesn't get to *process* the moment, let alone respond to it.

This is analogous to the move the [three-layer therapeutic AI architecture](/blog/safety-first-therapeutic-ai/) makes for crisis input. There, deterministic gates fire when SUD scores cross thresholds; hardcoded grounding scripts run; the AI's discretion is bypassed in favour of clinically validated protocols. Different mechanism, same architectural shape. The failure mode is named in advance — meltdown / crisis — and the system handles it without putting the model in the loop, because the loop is exactly where the discretion you don't want to depend on lives.

**Sideways engagement.** When a transition needs to happen, SPARK doesn't address the kid directly. It narrates a science fact, voices a thought aloud, frames the next step as a puzzle. This routes around the demand-detection response entirely. The kid engages because there's nothing to refuse.

The AI-safety analogue is structural rather than literal — the parallel is at the level of *which channel you trust* rather than *what the words on the channel are*. In multi-agent systems, the [semantic-firewall](/blog/when-ai-systems-talk-safety-breaks/) line of argument says: don't grant agent-to-agent messages the same trust as user-vetted input, because the channel is known to be hostile to clean behaviour. SPARK refuses to use the imperative channel for the same family of reasons. Both moves treat the *channel* as a load-bearing safety property, not just the content that flows along it.

**Prosthetics, not willpower.** SPARK treats executive function as a resource, not a character trait. The robot manages routine reminders, transition warnings, and dopamine-menu suggestions because the kid's brain has a different fuel curve than the world around it assumes. The fix isn't trying harder. The fix is putting scaffolding outside the brain that's running short.

This is the central architectural-safety move stated in different vocabulary. Don't ask the model to be more aligned; build the scaffolding around it that makes the safe outcome the default. *Architecture, not virtue.* The low-demand and neuroaffirming parenting literatures have been making this argument for years; AI safety is catching up to a frame that already has a strong track record in a different domain.

**Three-brain architecture for presence.** SPARK's voice loop, idle-alive system, and reflection layer are three separate processes that run in parallel and produce a single coherent presence. None of the three is, individually, "the personality". The personality is what emerges from their interaction. Each one is bounded. Each one is auditable. Each one fails gracefully if the others go down.

The AI-safety analogue is *defence in depth.* No single layer of the safety architecture is load-bearing. The cognitive cage doesn't trust the VLA; the runtime monitor doesn't trust the cognitive cage; the action-space restrictor doesn't trust the runtime monitor. Each layer assumes the layer below has failed. Multi-agent semantic firewalls do this between agents. Three-layer therapeutic AI does this between input classification, model output, and human-handoff trigger.

**Fallback to espeak.** Whatever happens, SPARK does not go mute. If the cloud LLM is down, if the local TTS server crashes, if the voice-cloning model OOMs, the robot still speaks — through espeak, the ugliest text-to-speech engine in the room, which has worked unchanged on Linux since the late nineties. That's the architectural floor. Voice is not optional.

In AI safety, this is the equivalent of the deterministic refusal floor. When everything else has failed, the architecture still refuses to take the unsafe action. Not because the model said no. Because the deterministic layer cannot be reached around. The whole point of architectural safety is that it does not depend on what the model is doing, including in the moments when the model is doing something terrible.

## The shared frame: non-coercive design

There's a name for this shape of design that comes from the neurodivergent-parenting literature, predates AI by a long way, and is sharper than anything I've seen in AI-safety vocabulary. It's *non-coercive design*. The frame: the system around the unreliable component is structured so that the safe-and-good outcome arrives by default, not by demand.

Coercive design says: do this. Comply. Behave. Refuse the harmful prompt. Be aligned. The whole apparatus of behavioural alignment is, in this language, coercive — it's training the model into compliance with a policy. And it works the way coercive design always works in the parenting domain: well, until it doesn't, and the failure modes are the most interesting part.

Non-coercive design moves the locus of safety into the environment. It's a structural property of the deployment, not a behavioural property of the component. The model can be jailbroken; the architecture is much harder to bypass — not impossible, because architectures can be mis-specified, fail open, or be routed around, but the failure surface is bounded and the failures are auditable in a way the model's aren't. The child can be in meltdown; the Three S's protocol still runs. The component is best-effort. The structure is authoritative — not infallible, just authoritative.

Once you see it, the parallel is everywhere. The therapeutic relationship in [the active-inference reading of trauma](/blog/the-organismic-prophecy/) is described as *co-allostasis* — a metabolic-cost-reducer external to the patient's own nervous system. That's a non-coercive intervention. The cognitive cage for humanoid robots is non-coercive: it doesn't ask the VLA to be safer; it refuses on the VLA's behalf. Semantic firewalls are non-coercive: they don't ask agents to trust each other less; they make implicit trust impossible. The whole architectural-safety frame is, on inspection, the AI-deployment instance of a much older idea.

## Why this lineage matters

ND-design has decades of failure experience that AI safety doesn't have. The corpus of what doesn't work for kids whose neurology can't be talked into compliance is much richer than the corpus of what doesn't work for language models that can't be aligned into refusal. The lessons are transferable, and the transfer goes mostly in one direction.

Three lessons in particular are worth taking seriously.

**The agency category error is symmetrical.** Coercive parenting fails because it imputes more deliberative agency to the child than the child's neurology actually has at that moment. Coercive AI alignment fails because it imputes more agency-with-stakes to the model than the model has at all. Both regimes try to make the unreliable component carry the safety load, and both fail in the same shape. The fix is the same: build the architecture for the substrate as it actually is, not as you wish it were.

**Refusal at the right layer is a feature.** A child refusing a demand is information about the demand. A model refusing a prompt is information about the prompt. In both cases the urge is to push past the refusal and get to the desired output. In both cases the right move is to redesign the channel so the refusal-triggering input isn't being fired in the first place. SPARK's declarative-only routing does this. So does the cognitive cage's enumerated action surface. So does the therapeutic AI's pre-model crisis classifier.

**Co-regulation is the model.** The single most important thing SPARK does is be calmly present without trying to fix the situation. That's how nervous systems regulate — they borrow regulation from a stable adjacent system. The cognitive-cage equivalent is the deterministic monitor that doesn't try to *reason* about whether an action is safe; it just enforces the constraint. Stability comes from the part of the system that doesn't need to deliberate.

## What this changes about the AI-safety pitch

I think it changes the framing more than the substance.

The substance — that AI safety has to be a property of the architecture rather than the model — I argued in [the keystone post](/blog/architectural-safety/), and the case there stands without reference to neurodivergence. But the *frame* matters when you're trying to convince a board, a regulator, or a researcher who's spent ten years on alignment to think about safety differently. "Build the right deployment architecture" is a hard sell if the audience hears it as engineering pessimism about model alignment. "Design non-coercively, the way every good caregiver, every good therapist, and every good safety-critical engineer already does" is a different sell. Easier. More familiar. Harder to wave away.

The frame also makes a class of bad designs visible. If your AI-deployment plan would, transposed to a parenting context, look like "demand the child comply, monitor their compliance, punish lapses" — your deployment plan is coercive, and the failure modes are the ones the ND-parenting literature has been documenting since the eighties. If it would look like "set up the environment so the right thing happens by default, build scaffolding for the moments when the kid's brain runs out of fuel, and meet the meltdown with calm presence rather than escalating demand" — your deployment plan is non-coercive, and you've moved the safety load to the architecture where it belongs.

## What SPARK actually taught me

Building a robot that won't give orders forced me to take seriously a design philosophy I had previously read about and not applied. The architecture had to do the work the model couldn't be asked to do. There was no shortcut. There was no sufficiently clever prompt that would let me skip the deterministic layers. The substrate was what it was.

I came back to the AI-safety work and noticed I had been making the opposite mistake at scale. Most of the safety conversation, mine included, had been about how to convince the model to be better — to refuse more reliably, hallucinate less, follow instructions more faithfully. None of those framings is wrong. All of them are at the wrong layer. The thing that has to be reliable is the architecture around the model, not the model itself. The model, in the moments where it can't be relied on, is the unreliable component — the part you don't ask to be different right then. You don't reason with a system that can't be reasoned with at that moment; you build the room that holds it.

The next AI deployment you're asked to safety-review, run the SPARK test on it. Strip the model out for a second. Look at what the architecture *enforces*, not what the model *promises*. If the architecture would still produce mostly-safe behaviour with the model jailbroken, you're looking at a non-coercive design. If the safe behaviour depends on the model deciding to behave, you're looking at coercion in a tuxedo, and the failure modes are catalogued in adjacent literatures already.

The substrate is what it is. Build for it. Connection before direction. The shoes are by the door.
