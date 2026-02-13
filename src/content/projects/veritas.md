---
title: "VERITAS"
description: "AI-native legal intelligence platform for Australian legal practice with privilege protection and precision RAG."
tags: ["ai", "legal", "python"]
repo: "https://github.com/adrianwedd/VERITAS"
status: "active"
featured: false
date: 2025-03-01
heroImage: "/images/projects/veritas-hero.webp"
---

Legal AI has an integrity problem. Most tools optimise for speed and treat accuracy as negotiable. In a profession where a hallucinated citation can end a career, that trade-off is backwards.

I built VERITAS as a legal intelligence platform designed specifically for Australian legal practice. It addresses what I call the efficiency-trust deficit—the gap between what AI can do quickly and what a lawyer can trust it did correctly. The architecture enforces trust at every layer: attorney-client privilege protection with end-to-end encryption. AGLC4-compliant citation validation. Court hierarchy-aware precedent analysis. An immutable audit trail with seven-year retention, because that is what the law requires.

The system runs as a microservices architecture—API gateway, authentication, legal reasoning, privilege protection, knowledge graph, and vector search—each independently deployable and observable through distributed tracing. The legal reasoning engine combines precision RAG with IRAC analysis and a citation network built on Neo4j. Precedent strength is computed from actual relationships between cases, not just keyword similarity.

What makes this different from a chatbot with a legal corpus is the constraint model. Matter segregation prevents cross-contamination between clients. Conflict detection runs before any analysis begins. Evidence chain of custody tracks admissibility at every step. These are not features. They are the minimum requirements for a system that a lawyer could use without professional liability exposure.

The Australian legal system has its own court hierarchy, its own citation format, and its own compliance standards. Building for it specifically—rather than treating it as a localisation of a US-centric product—is the point.
