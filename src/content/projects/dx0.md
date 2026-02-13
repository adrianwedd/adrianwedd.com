---
title: "Dx0"
description: "Multi-agent diagnostic system simulating physician personas against 304 NEJM clinical cases."
tags: ["ai", "healthcare", "agents", "python"]
repo: "https://github.com/adrianwedd/Dx0"
status: "active"
featured: false
date: 2025-05-01
heroImage: "/images/projects/dx0-hero.webp"
---

The question everyone asks about AI in medicine is whether it can diagnose. That's the wrong question. The right question is whether it can diagnose responsibly—within resource constraints, with appropriate uncertainty, without the kind of confident hallucination that in a clinical context becomes malpractice.

Dx0 is a sequential diagnosis benchmark that doesn't simulate a single omniscient physician. It simulates a team: five specialised personas—Hypothesis Generator, Test Chooser, Challenger, Stewardship Officer, Checklist Validator—working through 304 NEJM Clinical Pathological Conference cases the way a real differential diagnosis unfolds. Each persona constrains the others. The Challenger exists specifically to attack premature convergence. The Stewardship Officer enforces a budget with real CPT/CMS cost mapping, because ordering every test is not diagnosis—it's avoidance of diagnosis.

The architecture reflects a conviction: AI-assisted medicine should be designed around the failure modes of clinical reasoning, not around the convenience of a single-pass prompt. FHIR integration for healthcare interoperability. Statistical significance testing with permutation tests. The system is built to be interrogated, not trusted.
