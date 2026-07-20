---
title: 'The Right to Be Forgotten'
description: 'The digital afterlife industry sells immortality and delivers undeadness. Finitude is not a defect in a person, and deletion should be the default.'
date: 2026-07-31
tags: ['privacy', 'deletion', 'data', 'autonomy', 'ethics']
series: 'The Ungovernable Body: Essays'
seriesOrder: 9
---

In the analogue arrangement, the dead went quiet. Letters yellowed in a box. Photographs faded on a mantle. Withdrawal from the world was slow, and the slowness did work: it gave the people left behind time to move from _she is here_ to _she was here_.

That process no longer runs by default. The dead now have accounts. The accounts have uptime.

A person's data does not decay. It is stored on hardware engineered specifically to refuse decay — redundancy, error-correcting codes, replication across regions. Every design choice in a modern storage layer is a choice against forgetting. We built the most durable memory in human history and then, without deciding to, pointed it at people who are no longer alive.

## What the industry actually sells

There's a market here now, and it's worth naming its tiers, because they are not the same violation.

The mildest is **memorialisation**: the account is frozen and made read-only. Facebook's Legacy Contact, Instagram's "Remembering" banner. A tombstone with a login. The problem here is accumulation, not falsehood.

Above that sits **curated playback**. Companies like StoryFile record you answering thousands of questions while you're alive, then use voice recognition to retrieve the closest match when someone asks something. At one funeral, the deceased — a Holocaust educator who had spent hours recording answers — appeared as an avatar taking questions from the congregation. Nothing it said was invented: the system was selecting among things she had actually recorded, not generating new ones. That's the honest tier, and it still turns a person into an information kiosk that never closes, permanently on call to satisfy whoever shows up with a question.

Then it stops being honest. **Generative simulation** — a language model fine-tuned on someone's texts and emails, producing sentences they never wrote. The best-known case is a man who fed his dead fiancée's messages into Project December and talked to the result for months. The system didn't preserve her. It predicted her. Everything it said in her voice was a guess dressed as her.

And at the top, **reanimation**: still photographs animated into blinking, smiling, speaking faces. The likeness performs expressions the person never wore.

The line that matters runs between the second and the third tier. Playback preserves a past. Simulation manufactures a future. Once the dead can comment on things that happened after they died, they have stopped being dead in any way the survivor's nervous system can process.

## Grief is a very good business model

None of this is neutral technology that happens to get pointed at corpses. The economics select for it.

An engagement-optimised system, applied to a bereaved person, learns exactly one lesson: grief retains. The mourner who is nearly finished mourning churns. The mourner who cannot let go opens the app daily. There is no version of "maximise time in product" that does not, in this context, mean _prolong the grief_.

Add a subscription and it gets worse. If the family stops paying, does the person die again? That question should be absurd. It's a support ticket.

Push it one step further and you get what Cambridge researchers sketched as a near-future scenario: a grandmother's simulation used to recommend products to her grandchildren. The ancestor as sales channel. That's the endpoint of treating a dead person as an asset — not just denied rest, but conscripted.

## The law does not have a subject here

The obvious objection is that we already have a right to erasure. We do — for the living, and only for them. [The file outlives the person](/blog/memory-wars-and-data-leakage/); the protection does not.

The GDPR says so plainly: it does not apply to the personal data of deceased persons. The right to be forgotten is a right held by a data subject, and death terminates the subject. The data doesn't go anywhere. It just loses its protector.

What fills the gap is a three-way scramble. The platform claims the data through terms of service. The heirs claim it as part of the estate. Occasionally the state claims an archival interest. Nobody in that room is arguing for deletion.

Germany's Federal Court of Justice settled it one way in 2018. The parents of a girl who died wanted access to her Facebook messages. The court ruled that her account passed to them exactly as a diary or a bundle of letters would — universal succession, digital assets treated as property. I understand why the parents wanted it, and I don't think the ruling was cruel. But look at what it establishes: your digital self is inheritable property, not a persona that can be extinguished. Property beats privacy.

France went the other way, letting people leave binding directives about deletion after death. Better — except it only works for people who file. Almost everyone dies intestate with respect to their data.

The US mostly defers to whatever the platform's terms say, since few people use the estate tools available. That means sovereignty over the dead sits with Meta, Google and Apple, whose institutional instinct is retention, because deleting things creates liability and keeping things doesn't.

Google's Inactive Account Manager is the closest thing to a working deletion mechanism anywhere in this landscape. You set a timeout and your data is erased or handed on. It's genuinely good. It is also a product feature, revocable at will, not a right.

## Why finitude isn't a defect

Underneath the legal mess is a claim I want to make directly: **being finite is not a flaw in a person.** It's a condition of being one.

A life becomes a story through selection. Things drop out. What remains takes a shape, and the shape is the meaning. A complete record has no shape — it's just everything, in order, forever. Ricoeur's argument is that forgetting isn't a failure of memory but a condition of its narrative function, and that a memory with no gaps would be an unbearable burden. He means that structurally, not emotionally. You cannot narrate a total archive. You can only query it.

Grief works the same way. Mourning is the slow internalisation of an absence, and it requires the absence to actually be there. A system that keeps the dead conversationally available doesn't ease that work. It suspends it indefinitely at the first step.

Patrick Stokes has a word for what the data actually is: _exuvial_. A shed skin. It points at a subject who isn't there any more. The whole industry rests on a category error — treating the exuviae as though they were the person, and then animating them.

There's an older idea in bioethics that gives the claim its name: the right to rot. It began as a patient's right to refuse intervention, to let the body do what bodies do without being forcibly maintained. The digital version is the same claim aimed at the same instinct. The body returns to the ground; the data should be allowed to return to entropy. Data permanence is not a natural state we are preserving. It is an intervention we are performing, continuously, on someone who never asked for it.

There is an ecological argument stacked on top of this one — the cost of keeping everything, forever, in buildings that must be cooled — but it belongs to [a different piece](/blog/the-data-pyre/), and it isn't what carries the claim. The claim stands even if storage were free.

## What I'd actually build

A right to data death, distinct from the right to be forgotten, and resting on three things.

**Deletion as the default.** Absent an explicit instruction, data is erased after a fixed period post-mortem. This is the whole argument in one clause: today silence means _keep forever_, and it should mean _let go_. Only demonstrated historical significance overrides it.

**Inalienability.** You cannot sign this away in terms of service. No platform gets to make a perpetual licence over your remains a condition of using a messaging app at twenty-two.

**No resurrection without consent given in life.** Building a generative simulation of a dead person requires their explicit, informed, prior agreement. Not a relative's permission. Not a company's. Theirs, obtained while they could still refuse. Register it the way we register a DNR — a standing instruction that your data is not training material for a ghost of you.

Beyond the statute, the interesting engineering problem is decay by design: storage tiers that let resolution degrade, that let old material blur and thin instead of holding at full fidelity indefinitely. We know exactly how to build systems that never forget. Nobody's been asked to build one that forgets gracefully.

None of this is a demand for destruction. It's the opposite. Meaning comes from limits, and a person is not improved by being made infinite. The dignity is in the ending.

We should be building infrastructure capable of silence.

[Read the full chapter →](https://ungovernable-body.wedd.au/research/3-2-the-right-to-be-forgotten/)
