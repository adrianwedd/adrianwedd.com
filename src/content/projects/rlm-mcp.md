---
title: "rlm-mcp"
description: "MCP server for processing arbitrarily long contexts. Enables Claude Code to work with 1M+ character documents."
tags: ["ai", "mcp", "python", "tools"]
repo: "https://github.com/adrianwedd/rlm-mcp"
status: "active"
featured: false
date: 2025-11-01
---

Recursive Language Model pattern implemented as an MCP server. Session-based document management with BM25 search, persistent indexes surviving server restarts, and complete artifact provenance tracking.

103/103 tests passing. Sub-second searches, under 100ms index loads. Concurrent session safety with per-session locks. Built for team environments where context windows aren't enough.
