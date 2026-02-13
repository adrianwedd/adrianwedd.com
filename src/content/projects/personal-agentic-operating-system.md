---
title: "Personal Agentic Operating System"
description: "Local-first LLM agents orchestrated with LangGraph, powered by Qdrant and Neo4j, observable via Langfuse."
tags: ["ai", "infrastructure", "python"]
repo: "https://github.com/adrianwedd/personal-agentic-operating-system"
status: "active"
featured: false
date: 2025-07-01
heroImage: "/images/projects/personal-agentic-operating-system-hero.webp"
---

Most agentic systems assume the cloud. I built this one to assume your machine.

PAOS is a local-first operating system for LLM agents. Everything runs in Docker on your hardware—no external API calls required unless you choose them. The LLM backend is pluggable: Ollama for local inference, or OpenAI, Gemini, DeepSeek when you want to reach out. The decision of where your data goes and which model processes it stays with you.

The core is a LangGraph workflow: plan, prioritise, retrieve, execute, checkpoint. Hybrid retrieval combines Neo4j entity lookups with Qdrant vector search filtered by metadata. Neither graph traversal nor embedding similarity alone captures how humans organise knowledge. Together they get closer. A human-in-the-loop checkpoint sits before any consequential action, because autonomy without oversight is just automation you cannot debug.

The part I find most interesting is the self-improvement loop. A meta-agent runs on a schedule—daily, if you set the cron—reading reflection logs and updating system guidelines that get injected at runtime. The point is not "self-improvement" in the breathless AGI sense. The point is traceable adaptation: what changed, why it changed, and what it broke. Every trace flows through Langfuse. Every node and tool call is observable. The Mermaid graph re-renders on each build so the architecture documentation stays honest.

The motivation was simple: I wanted an agentic system I could reason about. Not a black box that sometimes helps, but a system with legible state, explicit checkpoints, and a memory architecture I can inspect and trust.
