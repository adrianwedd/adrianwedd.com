---
title: 'ModelAtlas'
description: 'Forensic-grade intelligence framework for mapping, enriching, and trust-scoring the foundation model landscape.'
tags: ['ai', 'research', 'python']
repo: 'https://github.com/adrianwedd/ModelAtlas'
status: 'active'
featured: false
date: 2025-04-15
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/modelatlas/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/modelatlas/video.mp4'
heroImage: '/notebook-assets/modelatlas/infographic.webp'
youtubeUrl: 'https://www.youtube.com/watch?v=Y9o5Iy_daps'
videoUploadDate: 2026-05-05T01:32:21Z
---

There are thousands of foundation models now. New ones appear daily. Most metadata about them is incomplete, inconsistent, or wrong. Context lengths are missing. Base model lineage is ambiguous. Quantisation details are buried in config blobs that nobody parses. If you want to choose a model for a production system, you are assembling the picture yourself from fragments.

I built ModelAtlas to make that process systematic. It is a framework for parsing, enriching, auditing, and visualising the foundation model landscape. It starts with raw scrapes from Ollama's registry and other model hosts, then runs a recursive enrichment agent — RECURSOR-1 — that normalises fields, infers missing data and decodes manifests. The LLM enrichment stage is specified and instrumented, with prompts written per model; it has not yet been run across the corpus, and every record says so in its own metadata rather than quietly presenting a placeholder as an inference. What exists now is 704 records of structured, versioned metadata carrying their own provenance.

TrustForge computes a trust score for each of those records from what the data actually holds — licence class, download counts, context length, availability signals, and jailbreak/privacy annotations where a host supplied them. It is an explicit heuristic, not a verdict: a record with missing fields scores low because the evidence is thin, not because the model is bad.

The philosophy is that metadata is critical infrastructure. When researchers, engineers, and agentic systems need to select a model, they should be able to trace why that model exists, what it was built from, and whether the claims about it hold up. Trust must be quantifiable. Enrichment must be recursive. The system should be able to explain its own construction.

A CLI provides semantic search. A React dashboard is in development for visual analytics. The whole pipeline runs from a single command. Models are stored as enriched JSON with Git LFS for the large artefacts.
