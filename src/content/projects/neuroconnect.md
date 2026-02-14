---
title: "NeuroConnect"
description: "24/7 AI voice helpline for Australians with ADHD—executive function scaffolding, crisis detection, NDIS evidence logging."
tags: ["ai", "health", "adhd", "python"]
repo: "https://github.com/adrianwedd/neuroconnect"
status: "active"
featured: false
date: 2025-05-01
audioUrl: "/notebook-assets/neuroconnect/audio.mp3"
heroImage: "/notebook-assets/neuroconnect/infographic.webp"
---

A person with ADHD calls a helpline. They trail off mid-sentence. There is a pause—maybe they lost the word, maybe they lost the thread, maybe they are in crisis. The system has to know the difference. It has to know in under a second.

I built NeuroConnect as a 24/7 voice and text helpline designed from the ground up around neurodivergent communication patterns. Every parameter is research-backed: responses stay under 40 words because working memory is finite. Options are capped at three because cognitive load is real. Mouth-to-ear latency targets 800 milliseconds because delay aversion is not a preference—it is neurology.

Crisis detection is deterministic. No ML thresholds. No hoping the model gets it right. Regex patterns calibrated against ADHD speech—the hyperbole, the rejection-sensitive dysphoria, the burnout language that sounds alarming but is not—run in under 10 milliseconds. When danger is real, the LLM is locked out. A pre-written safety script takes over. Lifeline numbers are read aloud. A webhook fires to human responders. There is no execution path where a language model decides whether someone is safe.

The voice pipeline streams from Twilio through Deepgram to the cognitive loop and back through ElevenLabs. Adaptive silence detection extends the listening window when someone trails off mid-thought, because word-finding pauses are not turn boundaries. Filler phrases mask processing latency so the caller never hears dead air. Barge-in capability stops text-to-speech immediately when interrupted. If the LLM crashes, the caller still hears a voice.

Conversations are mined for NDIS functional capacity indicators—with consent—and mapped to support domains for plan reviews. Without consent, nothing is stored. 254 of 257 tests pass. The three that do not require a local PostgreSQL instance.
