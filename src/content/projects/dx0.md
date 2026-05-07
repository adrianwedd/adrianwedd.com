---
title: 'Dx0'
description: 'Multi-agent diagnostic system simulating physician personas against 304 NEJM clinical cases.'
tags: ['ai', 'healthcare', 'agents', 'python']
repo: 'https://github.com/adrianwedd/Dx0'
status: 'active'
featured: false
date: 2025-05-01
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/dx0/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/dx0/video.mp4'
heroImage: '/notebook-assets/dx0/infographic.webp'
youtubeUrl: 'https://www.youtube.com/watch?v=h9H9TnoI8hk'
---

The question everyone asks about AI in medicine is whether it can diagnose. That's the wrong question. The right question is whether it can diagnose responsibly—within resource constraints, with appropriate uncertainty, without the kind of confident hallucination that in a clinical context becomes malpractice.

Dx0 is a multi-agent diagnostic orchestrator, and SDBench is its integrated sequential diagnosis benchmark. It simulates a team of five specialised personas—Hypothesis, Test-Chooser, Challenger, Stewardship, and Checklist—that operate within the SDBench framework, which ingests 304 NEJM Clinical Pathological Conference cases. Each persona constrains the others. The Challenger exists specifically to attack premature convergence. The Stewardship Officer enforces a budget with real CPT/CMS cost mapping, because ordering every test is not diagnosis—it's avoidance of diagnosis.

The architecture reflects a conviction: AI-assisted medicine should be designed around the failure modes of clinical reasoning, not around the convenience of a single-pass prompt. SDBench provides an evaluation pipeline including statistical significance testing with permutation tests and Pareto frontier analysis, ensuring the system is built to be interrogated, not trusted.
