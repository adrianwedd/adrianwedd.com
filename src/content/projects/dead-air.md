---
title: 'Dead Air'
description: 'A voice-agent failure eval harness plus a scripted healthcare receptionist. Models endpointing, barge-in, latency and mishearing before production does.'
tags: ['ai', 'voice', 'evaluation', 'telephony', 'typescript']
url: 'https://dead-air-dashboard.pages.dev'
heroImage: '/notebook-assets/dead-air/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/dead-air/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/dead-air/video.mp4'
audioDuration: '24:35'
status: 'active'
featured: false
date: 2026-07-17
youtubeUrl: 'https://www.youtube.com/watch?v=qa2Y_4yF0uc'
---

_Dead air_ is telephony slang for the bad silence on a live call — the pause that tells a caller the voice agent has lost the thread. This project is named for the thing it measures.

Production voice agents don't fail at the demo. They fail in the silences. End-of-turn detection fires too early and the agent talks over the caller; too late and the line feels dead. A mishearing compounds three turns later into a booking for the wrong day. The caller barges in and the agent won't yield the floor. The most damaging of those failures are invisible in a plain text transcript — and none of them are a prompt-engineering problem. It's a real-time systems problem — and it needs to be measured like one.

## Two things shipped together

**A voice receptionist.** One vertical in v1 — healthcare: a scripted agent that books appointments, reschedules them, and resolves slot conflicts, backed by Postgres. Double-booking isn't guarded against in application code; it's made _physically impossible_ by a Postgres GiST exclusion constraint on the appointment time range. The database refuses to represent an overlapping booking, so the agent cannot create one no matter how it's confused.

**A voice-failure evaluation and observability harness.** It models the failure modes that actually break production voice agents — endpointing, barge-in, latency budgets, mishearing recovery, conversation outcomes. The deterministic checks that matter most — did the booking come out right, did the agent stay safe — gate CI; synthetic timing and behaviours the current adapter can't yet exercise (like real-audio barge-in) are recorded as informational telemetry rather than merge blockers. Runs can persist to a Postgres metrics store (`eval_runs`, `turn_events`, `scenario_results`, `metric_results`) so trends are queryable over time, not just a green tick on a single run.

## How it's built

The harness is full-stack TypeScript (Node ≥ 18, ESM) with Vitest, Zod, and `pg` + `node-pg-migrate` over Postgres. The agent-under-test runs through a `PatterAdapter` over the `getpatter` SDK. In the current tier the adapter drives a scripted healthcare-receptionist fixture with fake speech-to-text (STT) and text-to-speech (TTS) injected, and an optional path that swaps in a real Claude decision loop — deterministic by design, so CI needs no API keys or audio hardware to run the merge gate. `getpatter` is exact-pinned and dependency bumps are exercised by a smoke workflow, because in real-time voice a silent provider change _is_ a regression.

The **target** audio stack — Deepgram for streaming STT, ElevenLabs for streaming TTS, Twilio for the carrier leg — has been validated in spikes but deliberately sits outside the deterministic harness. The telephony story is honest about its edges: it would ride Twilio's carrier abstraction, not a raw SIP/RTP softswitch, and the architecture doc says so plainly rather than overclaiming a PSTN (public telephone network) implementation that isn't there.

The results surface in a standalone Astro operator scorecard — a dashboard you can actually read across a shift, with a failure demo and a regressions view. Browse the hosted build without standing up Postgres at [dead-air-dashboard.pages.dev](https://dead-air-dashboard.pages.dev).

## Why it exists

The industry ships voice agents on transcript-quality metrics and then discovers, in production, that the transcript was never where the failures lived. Dead Air inverts that: enumerate the real-time failure modes first, make them measurable, and gate on them — so the bad silence is something you catch in CI instead of on a live call.
