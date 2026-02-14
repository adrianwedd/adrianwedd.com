---
title: "rlm-mcp"
description: "MCP server for processing arbitrarily long contexts. Enables Claude Code to work with 1M+ character documents."
tags: ["ai", "mcp", "python", "tools"]
repo: "https://github.com/adrianwedd/rlm-mcp"
status: "active"
featured: false
date: 2025-11-01
heroImage: "/notebook-assets/rlm-mcp/infographic.webp"
---

Context windows have limits. Documents don't. The mismatch creates a practical problem: if your working document exceeds what the model can hold in a single pass, you're forced into chunking strategies that lose coherence, or summarisation that loses detail, or simply giving up on using the document at all.

rlm-mcp implements the Recursive Language Model pattern as an MCP server—session-based document management with BM25 search, persistent indexes that survive server restarts, and complete artefact provenance tracking so you know which part of which document produced which output.

I built this for the workflow where context windows aren't enough: long-form research, multi-chapter manuscripts, regulatory documents that run to hundreds of pages. Sub-second searches, under 100ms index loads, concurrent session safety with per-session locks. The architecture assumes a team environment where multiple people need simultaneous access to the same corpus without stepping on each other's state.

One hundred and three tests. All passing. Because when the tool's job is to extend the reach of a language model, it needs to be the most reliable thing in the chain.
