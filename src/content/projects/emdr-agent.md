---
title: "EMDR Agent"
description: "AI-powered therapeutic agent for EMDR protocol guidance with real-time distress monitoring and crisis intervention."
tags: ["ai", "health", "typescript"]
repo: "https://github.com/adrianwedd/emdr-agent"
status: "experiment"
featured: false
date: 2025-06-01
audioUrl: "/notebook-assets/emdr-agent/audio.mp3"
heroImage: "/notebook-assets/emdr-agent/infographic.webp"
---

Therapy has a pacing problem. A human therapist reads the room—breath, posture, the micro-expressions that signal when to slow down or when to press forward. Software does not get that for free.

I built this to explore what safety requirements an AI-assisted EMDR system would need before it could be useful. Eye Movement Desensitization and Reprocessing is one of the most evidence-based trauma therapies we have. Its protocols are precise. Its failure modes are serious. Get the bilateral stimulation timing wrong, push too quickly through a traumatic memory, or miss a dissociative response, and you have done harm.

The architecture starts with safety, not features. Three layers of distress monitoring run continuously during every session. Grounding techniques trigger automatically when physiological arousal crosses thresholds. Crisis intervention protocols exist as hard stops—not suggestions the model might ignore, but deterministic gates that lock the AI out entirely and hand control to pre-written safety scripts and human referral pathways.

The adaptive protocol engine adjusts EMDR phases—desensitization, installation, body scan—based on real-time distress signals. Multi-modal bilateral stimulation supports visual tracking, auditory tones, and tactile pulses. Progress tracking generates a legible session record for both the user and any supervising clinician.

This is not a replacement for a therapist. It cannot be, and the README states that clearly. But the question of what responsible AI-assisted therapeutic tooling looks like is worth taking seriously—especially in contexts where the alternative is no access at all.
