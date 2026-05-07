---
title: 'Giving Claude Code a Voice'
description: 'Audio overview of Afterwords — local voice output for Claude Code with over 100 cloned voices, per-project selection, and zero cloud dependency.'
date: 2026-03-22
tags: ['notebooklm', 'ai', 'tts', 'voice-cloning']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/afterwords/audio.mp3'
duration: '21:43'
relatedPost: 'afterwords-post'
relatedProject: 'afterwords'
---

Claude Code already listens — hold Space, talk, it transcribes. But every response comes back as text. Afterwords closes the loop. A stop hook intercepts every response, sends it to a local TTS server running Qwen3-TTS on MLX, and plays it through the speaker. Two-way voice conversation with your coding assistant, running entirely on your machine.

This episode digs into how over 110 cloned voices serve from a single local TTS setup. Each voice is a 700 KB WAV reference clip and a transcript string — the model extracts speaker embeddings at inference time, so there is no fine-tuning and no per-voice model copies.

The most elegant detail is per-project voice selection. Drop a `.afterwords` file in any repo root containing a voice name. Switch projects, switch voices, no restart needed. SPARK development gets Vixen. This website gets Galadriel. Security research gets Snape. The TTS server was originally built for SPARK — a robot companion that needed three distinct voices — and the voice cloning pipeline was already running on localhost. A stop hook was the only missing piece.

[View the full project →](/projects/afterwords/)
