---
title: 'Beyond Optimisation: The Emergence of Learning Mechanics as a Formal Science'
description: 'A new paper argues that a scientific theory of deep learning is forming — one that makes falsifiable predictions about training dynamics, not just bounds.'
date: 2026-05-03
tags: ['AI', 'deep learning', 'theory', 'research']
draft: false
heroImage: '/notebook-assets/learning-mechanics-deep-learning-theory/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/learning-mechanics-deep-learning-theory/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/learning-mechanics-deep-learning-theory/video.mp4'
audioDuration: '23:03'
slides: '/notebook-assets/learning-mechanics-deep-learning-theory/slides.pdf'
youtubeUrl: 'https://www.youtube.com/watch?v=9Mp-HZZDEo4'
---

For a long time, the honest answer to "why does this neural network work?" has been some version of: we're not entirely sure. The results speak for themselves, but the internal logic — the actual mechanism by which a model moves from random noise to something useful — has felt more like craft than science. We have recipes. We lack laws.

That framing may be changing. A new paper by Jamie Simon, Daniel Kunin, and twelve co-authors — *There Will Be a Scientific Theory of Deep Learning* — argues not just that such a theory is possible, but that it's already forming. The term they use is **Learning Mechanics**: the study of the dynamics of training as a formal discipline in its own right.

---

## What makes this "mechanics" rather than just "more theory"?

The framing matters. Previous theoretical approaches to deep learning have mostly operated from two positions: statistical bounds ("here's the worst-case generalisation guarantee") and information-theoretic perspectives ("here's a measure of what the model could, in principle, learn"). Both are useful. Neither explains what's actually happening during training.

Learning Mechanics takes a different angle. It's concerned with the *process* — the trajectory from initialisation to convergence — rather than the endpoints. And it operates at what the authors call *coarse aggregate statistics*: the high-level, macroscopic properties of training that you can measure without needing to interpret every individual weight. Think loss curves, scaling relationships, the statistical structure of representations across layers. Not neurons. Patterns.

The third defining trait is the one that marks this as genuinely scientific rather than just descriptive: **falsifiable quantitative predictions**. A theory of learning mechanics isn't valuable if it only explains the results after the fact. The test is whether it can tell you what will happen before training begins.

---

## Five bodies of work converging

The paper identifies five research strands that are currently building towards this theory:

**Solvable idealised settings.** Linear networks, two-layer models, toy datasets — systems simple enough that you can derive exact results. The goal isn't to study toys for their own sake, but to build reliable intuition that transfers. If you can prove a clean result about gradient flow in a shallow linear network, you've got something to test against the messier reality of deep non-linear systems.

**Tractable limits.** What happens as you push a network toward infinite width? Toward infinite depth? These limits — NTK, mean-field theory, Gaussian process limits — strip away finite-size noise and reveal the structural phenomena underneath. They're useful precisely because they're extreme: at the boundary, certain behaviours become analytic.

**Simple mathematical laws.** Scaling laws are the obvious example. The observation that loss follows a clean power law with respect to data and parameters isn't just empirically interesting — it's the kind of macroscopic regularity that a serious theory needs to explain and predict. The goal is more laws like this, covering a wider range of observable quantities.

**Theories of hyperparameters.** Learning rate, batch size, weight decay, initialisation scale — these aren't just knobs to tune. They interact with the training dynamics in structured ways, and disentangling those interactions is part of making the system tractable. If you can account for a hyperparameter's effect in closed form, you've simplified the thing you're actually trying to understand.

**Universal behaviours.** Some phenomena appear across architectures: transformers, CNNs, MLPs, state-space models. Others are architecture-specific quirks. Learning Mechanics is concerned with the former. If a behaviour is universal, it belongs to the physics of gradient descent. If it only shows up in one setting, it's probably an engineering detail.

---

## The relationship with mechanistic interpretability

One clarification worth making: Learning Mechanics and mechanistic interpretability are not the same project, but they're not competing either.

Mechanistic interpretability works bottom-up — it starts with a trained model and tries to reverse-engineer what specific neurons, circuits, and attention heads are doing. It asks: given this final state, what representations has the model built?

Learning Mechanics works top-down — it starts with the training process and asks: what forces shaped the model into this state? How did the representations evolve? What structure did the loss landscape impose?

The connection is genuine. Understanding *why* certain representations tend to form during training — why induction heads emerge when they do, why certain features cluster — is exactly the kind of question that a mechanics perspective should eventually answer. The interpretability researchers asking "what is this circuit doing?" and the theorists asking "why does this circuit exist at all?" are working on the same object from different ends.

---

## Why now?

The timing isn't accidental. The infrastructure for this kind of theory has been building for years: better tools for large-scale experimentation, cleaner mathematical results in the tractable limits literature, the scaling law observations that forced the question of *why* power laws at all. The authors are also explicit that this paper isn't just a review — it's a case for the discipline. They address common arguments against the possibility of a fundamental theory, and they end with introductory materials and open questions, which reads as an invitation.

The honest position is that Learning Mechanics is still a nascent field. The five strands are converging, not converged. The macroscopic laws are partial. The theory doesn't yet tell you, before you start training, exactly what your model will learn to represent. But the trajectory is clearer than it's been, and the shift from "we observe this" to "we predicted this" is happening in enough corners of the field to make the broader claim credible.

---

The question I keep returning to: what changes in practice when we can predict training dynamics with the same precision we expect from classical mechanics? Not just "does it converge?" or "what loss should we expect?" but "what representations will this model form, and why?" That level of foresight would change how we think about alignment, about interpretability, about the design of training runs. We're not there. But the path toward it is beginning to look like science rather than guesswork.

---

*The paper is [arXiv:2604.21691](https://arxiv.org/abs/2604.21691). The authors have also launched a companion hub at [learningmechanics.pub](https://learningmechanics.pub), with introductory materials and a curated open questions list.*
