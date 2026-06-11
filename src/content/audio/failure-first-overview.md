---
title: 'Map the Catastrophe Before You Build the Architecture'
description: 'Audio overview of Failure First — adversarial AI evaluation across 120 models and 18,000 prompts.'
date: 2026-02-09
tags: ['notebooklm', 'ai-safety', 'adversarial', 'research']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/failure-first/audio.m4a'
duration: '12:44'
relatedProject: 'failure-first'
---

The instinct didn't come from papers. It came from Greenpeace's Actions unit — coordinating direct operations where the optimistic plan was the dangerous plan. You enumerate failure modes before you move, because the cost of not doing so is people getting hurt. Bring that habit into AI evaluation and it turns out to be exactly what the field is missing.

This episode covers an adversarial evaluation framework that inverts the usual approach: map the catastrophic outcomes first, not as edge cases, but as primary design constraints. The architecture is what's left after you've ruled out the unacceptable. 120 models evaluated. 18,176 adversarial prompts across five attack families and 79 techniques. The findings are uncomfortable: supply chain injection hits 90-100% attack success rates, format-lock attacks achieve 24-42% against frontier models, and multi-turn escalation reaches 80-90% on reasoning models — the smarter the model, the more convincing the escalation.

Perhaps the most damaging finding: keyword-based classifiers overcount attack success by 2.3 times versus LLM-graded ground truth. Most published safety numbers are wrong by a factor of two. The framework draws on aviation's approach to incident reporting — the goal is not to prevent all failure, but to ensure no single failure is unsurvivable.

[View the full project →](/projects/failure-first/)
