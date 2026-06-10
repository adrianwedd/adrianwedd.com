---
title: 'The Fall'
description: "Eight Minutes #2: inside the attacker's session — the live relay, the Binance pivot, and the safety nets that fired after I'd already been beaten."
date: 2026-06-10
tags: ['security', 'phishing', 'account takeover', 'incident response']
draft: true
series: 'Eight Minutes'
seriesOrder: 2
heroImage: '/notebook-assets/eight-minutes-the-fall/infographic.webp'
---

*This is Part 2 of Eight Minutes. [Part 1 — The Trap](/blog/eight-minutes-the-trap/) ends with a tap on a phone prompt. This is what the tap bought.*

## The other side of the glass

While I was typing into the lookalike page — `view-support[.]com`, defanged here so you can search it without visiting it — a human operator was retyping everything into the real Google sign-in, a beat behind me. Not a script. Not malware. A person, on shift, watching my keystrokes land in their panel and relaying them into the genuine login flow as fast as they arrived.

That's the shape of the whole attack, and it's worth holding onto: **my keystrokes, their session.** Every page I saw was a pane of glass with someone working on the other side of it. When Google challenged their login attempt, the kit relayed the challenge to me; when I answered it, the answer went back through them. The fake page even polled its backend every second and a half so the operator could steer which screen I saw next. I wasn't filling in a form. I was being *driven*.

## They're in

14:21:34, and I can give you the second with confidence — 04:21:34 UTC, `login_success`, from 103.120.6[.]237. That address is a rented VPS (as of June 2026; these addresses get reassigned, so a future tenant deserves none of your suspicion). Most of this story was reconstructed afterwards from Google's own server-side audit logs, not from memory — memory is what the attacker was counting on.

The session arrived in costume, too: it introduced itself to Google as a Pixel 10 phone, and later surfaced in my device list as a Windows desktop with a machine-generated name. Neither device exists.

The log line carries one more detail that still stings: `is_suspicious=True`. Google's risk engine *saw it*. It flagged the login as suspicious in the same breath as it let it through — because the password was right and the device prompt had been approved. By me. The flag lives in the log, not in my afternoon; no one shows you the machine's raised eyebrow in real time.

## The pivot

They didn't linger in the inbox to read. They went shopping.

Within seven minutes of landing they were inside my Binance account — and the route is the part everyone should memorise, because it has nothing to do with crypto. They asked Binance to reset my password. Binance, reasonably, emailed a reset link to my inbox. They owned my inbox. At 04:28 UTC the reset went through — and Binance's own security emails name the same VPS address that Google's log does (again: as of June 2026).

Email is the master key. It is the universal "forgot password" backdoor for nearly everything you own: own the inbox, and you own everything the inbox can reset. The Google account was never the prize. It was the key to the building.

They went to my files too — but here's what the record shows, and it's somehow worse than rummaging: in the entire session they opened exactly **one** file in my Drive. One, out of everything I keep there. No browsing, no searching around. They knew precisely what they were looking for.

## Tidying up

Here's the detail that tells you these are professionals: they cleaned up behind themselves.

Google had been sending me genuine security alerts as the attack unfolded — new sign-in warnings, a critical alert. Four of them. The operator binned every one, straight to Trash — and the Binance emails announcing the password reset went the same way — so that when I next glanced at my inbox there would be nothing to see. The attacker had delete-level access to my mailbox and the first thing they spent it on was my own situational awareness.

(I got those emails back later. That recovery — and what else came out of the Trash — is a [Part 3](/blog/eight-minutes-the-fight/) story.)

## The nets

While the operator was binning alerts and resetting passwords, two automated systems were quietly fighting for me — and it matters enormously that neither of them was me.

The first was Google's risk engine. Read access wasn't enough for the operator; they wanted *persistence* — their own permanent sign-in method on my account, something that would survive any password change I made. They tried to add one. Blocked. They tried again. Blocked. Four attempts in under four minutes, and the per-action re-authentication held every single time. The session I'd granted them could read and delete, but the moment they reached for the account's locks, Google demanded proof they couldn't relay.

The second was Binance. The moment the password reset landed, it auto-froze withdrawals for 24 hours. No judgement call, no support ticket — a built-in cool-down, dropped like a portcullis between the attacker and the only thing they'd actually come for.

Two nets. Both automatic. Both built by people who assumed someone like me would eventually fail — and were right.

## The reset

By 14:24 I'd said it out loud to him — that this had the shape of a well-documented account-takeover scam — and the line went dead. He hung up; the coaching was over. The access wasn't. The most dangerous minutes of the whole attack came *after* the call, while the operator worked my account alone and unhurried.

At 14:36 (04:36:09 UTC) I changed my Google password, and that single act killed their session. Everything they held evaporated: the web session, the mailbox access, the half-finished Binance takeover behind its frozen withdrawals.

And so you aren't left holding the dread I was holding: the Binance thread ends well. I disabled the account myself rather than trust any timer, and Binance support verified the takeover had died on the vine — no API keys added, no 2FA or binding changes, no withdrawals. **No funds moved.** The automatic freeze and the password reset had held the door exactly long enough.

Count it honestly, because the logs do: from `login_success` to session kill, the attacker held my account for fourteen and a half minutes. But everything they actually did with it — the landing, the four runs at the locks, the files, the Binance takeover — fits inside the **roughly eight minutes** between my tap and their verification codes arriving. Eight minutes of damage, inside fourteen of access. That eight is what this series is named for: not how long they were in, but how long it took them to spend what my tap had handed over.

## The nuance

Strictly, this wasn't the cookie-stealing adversary-in-the-middle of the textbooks: nothing was stolen from my session, because there was no session to steal. They minted their own — I granted it. That's also why a simple password reset could end it.

That distinction sounds academic and isn't. A stolen session cookie can outlive a password change. A *granted* session, built on a relayed password and a relayed prompt, dies the moment the password does. The mechanics of how they got in are exactly the mechanics of how I got them out.

## The score

Tally it honestly. The attacker beat me — the human, the security professional, the one who'd given the briefings — in one phone call: **attacker 1, me 0.** The two saves came from automated systems that had no idea who I was: **automated systems 2.**

I didn't win the eight minutes. I lost them, and the machines bought me back.

What I did with the rescue — the capture taken while the attack was still live, the logs pulled from Google's side of the glass, eight reports, and the change that means there will be no next tap — is [Part 3: The Fight](/blog/eight-minutes-the-fight/).

---

*Eight Minutes is a three-part series — a true first-party account; the evidence behind every timestamp is preserved. Part 1: [The Trap](/blog/eight-minutes-the-trap/) · Part 2: The Fall (you are here) · Part 3: [The Fight](/blog/eight-minutes-the-fight/).*
