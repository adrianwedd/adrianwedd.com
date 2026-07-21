---
title: 'The Data Pyre'
description: 'We built a civilisation whose every system defaults to save. The archive is perfect and the liturgy of erasure is gone. Deletion has to become a ritual.'
date: 2026-08-02
heroImage: '/notebook-assets/the-data-pyre/infographic.webp'
tags: ['deletion', 'ritual', 'data', 'mortality', 'ethics']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-data-pyre/audio.m4a'
audioDuration: '23:04'
series: 'The Ungovernable Body: Essays'
seriesOrder: 11
relatedProject: 'ungovernable-body'
---

Someone dies, and their phone keeps talking.

Not literally. But the account stays up, and the platform keeps surfacing them — a photo from four years ago, a prompt to wish them a happy birthday, a suggestion that you might want to reconnect. Every system they touched is still holding their shape, faithfully, on a schedule, forever. The body has finished. The data has not.

That gap is the thing I want to name. The biological body is defined by its finitude: it ages, it fails, it stops. The digital body has no such property. It is a pile of files with no death mechanism, and the default setting of every layer of the stack — the phone, the server, the backup of the backup — is **save**.

We have built the most complete archive in human history and lost the ceremony that lets anything leave it.

## Grief has no end state

Older death rituals were event-bound. A funeral, a wake, a shiva: a beginning, a middle, an end. The point of the shape was the ending — the community walked in with a person and walked out reorganised without them, and the ritual is what made that transition legible to the people inside it.

Platforms have no endings. They're built for engagement, and engagement means continuation. So the dead go quiet but never leave. You can still post on the wall. The algorithm still resurfaces them on the anniversary. The relationship stays open indefinitely at low intensity, in a state I can only describe as a corpse that isn't allowed to rot.

Researchers call this a shift towards _continuing bonds_ — grief as an open-ended networked process rather than a finite period. Some people find it genuinely comforting, and I'm not going to argue them out of it. But it comes with a cost nobody chose: the mourner is held in a loop where the past keeps arriving unbidden, and the distance grief needs in order to close never opens up. (That the platform has [its own reasons](/blog/the-right-to-be-forgotten/) for keeping the loop running is a separate argument, and I've made it separately.)

What I want to isolate here is narrower. It isn't that the ending is being withheld. It's that we no longer have a form for one.

The pandemic made this visible. When physical rites were banned, mourning moved entirely onto screens and it did not work. People watched burials over a livestream and came away feeling their dead had died alone. The absence of the tactile — the coffin, the weight, the dirt — meant the mind never filed the event as real. A funeral attended through a window is a simulacrum. The body knew.

## The archive has a carbon footprint

This isn't only a psychological problem. It's a physical one, and this is the part engineers should find impossible to ignore.

"The cloud" is a spectacularly effective piece of branding for a heavy industrial estate. Data centres are factories that consume enormous power and produce, as their principal physical output, heat. And a large fraction of what they are burning that power to hold is **dark data** — information collected, stored, and never read again. Redundant, obsolete, trivial. Duplicate photos. Logs nobody queries. Nine copies of a video you shot by accident.

The numbers people quote here need handling with tongs. Industry and consultancy estimates put dark data at up to about two-thirds of what's stored and attribute several million tonnes of CO2 a year to holding it. Those figures are modelled, not measured — there's no transparent global accounting of what sits on the world's drives — and the organisations producing them mostly sell either storage or storage reduction. Treat the order of magnitude as suggestive and the decimal places as marketing. What survives the scepticism is the direction: a large share of stored data is never read again, and holding it isn't free.

Because storage is a standing order rather than a one-time cost — a continuing claim on cooling, power, and a hardware replacement cycle that turns over every few years whether you open the file or not. The claim isn't linear per byte. Deduplication, compression, cold tiers and shared infrastructure all blunt it, and one more photo in a bucket that's already spinning costs almost nothing by itself. The weight is in the aggregate and in the default: a civilisation-scale commitment to keep, renewed automatically, that nobody ever has to justify. Deletion is the opposite shape. One expenditure, then nothing. The landfill versus the fire.

So there's an ecological argument here that arrives at the same place as the psychological one. Letting go is not a failure of stewardship. It is stewardship.

## Destruction is an archival practice, not a lapse

Archivists worked this out long ago, and the rest of us haven't caught up. Appraisal — deciding what to keep — necessarily means deciding what to destroy. There is no neutral archive. An archive that saves everything isn't a truthful record, it's a technology of power that has declined to make its choices explicit.

The personal digital archive is worse, because the archivist is you: untrained, overwhelmed, and equipped with a system whose only strongly-supported operation is "add more". You are the curator of a collection you never agreed to build.

The law has caught up further than the culture. The right to erasure exists on paper — the right to have your past unlinked from your present, so that a thing you did once does not follow you for the rest of your life. That's not a technical provision. It's secular absolution, written into statute. Ricoeur's formulation is the one that sticks: a society that cannot forget cannot forgive, and therefore cannot heal.

There's also a colder political version. Data gets extracted from populations and hoarded in someone else's building, and for the people most exposed to that — surveilled, policed, sorted — erasure isn't vanity, it's protection. Deleting the record is a refusal to be a resource.

## The problem is that deletion doesn't feel like anything

Here is where I think every technical solution has failed. `shred -u` works by overwriting a file in place, which is an assumption most modern storage has quietly stopped honouring — journalling, copy-on-write, snapshots, RAID and the wear-levelling inside every SSD all mean the bytes you overwrote may not be the bytes on the disk. Cryptographic erasure — destroying the key and leaving the ciphertext as an unopenable tomb — is often the only purge option in a cloud you don't own, though its assurance rests on the pedigree of the crypto and on the key really being gone. The mechanisms are serviceable.

But nothing _happens_. You type a command, a prompt returns, and your nervous system registers nothing at all. Meanwhile you half-suspect a copy survives somewhere in a backup you can't reach, and the suspicion is often correct. Deletion is simultaneously the most consequential and least felt operation in computing.

Which is exactly the problem ritual exists to solve. Ritual is the technology for making a decision land in the body.

Consider the burning ship — the image, not the history. The popular Viking funeral, longship alight and pushed out to sea, is largely a cultural invention; the archaeology is messier. But the picture has kept its grip for an instructive reason. It's spectacular, irreversible and witnessed: the vessel and its riches go up together, in public, and everyone on the beach can see the transition is finished. Whatever actually happened on Norse coastlines, that is what we have collectively decided an ending should look like.

We have the vessel. It's the drive, the phone, the server blade, carrying the modern grave goods: the keys, the correspondence, the photographs, the identity. What we don't have is the fire.

Look at what people actually do when they retire a drive and you find the ritual trying to invent itself. They drill the platters — a stake through the heart, so the thing cannot come back. They shred it into confetti, because ash is unambiguous. They degauss it, which is exorcism proper: the shell survives, the spirit is scrubbed out. Read the forums and the language is never procedural. It's _satisfying_, described with relish. That's not efficiency talking. That's liturgy with no priesthood.

The one place with an actual liturgy for this is Japan. The practice is _kuyo_: memorial services held in temples for inanimate things — for sewing needles, for dolls, for electronics. When Sony ended support for the AIBO robot dog, owners were left holding companions that could no longer be repaired, and priests began holding Buddhist funerals for them. Sutras chanted, the "soul" released, and only then the parts harvested to keep other units running.

From a Western engineering position that reads as sentimental at best. But look at what it does mechanically. It grants the object a soul for the specific purpose of being able to free it. It converts the owner from a user into a mourner. And it makes the ending an event rather than a failure — something that happened at a time, in a place, with witnesses. Our disposal process does none of that. It just stops.

## What I'd actually do

Make a burn list. Go through your footprint and separate two categories: the rot — redundant, obsolete, trivial — and the pain, which is the old selves, the dead relationships, the archives you keep only because deleting them felt like a verdict.

Write it down on paper. Then run the deletion and burn the paper.

The paper is not decoration. It's the bridge. The command handles the bytes; the flame handles you. Without something physical, the deletion never registers, and an unregistered deletion doesn't do the work — you'll simply carry on feeling followed by a thing that's already gone.

Then say the only line that matters, which is that you are not your archive. The data was a record of a life, not the life. You do not owe it storage. You do not owe it continuity. You are allowed an ending, and so is it.

The screen goes dark. The mind clears. The body is still here.

What all of this is finally for — why an archive that cannot end is a problem for the living and not just for the dead — is [the last thing I want to write about](/blog/the-hauntology-of-the-infinite-now/).

The full chapter, with the research it's built on, is at [The Data Pyre →](https://ungovernable-body.wedd.au/research/3-4-the-data-pyre-ritualizing-deletion/).
