---
title: 'The Fight'
description: "Eight Minutes #3: a packet capture taken mid-attack, Google's own audit logs, eight abuse reports, and the passkey that ends the story."
date: 2026-06-10
tags: ['security', 'phishing', 'digital forensics', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 3
heroImage: '/notebook-assets/eight-minutes-the-fight/infographic.webp'
faq:
  - q: 'What is a real-time relay phishing attack?'
    a: 'An attack where a human operator relays your credentials and 2FA approvals into the real site as you type them into a fake one. Everything you check — sender, domain, the matching prompt number — is genuine, because the attacker is triggering the real flows. Only the context is fake.'
  - q: "Why didn't two-factor authentication stop it?"
    a: 'Codes and one-tap prompts can be relayed. The prompt number matched because the attacker triggered the real challenge with the password they had just captured. Any 2FA a human can read or approve, a human can be tricked into handing over.'
  - q: 'What is the only widely available 2FA that resists this?'
    a: 'Passkeys and hardware security keys. The credential is bound to the real domain and never passes through you, so there is nothing for an operator to relay.'
  - q: 'What should I do right now?'
    a: "Enrol a passkey on your email account — it takes about two minutes. Never approve a login prompt you didn't personally start. Move financial-account 2FA off email and SMS."
---

*This is Part 3 of Eight Minutes. [Part 1 — The Trap](/blog/eight-minutes-the-trap/) is the call and the tap; [Part 2 — The Fall](/blog/eight-minutes-the-fall/) is the eight minutes the tap bought. This is the fight back.*

## Capture first, panic later

The realisation arrived mid-attack, not after it. Partway through the call I pasted the pattern into an AI session I had open, watched it name the scam back at me, and said so out loud to the man on the phone — which is when he hung up. So I had a strange and valuable thing most victims never get: minutes of overlap where I *knew*, and the attack was *still running*.

The instinct under adrenaline is to slam everything shut. I did something that felt almost irresponsible instead: I recorded it. A full network capture of the live phishing session — 880 requests, the fake pages, the relay backend, the operator's responses steering my screen — taken while the operator was still on shift inside my account.

That choice is the reason this series exists in this detail, and the reason the worst part of the attack was ever discovered at all. The capture is how the Binance pivot came to light. If I'd simply reset my password and walked away, I would have spent that evening feeling lucky while knowing almost nothing about what had actually happened.

If you remember one operational thing from this series: contain *fast*, but capture *first* where you safely can. You can't investigate evidence you never preserved.

## Recovering the deleted warnings

Part 2 ends with the attacker binning Google's security alerts so I wouldn't see them. The Trash, it turns out, is not the void — every one of the four deleted warnings came back out of it, timestamps intact, and they now read as a minute-by-minute narration of the attack written by Google in real time.

One alert needed no recovering, because the attacker could never reach it: the critical "someone tried to change how you sign in" warning had also gone to my recovery address — a second mailbox the attacker never controlled. That's worth a hardening note all by itself: a recovery account isn't just for resets; it's an off-site copy of your security mail that an attacker inside your main account cannot blind.

The arithmetic of it is chilling in a quiet way. They had delete-level access to my mailbox for the fourteen and a half minutes the session lived, and the first thing they spent it on was my situational awareness.

## Asking Google what Google saw

Alert emails and a packet capture gave me my side of the story. I wanted the server's side. So I pulled the Google Workspace audit logs — the authoritative, server-side record of every login and account action — and let Google's own evidence grade my reconstruction.

It confirmed everything, and sharpened it:

- The attacker's login, to the second, from the VPS address — with Google's own `is_suspicious=True` flag sitting right there in the log line.
- Not one blocked persistence attempt but **four**. The single "Google stopped this attempt" email I'd received had understated it; the operator went back to the locked door four times in under four minutes.
- And the line that let me finally exhale: the password-change log held **exactly three entries, all mine**. No recovery email added, no phone swapped, no rogue passkey, no backup codes. The blocks had truly held.

That last check upgraded the whole investigation. The reconstruction stopped resting on alert emails and a capture and became first-party logs at both ends — Google's audit log and Binance's own security emails name the same attacker IP (as of June 2026; it's a rented VPS address, and these get reassigned).

## Mapping the kit without touching it

I never sent a single packet to the attacker's infrastructure. Everything I learned about it came from public registries and scan databases — certificate transparency logs, urlscan, RDAP. Passive only: when the kit is already fully captured, active probing buys you nothing and tips your hand.

The passive picture was damning enough. The phishing domain was registered a month before my phone rang, wildcard certificate and all, and a public scanner had captured the live kit the same day it was stood up. Then the find that reframed everything: the lure page had been publicly scanned **six days before my call**.

I wasn't a target. I was a Wednesday. This was a production line — provisioned, tested, and already chewing through victims before it got to me. Somewhere in that scan history are the people it reached before me, and the people it was scheduled to reach after.

## Eight reports

A production line is infrastructure, and infrastructure has landlords. Every piece of the kit exists at someone's commercial pleasure — a host, a registrar, a DNS provider — and every one of them has an abuse desk. So the counter-attack was paperwork, dispatched in impact order:

1. **The origin host** — the company whose server actually serves the phishing site. The fastest kill: suspend the box, the site dies regardless of the domain.
2. **The registrar** — the domain itself.
3. **Cloudflare** — the DNS record in front of it.
4. **The host renting the attacker their VPS** — the report carrying the strongest single fact: first-party logs at both ends put the same address inside my Google account and behind the Binance reset.
5. **Google Safe Browsing** — the browser-level block that warns every future victim mid-click.
6. **Google's own Sites and Support-Cases teams** — the lure prop and the auto-responder abuse that made the lure authentic. Two separate teams; two separate abuses.
7. **The blocklists** — propagation to every feed that consumes them.
8. **ReportCyber**, Australia's national cybercrime reporting channel — which creates the law-enforcement record. That report is filed.

None of these requires a badge or a subpoena. They require knowing who the landlords are — which the passive recon had already established — and writing clearly, with evidence.

## What happened next

<!-- GATE: takedown-outcomes — filled at publish time from the incident folder, "as of <cut-off date>" framing per spec. Do not publish with this comment present. -->

## The ending

The story ends where the advice should have started: passkeys.

Everything else in this series is, in the end, a story about a human being asked to make a perfect judgement call under pressure, in real time, against a professional — and losing. The fixes that ask the human to *try harder* (check the sender, check the number, be more suspicious at 2pm on a busy afternoon) put the same human back in the same losing position with higher stakes of shame.

A passkey removes the human from the decision. The credential is bound to the real domain; it never passes through me; there is no number to match, no code to read out, nothing for an operator to relay. It isn't hygiene theatre or one more thing to be vigilant about. It's the one fix that moves the decision *off* the person the attack is designed to beat.

That's where this ends: passkeys on the accounts that matter, starting with email — because email, as Part 2 showed, is the master key to everything else.

And so the closing line of my own notes becomes the closing line of the series: go enrol a passkey on your email account right now. It takes two minutes. I'll wait.

---

*Eight Minutes is a three-part series — a true first-party account; the evidence behind every timestamp is preserved. Part 1: [The Trap](/blog/eight-minutes-the-trap/) · Part 2: [The Fall](/blog/eight-minutes-the-fall/) · Part 3: The Fight (you are here).*
