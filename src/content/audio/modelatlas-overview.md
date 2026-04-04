---
title: 'Trust-Scoring the Foundation Model Landscape'
description: 'Forensic-grade metadata for thousands of foundation models — recursive enrichment, provenance tracking, and trust you can quantify.'
date: 2025-04-15
tags: ['notebooklm', 'ai', 'research', 'python']
audioUrl: '/notebook-assets/modelatlas/audio.mp3'
duration: '13:29'
relatedProject: 'modelatlas'
---

There are thousands of foundation models now. Most metadata about them is incomplete, inconsistent, or wrong. Context lengths are missing. Base model lineage is ambiguous. Quantisation details are buried in config blobs that nobody parses. If you want to choose a model for production, you are assembling the picture yourself from fragments.

ModelAtlas makes that process systematic. A recursive enrichment agent — RECURSOR-1 — normalises fields, infers missing data, decodes manifests, and uses LLMs to fill gaps that heuristics cannot. TrustForge computes a trust score for each model by fusing metrics across dimensions: licence compliance, download statistics, upstream lineage, and LLM-inferred risk. TracePoint provides lineage debugging — you can inspect any model's journey from raw scrape through every enrichment decision to its final metadata state, including the prompts that drove each inference.

The philosophy is that metadata is critical infrastructure. When researchers, engineers, and agentic systems need to select a model, they should be able to trace why that model exists, what it was built from, and whether the claims about it hold up. Trust must be quantifiable. Enrichment must be recursive. The system should be able to explain its own construction.

[View the full project →](/projects/modelatlas/)
