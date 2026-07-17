---
title: 'Throw a Chicken'
description: 'A live Roblox game where you train at the gym, train stunt chickens to glide, and throw them as far as you can. Product-managed by my seven-year-old.'
tags: ['roblox', 'luau', 'gamedev', 'kids']
url: 'https://www.roblox.com/games/126535674028996'
heroImage: '/notebook-assets/throw-a-chicken/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/throw-a-chicken/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/throw-a-chicken/video.mp4'
audioDuration: '20:23'
status: 'active'
featured: false
date: 2026-07-12
---

My son Obi is the Product Manager on this one. He's seven. The full spec started as his idea, and every design decision — how far a chicken should glide, what the training loop feels like, whether the chickens look eager enough — got run past the person who commissioned it.

The pitch, in his words: *train yourself, train your chicken, pick the angle, throw farther.* Every chicken is an eager cartoon stunt performer. You lift at the gym to raise your Throwing Skill, you put chickens through a wind tunnel to raise their Flight Skill, you pick a launch angle, and you throw them across the map for distance.

## It's live

Published and playable on Roblox — [place version 7 is live](https://www.roblox.com/games/126535674028996). There's a static landing page at [throw-a-chicken.pages.dev](https://throw-a-chicken.pages.dev), deployed to Cloudflare Pages.

All eight build milestones (M1–M8) shipped, plus a four-part enrichment cycle (E1–E4) on top:

- **Throw prototype** — angle, charge, flight physics, chase camera, distance readout, reset.
- **Player gym training** — rapid tapping builds Throwing Skill, which lengthens throws.
- **Wind-tunnel training** — a flappy-style altitude-zone minigame: keep the chicken in a moving green band to build its Flight Skill.
- **A roster of collectible chickens** — Flapjack, Nugget, Bocky Balboa, Amelia Eggheart and friends, each with its own flight characteristics and sweet-spot launch angle.
- **Economy and progression** — Cluck Coins, hatchable pets that boost multipliers, and upgrades.
- **World 2: Dusty Chicken Canyon** — a portal-locked second map (2.5× rewards, canyon walls, a mid-course jump ramp) that unlocks at 15,000 coins.
- **Enrichment polish** — flight trails that turn gold on a personal best, PB flags on the course, named landmarks, a daily coop challenge, and a sticker book of achievements.

## How it's built

Luau with a proper toolchain rather than editing in-place: source lives in `src/` and syncs into Studio via Rojo, so the game is version-controlled like real software. `deploy.py` builds the `.rbxlx` place file from that committed source with `rojo build` and publishes it through Roblox Open Cloud — the place file is a build artifact, not something hand-edited and checked in.

The point of building it *with* Obi rather than *for* him is the same principle behind [SPARK](/projects/spark/): a kid who co-owns the thing engages with it completely differently than a kid handed a finished toy. He isn't a playtester bolted on at the end. He's the reason each knob exists — and the feel-tuning still waits on his sign-off.
