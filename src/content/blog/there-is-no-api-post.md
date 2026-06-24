---
title: 'There Is No API'
description: 'The router I was reconfiguring has no public API. Part 2: driving the private endpoints the web UI calls — and the wall the agent could not script past.'
date: 2026-06-25
tags: ['engineering', 'networking', 'security', 'homelab', 'AI agents', 'Claude Code']
series: 'An Agent in the Walls'
seriesOrder: 2
draft: false
---

The request was simple to say out loud. Take a flat home network — one subnet, everything trusting everything — and turn it into a segmented one: an isolated VLAN for the smart-home gadgets, a filtered network for the kids, a real firewall between the zones. The kind of thing the router's marketing page promises you can do with a few clicks.

The problem is that I wasn't doing it with clicks. I was doing it remotely, through an agent, in batches I could read and gate before they ran ([Part 1](/blog/dont-saw-off-the-branch/) was about the safety net that made that not-reckless). And when you take the human finger off the mouse, you discover the thing the marketing page never mentions: **the router has no API.**

Not a published one, not a stable one, not one with your name on it — there is no public, supported, here-is-how-you-automate-this interface at all. What it has is a web app, and the web app talks to the gateway over a set of internal HTTP endpoints that exist only to serve that web app. They are versioned to the firmware, undocumented, and free to change shape the moment you update. If you want to drive this thing programmatically, those endpoints are the whole game. So the real work of this part isn't configuring a network. It's reverse-engineering a control surface that was never meant to have a second user.

None of which is novel, and I won't pretend it is. People have been driving these private endpoints for the better part of a decade — there's a whole community of open-source [API browsers](https://github.com/Art-of-WiFi/UniFi-API-browser) and client libraries that map them version by version, far more exhaustively than I needed to. (I went and reinvented a good chunk of that wheel, partly because reading the live endpoints myself is how I actually learn a system, and partly because it's a thing I do.) What was new here wasn't the endpoints. It was who was driving them, and under what constraints: an agent, working a live network it could lock itself out of, with the discipline from Part 1 as the only thing between a clever automation and a bricked house. The endpoints are old news. The hand on them is the story.

## Getting in

First you have to authenticate, and even that is a question with two answers.

There's an API-key header the gateway accepts. It works — I send it, the gateway answers `rc: ok` — but it's the kind of "works" you don't trust, because it's undocumented and version-dependent, and a firmware update could quietly stop honouring it halfway through a provisioning run, leaving the agent stranded with no way back to a half-built network.

So the auth helper gets a fallback before it gets used in anger. Try the API key first; if the gateway answers with a 401, or a body that says login is required, fall back to the same login the web app uses — POST the credentials, capture the session cookie _and_ the cross-site-request token the app rides on, and retry the original call with both. Two independent ways to be authenticated, so that the failure of the convenient one doesn't end the session. It's the same instinct as the backout paths from Part 1, one layer down: never depend on a single mechanism you don't control.

## The map

With a way in, the next question is the real one: what can you actually _write_?

The endpoints are happy to show you everything. Read the networks, read the wireless configs, read the firewall — it's all there, dozens of fields per object, the full live shape of the running network. Reading is easy. Writing is where the gateway gets opinionated, and the only way to learn its opinions is to poke it.

The pattern that emerges — and it's the single most useful thing I learned — is **mirror, don't mint.** Don't try to construct a new network object from scratch by guessing which of its forty fields are required; the gateway rejects sparse, hand-built objects in ways that are maddening to debug. Instead, GET an object that already exists and works — an existing network, an existing wireless config, an existing firewall policy — copy its exact shape, drop the identifier that marks it as that specific object, swap the handful of fields you actually want to change, and POST the whole thing back. You're not authoring; you're cloning a known-good template and editing the clone. Networks, wireless networks, and — to my genuine surprise — even the zone-based firewall _policies_ all turned out to be writable this way. The earlier assumption that firewall policy was read-only was just over-caution; mirror an existing policy, swap the source and destination zones, and it takes.

Then there's the trap inside the map. A wireless network has a field called `vlan` that looks exactly like "what VLAN is this Wi-Fi on." It is a lie — or at least, it is not the field that decides anything. The actual VLAN of a wireless network is set by _which network object it points at_, through a separate reference field, `networkconf_id`. I lost real time to this: a status script kept reporting a wireless network's VLAN as "none," because it was reading the obvious `vlan` field instead of following `networkconf_id` to the network that actually governs it. The obvious field is a decoy. The truth is one indirection away. That is the whole texture of working an undocumented API — the thing named like the answer is rarely the answer.

## "rc: ok" and meant no

Here is the pattern that turned this from a puzzle into a discipline.

I flip a setting — say, a per-network boolean. I POST the change. The response is `rc: ok`. Clean success, no error, no warning. I re-read the live config to confirm. **The value is back to what it was.** The write was accepted, acknowledged, and silently discarded. The gateway said yes and meant no.

It is not a one-off. A DHCP reservation POSTs with `rc: ok` and never takes effect, because its `network_id` came through null and the gateway cheerfully stored a reservation attached to nothing. A whole class of security toggles return success and then revert on the next read. A content-filtering rule refuses to be _created_ over the API — the create call comes back 405, method not allowed — but the identical rule, once it exists, _edits_ cleanly over the API. So you make the empty rule with a click in the console, the one path that will create it, then fill it in through the API. None of these failures announce themselves. Every one of them returns `rc: ok`.

The lesson is blunt and it is the load-bearing rule of the whole project: **`rc: ok` is not proof.** A success code means the request was well-formed enough to be accepted, not that the change you intended is now true. The only thing that proves a write is reading the state back and seeing your change survive. Verify-after-write isn't a nicety here; it's the difference between a configured network and a network you _believe_ is configured while it quietly isn't. For an agent especially — which is fast, confident, and has no instinct for "that felt too easy" — the re-read is the entire safety margin. Trust the read, never the receipt.

There's a sharp edge next to this one. Editing an existing object in place isn't a partial update — it's GET-modify-PUT: fetch the _whole_ object, change your fields, send the whole thing back. Send only the fields you changed and the gateway reads the absence of the rest as an instruction to clear them. On a network object, that can mean wiping the WAN config — sawing off the branch in the most literal way the API allows. (Creating a _new_ object is the mirror-and-POST move from earlier; settings have their own POST again. This trap is specific to in-place edits — and it carries the worst blast radius of the three.) The whole-object rule is tedious and it is non-negotiable.

## The wall

And then, twice, the agent hits something it cannot write its way around — and this is the part of the whole series I find most interesting, because it's where the boundary of the thing becomes visible.

The first time is the firewall. The plan has a detector script whose job is to figure out whether the gateway is running the modern zone-based firewall or the legacy one, so the rest of the run can branch correctly. Its heuristic: ask for the firewall policies; if the array comes back empty, call it zone-based. That heuristic is _wrong_, and wrong in the most seductive way — an empty array doesn't mean "zone-based firewall, no policies yet." It means "this endpoint exists and has nothing in it," which is exactly what you also see on a box that _isn't_ in zone-based mode at all. The detector reads the presence of a door as proof you're through it. The box has never been migrated. There are no zones to write policies into.

And there is no API call to fix that. Migrating a gateway to the zone-based firewall is a one-way structural change the vendor gates behind a button in the console — a deliberate "are you sure" that simply isn't exposed as an endpoint. The agent can see the problem, can explain the problem, cannot solve the problem. The only move left is to stop and say: _you need to click this._ So I click "Upgrade to Zone-Based Firewall," the gateway rebuilds itself with its default zones, and the agent picks back up on the other side.

The second time is the intrusion detection and prevention engine — the thing I pointedly left out of Part 1. Turning it on through the API fails every single way it can: every payload variant comes back rejected as invalid, because the firmware's schema has moved and the old field names no longer validate. (Here's the version surprise that costs an hour: `ips_mode` used to take `detect` or `detect_and_block`; on this build it's a three-value enum — `off | ids | ips` — so even a "correct" old call is speaking a dead dialect.) Same shape as the firewall: the agent exhausts the automatable surface, and the last step is a human reaching past it to a toggle in the console.

That's the line. Not a failure of the agent and not a limit of _AI_ in some grand sense — a specific, legible boundary between the things this system exposes to automation and the things it deliberately keeps behind a human hand. An agent is extraordinary at the first category and simply cannot touch the second, and the skill is knowing which is which _before_ you've wasted an hour proving a wall is a wall.

## The other side of the wall

What makes the boundary worth dwelling on is that it isn't a dead end. It's a handoff.

The moment the human clicks the intrusion-prevention toggle, the engine comes up — and not in a half-measure, watch-and-warn mode, but full prevention: `ips_mode: ips`, detect _and_ block. And now the agent, stonewalled thirty seconds ago, can suddenly do the thing it was blocked from doing. Turning the engine on populates a settings object the API can now read and write — so the agent goes back to GET-modify-POST: read the now-valid object, add one entry, POST the whole thing back. The entry is a honeypot on the smart-home VLAN — a decoy address low in the subnet, below the range that hands out real leases, waiting for any compromised gadget that starts scanning its neighbours. Lateral movement between devices on that VLAN is the one kind of traffic the firewall can't see, so a tripwire is exactly the right instrument — and it can only be planted _after_ the human turns the key.

That's the shape I didn't expect to find at the centre of this. The interesting boundary between a person and an agent isn't a fence with the agent on the wrong side of it. It's a relay. The agent runs flat-out across everything that's scriptable, hits the thing that needs a human judgement or a human hand, hands off cleanly, and is waiting to sprint again the instant the baton comes back. The human did the half only a human could; the agent did the half no human would have the patience for. Past the wall, both halves are live: the firewall enforcing, the prevention engine blocking, the honeypot armed.

The router still has no API. But by the end I had a map of exactly what it would and wouldn't let me automate — and, more usefully, a clear picture of where I stop being optional.

---

_Part 3 — [The Limits of the Walls](/blog/the-limits-of-the-walls/) — is the reflective close: what it actually means to hand a live network to an agent, what made the collaboration work across six sessions, and the things I would never let it touch._
