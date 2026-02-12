---
title: "EMDR Agent"
description: "AI-powered therapeutic agent for EMDR protocol guidance with real-time distress monitoring and crisis intervention."
tags: ["ai", "health", "typescript"]
repo: "https://github.com/adrianwedd/emdr-agent"
status: "experiment"
featured: false
date: 2025-06-01
---

Therapy has a pacing problem. A human therapist reads the room—breath, posture, micro-expressions—and adjusts in real time. Software doesn't get that for free.

I built this as an exploration of what an AI-assisted EMDR system would need to be safe before it could be useful. Eye Movement Desensitization and Reprocessing is one of the most evidence-based trauma therapies we have, but its protocols are precise and its failure modes are serious. Get the bilateral stimulation wrong, push too fast through a memory, or miss a dissociative response, and you've done harm.

So the architecture is safety-first. Three layers of distress monitoring run continuously. Grounding techniques trigger automatically when arousal spikes. Crisis intervention protocols exist as hard stops—not suggestions the model can reason its way around, but deterministic gates that lock the AI out and hand control to pre-written scripts and human referral systems.

The adaptive protocol engine adjusts EMDR phases based on real-time signals. Multi-modal bilateral stimulation supports visual, auditory, and tactile channels. Progress tracking gives both the user and any supervising clinician a legible record of what happened and when.

This is not a replacement for a therapist. The README says it, and I mean it. But the question of what responsible AI-assisted therapeutic tooling looks like is worth taking seriously—especially when the alternative is no access at all.
