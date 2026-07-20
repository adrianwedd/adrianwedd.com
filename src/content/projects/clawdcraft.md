---
title: 'ClawdCraft'
description: 'Claude Code living in a Minecraft server as Clawd — a crab-skinned allay kids talk to in chat, with the boundaries that matter enforced in code.'
tags: ['ai', 'agents', 'minecraft', 'kids', 'claude-code']
repo: 'https://github.com/adrianwedd/clawdcraft'
heroImage: '/notebook-assets/clawdcraft/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/clawdcraft/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/clawdcraft/video.mp4'
audioDuration: '19:46'
status: 'active'
featured: true
date: 2026-07-17
youtubeUrl: 'https://www.youtube.com/watch?v=siw3Ip9b-vc'
videoUploadDate: 2026-07-20T08:45:59Z
---

ClawdCraft puts **Claude Code inside a Minecraft server** as _Clawd_ — a friendly, hovering, crab-skinned creature that players talk to in ordinary chat. Say `clawd build me a fountain` and a real, persistent Claude Code session answers back in-game, remembers you, hands out small gifts, casts effects, and builds things. You can attach to its tmux session at any time and watch it think.

It runs live on a Raspberry Pi alongside a PaperMC server, answering kids on both Java and Bedrock editions.

## How it works

A small Node bridge tails the server log. When a line starts with `clawd`, the bridge injects it into a long-running interactive Claude Code session via tmux `send-keys`. Clawd replies through exactly four pre-approved scripts: `say.js` (chat plus particle-and-sound emotes), `rcon.js` (world commands over RCON), `gift.js` (small items), and `memory.js` (per-player notes). One continuous conversation survives bridge restarts, and a human can type into the same session Clawd is living in.

The deliberate choice is a **tmux session instead of headless `claude -p`**: you get human-in-the-loop safety (anything beyond the four scripts waits for a human to approve), real-time observability, and a brain you can steer mid-conversation.

## The boundaries that matter live in code

The most transferable idea in the project: players _will_ try to sweet-talk an AI, so the critical limits are reinforced in code rather than trusted to the prompt alone. (Softer rules — like which players may ask for world changes — do live in the prompt, and the design treats every operator as someone you'd hand RCON to.)

- **Gifts are a code-level allowlist** in `gift.js` — no amount of persuasion produces a netherite sword.
- **An RCON guard** (`rcon_guard.js`) enforces the "NEVER run" list on the exact paths Clawd is pre-approved for: admin verbs blocked in any namespace, `kill`/`tp` refused unless every selector is provably tight, `execute ... run` unwrapped and inspected. Fifty-plus offline test cases include the prompt's own repair commands as must-pass.
- **Per-player token budgets** — cooldowns plus hourly and daily caps, with an in-character "I need a little rest" denial that costs zero tokens.
- **Op visibility**: every deliberate command Clawd executes is echoed to online operators as a gray `⚙ Clawd:` line, so the adults can see exactly what the crab is doing.

## The body problem

Clawd's avatar is an invulnerable allay with AI disabled — vanilla allay pathfinding once flew it to build-height y=261, never to be seen again. All movement is bridge-driven teleports: it glides beside whoever spoke to it last, freezes on `clawd stay`, and flies home to a depot when everyone logs off, where it patrols and sorts dropped items into per-item-type chests. None of that costs tokens.

The crab look ships as resource packs for both editions, generated from a single cube spec: Bedrock gets true custom allay geometry with swinging claws (name-keyed, so wild allays are untouched), while Java — where packs can't reshape entities — gets a crab item-display the bridge floats over the carrier allay.

## Hard-won lessons

The repo doubles as a field guide to making an agent inhabit a live game server: entities summoned into unloaded chunks succeed but become invisible to every selector (the old respawn loop once stacked 83 invulnerable allays); tmux 3.3a's `send-keys` fails precisely when no human is attached, which is exactly when you need it; and plugin command shadowing means anything RCON-driven must use `minecraft:`-prefixed commands or an entirely different plugin answers.

An optional ambient mode teaches Clawd to _overhear_. World events — first-ever joins, advancements, deaths — are already relayed with a percent chance, and proximity chat is built but deliberately off until an operator says `clawd listen on`: the prompt's instruction is "may notice, not must reply," and whether that keeps Clawd tastefully quiet is the next thing to tune with kids online. Presence, rationed — every relay costs a brain turn, so cooldowns and hourly caps in the config are the token budget.
