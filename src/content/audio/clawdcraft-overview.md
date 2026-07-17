---
title: 'A Crab in the Server: How Claude Lives in Minecraft'
description: 'Audio overview of ClawdCraft — Claude Code as an in-game creature kids talk to, and why its hard limits live in code instead of the prompt.'
date: 2026-07-17
tags: ['notebooklm', 'ai', 'agents', 'minecraft']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/clawdcraft/audio.m4a'
duration: '19:46'
relatedProject: 'clawdcraft'
---

Clawd is a hovering, crab-skinned allay on a family Minecraft server — and behind it is a real, persistent Claude Code session in tmux that a human can watch think. Say `clawd build me a fountain` in ordinary chat and the message travels from the server log into that session, and back out through exactly four pre-approved scripts.

This episode covers the architecture (log-tail bridge, tmux brain, RCON hands), why the boundaries that matter are enforced in code — a gift allowlist no sweet-talking defeats, an RCON guard with fifty-plus offline test cases, per-player token budgets — and the hard-won lessons of giving an AI a body in a live game world: the y=261 incident, 83 stacked allays in an unloaded chunk, and a tmux bug that only bites when no human is watching.

[View the full project →](/projects/clawdcraft/)
