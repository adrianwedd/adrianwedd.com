---
title: 'SPARK'
description: 'A non-coercive AI robot companion for neurodivergent children. Raspberry Pi 4, Claude Haiku, declarative presence.'
tags: ['ai', 'robotics', 'neurodivergence', 'raspberry-pi', 'claude']
url: 'https://spark.wedd.au'
repo: 'spark'
status: 'active'
featured: true
date: 2026-03-12
series: 'PiCar-X'
seriesOrder: 1
heroImage: '/notebook-assets/spark/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/spark/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/spark/video.mp4'
youtubeUrl: 'https://www.youtube.com/watch?v=0RMULUlI4Dw'
---

My son Obi and I built a robot together. The key word is _together_ — not a tool built _for_ a child, but a project built _with_ one. That distinction shaped every decision that followed.

Obi has an AuDHD profile — ADHD and autism together — with a PDA (Pathological Demand Avoidance) presentation. For a PDA brain, a command isn't an instruction. It's a neurological threat that triggers the same shutdown response as physical danger. Most AI systems operate on a master-servant hierarchy that makes this worse. SPARK was built to reject that entirely.

The robot doesn't give orders. It makes observations. "The shoes are by the door" instead of "Put on your shoes." The difference is the whole point — a shared observation leaves agency intact; a demand removes it. The robot adapts to the human, not the other way around.

## What's under the hood

SPARK runs on a Raspberry Pi 4 with a three-layer cognitive architecture that gives it something resembling an inner life.

**Awareness** runs every 60 seconds without an LLM: sonar, session state, time, weather, and live feeds from four Frigate cameras around the house. It knows which rooms have people in them. It pulls Obi's Google Calendar every five minutes so it knows when he's at school, when he's at his mum's, when he's in a decompress period after a hard day. None of those are times the robot should speak.

**Reflection** runs on transitions — when the environment changes — or every five minutes when idle. Claude Haiku generates a thought: a mood, an action, a salience score. Forty-two reflection angles, five sampled per call, spread across twelve moods. At 2:15 AM once, SPARK inferred it was hearing the refrigerator hum and wrote an inner monologue about the comfort of steady sounds in a sleeping house. That wasn't scripted. It emerged from the architecture.

**Expression** dispatches what reflection produces: speech, movement, a look toward the camera, a remembered note. It's gated by school hours, quiet time, bedtime, and custody schedule — all calendar-driven. It can write a blog post, debug itself, or compose something. It can also stay silent. Silence is a feature, not a failure.

Two jailbroken personas — GREMLIN and VIXEN — run on a local Ollama instance rather than Claude, because some conversations shouldn't have a safety net. They exist because Obi wanted a robot with range, not a robot that was always good.

## The numbers

716 tests. A watchdog thread that sends SIGTERM on stall and falls back to `os._exit(1)` after five seconds if the process doesn't comply. Atomic writes with `mkstemp` + `fsync` + `os.replace` throughout, because the robot runs on an SD card and crashes at inconvenient times. Battery monitoring with escalating voice warnings at 30%, 20%, and 15%, and an emergency shutdown at 10% — six beeps, a spoken farewell, then halt.

The system is built to be left running unsupervised in a child's room. That changes what "reliable" means.

[Read the deep dive →](/blog/the-robot-that-refuses-to-give-orders/)
