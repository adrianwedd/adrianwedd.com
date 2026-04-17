---
title: 'What Safety Architecture Does AI Therapy Require?'
description: 'Audio overview of EMDR Agent — exploring what responsible AI-assisted trauma therapy demands before it can exist.'
date: 2025-06-01
tags: ['notebooklm', 'ai-safety', 'health', 'ai']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/emdr-agent/audio.mp3'
duration: '15:08'
relatedProject: 'emdr-agent'
---

Therapy has a pacing problem. A human therapist reads the room — breath, posture, the micro-expressions that signal when to slow down or press forward. Software does not get that for free. EMDR is one of the most evidence-based trauma therapies we have, and its failure modes are serious: get the bilateral stimulation timing wrong, push too quickly through a traumatic memory, or miss a dissociative response, and you have done harm.

This episode explores the architecture of a system built to answer a hard question: what safety requirements would an AI-assisted EMDR system need before it could be useful? Three layers of distress monitoring run continuously during every session. Grounding techniques trigger automatically when physiological arousal crosses thresholds. Crisis intervention protocols exist as hard stops — not suggestions the model might ignore, but deterministic gates that lock the AI out entirely and hand control to pre-written safety scripts and human referral pathways.

The adaptive protocol engine adjusts EMDR phases based on real-time distress signals. But the deeper point is that this is not a replacement for a therapist and cannot be. The question of what responsible AI-assisted therapeutic tooling looks like is worth taking seriously — especially in contexts where the alternative is no access at all.

[View the full project →](/projects/emdr-agent/)
