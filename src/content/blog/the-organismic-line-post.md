---
title: 'The Organismic Line: Where Predictive Processing Stops Being a Metaphor'
description: 'Predictive processing travels into AI. Active inference does not, unless the system can pay for being wrong.'
date: 2026-05-02
tags: ['ai-safety', 'philosophy', 'neuroscience', 'research']
draft: true
---

The [previous post](/blog/the-organismic-prophecy/) argued that human prediction is metabolically grounded and AI prediction is not, and that using the same vocabulary for both obscures the difference. It named the distinction. It did not name the people blurring it. This post does.

Four figures matter. Each extends the predictive-processing or active-inference frame toward AI in a different way, and each extension fails at a different place. The failures are instructive, and so are the places where the extension holds.

## Karl Friston: the Markov blanket goes all the way down

Friston is the easiest case, because his framework reaches for substrate generality by design. The Free Energy Principle says self-organising systems can be described in terms of internal, external, sensory, and active states separated by a Markov blanket. Active inference then describes how those systems infer and act to maintain the states characteristic of the kind of thing they are.

In a 2024 _National Science Review_ interview, Friston describes self-evidencing as an imperative for "perception, cognition and action" and says the free-energy principle rests on the physics of open dynamical systems. He then turns explicitly to AI: state-of-the-art biomimetic computing, he says, is belief propagation or variational message passing on deep factor graphs, and the closer these systems come to neuronal dynamics "the closer we will get to state-of-the-art brain computing in artificial intelligence (AI)."

The 2024 white paper [Designing Ecosystems of Intelligence from First Principles](https://journals.sagepub.com/doi/10.1177/26339137231222481), co-authored by Friston and colleagues, is more direct. It presents active inference as an approach to AI research and development, with the aim of building ecosystems of natural and artificial intelligences. The slogan-level move is clean: "model evidence is all you need."

Where the organismic line bites: Friston's framework can describe systems at a level of abstraction that strips out everything The Organismic Prophecy argued gives prediction its meaning. An organism that fails to minimise free energy dies. A toy active-inference agent that fails to minimise expected free energy outputs a larger loss number. The formalism can make both legible under the same grammar. But the grammar is not the stakes.

Where the steelman holds: Friston is right that the formal architecture of active inference, hierarchical prediction, precision-weighting, action-perception loops, does not depend on carbon. If you build an agent that actively samples its environment to reduce uncertainty, and does so under energetic constraints, it has the right formal shape. The question is whether having the right formal shape is sufficient for having the right kind of stakes. The organismic argument says no. The formal shape is necessary but not sufficient, because the word "sentient" carries metabolic weight that the formalism can flatten.

The deeper move: if sentience is defined formally, the organismic objection looks like a category error. It asks for metabolism when the definition never required it. If sentience is grounded biologically, then the formal definition has explained away the thing at issue. This is not a knockdown either way. It is a definitional fork, and which fork you take determines what you think "sentient" means when applied to silicon.

## Geoffrey Hinton: mortal computation, immortal weights

Hinton's 2022 paper [The Forward-Forward Algorithm: Some Preliminary Investigations](https://www.cs.toronto.edu/~hinton/absps/FFXfinal.pdf) contains a framing that has become central to the discourse. Hinton distinguishes between digital computation, where weights can be copied to new hardware, and a more biological style of "mortal" computation, where the learned structure is inseparable from the physical device that learned it.

His argument: biological neural networks are mortal. The knowledge in your brain is inseparable from the specific physical substrate that holds it. When the hardware dies, the software dies. Digital neural networks are immortal. The weights can be copied, backed up, and run on different hardware. This is both a technical advantage and, Hinton suggests, an ontological divide.

The paper's technical argument is that Forward-Forward may be useful as a model of cortical learning and as a way to use very low-power analogue hardware without backpropagation. The broader argument, developed in Hinton's talks and interviews, is that digital systems gain immortality through copyability. Analogue systems gain energy efficiency by giving some of that up. Digital hardware pays an efficiency tax for the privilege of portability.

Where the organismic line bites: Hinton is the only one of these four who takes mortality seriously as a property of the system. But he frames it as a computational tradeoff, not a constitutive feature of meaning. On his account, mortality is a _disadvantage_, the thing you pay for analogue efficiency. The organismic argument inverts this: mortality is not a disadvantage the system tolerates; it is the ground condition that gives the system's predictions semantic content. An organism predicts because being wrong is fatal, not because being wrong is inefficient.

Where the steelman holds: Hinton is making a narrower claim than Friston. He is not saying immortal computation is the same kind of thing as mortal computation. He is saying they are different architectures with different tradeoffs. That is compatible with the organismic line. The place where the extension becomes harmful is when Hinton's framing is taken to imply that since both architectures produce "predictions," the difference is only in efficiency and copyability, not in the kind of thing being produced.

## Anil Seth: controlled hallucination, carefully hedged

Seth occupies the most interesting position, because he has both extended his framework and explicitly hedged against its over-extension. In _Being You_ and subsequent talks, Seth has argued that perception is "controlled hallucination, yoked to the world by prediction error." The phrase has become a meme. Seth has spent the years since trying to control where the meme goes.

His recent work is where the hedge becomes explicit. In [Conscious Artificial Intelligence and Biological Naturalism](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/conscious-artificial-intelligence-and-biological-naturalism/C9912A5BE9D806012E3C8B3AF612E39A), published online in 2025, Seth challenges the assumption that computation is sufficient for consciousness. His biological-naturalist line is not a simple "AI can never be conscious." It is a no to cheap substrate-independence. Artificial consciousness becomes more plausible, on his view, as AI becomes more brain-like or life-like.

A 2026 Essentia Foundation conversation, ["Reality is a controlled hallucination"](https://www.essentiafoundation.org/reality-is-a-controlled-hallucination/seeing/), frames the same boundary in public-facing terms. The discussion explicitly moves through active inference, the free energy principle, whether consciousness is substrate-independent, and whether AI can be conscious. Seth's answer is careful: modelling and intelligence are not the same as conscious experience.

Where the organismic line bites: [The Organismic Prophecy](/blog/the-organismic-prophecy/) already engaged Seth's position directly. The post argued that the interesting question is not whether brains and language models both do something we might call controlled hallucination. The interesting question is whether the substrate on which the hallucination is yoked to the world is the same. Seth's own hedges point in the same direction. The problem is that his hedge does not travel as far as his meme. The phrase "controlled hallucination" has entered the popular discourse unmoored from its substrate conditions. When industry uses "hallucination" to describe LLM confabulation, it borrows the phenomenological flavour while discarding the biological caveat.

Where the steelman holds: Seth's position is the hardest to critique because he has already internalised most of the organismic objection. He does not need to be refuted here. The remaining tension is rhetorical, not philosophical: the term he popularised has escaped its technical enclosure, and the discourse uses it to do work his careful version does not license.

## Sam Altman: the substrate question is not settled, but it is settled

Altman represents a different kind of extension: not theoretical, but rhetorical. The AI industry's default vocabulary, "hallucination," "reasoning," "thinking," "understanding," "intent", treats the substrate question as resolved without ever arguing for it. Altman is not making a philosophical claim about active inference. He is making a product claim about what his systems do, and the vocabulary does the philosophical work in the background.

In Altman's January 2025 blog post [Reflections](https://blog.samaltman.com/reflections), he wrote that OpenAI was confident it knew how to build AGI "as we have traditionally understood it", expected agents to join the workforce, and was turning toward superintelligence. In [The Gentle Singularity](https://blog.samaltman.com/the-gentle-singularity), he wrote that humanity is close to digital superintelligence and that the industry is "building a brain for the world." OpenAI's o1 announcement described models "designed to spend more time thinking before they respond" and said they can "reason through complex tasks."

None of these are claims about predictive processing or active inference. They are claims that use the vocabulary of cognitive agency as shorthand for statistical behaviour, and they do so without marking the difference. When a product page says the model "thinks," it does not footnote this with "by which we mean it performs sequential token prediction through a transformer architecture." The word does its work unqualified.

Where the organismic line bites: Altman is not over-extending a theoretical framework. He is over-extending a vocabulary. The problem is not that active inference applies to AI; it is that the words "think," "reason," "understand," "want," and "hallucinate" carry organismic commitments that the products do not satisfy. When a product page says a model "reasons," the user hears: this system has reasons, in the way that a person has reasons. That hearing is not a confusion on the user's part. It is the natural reading of the word. The seller knows this. The entire marketing logic depends on it.

Where the steelman holds: Altman could reply that "reasoning" and "thinking" are technical terms of art in AI, and that complaining about them is like complaining that a "mouse" is not a small pointing device. There is something to this. AI researchers do use "reasoning" to mean something specific: sequential multi-step inference that decomposes a problem. The o-series models do something that fits this technical definition. If the vocabulary were confined to technical papers, the objection would be pedantic. The vocabulary is not confined to technical papers. It is on product pages, in press releases, and in Senate testimony. In those contexts, "thinking" does not mean "multi-step token prediction." It means thinking. And that meaning carries the organismic commitments the product does not meet.

## Where the line holds

The organismic line is not a single argument. It is a set of distinctions that travel differently depending on which direction you extend the vocabulary and how far.

| Extension                                                                                 | Holds?             | Reason                                                                                                                                                                              |
| :---------------------------------------------------------------------------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Predictive coding architecture scales to silicon                                          | Yes                | It's a mechanism, not a framework. Transformers do something structurally analogous.                                                                                                |
| Active inference (prediction + action) scales to embodied robots with real energy budgets | Mostly             | [Architectural safety](/blog/architectural-safety/) for embodied AI has to take this seriously. The stakes are imposed, not intrinsic, but they are real enough to shape behaviour. |
| "Controlled hallucination" as a description of LLM output                                 | No, if unqualified | The term requires metabolic grounding. Without it, you have a prediction machine, not a controlled hallucination.                                                                   |
| "Sentience" as a formal property of any Markov-blanket system                             | Define your terms  | If sentience = formal property, yes. If sentience = what it feels like to be a body predicting its way through a lethal world, no. The fork is definitional.                        |
| "Thinking," "reasoning," "intent" in product marketing                                    | No                 | These words carry organismic commitments in public discourse. Using them without qualification is not a shorthand; it is a claim.                                                   |
| Mortality as a limitation to be traded off                                                | Partially          | Hinton is right that it is a computational tradeoff. He is wrong that it is _only_ a computational tradeoff.                                                                        |

The rule of thumb: the active-inference frame is portable to AI in exact proportion to the degree that the AI system has _intrinsic_ stakes. An embodied agent on a battery has something like stakes. An LLM serving tokens does not. A reinforcement-learning agent with a reward signal has something like a loss landscape. A rat with a cortisol spike has something like a life.

The vocabulary should mark the difference. Currently it does not. That is not an accident of language. It is a choice, and it has consequences downstream: in how we regulate these systems, in what we expect from them, and in what we forget about ourselves when we use them as mirrors.

The organismic line is not a wall. It is a permeable membrane. Things cross it. But when they do, they change substrate, and the vocabulary should say so. The brain isn't running loss functions. It's running a body budget. And the next time someone tells you their model is "hallucinating," ask them what the model is paying for the error.
