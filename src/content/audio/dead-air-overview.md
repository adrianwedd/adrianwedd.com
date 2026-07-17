---
title: 'The Bad Silence: Measuring Where Voice Agents Fail'
description: 'Audio overview of Dead Air — a failure-eval harness for voice agents, and why the failures never live in the transcript.'
date: 2026-07-17
tags: ['notebooklm', 'ai', 'voice', 'evaluation']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/dead-air/audio.m4a'
duration: '24:35'
relatedProject: 'dead-air'
---

*Dead air* is telephony slang for the bad silence on a live call — the pause that tells a caller the agent has lost the thread. Production voice agents don't fail at the demo; they fail in the silences. Endpointing fires too early and the agent talks over you, or too late and the line feels dead. A mishearing in turn one compounds into a booking for the wrong day. None of that shows up in a text transcript.

This episode walks through Dead Air: a harness that models those real-time failure modes — endpointing, barge-in, latency, mishearing recovery — and gates the deterministic ones (did the booking come out right, did the agent stay safe) in CI without needing API keys or audio hardware. It covers the scripted-fixture-plus-optional-real-Claude adapter, the Postgres GiST constraint that makes double-booking physically impossible, and why honest scope beats an overclaimed telephony stack.

[View the full project →](/projects/dead-air/)
