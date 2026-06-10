---
title: 'The Trap'
description: "Eight Minutes #1: the vishing call, the case number, and a lure genuinely signed by Google — why every check I'd been taught to run came back green."
date: 2026-06-10
tags: ['security', 'phishing', 'social engineering', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 1
heroImage: '/notebook-assets/eight-minutes-the-trap/infographic.webp'
---

## The call

The phone rings at 14:04 on a Wednesday afternoon — 04:04 UTC, in the notation this story will eventually be reduced to. I'm at my desk in Tasmania, mid-task, attention already split three ways. Unknown number, +1 country code. I answer anyway.

A calm American voice introduces himself as Brian, from Google support. He's received a notification on his end, he says, prompting him to reach out to the primary phone number listed on file. There's a case number. There's an assigned support agent. There is no urgency in his voice at all, which is its own kind of pressure: scammers shout, the folklore goes, and this man is not shouting. He sounds like someone three tickets into a long shift who would rather be doing something else.

Here is the first thing worth knowing, before anything else happens. The number on my screen — +1 650‑918‑0851 — is a caller ID, and caller IDs are spoofable; whoever legitimately holds that number is almost certainly not the attacker. The 650 area code is Mountain View. Google's home turf. That's why it was chosen: it's set dressing, and it cost them nothing.

I work in security. I know cold calls about cases I never opened are a red flag. I stay on the line anyway — partly because the call alone proves nothing, and partly because I want to see what arrives.

## The lure that was real

What arrives, a minute and a half into the call, is an email. From `noreply@google.com`. Not from an address *resembling* Google — from Google. DKIM signature: valid, signed by `google.com`. SPF: pass. DMARC: pass, on a domain whose policy says to reject anything that fails. The subject line references the case number and assigns me a support agent by name — "Brian Sellers", matching the man in my ear.

Five minutes later a second email lands through the same authenticated channel, this one carrying a link to a page on Google Sites where I can "view my tickets".

Stop and sit with that, because it's the hinge of the whole story. Every authenticity check I would teach someone to run on a suspicious email — check the sender, check the signatures, check that the sending domain is real — came back green. Because the message genuinely came from Google's infrastructure.

The trick is almost elegant. Google's support system, like many, has an auto-responder: email it, and it politely replies to confirm. The attacker seeded it from a lookalike domain — `google-management[.]com` — spoofing me as the sender and packing the lure text into the subject line. Google's machinery did the rest: it echoed the subject back to me, wrapped it in Google's own boilerplate, signed it with Google's own key, and delivered it from Google's own servers. Nothing in the email was forged except the intent. The one tell — a raw header naming the lookalike domain — lives in the message source, which is precisely the place nobody looks while they're holding a phone to their ear.

A genuine-looking email proves the *sender system*. It does not prove the *intent*. I'd nodded along to that distinction in a dozen security briefings. It is a very different thing at 2pm with a calm voice in your ear and a case number on your screen.

## The pressure

Brian's next move is the one the whole act has been building to, and it's dressed as caution: we should secure the account first. Not "give me your password". Not "read me the code". Just — there's a case open, it's being escalated, let's make sure you're protected while it's looked at. Would I follow the steps?

At 14:11 (04:11:56 UTC — the server logs remember the second even though I don't) I reset my Google password with him on the line. It feels prudent. It feels like the thing a careful person does. It is, in fact, the harvest: a fresh password, minted on his schedule, that I am about to hand over.

The ticket page on Google Sites leads onward to a support portal. The portal wants me to sign in. Of course it does — portals do. I'm still mid-afternoon, still mid-task, still half-listening; the divided attention isn't a footnote to the mechanism, it *is* the mechanism. I type my email and my eleven-minute-old password into a page that looks exactly like every Google login I've ever seen.

Somewhere on the other side of that page, a human being is reading them as I type.

## The tap

A sign-in prompt appears on my phone.

This is the moment all the advice points at. *Check the number matches.* If the number on your phone matches the number on the screen, you're safe — that's the deal we've all been taught. The portal shows me the number to expect: **86**. My phone shows: **86**.

It matches. It matches because, seconds earlier, the attacker took the password I had just minted and typed it into the *real* Google sign-in — and Google, doing its job perfectly, issued a *real* device prompt for the *real* login that was happening right then. The number was genuine. The challenge was genuine. The only thing wrong with any of it was whose session I was approving.

I tap yes.

Part 2 is [the eight minutes that tap bought them](/blog/eight-minutes-the-fall/).

---

*Eight Minutes is a three-part series — a true first-party account; the evidence behind every timestamp is preserved. Part 1: The Trap (you are here) · Part 2: [The Fall](/blog/eight-minutes-the-fall/) · Part 3: [The Fight](/blog/eight-minutes-the-fight/).*
