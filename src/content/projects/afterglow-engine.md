---
title: "Afterglow Engine"
description: "Audio archaeology tool that mines past work for new textures. Pad mining, drone generation, granular clouds."
tags: ["music", "audio", "python", "creative"]
repo: "https://github.com/adrianwedd/afterglow-engine"
status: "active"
featured: true
date: 2026-02-02
---

The premise is simple and slightly unsettling: your best sounds already exist. They're buried in your finished work—in the reverb tails of tracks you forgot, the sub-harmonics of a pad you used once, the room tone of a recording you made in a different house, in a different year, in a different life.

Afterglow Engine is audio archaeology. It distils completed work into reusable sonic pigments: pad mining, drone generation, granular clouds, hiss and air textures—all extracted from your existing catalogue and output as 44.1kHz WAV files optimised for hardware samplers. You feed it an album. It returns the ghosts that were always inside it.

It started because I kept reaching for textures that felt familiar but didn't exist in any sample library. They existed in my own past work, but extracting them manually was slow enough to kill the creative impulse that wanted them. The engine automates the archaeology. STFT caching delivers a hundred-thousand-times speedup over naive analysis. A hundred and forty-nine tests with CI/CD and performance regression detection ensure the tool doesn't quietly degrade the thing it's supposed to preserve.

The past is a sample library. You just need the right excavation tool.
