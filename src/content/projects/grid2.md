---
title: "Grid 2.0"
description: "Deterministic AI website builder—beam search for page assembly, tone-aware components, real-time editing."
tags: ["ai", "web", "typescript"]
repo: "https://github.com/adrianwedd/grid2_repo"
status: "experiment"
featured: false
date: 2025-05-01
heroImage: "/images/projects/grid2-hero.webp"
---

The problem with AI website builders is hallucination. Ask a language model to generate a page and you get something that looks plausible until you inspect it—broken layouts, invented components, styles that conflict. The output is probabilistic. Probability is not what you want from a build system.

I built Grid 2.0 with a different approach: AI for understanding, algorithms for execution. A language model interprets what the user wants—the intent, the tone, the content structure. But the actual page assembly is handled by a beam search algorithm that selects the optimal combination of sections from a component library. The result is deterministic. Same inputs, same page, every time.

The component library is tone-aware. Every section can render in different tones—minimal, bold, playful, corporate—so brand identity propagates through the page without manual styling. A pure transform system provides a set of composable functions for modifying the generated page after assembly. Every transform is reproducible. The real-time editor lets you see changes as you make them, with full undo/redo history.

The chat interface parses natural language commands into transforms. Right now it uses regex. You could layer an LLM classifier on top. But the point is that the page generation pipeline—beam search, audit, render—never depends on a generative model to produce markup. The LLM stays in the understanding layer. The algorithm stays in the execution layer. The boundary is the architecture.
