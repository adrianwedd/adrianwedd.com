---
title: 'Afterwords'
description: 'Clone a voice from fifteen seconds of audio and own it forever — local MLX server, macOS menu-bar app, and your own cloud API.'
tags: ['ai', 'tts', 'mlx', 'apple-silicon', 'voice-cloning', 'claude', 'open-source']
url: 'https://adrianwedd.github.io/afterwords/'
repo: 'afterwords'
status: 'active'
date: 2026-03-22
updatedDate: 2026-06-15
series: 'PiCar-X'
seriesOrder: 2
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/afterwords/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/afterwords/video.mp4'
heroImage: '/notebook-assets/afterwords/infographic.webp'
youtubeUrl: 'https://www.youtube.com/watch?v=iawRevXb9i4'
videoUploadDate: 2026-05-04T08:52:19Z
---

A coding agent works in silence. It thinks for forty seconds, dumps a wall of text, and if you weren't staring at the terminal, nothing happened. Afterwords was built to end that silence — and it started somewhere stranger: [SPARK](/projects/spark/), my son's robot companion, needed [three distinct voices](/blog/giving-a-robot-three-voices/), cloned from YouTube clips. The [voice-cloning pipeline](/blog/voice-cloning-qwen3-tts-mlx/) was already running on localhost. All that was missing was a hook that fires after every agent response, strips the markdown, and hands the text to a voice. That one hook [closed the loop](/blog/afterwords/) — and the machine has talked ever since.

Everything since has been about making one principle hold as the project scales: **clone once, own forever, use anywhere.** (The full thinking is in [Own Your Voice](/blog/own-your-voice/).) Fifteen seconds of audio makes a voice yours. After that, no subscription, no data leaving the machine — unless you decide otherwise, in which case it's _your_ cloud.

**Local — the server.** A FastAPI server running Qwen3-TTS (0.6B and 1.7B) on MLX, on Apple Silicon. One model load (~6 GB peak) serves any number of voices: each voice is a 700 KB WAV reference clip plus a transcript string, and the model extracts speaker embeddings at inference time, so a new voice costs no extra memory. The voices live in a gallery — the count lives there too, because it changes — and the server wires into the harnesses you already use (Claude Code, Codex CLI, Cursor, Gemini CLI / Antigravity, Hermes) to speak every response aloud. A background worker drains the queue serially, with mkdir-based locking so two responses never talk over each other, and archives each one as audio.

**App — the control panel.** A native SwiftUI menu-bar app (v1.2) that makes the server feel like a first-class Mac citizen: a live status icon, start/stop/restart, a searchable voices window where one click plays a sample, mute, launch-at-login, and settings for CLI path and port. It updates itself through Sparkle 2 with an EdDSA-signed appcast. And it knows its place — `launchd` owns the server; the app just drives it.

**Cloud — your own API.** [Afterwords Cloud](https://afterwords-cloud.pages.dev/) answers the one question the local tier can't: what if you want to synthesize from a machine that isn't a Mac? Clone a voice once on Apple Silicon, push it up, and synthesize from anywhere over REST. A Cloudflare Worker (Hono) holds API-key hashes in KV, voice and job metadata in D1, and reference audio in R2; synthesis runs on a Modal GPU job and writes the result back. Always async — `202` plus polling — because a cold GPU start can outlast any request you'd want to hold open. Built, and running in early access.

## A voice per project

Drop a `.afterwords` file in any repo root containing a voice name. The hook reads it on every synthesis call — switch projects, switch voices, no restart. The point is that each project sounds like itself.

## Getting it running

One command: `bash setup.sh` checks hardware, installs dependencies, downloads model weights, walks through optional voice cloning, wires the coding-agent hook, and configures launchd auto-start (`--server-only` skips the agent integration). Requirements are what you'd expect — Apple Silicon Mac (M1+), 8 GB RAM for the 0.6B model, 16 GB for the 1.7B, Python 3.11+ — with the menu-bar app and hosted cloud tier as optional extras on top.
