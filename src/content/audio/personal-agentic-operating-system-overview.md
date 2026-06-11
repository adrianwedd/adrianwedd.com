---
title: 'An Agentic System You Can Actually Reason About'
description: 'Audio overview of PAOS — a local-first LLM operating system with hybrid retrieval and a self-improving meta-agent.'
date: 2025-07-01
tags: ['notebooklm', 'ai', 'infrastructure', 'agents']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/personal-agentic-operating-system/audio.m4a'
duration: '23:32'
relatedProject: 'personal-agentic-operating-system'
---

Most agentic systems assume the cloud. PAOS assumes your machine. Everything runs in Docker on your hardware — no external API calls required unless you choose them. The decision of where your data goes and which model processes it stays with you.

This episode explores the architecture of a local-first operating system for LLM agents. The core is a LangGraph workflow: plan, prioritise, retrieve, execute, checkpoint. Hybrid retrieval combines Neo4j entity lookups with Qdrant vector search, because neither graph traversal nor embedding similarity alone captures how humans organise knowledge. A human-in-the-loop checkpoint sits before any consequential action, because autonomy without oversight is just automation you cannot debug.

The most interesting part is the self-improvement loop. A meta-agent runs on a schedule, reading reflection logs and updating system guidelines that get injected at runtime. This isn't self-improvement in the breathless AGI sense. It's traceable adaptation: what changed, why it changed, and what it broke. Every trace flows through Langfuse. Every node and tool call is observable. The motivation was simple — not a black box that sometimes helps, but a system with legible state, explicit checkpoints, and a memory architecture you can inspect and trust.

[View the full project →](/projects/personal-agentic-operating-system/)
