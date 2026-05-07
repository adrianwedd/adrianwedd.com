---
title: 'Beyond Context Windows'
description: 'Audio overview of rlm-mcp — an MCP server for processing million-character documents with BM25 search and provenance.'
date: 2026-05-07
tags: ['notebooklm', 'ai', 'mcp', 'tools']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/rlm-mcp/audio.mp3'
duration: '18:31'
relatedProject: 'rlm-mcp'
---

Context windows have limits. Documents don't. The mismatch creates a practical problem: if your working document exceeds what the model can hold in a single pass, you're forced into chunking strategies that lose coherence, summarisation that loses detail, or simply giving up on using the document at all.

This episode covers an MCP server that implements the Recursive Language Model pattern — session-based document management with BM25 search, persistent indexes that survive server restarts, and complete artefact provenance tracking so you know which part of which document produced which output. Sub-second searches, under 100ms index loads, concurrent session safety with per-session locks.

The architecture assumes the hardest use case: long-form research, multi-chapter manuscripts, regulatory documents that run to hundreds of pages, team environments where multiple people need simultaneous access to the same corpus without stepping on each other's state. When the tool's job is to extend the reach of a language model, it needs to be the most reliable thing in the chain. Comprehensive test suite. All passing.

[View the full project →](/projects/rlm-mcp/)
