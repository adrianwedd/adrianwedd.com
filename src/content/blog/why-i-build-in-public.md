---
title: "Why I Build in Public"
description: "On showing your work, shipping imperfect things, and why the commit log is more honest than the readme."
date: 2026-02-15
tags: ["engineering", "open-source", "philosophy"]
heroImage: "/og/why-i-build-in-public.png"
---

Every project on this site has a source link. Most of them link to messy repositories with commit messages like "fix the thing" and half-finished branches named `experiment-3`. This is deliberate.

## The performance of competence

The default posture for technical work is polish. You show the finished product. You write the README after the dust settles. You present the architecture diagram that implies the system was designed top-down, when in reality you stumbled into it sideways after three false starts and a dependency that turned out to be unmaintained.

I've done this. It's exhausting, and it's dishonest in a way that matters. Not because polish is bad — polish is craft — but because the curated version teaches nobody anything. The person reading your clean README learns what you built. They don't learn how you built it, which is the part that would actually help them.

## What building in public means

For me it means:

- **The commit log is the real changelog.** Not a curated list of features, but the actual sequence of decisions, mistakes, and reversals. You can watch me add a feature, realise it's wrong, rip it out, and try again.
- **Issues are open.** Not as a support channel, but as a thinking-out-loud space. Half the issues on [this site's repo](https://github.com/adrianwedd/adrianwedd.com/issues) are me arguing with myself about what to build next.
- **The colophon exists.** [It lists everything](/colophon/) — the stack, the design decisions, the credits. If you want to build something similar, you can see exactly how this one works.
- **Drafts ship.** Not everything on this site is finished. Some projects are experiments that went nowhere. They're still listed, because the dead ends are part of the map.

## The cost

Building in public has a real cost. You expose every bad decision before you've had time to correct it. Someone might look at your code on the worst day of a refactor and form an opinion. You can't control the narrative.

But here's the thing: the narrative was always a fiction. The only question is whether you spend energy maintaining it or redirect that energy into the work itself.

## Who it's for

It's not for an audience. It's for the version of me six months ago who was trying to figure out how to do something and couldn't find a single honest example of someone else doing it badly first and then doing it well.

If you're building something and it's messy — show it anyway. The mess is the most useful part.
