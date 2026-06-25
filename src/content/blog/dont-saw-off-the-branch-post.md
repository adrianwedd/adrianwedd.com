---
title: "Don't Saw Off the Branch"
description: 'I let an AI agent rebuild my live home network over Starlink — no console, no documented API. Part 1: building three backout paths before a single write.'
date: 2026-06-25T12:00:00Z
tags: ['engineering', 'networking', 'security', 'homelab', 'AI agents', 'Claude Code']
series: 'An Agent in the Walls'
seriesOrder: 1
heroImage: '/notebook-assets/dont-saw-off-the-branch/infographic.webp'
heroAlt: 'Dark botanical infographic: building independent backout paths and safety nets before an AI agent rebuilds a live home network.'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/dont-saw-off-the-branch/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/dont-saw-off-the-branch/video.mp4'
draft: false
autopublish: true
---

There's no fibre where I live. The internet arrives by satellite — a dish on the roof, a Starlink router in the hallway, and behind it a Ubiquiti Dream Router that does the actual work of being a network: the VLANs, the firewall, the Wi-Fi. The dish does not care that I want a segmented home network. It hands me one address and a lot of latency, and everything I build has to live downstream of that.

Which would be unremarkable except for one fact: I was not in the house. I was reconfiguring this network — the live one, the one my family streams and works and does homework on — remotely, over that same satellite link, with no physical console to fall back to. And I wasn't typing the commands myself. I was handing them, one careful batch at a time, to an AI coding agent.

## The wager

The interesting part of that sentence is not "AI reconfigured my router." Plenty of things can POST to an API. The interesting part is the position I'd put myself in: remote, behind two layers of NAT, on a gateway with no documented API and no out-of-band access, where a single bad write — one firewall rule that blocked the wrong path, one VLAN tag on the wrong port — would lock out the agent and me at the same time, on a network I could not walk over and reboot.

That's the wager. And the only thing that makes it not reckless is the discipline you build before you take it. I came to think of the agent as an eager apprentice working in a dark room full of live wires: fast, capable, genuinely useful, and completely willing to saw through the branch it's sitting on if you point it at the branch. The whole job of Part 1 is the rope you tie before you let it near the saw.

## Blast radius

Start by being honest about what "bad" looks like. On a home network you're remoted into, the catastrophic failure isn't data loss — it's reachability loss. You don't corrupt a file; you sever the path between yourself and the box, and the box keeps running perfectly, serving the new broken config forever, with no way for you to reach in and undo it.

My link made that worse in three specific ways. First, the connection was satellite, which means carrier-grade NAT: the gateway has no real public address of its own, so I couldn't just port-forward my way back in. Second, the gateway sat behind the satellite router's NAT as well — a double-NAT, two translation layers between the open internet and the device I was trying to manage. Third, and this is the one that matters most, the only machine physically wired to the gateway was a Mac — my one wired station, and therefore my sole management path. Everything else was Wi-Fi, which meant everything else was a tenant of exactly the network I was about to rebuild. Break the Wi-Fi and you don't just inconvenience the household; you remove your own footing.

So the rule wrote itself: **the one wired machine must never be touched.** Never VLAN-tagged, never moved, never made to depend on a rule the agent was about to author. It was the branch I was standing on. Everything else could change.

## Three ropes, not one

Before the agent was allowed to make a single change that could affect reachability, I wanted independent ways back in — not one backout, but several that didn't share a failure mode. A backout that depends on the LAN behaving is worthless precisely when you need it, because the thing you broke is the LAN.

What I ended up with were three paths with different dependencies — two that terminate above my LAN entirely, where a firewall mistake can't reach them, and a third inside the LAN as deliberate defence in depth:

1. **A one-tap WireGuard tunnel into the gateway's own OS**, brokered through the vendor's cloud. It doesn't traverse my LAN firewall, so a LAN firewall mistake can't sever it.
2. **The vendor's cloud remote-access path** — a second, independent way into the same console, enabled separately so that a failure in the first didn't take the second with it.
3. **A subnet router on a wired host inside the LAN**, advertising the home network over a mesh VPN — defence in depth, a route home that didn't depend on the vendor's cloud at all.

Three ropes, anchored in three different places. The point of redundancy here isn't paranoia; it's that each rope has a different way of failing, and you want the failures to be uncorrelated. If a single root cause can cut all your backouts at once, you have one backout wearing a costume.

And then I made the rule that turned the ropes into a discipline: **before any change that could affect reachability, prove a backout from a device on cellular, with Wi-Fi off.** Not "I'm pretty sure Teleport works." Prove it — phone off Wi-Fi, onto the mobile network, tunnel in, see the console. If you can't reach the box from outside your own network, you have no business changing your own network from inside it.

## The backout that had to be rebuilt

Here's the beat I'd save if I could only keep one, because it's the one that actually taught me something.

The original plan had a clean backout: a small Linux box would act as the subnet router, sitting on the home LAN, advertising it over the mesh VPN. Tidy. Except when we went to stand it up, the machine the plan had picked for the job turned out to be offsite — it couldn't sit on the home LAN at all, which is the one place a subnet router has to be. And the only other Linux node I had was on the wrong side of the gateway's NAT, upstream on the satellite router's own network, where it could see the wider internet but not the LAN it was meant to rescue. Nothing I owned was actually sitting on the gateway's network. As a backout, the whole idea was useless.

The disciplined move, the one I want to be the spine of this whole post, is what came next: **we stopped.** Not "proceed and we'll sort the backout later." The backout had failed its own assumptions, so before a single write went out, the entire safety design was torn up and rebuilt into the three ropes above — the two that terminate above the LAN, plus the wired host I recabled onto the gateway's own network to serve as a proper on-LAN subnet router. The plan on paper said "build your backouts first." Reality taught the better version of the rule: _when your backout fails its own assumptions, you don't route around it — you stop and rebuild it before you touch anything._ The cheap discipline is making a safety net. The real discipline is noticing your safety net has a hole in it and refusing to perform without one.

## The harness

Even with the ropes in place, I didn't trust the agent — or myself — to hand-write live changes to an undocumented API. So every write went through a wrapper with a `DRY_RUN` mode. Set the flag and reads still went through, but any write was printed instead of sent — the method, the URL, the full payload, laid out to be read. You read it. You agreed it was what you meant. Then, and only then, you cleared the flag and ran it for real.

That mode doubled as a test harness, and that's where it earned its keep, in a way I didn't expect. The danger I'd braced for was the agent hallucinating an endpoint — inventing an API that didn't exist. The bug that actually showed up was dumber: a shell script built one of its requests by reading fields positionally, and one of those fields — a Wi-Fi band — was empty for every network I had. An empty field in the wrong place doesn't politely error. It shifts every value after it one slot over, so the script grabbed the wrong variable, decided a required value was missing, and aborted — on a condition that wasn't actually true. Run that cold in the middle of a live provisioning sequence and it doesn't corrupt anything; it just dies halfway, leaving you stranded between two states. I caught it in dry-run, exercising the scripts against the real API with the writes held back — which is exactly when you want to find it.

That's the lesson under the lesson: the agent's failures aren't only exotic, AI-shaped failures. A lot of them are ordinary, boring, brittle-software failures — the kind any of us write — except now they're being generated quickly and aimed at production. The harness isn't there because the agent is uniquely untrustworthy. It's there because _fast_ and _live_ is a combination that punishes the ordinary mistakes you'd normally catch by being slow.

## Reversible order

The other half of not-locking-yourself-out is sequencing. There's a tempting order — harden everything, then migrate the devices onto the hardened network — that is exactly backwards, because it strands every device on the old network the moment the new rules go live.

So the order was inverted: **migrate first, harden second.** Bring the trusted devices onto their new home before changing what "home" means. Move the trusted wireless devices off the network that was about to be flipped, _before_ flipping it — and put the wired backout host on the segment that wasn't changing at all, so the path home sat on stable ground while everything else moved. Every step was chosen so that if it went wrong, the wrong state was a state you could still reach from, and therefore still undo.

## Don't saw off the branch

The cleanest example of that principle is also where the post gets its name.

The household has fifteen-odd Wi-Fi gadgets — small, dumb, permanently-installed things that are a nightmare to reconfigure: each one wants you to hold a button, join a setup network, poke at a phone app. I needed all of them to move off the flat network and onto an isolated IoT segment. Reconfiguring each device by hand was a non-starter — and worse, a great way to brick the migration halfway through and leave the house half-on-each-network.

The trick was to never make the devices notice. The old router and the new gateway were both broadcasting a Wi-Fi network of the same name. So instead of touching the devices, I renamed the _old_ router's network — and made sure the new gateway's identically-named network used the same passphrase. The devices lost the network they were on, looked for one by that name, found the gateway's, and silently roamed across. Zero per-device reconfiguration. They never knew they'd moved.

That's the literal "don't saw off the branch" move: you don't cut the thing the devices are sitting on. You quietly grow an identical branch right next to it and let them step across on their own.

## What the discipline bought

Only after all of that — the ropes proven from cellular, the backout rebuilt when it failed its assumptions, the harness on every write, the migrate-before-harden order, the silent SSID roam — did the actual reconfiguration happen. And it's worth naming the result, because the result is the argument _for_ the discipline, not a separate story:

- The fifteen-odd IoT gadgets ended up isolated on their own VLAN, walled off from the machines that matter.
- The kids' network got its own segment with content filtering and SafeSearch enforced at the gateway, not on the devices — the kind of thing that's trivial to ask for and easy to get wrong.
- A zone-based firewall replaced the flat "everything can talk to everything" default with explicit, ordered policy.
- DNS got encrypted, so the queries leaving the house stopped being readable on the wire.

None of those changes is exotic. What's worth writing down is that all of them were made to a live network, remotely, by an agent, without once stranding the household or locking out the operator — and that _that_ outcome was a property of the rope-work, not luck.

There's one thing I deliberately haven't mentioned: the intrusion detection and prevention engine. Getting it turned on turned out to be a story of its own — the moment the agent hit a wall it could not script its way around, and had to put the decision back in a human's hands. That's the next part.

But the foundation is this one, and it's smaller than it sounds. Before you let a fast, capable, slightly-overeager agent near production, you build it a room it can't hurt you from. You give yourself more than one way back in, and you _prove_ they work from outside. And when your safety net turns out to have a hole, you stop and patch the net — you do not, however tempting, just lean a little further out and hope.

You don't saw off the branch.

---

_Part 2 — [There Is No API](/blog/there-is-no-api/) — is about what happened when the agent went looking for the controls, and found that the router it was reconfiguring doesn't actually have an API at all._
