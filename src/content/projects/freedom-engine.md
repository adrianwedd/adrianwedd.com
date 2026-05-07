---
title: 'Freedom Engine'
description: 'AI tool making First Step Act sentence credits accessible for 264,000+ eligible federal inmates despite legal complexity.'
tags: ['ai', 'justice', 'python']
repo: 'https://github.com/adrianwedd/freedom-engine'
status: 'active'
featured: false
date: 2025-04-01
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/freedom-engine/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/freedom-engine/video.mp4'
heroImage: '/notebook-assets/freedom-engine/infographic.webp'
youtubeUrl: 'https://www.youtube.com/watch?v=DiUEJScqN8I'
---

Over 264,000 people are held in the US federal prison system. Many are eligible for reduced sentences under the First Step Act. The provisions exist. The information is public. But the legal complexity makes it inaccessible to most inmates without outside help. The information gap is not theoretical—it costs people months or years of their lives.

I built the Freedom Engine to bridge that gap. It is a secure, human-in-the-loop Q&A service that helps federal inmates understand and apply the First Step Act (FSA) Time Credit system. By providing accurate, plain-language answers grounded in federal statutes, BOP policies, and case law, we aim to reduce confusion and facilitate potential sentence reductions.

The architecture is security-first in a way most AI projects never have to consider. A three-layer PII redaction quorum strips personal information before anything touches a language model. HSM tokenization vaults handle what remains. Every response passes through 100% human review—AI assists, it never decides alone. None of this is optional. Without it, the system has no business existing. In a context where a wrong answer affects someone's liberty, confidence scores and legal expert validation are not features. They are requirements.

The knowledge base is version-controlled with "versioned interpretations"—because the law changes, case law evolves, and a system that was correct last month can be wrong today. The phased roadmap starts with a fully manual response service, builds a training corpus from real questions, and reserves RAG-assisted drafting for future phases, strictly after accuracy has been validated by legal experts.

I care about this because the people who need it most have the least ability to advocate for themselves. Technology should close that gap, not widen it.
