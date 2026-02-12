---
title: "Ticketsmith"
description: "Enterprise AI automation for Jira and Confluence with self-hosted vLLM inference and RAG pipelines."
tags: ["ai", "infrastructure", "python"]
repo: "https://github.com/adrianwedd/ticketsmith"
status: "active"
featured: false
date: 2025-08-01
---

Every organisation that uses Jira and Confluence has the same problem: the knowledge is there, but finding it costs more than recreating it. Tickets reference documents that reference other tickets. Context lives in comments that nobody reads twice. The institutional memory is vast and effectively inaccessible.

I built Ticketsmith to make that knowledge useful. It is an AI automation platform that sits on top of Atlassian's ecosystem. A ReAct agent loop reads tickets, retrieves relevant Confluence pages through a RAG pipeline, and generates responses grounded in the organisation's actual documentation—not general training data.

The architecture runs on sovereign compute. A containerised vLLM server exposes an OpenAI-compatible API backed by open-weight models like Llama 3. No data leaves your infrastructure. For developers without GPU access, a local llama-cpp-python path supports quantised models on consumer hardware. The inference layer is a dependency you control, not a service you rent.

The RAG pipeline handles ingestion and retrieval across Atlassian's API surface—issues, pages, comments, attachments—and maintains an evaluation dataset of curated prompt-response pairs. Accuracy is measurable. Regressions are catchable. Model selection is documented in a decision matrix that maps task types to model capabilities.

I built this because the gap between "we have documentation" and "the AI can find and use our documentation" is where most enterprise AI projects fail. The documentation exists. The retrieval infrastructure is the missing piece. Running it on your own hardware means the security conversation is already over.
