---
title: 'Trust-Scoring the Foundation Model Landscape'
description: 'Forensic-grade metadata for thousands of foundation models — recursive enrichment, provenance tracking, and trust you can quantify.'
date: 2025-04-15
tags: ['notebooklm', 'ai', 'research', 'python']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/modelatlas/audio.mp3'
duration: '13:29'
relatedProject: 'modelatlas'
---

There are thousands of foundation models now. Most metadata is incomplete, inconsistent, or incorrect. Critical details like context lengths, base model lineage, and quantization specifics are often buried in configuration blobs. If you want to choose a model for production, you are assembling the picture yourself from fragments.

ModelAtlas makes that process systematic. A recursive enrichment agent — RECURSOR-1 — normalises fields, infers missing data, decodes manifests, and uses LLMs to fill gaps that heuristics cannot. TrustForge computes a trust score by fusing metrics including license compliance, download statistics, upstream lineage, and LLM-inferred risk assessments. TracePoint provides lineage debugging — you can inspect any model's journey from raw scrape through every enrichment decision to its final metadata state, including the prompts that drove each inference.

The philosophy is that metadata is critical infrastructure. When researchers, engineers, and agentic systems need to select a model, they should be able to trace why that model exists, what it was built from, and whether the claims about it hold up. Trust must be quantifiable. Enrichment must be recursive. The system should be able to explain its own construction.

[View the full project →](/projects/modelatlas/)
