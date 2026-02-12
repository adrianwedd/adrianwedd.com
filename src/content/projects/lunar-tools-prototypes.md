---
title: "Lunar Tools Prototypes"
description: "Interactive audiovisual art installations—dream interpreters, fingerprint painters, cosmic murals, and fractal forests."
tags: ["art", "ai", "installation", "python"]
repo: "https://github.com/adrianwedd/lunar_tools_prototypes"
status: "experiment"
featured: false
date: 2025-06-15
---

A visitor speaks into a microphone. Their voice becomes a brushstroke. An ambient sound becomes a fractal branch. A dream described aloud becomes an image that did not exist until they said it.

This is a collection of over twenty interactive audiovisual installations built with Lunar Tools. Each prototype explores a different intersection of AI generation, real-time audio, and human input—speech-to-text to GPT to DALL-E to screen, all in a loop tight enough that the visitor feels like a participant, not a spectator.

The Acoustic Fingerprint Painter renders abstract brushstrokes driven by the unique qualities of each visitor's voice. The Dream Interpreter listens to spoken descriptions and visualises them through Stable Diffusion pipelines. The Evolving Cosmic Mural generates a continuously morphing visual driven by AI descriptions and MIDI controls. The Audio-Reactive Fractal Forest builds an ever-growing tree structure whose shape and colour respond to ambient sound in real time.

Other prototypes include a collaborative canvas where multiple visitors paint together with periodic AI style suggestions, a narrative quilt that grows one visual patch per chat message, a generative poetry mosaic of AI-written couplets illustrated by DALL-E, and a neural style-transfer music visualiser that synchronises effects to live beats.

The shared core centralises Lunar Tools instances—Speech2Text, GPT4, TTS, AudioRecorder, Renderer, MIDI, and WebCam—so each prototype can focus on its own logic rather than boilerplate. A CLI entrypoint launches any installation by name. The work is deliberately experimental: some of these are gallery-ready, some are sketches, and the line between those categories is part of the point.
