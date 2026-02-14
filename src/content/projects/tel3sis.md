---
title: "TEL3SIS"
description: "Voice-first agentic platform for phone calls. Real-time STT, LLM reasoning, and TTS with sub-3s latency."
tags: ["ai", "voice", "telephony", "python"]
repo: "https://github.com/adrianwedd/TEL3SIS"
status: "active"
featured: false
date: 2025-10-01
heroImage: "/notebook-assets/tel3sis/infographic.webp"
---

The phone call is the oldest real-time interface we have. It's also the one AI handles worst. Chat is easy—latency is invisible, you can take a few seconds to think, the user stares at a typing indicator and waits. On a phone call, three seconds of silence is an eternity. It's the gap where the caller decides the system is broken, or stupid, or both.

TEL3SIS is a voice-first agentic platform built around that constraint. The entire architecture—speech-to-text, LLM reasoning, text-to-speech—is optimised to complete the full loop in under three seconds. Not as a benchmark. As a survival threshold.

The system integrates with calendars, weather, SMS, and email. It handles context-aware call forwarding to humans when the conversation exceeds what an agent should attempt—a safety boundary that too many voice AI systems omit because it feels like admitting defeat. Tri-layer memory across Redis, SQLite, and vector storage gives the agent conversational persistence without the hallucination risk of stuffing everything into a single context window. A safety oracle performs pre-execution filtering on every action.

The name is an acronym: Telephony-Linked Embedded LLM System for Interactive Support. The design philosophy is simpler: if you're going to put an AI on a phone line, it needs to be fast enough to feel present and honest enough to hand off when it shouldn't be.
