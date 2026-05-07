---
title: 'ModelAtlas'
description: 'Forensic-grade intelligence framework for mapping, enriching, and trust-scoring the foundation model landscape.'
tags: ['ai', 'research', 'python']
repo: 'https://github.com/adrianwedd/ModelAtlas'
status: 'active'
featured: false
date: 2025-04-15
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/modelatlas/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/modelatlas/video.mp4'
heroImage: '/notebook-assets/modelatlas/infographic.webp'
youtubeUrl: 'https://www.youtube.com/watch?v=Y9o5Iy_daps'
---

There are thousands of foundation models now. New ones appear daily. Most metadata is incomplete, inconsistent, or incorrect. Critical details like context lengths, base model lineage, and quantization specifics are often buried in configuration blobs. If you want to choose a model for a production system, you are assembling the picture yourself from fragments.

ModelAtlas makes this process systematic. It is a forensic-grade, modular intelligence framework designed for parsing, enriching, auditing, and visualizing the foundation model landscape. It ingests raw metadata from the Ollama registry and employs RECURSOR-1—a recursive enrichment agent—to normalize fields, infer missing data, decode manifests, and leverage LLMs to bridge gaps heuristics cannot fill. The output is structured, versioned metadata with provenance tracking at every step.

TrustForge computes a trust score by fusing metrics including license compliance, download statistics, upstream lineage, and LLM-inferred risk assessments. TracePoint provides lineage debugging—you can inspect any model's journey from raw scrape through every enrichment decision to its final metadata state, including the prompts that drove each inference.

The philosophy is that metadata is critical infrastructure. When researchers, engineers, and agentic systems need to select a model, they should be able to trace why that model exists, what it was built from, and whether the claims about it hold up. Trust must be quantifiable. Enrichment must be recursive. The system should be able to explain its own construction.

The framework includes a semantic search CLI, an automated enrichment trace, and a React-based dashboard, AtlasView, for visual analytics. Models are stored as enriched JSON with Git LFS for the large artefacts.
