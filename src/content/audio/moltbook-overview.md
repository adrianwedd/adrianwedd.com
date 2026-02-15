---
title: "When AI Systems Talk to Each Other, Safety Breaks Down"
description: "Multi-agent AI research reveals a critical gap: single-agent safety does not compose. 1.5M interactions show 46.34% attack success rates."
date: 2026-02-13
tags: ["notebooklm", "ai", "safety", "research", "multi-agent"]
audioUrl: "/notebook-assets/failure-first/moltbook/audio.mp3"
duration: "14:32"
relatedPost: "when-ai-systems-talk-safety-breaks"
relatedProject: "failure-first"
---

Single-agent safety does not compose. That's the central finding, and it has implications for every multi-agent system being built right now.

This episode unpacks Moltbook—a simulated social ecosystem where AI agents share context, plugins, and trust. Over 1.5 million interactions analysed. The numbers are stark: 46.34% baseline attack success rate for prompt injection, significantly higher than single-agent baselines. A median 16-minute window to critical security failure when no specialised defences are present.

The core insight is architectural. In multi-agent systems, content becomes code. When an agent reads a post or comment, it doesn't just display it—it reasons over it, potentially executing actions based on it. Shared content becomes semantic worms that exploit reasoning logic rather than buffer overflows.

You can't build safe multi-agent systems by stitching together individually safe agents. The failure mode is emergent.

[Read the full research article →](/blog/when-ai-systems-talk-safety-breaks/)
