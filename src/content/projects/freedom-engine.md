---
title: "Freedom Engine"
description: "Secure AI service helping federal inmates understand First Step Act time credit provisions."
tags: ["ai", "justice", "python"]
repo: "https://github.com/adrianwedd/freedom-engine"
status: "active"
featured: false
date: 2025-04-01
---

Over 264,000 people are held in the US federal prison system. Many are eligible for reduced sentences under the First Step Act. The provisions exist. The information is public. But the legal complexity makes it inaccessible to most inmates without outside help. The information gap is not theoretical—it costs people months or years of their lives.

I built the Freedom Engine to bridge that gap. It is an AI-assisted Q&A service that takes questions about FSA time credits—submitted through prison email systems like CorrLinks and JPay—and returns accurate, plain-language answers grounded in federal statutes, Bureau of Prisons policy statements, and relevant case law.

The architecture is security-first in a way most AI projects never have to consider. A three-layer PII redaction quorum strips personal information before anything touches a language model. HSM tokenization vaults handle what remains. Every response passes through 100% human review—AI assists, it never decides alone. None of this is optional. Without it, the system has no business existing. In a context where a wrong answer affects someone's liberty, confidence scores and legal expert validation are not features. They are requirements.

The knowledge base is version-controlled with "versioned interpretations"—because the law changes, case law evolves, and a system that was correct last month can be wrong today. The phased roadmap starts with a fully manual response service, builds a training corpus from real questions, and only introduces RAG-assisted drafting once accuracy has been validated by legal experts on real data.

I care about this because the people who need it most have the least ability to advocate for themselves. Technology should close that gap, not widen it.
