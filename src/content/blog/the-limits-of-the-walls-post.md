---
title: 'The Limits of the Walls'
description: "Six sessions handing a live home network to an AI agent. Part 3: the memory that made it work, the division of labour, and what I'd never let it touch."
date: 2026-06-25T12:10:00+10:00
tags: ['engineering', 'networking', 'security', 'homelab', 'ai-agents', 'claude-code']
series: 'An Agent in the Walls'
seriesOrder: 3
heroImage: '/notebook-assets/the-limits-of-the-walls/infographic.webp'
heroAlt: 'Dark botanical infographic: the division of labour and the limits of handing a live home network to an AI agent.'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-limits-of-the-walls/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-limits-of-the-walls/video.mp4'
draft: false
autopublish: true
youtubeUrl: 'https://www.youtube.com/watch?v=9Wbe_7P9K78'
---

By the end there were six sessions behind me, spread across a handful of days, and a home network that bore almost no resemblance to the flat one I'd started with. Segmented, firewalled, filtered, watched. And the part that stayed with me wasn't any single configuration change. It was the working relationship — the strange, specific experience of handing an AI agent write-access to the place I actually live, and watching it become genuinely good at the job.

This last part isn't a how-to. It's the reflection: what made the collaboration work, where the real division of labour fell, and the lines I drew and would draw again.

## The thing about memory

Start with the problem that shapes everything else: the agent has no memory. Each session begins from nothing. The model that spent two hours yesterday learning the precise, undocumented shape of my gateway's firewall API wakes up today knowing none of it — not the endpoints, not the traps, not the decisions we made or why. Whatever it learned evaporates when the session closes.

If you don't solve that, you don't have a collaborator; you have a very capable amnesiac you re-onboard every morning, who re-makes yesterday's mistakes because it has no record that they were mistakes. The whole project would have collapsed under the cost of re-explaining itself.

So the fix was a file. A single living document — I called it the state file — that held the current truth of the network: what existed, what every non-obvious decision was and why, which API paths worked and which lied, what was deliberately left undone. Not a log of everything that happened, but a curated picture of where things _stand_, rewritten as the truth changed. Alongside it, a short handoff note per session: what changed this time, what's mid-flight, what the next session should read first.

This turned out to be the most important piece of infrastructure in the whole effort, and none of it touched the network. The agent's first act each session was to read the state file and the latest handoff. Its last act was to update them. In between, the file was the shared brain neither of us had to hold in our own head — the durable memory that made a sequence of forgetful sessions add up to something cumulative. The intelligence was rented by the hour; the _continuity_ was mine to keep, in a text file, on purpose.

You could watch it pay off. A later session set out to turn on a security feature through the API and got the same answer every time: every payload rejected as invalid, the firmware's schema having drifted out from under the old field names. A fresh agent would have rediscovered that the hard way, burning twenty minutes re-deriving a dead end. This one read three lines in the state file — _this one's API-blocked; toggle it in the UI_ — and went straight to handing me the toggle. The dead end had been hit once, written down once, and never hit again. That's the whole return on the file: errors that happen at most a single time, instead of every session, fresh.

## The loop

Underneath the memory was a rhythm, and it barely varied across six sessions because varying it was where danger lived.

Read the state. Plan the change in full before touching anything. Dry-run the writes — print exactly what would be sent, read it, agree it's right. Pass the gate: prove a way back in _before_ any change that could cost reachability. Write. Then — and this was the non-negotiable one — verify by reading the live state back, because on this gateway a success code was never proof that a change had taken; it just meant the request was well-formed enough to be accepted (Part 2 is a catalogue of writes that returned success and quietly did nothing). And finally, re-state: fold what just happened back into the file, so the next session inherits the new truth instead of the old.

Read, plan, dry-run, gate, write, verify, re-state. It reads like ceremony. It is, in the same way a pre-flight checklist is ceremony — a deliberate refusal to let competence and speed talk you out of the step that saves you. The agent is fast enough to skip straight from plan to write, and confident enough to feel fine about it. The loop exists precisely to deny it that, and to deny _me_ it, because the speed is exactly what makes the skipped step expensive.

The gate was the step I was most tempted to wave through, and the one I'm gladdest I never did. "Prove a way back in before any change that could cost reachability" sounds obvious until you're four changes deep, everything's working, and checking the backout _again_ feels like superstition. It isn't. The whole point of a backout is that you need it precisely when you were most sure you wouldn't — when the change you were confident about turns out to have severed the path you were standing on. Proving it cold, from a phone on cellular, every single time, is what keeps confidence from quietly becoming the thing that strands you.

## Who did what

The clearest thing I learned is that the interesting boundary isn't "can the agent do this." It's "should this be the agent's to do" — and those are different questions with a fault line running between them.

The agent was extraordinary at the wide, patient, mechanical work: mapping an undocumented API by methodically poking it, holding forty fields of an object in mind while changing three, mirroring a known-good template instead of guessing, grinding through verification reads no human would have the stamina to do by hand. This is the work that's tedious to the point of error for a person and effortless for a model. I would not want to do it again without one.

What it could not do — and Part 2 is the story of hitting this twice — was a small set of things that needed a human at the console, for two different reasons. One was a genuine gate: a one-way structural migration the vendor puts behind an _are-you-sure_ button on purpose — exactly the kind of consequential, hard-to-undo step that _should_ have a human finger on it. The other was humbler: a setting whose API schema had drifted until no payload the agent could form would validate, so the only working path left was the toggle in the UI. One wall deliberate, one just the edge of what was automatable — but the response to both is the same. Those weren't failures. They were the system working as designed, drawing the same line I'd draw myself: the consequential, hard-to-undo decisions get a human finger on them. The agent ran flat-out across everything scriptable, stopped clean at each of those lines, handed me the keyboard, and picked back up the instant I'd turned the key. A relay, not a fence.

And there was a third category, the one that matters most and has nothing to do with capability: the things the agent was perfectly _able_ to do that I chose to keep for myself anyway.

Deciding what the network _should be_, for one. The agent could propose a segmentation scheme, and a good one — but whether the kids' devices belonged behind content filtering, what in the house needed isolating from what, which conveniences were worth which risks: those are judgements about how my family lives, and they don't belong to a contractor I rent by the hour, however fluent. The agent was a superb implementer of intent and a poor author of it. It could tell me _how_ to build almost anything I could describe. It could not tell me what was worth building — and I never wanted it to try.

## The unease

There's a particular unease in this that I don't want to wave away, because it's the honest centre of the whole series.

For a few days I had an agent in the walls of my house — moving through the wiring, rerouting how my family's devices talk to each other and the world, with real reach into the systems a home quietly depends on. That phrase kept occurring to me, half uneasy and half not. Uneasy, because something autonomous and fast was operating in the infrastructure I sleep inside, and the failure modes were not abstract: a wrong rule doesn't throw an exception, it just silently severs something and waits for you to notice. Not uneasy, because at no point was it _unsupervised_. Every write was one I'd read first. Every irreversible step was mine to take. The walls had something living in them, but I'd built the room it worked in, kept the only set of keys to the doors that mattered, and never once let it out of my sight.

That's the resolution I landed on. The fear in Part 1 wasn't a phase to get past; it was the load-bearing emotion, the thing that built the ropes and the loop and the gates. An agent in the walls is fine — useful, even remarkable — exactly to the degree that you remain the one who decided to put it there and can get it out.

## The lines

Because someone always asks how far this goes, the scope, plainly:

This was my own network, changed with the consent of the people who use it. Everything in these three posts has been sanitised — the identifiers that would let someone target this specific house are gone, deliberately, because publishing the map of a network is not the same as publishing the lessons from rebuilding one. Nothing here involved exploiting anything; the "undocumented API" is simply the gateway's own web app talking to its own gateway, the same calls the browser makes, observed and reused on the device I own. And nothing here is a recipe for reaching into infrastructure that isn't yours. The interesting part was never access. It was the discipline of using access you already, legitimately have.

## What I wouldn't let it do

A short list, and it's less about the network than about me:

I wouldn't let it take an irreversible step without a human on the toggle — and I'm glad the vendor agrees, because their hard gates enforced the rule even where my discipline might have slipped. I wouldn't let it run a write it had planned but I hadn't read; the dry-run is non-negotiable, and the day I start rubber-stamping the previews is the day the harness becomes theatre. I wouldn't let it operate without the gate proven first — no change that can cost me the way back in until the way back in is tested from outside. And I wouldn't hand it the keys to anything I couldn't afford to have quietly broken while it returned a cheerful `rc: ok` — which, more than any firewall rule, is the actual boundary of the walls.

None of that is a limit on what the agent can do. It's a limit on what I'll delegate without watching — which, it turns out, is the only kind of limit that was ever mine to set. The agent will get more capable. The discipline is the part that has to hold.

---

_This is the close of "An Agent in the Walls." Part 1 — [Don't Saw Off the Branch](/blog/dont-saw-off-the-branch/) — is the safety net. Part 2 — [There Is No API](/blog/there-is-no-api/) — is the reverse-engineering and the wall._
