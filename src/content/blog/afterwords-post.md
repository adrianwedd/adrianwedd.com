---
title: 'Afterwords: Completing the Voice Loop in Claude Code'
description: 'Adding local TTS to Claude Code so it talks back — 17 cloned voices, zero cloud dependency, one stop hook.'
date: 2026-03-22
tags: ['ai', 'tts', 'mlx', 'apple-silicon', 'voice-cloning', 'claude', 'open-source']
series: 'PiCar-X'
seriesOrder: 4
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/afterwords-blog/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/afterwords/video.mp4'
heroImage: '/notebook-assets/afterwords/infographic.webp'
faq:
  - q: 'Does Afterwords send any data to the cloud?'
    a: 'No. The entire pipeline runs locally — MLX inference on Apple Silicon, FastAPI on localhost, audio playback on your speaker. Nothing leaves the machine.'
  - q: 'How much RAM does it need?'
    a: 'About 6 GB peak for the Qwen3-TTS 0.6B model at 8-bit quantisation. An M1 MacBook Air with 8 GB of unified memory is sufficient.'
  - q: 'Can different projects use different voices?'
    a: 'Yes. Drop a .afterwords file in any repo root containing a voice name. The hook reads it per synthesis — no server restart needed.'
  - q: 'How long does it take to speak a response?'
    a: 'About 15 seconds of fixed overhead for speaker embedding extraction, plus roughly 0.5x real-time for the audio. A typical two-sentence response takes 18–22 seconds on an M1.'
youtubeUrl: 'https://www.youtube.com/watch?v=ajdnUfqC7E4'
videoUploadDate: 2026-05-03T13:26:02Z
---

Claude Code already listens. Hold Space, talk, it transcribes. That half of the loop has worked for months. But every response comes back as text — silent characters on a dark terminal. You speak to it. It types back.

Afterwords closes the loop. It intercepts every Claude Code response, sends the text to a local TTS server, and plays it through the speaker. The result is a two-way voice conversation with your coding assistant, running entirely on your machine.

## Why This Exists

I built the TTS server for [SPARK](/projects/spark/) — a robot companion that needed [three distinct voices](/blog/giving-a-robot-three-voices/) cloned from YouTube clips. The [voice cloning pipeline](/blog/voice-cloning-qwen3-tts-mlx/) was already running on localhost. Claude Code was already running on the same machine. The only missing piece was a hook to connect them.

Claude Code's hook system made this trivial. A stop hook fires after every response. Strip the markdown, send the text to the TTS server, play the audio. Three components, zero new infrastructure.

The surprising part wasn't the engineering. It was the experience. Having Claude Code speak its responses changes the interaction pattern entirely. You stop reading diffs and start having conversations. Code review becomes a dialogue. Error explanations land differently when you hear them in Cate Blanchett's cadence.

## Architecture

Three components, all local:

```
Claude Code response
  → Stop Hook (tts-hook.sh)
    → strips markdown
    → queues text
  → Background Worker (tts-worker.sh)
    → sends to localhost:7860/synthesize
    → plays WAV through speaker
    → archives as MP3
```

The **TTS server** (`server.py`) is a FastAPI app running Qwen3-TTS Base — a 0.6B parameter model, 8-bit quantised, running on MLX. It loads once (~6 GB peak memory) and serves any number of voices. Each voice is just a 700 KB WAV reference clip and a transcript string. Adding a voice costs zero additional memory.

The **stop hook** fires after every Claude Code response. It strips markdown formatting (so the model doesn't try to pronounce backticks), truncates long responses, and drops the text into a queue directory.

The **background worker** processes the queue serially with mkdir-based locking — no audio overlap, no race conditions. Responses are archived as compressed MP3s in `~/.claude/tts-archive/`.

## 17 Voices, Zero Extra Memory

The voice library ships with 17 cloned voices, all extracted from public audio using the [clone-voice.sh](/blog/voice-cloning-qwen3-tts-mlx/#step-1-prepare-your-reference-audio) pipeline:

**Female:** Galadriel (Cate Blanchett), Samantha (Scarlett Johansson), Avasarala (Shohreh Aghdashloo), Vesper (Eva Green), Marla (Helena Bonham Carter), Claudia (Claudia Black), Aurora (AURORA), Audrey (Audrey Hepburn), Eartha (Eartha Kitt), Tilda (Tilda Swinton)

**Male:** Snape (Alan Rickman), Loki (Tom Hiddleston), Spock (Leonard Nimoy), Bardem (Javier Bardem), Depp (Johnny Depp)

**Character:** Vixen (children's poem reader), Obi (7-year-old Australian)

Every voice is a single WAV file (~700 KB) and a transcript. The model extracts speaker embeddings at inference time — no fine-tuning, no per-voice model copies. We serve all 17 from a single 8 GB M1 with no measurable difference in memory usage between one voice and seventeen.

## Per-Project Voice Selection

Different codebases deserve different voices. Drop a `.afterwords` file in any repo root:

```bash
echo "galadriel" > /path/to/my-project/.afterwords
```

The hook reads this file on every synthesis call. Switch projects, switch voices. No server restart, no configuration reload. The TTS server accepts the voice name as a query parameter — the hook just passes it through.

This means SPARK development gets Vixen's voice. This website gets Galadriel. Security research gets Snape. The voice becomes part of the project's character.

## Setup

One command:

```bash
git clone https://github.com/adrianwedd/afterwords.git
cd afterwords
bash setup.sh
```

The installer checks hardware compatibility, sets up the Python environment, downloads model weights (~1.5 GB on first run), walks through optional voice cloning, wires the Claude Code stop hook, and configures launchd auto-start. The server launches on boot and waits quietly until Claude Code has something to say.

**Requirements:** Apple Silicon Mac (M1+), 8 GB RAM, Python 3.11+, Claude Code with a Claude.ai account.

## What It's Not

Afterwords is not a voice assistant. It doesn't listen for wake words, doesn't maintain conversation state, doesn't do anything clever with audio input. Claude Code handles all the intelligence. Afterwords is plumbing — it takes text that was going to your eyes and routes it to your ears instead.

It's also not fast. Twenty seconds per response is fine for code review explanations and error analysis. It's not fine for rapid-fire debugging. The hook is smart enough to skip very short responses and truncate very long ones, but the latency is inherent to running a 600M parameter model on consumer hardware.

For tasks where you need speed, you'll still read. For tasks where you need comprehension — architecture discussions, security review walkthroughs, onboarding to unfamiliar codebases — hearing the response while you look at the code is a genuine improvement.

## The Broader Pattern

Afterwords exists because three things converged: open-source voice cloning models that actually work, Apple Silicon hardware that can run them in consumer RAM, and Claude Code's hook system that makes integration trivial. None of these existed two years ago.

The [voice cloning server](/blog/voice-cloning-qwen3-tts-mlx/) was built for a robot. It found a second life as a coding assistant's voice. The same server could voice a home automation system, a notification pipeline, a documentation reader. The model loads once. The voices are free. The integration point is always the same HTTP endpoint.

The code is MIT licensed and lives at [github.com/adrianwedd/afterwords](https://github.com/adrianwedd/afterwords). The landing page is at [adrianwedd.github.io/afterwords](https://adrianwedd.github.io/afterwords/).
