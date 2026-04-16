---
title: 'Diagnosis as a Team Sport'
description: 'Multi-agent AI diagnostic system with five physician personas, 304 NEJM cases, and a budget that forces real trade-offs.'
date: 2025-05-01
tags: ['notebooklm', 'ai', 'healthcare', 'agents']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/dx0/audio.mp3'
duration: '14:30'
relatedProject: 'dx0'
---

The question everyone asks about AI in medicine is whether it can diagnose. That's the wrong question. The right question is whether it can diagnose responsibly — within resource constraints, with appropriate uncertainty, without the kind of confident hallucination that in a clinical context becomes malpractice.

Dx0 doesn't simulate a single omniscient physician. It simulates a team: five specialised personas — Hypothesis Generator, Test Chooser, Challenger, Stewardship Officer, Checklist Validator — working through 304 NEJM Clinical Pathological Conference cases the way a real differential diagnosis unfolds. Each persona constrains the others. The Challenger exists specifically to attack premature convergence. The Stewardship Officer enforces a budget with real CPT/CMS cost mapping, because ordering every test is not diagnosis — it's avoidance of diagnosis.

The architecture reflects a conviction that AI-assisted medicine should be designed around the failure modes of clinical reasoning, not around the convenience of a single-pass prompt. FHIR integration for healthcare interoperability. Statistical significance testing with permutation tests. The system is built to be interrogated, not trusted.

[View the full project →](/projects/dx0/)
