---
title: 'LeJEPA: Self-Supervised Learning Gets a Theoretical Foundation'
description: 'Audio overview of LeJEPA — how Balestriero and LeCun proved isotropic Gaussian embeddings are optimal and distilled it into a 50-line self-supervised method.'
date: 2026-02-13
tags: ['notebooklm', 'ai', 'machine-learning', 'research', 'self-supervised-learning']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/lejepa-self-supervised-learning-gets-a-theoretical-foundation/audio.m4a'
duration: '21:16'
relatedPost: 'lejepa-self-supervised-learning-gets-a-theoretical-foundation'
---

Self-supervised learning has worked remarkably well in practice, with methods like DINO and I-JEPA pushing the frontier. The problem: nobody fully understood _why_ the specific combination of stop-gradients, EMA teachers, and asymmetric augmentation was necessary. Remove one piece and training collapses.

This episode covers LeJEPA, Balestriero and LeCun's paper that provides a theoretical answer. The core result: isotropic Gaussian embeddings are provably optimal for downstream tasks. From that, they derive SIGReg — a differentiable Gaussian regulariser using the Epps-Pulley characteristic function test — and build a full self-supervised method in roughly 50 lines of PyTorch. No stop-gradient. No teacher network. No EMA schedule.

The audio covers the theory, the implementation, and the competitive ImageNet results from a method that's refreshingly principled.

[Read the full post →](/blog/lejepa-self-supervised-learning-gets-a-theoretical-foundation/)
