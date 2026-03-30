---
title: "AI for Understanding, Algorithms for Execution"
description: "A deterministic website builder where LLMs interpret intent but beam search assembles pages. Same inputs, same output, every time."
date: 2025-05-01
tags: ["notebooklm", "ai", "web", "typescript"]
audioUrl: "/notebook-assets/grid2/audio.mp3"
duration: "0:00"
relatedProject: "grid2"
---

Ask a language model to generate a web page and you get something that looks plausible until you inspect it — broken layouts, invented components, styles that conflict. The output is probabilistic. Probability is not what you want from a build system.

Grid 2.0 draws a hard line between understanding and execution. A language model interprets what the user wants — the intent, the tone, the content structure. But the actual page assembly is handled by a beam search algorithm that selects the optimal combination of sections from a component library. The result is deterministic. Same inputs, same page, every time. The component library is tone-aware, so every section can render in different registers — minimal, bold, playful, corporate — and brand identity propagates through the page without manual styling.

The boundary between LLM and algorithm is the architecture. A pure transform system provides composable functions for modifying the generated page after assembly. Every transform is reproducible. The chat interface parses natural language commands into transforms. The LLM stays in the understanding layer. The algorithm stays in the execution layer. That separation is not an implementation detail — it's the entire point.

[View the full project →](/projects/grid2/)
