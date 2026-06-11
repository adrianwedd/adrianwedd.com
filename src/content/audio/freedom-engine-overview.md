---
title: 'Bridging the Information Gap That Costs Years'
description: 'Audio overview of Freedom Engine — AI-assisted legal Q&A helping federal inmates access First Step Act provisions.'
date: 2025-04-01
tags: ['notebooklm', 'ai', 'justice', 'legal']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/freedom-engine/audio.m4a'
duration: '15:51'
relatedProject: 'freedom-engine'
---

Over 264,000 people sit in the US federal prison system. Many are eligible for reduced sentences under the First Step Act. The provisions exist. The information is public. But the legal complexity makes it inaccessible to most inmates without outside help — and that information gap costs people months or years of their lives.

This episode digs into the architecture of a system built to close that gap. Freedom Engine accepts questions about FSA time credits submitted through prison email systems like CorrLinks and JPay, then returns accurate, plain-language answers grounded in federal statutes and case law. The security architecture is unlike most AI projects: a three-layer PII redaction quorum, HSM tokenization vaults, and one hundred percent human review on every response. In a context where a wrong answer affects someone's liberty, these aren't features — they're requirements.

The deeper tension is between automation and accountability. The knowledge base uses versioned interpretations because law changes, case law evolves, and a system that was correct last month can be wrong today. The roadmap starts fully manual, builds a training corpus from real questions, and only introduces AI-assisted drafting once accuracy has been validated on real data by legal experts. The people who need this most have the least ability to advocate for themselves.

[View the full project →](/projects/freedom-engine/)
