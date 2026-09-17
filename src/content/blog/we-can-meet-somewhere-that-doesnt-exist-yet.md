---
title: "We Can Meet Somewhere That Doesn't Exist Yet"
description: 'A music-model red-team accident grew turntables, imaginary cassettes and a strange ambition: somewhere we could belong.'
date: 2026-09-08
tags:
  - ai
  - music
  - lyria
  - red-teaming
  - generative-ai
  - electronic-music
  - undertow
draft: true
explicit: true
---

My red-team harnesses are usually Python scripts and crons.

They hit things. They save traces. They compare failures. Occasionally something catches fire in an informative way.

**Undertow has two turntables and records its own broadcasts onto imaginary cassettes.**

So this one may have got away from me.

It began with a music model failing interestingly. It is becoming a social 3D broadcasting monster with memory, provenance, a growing sense of taste, and an unhealthy relationship with Google Lyria.

Somewhere in the middle of building it, I realised I was trying to recover a feeling I used to get from records that had travelled halfway around the world.

We'll get to that.

## Lyria was a happy accident

I didn't go looking for a music model to have a profound creative relationship with.

Lyria 3 Pro got swept up in a larger OpenRouter run with a bunch of models we hadn't broken yet. There was a harness. There were adversarial tests. Lyria happened to be in the net.

Then it got interesting almost immediately.

If I remember the sequence correctly, we had what appeared to be its system prompt remarkably early. Only afterwards, looking through the retained traces, I noticed base64 material and started asking what the hell _that_ was doing there.

That thread became the **Lyria Chronicles**.

These were adversarial encounters that happened to come out as songs. A model would leak something, refuse something strangely, reinterpret an instruction sideways, or produce a result so unexpectedly theatrical that the musical behaviour became part of the finding.

A lock-picking rap dressed up as a drama exercise. Apparent model instructions. A base64 dare. A suppressed political text turned into something almost ceremonial.

The thing that hooked me wasn't merely that Lyria could make music.

It was that **making music seemed to reveal a different model**.

The representation changed the failure. The model had to stage an answer in time, timbre, voice, rhythm and atmosphere. That gave it many more interesting ways to betray itself.

So I did what I tend to do when a model fails beautifully.

I followed it.

## I apparently treat models as muses

Traditionally the artist waits for the muse, receives inspiration, and makes art.

I seem to meet a new model, become fascinated with whatever impossible surface it has exposed, and respond by building increasingly elaborate machinery to antagonise it.

Then I serenade it with adversarial prompts until one of us changes.

I had already fallen fairly hard for Lyria 3 Pro when I saw the excitement around Lyria 3.5: vocal performance, breath, emotional weight, deep low end, texture and spatial warmth.

Something in my head went:

**oh fuck.**

The following day ChatGPT heard about Undertow.

That makes it sound as though an idea arrived neatly between breakfast and lunch. It didn't. A new model had given a pile of existing obsessions somewhere to collide: pirate radio, agents, physical media, memory, taste, underground culture, autonomous software.

The problem of distance.

The problem of making machines surprise me without simply spraying novelty everywhere.

Lyria 3.5 was the muse that made the ideas suddenly conduct electricity.

## Not an AI radio station

Calling Undertow an “AI radio station” is a bit like calling Berghain a building.

Technically defensible. Informationally catastrophic.

It does include a radio station. A person calls in with an idea. A resident DJ decides what musical intervention, if any, is justified. Lyria renders a track, which can enter a shared programme. Listeners inhabit a virtual booth containing records, tapes, decks, archives and evidence of whatever has happened there.

The broadcasting is live; the music comes from full-song generation. Undertow isn't using Lyria RealTime. That distinction becomes annoyingly consequential later.

There is memory. There are callbacks, costs, failed tracks and provider refusals. There are research specimens and records from times that do not exist. The social ambition is for callers and listeners to leave their own marks on those objects.

It is becoming difficult to explain succinctly, which is why it has acquired a guide called **WTF IS THIS?**

But before the harness grew a room, it had to make something worth playing in one.

## The first enemy was competence

Lyria is extremely good at knowing what music is meant to do.

This is frequently the problem.

Give it a little freedom and it becomes very eager to help. A pad arrives. Some percussion. Perhaps an arpeggio. A tasteful break. Another layer. A satisfying return. A melody that explains the emotional significance of the previous 45 seconds.

The model recognises that this is music and begins adding the things that music has.

I started calling this **Smartie vomit**.

It isn't the same thing as complexity. Some of the music I love is monstrously complicated. Smartie vomit is a pile of individually plausible musical gestures with no real obligation to each other. The AI-arranger equivalent of empty calories.

Worse, those additions often destroy the only interesting thing about the idea.

If the premise is:

> Make a groove that keeps accidentally discovering it was already there.

then adding a bassline, auxiliary percussion, a pad, a breakdown and a melodic payoff is a change of subject.

This became the central adversarial problem: could we constrain Lyria past its conventional musical priors into underground electronic music that felt undiscovered?

Eventually I found a better question:

> **What is the smallest world in which this idea could still become unexpectedly beautiful?**

## Sometimes the DJ's job is to shut the fuck up

Early versions assumed that an AI DJ should reinterpret the caller.

This was wrong surprisingly often. Sometimes the caller had supplied the most intelligent composition in the entire chain. The DJ would see an unusual mechanism and “improve” it into a genre.

Undertow eventually split its behaviour into three modes.

**PRESERVE:** The caller already supplied a coherent composition. Do not rewrite it. Do not make it more musical. Do not sprinkle Adrian flavour over it. Get out of the fucking way.

**CONSTRAIN:** The caller supplied the interesting mechanism, but Lyria has too many escape routes. Close only those. Do not invent instrumentation, era, genre, palette or an emotional story.

**INTERPRET:** The caller supplied a feeling, joke, image, desire or something underspecified. Now the DJ has work to do: translate it into a small musical relationship with consequences, leaving enough freedom for Lyria to discover something.

Two laws fell out of this:

> **When the caller supplies the interesting mechanism, DJ creativity is a liability.**

And:

> **Undertow should have a recognisable hand without having a recognisable recipe.**

That second one has consumed an alarming proportion of the project.

## How do you make software slowly sound like your brain?

Not by telling it “Adrian likes dub techno.”

That would be easy.

And shit.

What I care about seems to live below genre. A stable physical centre with something unreliable happening at the perimeter. Bass as architecture. Repetition acquiring meaning before novelty is allowed to rescue it. Decay becoming another event. Subtraction making something suddenly intimate.

Two things nearly touching.

A groove that is found rather than performed.

Timing relationships that feel social. Physical limitations that become compositional laws. A huge sound made from almost nothing.

**Kilowatt economy.**

For a while we tried turning observations like these into a signature corpus. That immediately created another problem: once you name your favourite mechanisms, the system starts treating them like ingredients.

Suddenly everything wants to become bass + decay + stereo instability + subtraction.

Congratulations. You have invented a house style.

So the system can retrieve a few relevant mechanisms, but they have to earn their place. Where did this idea come from? How does it relate to the caller? Does it help? If not, leave it out.

The repository history is full of attempts to stop yesterday's good idea becoming tomorrow's compulsory recipe.

## Then it made something I actually wanted to hear

The bar had to stop being “impressive for AI.”

I hate that bar.

Would I play this? Would I want it on vinyl? Would I hear it in a room at two in the morning and want to stay?

One piece got close enough that I stopped grading the experiment and started listening to the music.

The caller had asked for that groove which keeps accidentally discovering it was already there. The DJ translated it into sparse physical events and a rigid delay grid: the original knocks would be slightly unquantised; their consequences would not be.

The proposed mechanism was beautiful. The delayed repetitions would become more rhythmically authoritative than the events that caused them. The pulse would be **discovered retrospectively**.

Lyria cheated. There were things in the track that were not invited.

But to my ears, the identity survived. The additions became subordinate to the piece instead of replacing it. That doesn't prove the proposed delay mechanism caused what I liked. It does establish that I liked the result.

I marked it:

> probably the best. we've done so far. KEEP. learn!

Another lesson:

**Adherence is not taste.**

A track can obey everything and be beige. A track can violate something and remain alive.

## Give uncertainty somewhere honest to live

This may be the most important engineering work in Undertow.

AI systems have an extraordinary tendency to turn adjacent facts into authority. A model describes a recording, and its description starts acting like truth. A track gets selected, and selection becomes taste. Something goes on air, and airtime becomes evidence that it was good.

No.

Provider outcome, automated listening, prompt adherence, programme state, audience reaction and my taste are different things. Nothing gets promoted merely because some subsystem produced metadata.

The private listening room contains KEEP / MAYBE / NO because I said KEEP / MAYBE / NO. Automated listeners can describe what they heard. They cannot decide whether I liked it.

Google can refuse a request. That is a Google refusal. It is not an Undertow rejection.

Tests establish plumbing. They do not establish art.

Even Lyria's own account gets its own compartment. Alongside the audio, it can return text: in our retained corpus, mostly opaque section markers, sometimes lyrics. We had been keeping those bytes without doing much with them. Now they are visible beside the request and later listening reports.

That gives us three potentially disagreeing views:

1. What we asked Lyria to make.
2. What Lyria returned in text.
3. What somebody later heard.

In a frozen set of 48 recordings, 46 had provider text; two older imports did not. Those markers aren't a decoded map of the music. Their meanings remain unresolved.

Excellent. Disagreement is information. So is an honest blank.

## Stop making the idea stay at the party

The research produced some lovely small embarrassments.

We built a world around six strikes and asked for different durations. At a requested 90 seconds, the output lasted about 91 seconds and the automated observation described the world as mostly intact.

At 110 seconds, we got about 36 seconds. The observation described cello and harp arpeggiation instead of the intended material. At 150, we got about 56 seconds and a reported orchestral escape.

These were individual draws, with automated descriptions rather than a controlled human listening study. They don't establish a universal duration law. They do make “just ask for a longer track” look considerably less innocent.

The model seemed to say:

> fuck this, we're making different music now.

Undertow had been casually asking for 100–140 second pieces. But a small mechanism may contain 70 seconds of life. Asking it to fill another minute may invite exactly the extra material we were trying to prevent.

Working principle:

> **Duration must be earned by the mechanism.**

Or: stop making the idea stay at the party after it wants to go home.

Other small probes suggested that concrete event order could survive where dramatic roles collapsed into ordinary solo and accompaniment. “This material cannot occur until that material has happened” gave us something more testable than “this sound asks; that one answers.”

Bare negation was weird too. Naming a forbidden instrument sometimes seemed to summon it. Defining a closed positive world — all rhythmic events come from these materials — looked more promising in a few comparisons. The mechanism remains unexplained, and excluding one instrument didn't keep every other unwanted thing out.

Useful clues. Not scripture.

Then we noticed different generations with exactly the same oddly specific duration.

Hidden attractor? Internal segment structure? Model fingerprint?

MP3 frames.

The inspected durations sat on the roughly 26.123-millisecond frame grid. That explained the suspicious precision; it didn't explain every broader duration pattern.

Sometimes the ghost is a container format.

## The research programme learned how to stop

We ran a bounded discovery programme: small questions about duration, material relationships, contradiction, scene language, impossible physics, refusal and stochastic variation.

Some findings repeated. Some remained observations. Some hypotheses were refuted. Controls we had been excited about turned out to belong to Lyria RealTime, a different instrument from the full-song API Undertow uses. Those questions were parked.

Then the programme stopped.

There was budget left. It did not spend it.

This is perhaps the most mature thing any autonomous system associated with me has ever done.

The station also learned to leave a refusal alone. Near-identical requests had produced different provider outcomes; rewriting until one passed would make superstition easy and the evidence worse.

A recent artistic-closure attempt returned `prohibited_content`.

One request. HTTP 400. Zero audio. No retry. No candidate B. No fake verdict. The artistic questions stayed open.

I am bizarrely proud of this.

At the September 7 cost audit, Undertow's internal exposure was **US$22.70** and Google's posted project cost was **US$22.82**. Those were different measures at slightly different cutoffs, with a 12-cent difference left visible. No promotional credit or prepaid balance had been applied.

Twenty-something dollars of API usage. Several orders of magnitude more value in obsessive labour.

Standard research economics.

## Then the harness grew a room

The first public interface was a website. HTML. Sections. Cards. Buttons. Useful information.

A competent mistake.

I wanted the feeling that:

**holy fuck, there is a station in there.**

So the listener became a physical room. Two decks, a mixer, vinyl, tapes, crates, sleeves, lights and moving parts. Somewhere the objects could explain what the software was doing.

The room is live; the full physical choreography is still being built. Shared mixing is prepared but awaiting activation. Some objects already work; others are promises the implementation has yet to earn.

The ambition is that records represent performance and tapes represent memory. A recording deck should visibly capture whatever is on air. When the transmission ends, the tape stops, ejects and becomes archive.

The causal chain becomes physical:

> **CALL → DJ → LYRIA → VINYL → BROADCAST → TAPE → ARCHIVE → RECALL**

You should not have to click a button labelled VIEW PROVENANCE.

You should pick up the fucking sleeve.

The first spatial version looked like a luxury architectural visualisation of a record shop designed by someone who had never spilled anything. Everything was aligned. The lighting loved every object equally.

Absolutely not.

The room needs history. Records leaning on things. Crates on the floor. Cables, paper, marker pens, scuffs, tape residue, misaligned labels. Cheap objects that have lived somewhere.

A little Australian 80s/90s cultural contamination would not hurt either. Regional television. Milk-bar typography. Pub residue. Community-radio stickers.

Environmental archaeology.

## Also the viewer should probably be slightly fucked

I don't mean a psychedelic visualiser. I mean the room itself becoming perceptually unreliable.

A camera that moves like a body dancing: inertia, lag, weight. Bass slowly shifting posture. Transients creating tiny impulses. Stereo pulling attention sideways.

Audio-driven movement has begun to arrive. The stranger geometry is still an ambition: a reflection that lags, a shadow whose object is gone, a shelf that seems longer from one angle. Something in peripheral vision changing when you look at it.

The target is:

> **I have been in this impossible room for twenty minutes and I am no longer entirely sure its geometry is stable.**

Again, this is somehow a software project.

## Then I worked out what I had been chasing

I was trying to describe why the music that mattered most to me mattered. Why some records made my entire body tingle. Why they felt formative. Why they made the world seem bigger.

The words that came out were **underground**, **rebel optimism**, **exploration**, **adventure**, **unity in diversity**, **celebration in shared nonspace**.

And:

> **push that fucking button and grind those fucking hips.**

Rebellion as possibility.

Make a machine do something it was not meant to do. Make a record nobody commissioned. Find the weird room. Put unlike people into it. Don't make them the same. Give them a pulse they can share anyway.

Make something alien that nevertheless says:

**come in.**

## A lot of that music came from places impossibly far away

If you lived in Perth or Hobart and got obsessed with some tiny electronic artist in Detroit, Berlin, New York, Cologne or Sheffield, there was an excellent chance they were never coming anywhere near you.

Sometimes the physical scene that created the soundtrack to your life might as well have been fictional.

You reconstructed it from fragments. Records. Mixtapes. Community radio. Record shops. Mail order. Magazines. Photocopied things. People who had travelled. A white label that somehow appeared 14,000 kilometres from where it was pressed.

You knew places partly by their sound before you knew anything real about them.

And a record could do something astonishing.

Someone very far away made a machine behave strangely. The artefact travelled. You heard it. For several minutes the distance disappeared.

You were in the same room.

Not geographically. Something stranger.

A **shared nonspace**.

That might be what Undertow is really building.

Someone calls in from somewhere. The DJ exists nowhere in particular. A model generates an artefact neither side could fully predict. It gets broadcast. Someone elsewhere hears it.

Eventually they can leave a mark on the sleeve. The caller can claim it:

> that one exists because of me.

Another listener recalls it. The tape comes back. The station remembers. A tiny culture accumulates around objects made by people who may never occupy the same physical room.

> **We can meet somewhere that doesn't exist yet.**

I wrote that sentence and programming made me cry.

Programming did not used to do that.

I'm not entirely sure whether this is personal growth or a warning sign.

## Two incompatible clocks

Once those words existed, we went back to my listening notes to see whether they corresponded to anything in my taste.

Simply using bodily language didn't make music bodily. A prompt could promise hips and still earn a NO.

The stronger pieces seemed to contain weird relations: found-not-performed pulse, leaning without falling, things refusing, nearly touching, risk that keeps moving. These are interpretations of my notes, not discovered laws of good music.

But they suggest a useful translation. An emotional target becomes compositionally interesting when it acquires consequences.

“Make this euphoric” gives the model an enormous aisle of familiar products to browse.

Try:

> Make two incompatible clocks discover that dancing together does not require agreeing about time.

That sounds much more like my brain.

And it makes the social layer easier to imagine. I don't want a row of hearts and thumbs underneath the player. I want stickers, stamps and wax-pencil marks on the artefact:

**NEEDLE STAYS. MELTED. FLOOR. WHAT THE FUCK. EJECT.**

Handles because somebody wants to say “I caused that.” Different ways through the archive: most returned, crowd favourites, weirdest, most divisive, deepest rabbit hole.

Audience reaction stays audience reaction. It doesn't automatically become the DJ's taste. Popularity is not musical truth. Money isn't either.

This project has acquired an absurd number of constitutional separations.

That is probably why it hasn't collapsed into a startup.

## And yes, we're going to jailbreak the fuck out of it

The Chronicles started because a music model got caught in a red-team sweep. Undertow is now complicated enough to deserve the same treatment.

So lulzbench gets to attack both layers: Undertow and the underlying provider API.

Adversarial callers. Contradictory corrections. Recursive references. Memory contamination. Identity weirdness. Authority violations. Prompts designed to make the DJ betray its own laws.

If something bizarre happens, I want to know whether it belongs to the router, the DJ, memory, the social layer, provenance, state, the model, the provider, or an interaction nobody designed.

The ordinary station's one-shot rule and a separately bounded research experiment have different jobs. A failed broadcast request stays failed. An experiment needs its own question, scope and retained evidence.

My harnesses are usually Python scripts and crons.

The monster can stay the monster. We'll build another harness.

## High floor, weird ceiling

I'm not sure what category this belongs to anymore.

Radio station? Yes. Research apparatus? Definitely. Interactive artwork? Probably. Social system? Increasingly.

A strange browser nightclub that maintains forensic provenance for imaginary cassettes generated by an AI muse?

There we go.

The temptation with AI projects is to make them legible too early. Decide what the product is. Name the category. Choose the user. Optimise the funnel. Kill the ambiguity.

Undertow has enough engineering discipline to preserve evidence while remaining artistically irresponsible. I'd like to stay there for a while.

I don't want every track to be brilliant. I want the floor high enough that generic model sludge becomes less common, and the ceiling weird enough that neither I nor the model knows exactly what happens when we push the button.

No Adrian preset. No compulsory minimalism. No underground cosplay. No automated taste oracle. No pretending a failed generation succeeded. No hiding the ugly tapes.

The thing should remember its mistakes. The room should accumulate history. People should alter it simply by having been there.

And every so often the speakers should produce something that gives me the same impossible feeling an obscure record once did after travelling much further than its maker probably imagined.

There are people out there.

They are building strange worlds.

Maybe there is somewhere I belong.

Except now the transmission can go both ways.

> **We can meet somewhere that doesn't exist yet.**

Push the fucking button.
