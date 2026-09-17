---
title: 'When Generation Becomes Cheap, Judgement Becomes Expensive'
description: 'As machines make plausible code abundant, engineering value moves toward specification, verification, evidence and knowing when the machine is wrong.'
date: 2026-09-09
tags: ['ai', 'programming', 'agents', 'software-engineering', 'verification']
draft: true
---

I hate the term “vibe coding”.

Not because it describes nothing.

It describes something real, and usually something terrible.

Ask an AI to build something. Accept whatever comes back. Don't read the code. Don't understand the architecture. Keep prompting around errors until they disappear. Ship it because the demo works.

That's vibe coding.

Please don't run a hospital with it.

The problem is that the term escaped.

Now I regularly see “vibe coding” used to describe almost any software development in which a generative model did a substantial amount of the typing.

In [the companion essay](/blog/the-button-was-never-the-art/), “AI slop” was the category error: a useful description of low-effort mass production expanded until it meant anything made with the medium. “Vibe coding” is undergoing almost exactly the same mutation. It once named abdication of judgement. Increasingly it names the presence of AI.

And that makes roughly as much sense to me as calling electronic music “pressing buttons”.

It confuses **where the work happened** with **whether any work happened at all**.

That distinction is becoming rather important.

Because the machines are getting very good at typing.

## Typing was never the whole job

For most of the history of software development, implementation was expensive.

You wanted a feature, somebody had to write it.

Function by function. Test by test. Interface by interface.

Knowing how to translate an idea into formal instructions a computer could execute was a scarce skill, and much of the visible evidence of being a programmer was therefore code.

You wrote code.

Lots of it.

Generative models are attacking that scarcity with extraordinary speed.

I can now describe a change, point an agent at a repository and watch it inspect the existing architecture, find relevant files, propose an implementation, write code, add tests and run them.

Sometimes it does in minutes what would once have taken me hours.

Sometimes it confidently drives the car into a lake.

Both facts matter.

But if producing plausible code keeps getting cheaper, then **lines of code produced by a human become an increasingly strange measure of human contribution**.

The work hasn't necessarily disappeared.

Some of it has moved.

## The work moved

New tools don't necessarily remove the work. They move it somewhere people haven't learned to recognise as work yet.

Photography moved some of the craft away from manually rendering an image. Electronic music moved some of it away from physically producing every sound. DJing made selection, sequencing, timing and manipulation part of the instrument. [That argument has already been made](/blog/the-button-was-never-the-art/).

Generative systems are doing something similar to engineering.

The interesting work increasingly happens before, around and after generation.

What should we build? What constraints actually matter? Which source is authoritative? What evidence would establish that the change works?

What could fail silently? What did the agent assume? Did it fix the problem or merely make the test green? What changed that wasn't supposed to change?

And should this thing exist at all?

Those aren't secondary questions surrounding the “real” work of typing code.

**They are engineering.**

## The demo works

One of the most dangerous things about generative AI is that it is extremely good at producing things that look finished.

The function exists.

The page renders.

The test passes.

The agent reports success.

Wonderful.

Now ask whether the test actually measures the requirement. Ask whether the implementation preserved an invariant nobody mentioned in the prompt. Ask whether the benchmark is measuring the model or accidentally measuring the harness.

Ask whether the evidence demonstrates the claim or merely resembles evidence that might.

The hard failures are often not crashes anymore.

They're **plausible success**.

I found a tiny, horrible example while auditing one of my benchmark harnesses. I gave its retry wrapper a mocked HTTP 403 carrying the structured error code `misalignment_policy_violation`. The provider wasn't saying “busy”. It was saying **stop**.

The harness classified every 403 as an account-level rate limit. With the default retry policy, one safety refusal produced four requests: the original plus three retries. The backoff machinery worked exactly as written. Operationally, it looked healthy. Semantically, it had converted **stop** into **try again**.

The verification was almost insultingly simple: preserve the response body, assert the number of calls and watch the count reach four. The correction makes that safety signal terminal and raises immediately.

**The code understood the status. The failure was understanding what the status meant.**

That changes the job.

When generating an implementation was expensive, producing the implementation consumed much of the effort.

When generating one becomes cheap, deciding whether it deserves to survive becomes much more important.

Generation gets cheaper.

Verification gets relatively more expensive.

## Vibes aren't the problem

The funny thing is that “vibe coding” identifies the wrong villain.

The problem isn't that a machine wrote the code.

The problem is **abdication of judgement**.

A human can write terrible software manually.

A human can cargo-cult Stack Overflow answers they don't understand.

A human can satisfy the ticket while completely misunderstanding the system.

A human can write beautiful, elegant code solving the wrong problem.

We've been remarkably capable of producing software failures without artificial intelligence.

Likewise, an engineer can use an agent heavily without surrendering engineering judgement to it.

I can let a model write nearly every character of an implementation while being extremely demanding about architecture, evidence, testing, provenance and failure behaviour.

Or I can manually type every character of something catastrophically stupid.

The keyboard does not know which happened.

Neither does Git.

“Who typed the code?” is becoming less useful than:

**Who exercised judgement over the system?**

## This doesn't make everyone an engineer

There is an equal and opposite piece of bullshit worth avoiding.

If typing code becomes cheap, that does not mean expertise becomes obsolete.

It means some expertise changes location.

Someone with very little software knowledge can now produce things that would have been completely inaccessible to them a few years ago.

That's fantastic.

It is also dangerous.

The gap between **being able to make something run** and **being able to know whether it should be trusted** is getting larger, not smaller.

A novice and an experienced engineer can use the same agent and receive similarly impressive-looking output.

The difference often only becomes visible when something unusual happens: requirements conflict, production behaves differently from the test environment, a dependency lies, a security boundary gets crossed or the data is incomplete.

The model encounters a condition its happy-path implementation never imagined.

Now somebody has to notice.

And noticing is a skill.

## Agents make this stranger

Coding assistants already complicate authorship.

Agents complicate it much further.

Once an agent can inspect a repository, formulate a plan, edit multiple files, execute commands, run tests, read their results and iterate, “AI-assisted coding” starts becoming an inadequate description.

The machine isn't merely completing the next line.

It is performing bounded chunks of engineering work.

That makes the human role less obvious, not less important.

Someone still has to decide what authority the agent has, construct its environment and define the goal well enough that success means something.

Someone has to decide which evidence is sufficient. Someone has to notice when the agent has optimised for the wording of the task instead of its intent. Someone has to know when **not** to let it continue.

The interesting engineering problem starts moving from:

> How do I implement this?

towards:

> How do I construct a system in which increasingly capable machines can implement things without quietly fucking everything up?

That's not less engineering.

It's engineering one level up.

## The scarce thing moves

When a machine can generate almost unlimited plausible code, generation stops being the scarce resource.

Judgement becomes expensive: knowing what matters, what to measure, what to reject, what evidence to trust and when the apparently brilliant result is bullshit.

This isn't unique to software.

We're watching the same shift happen in images, music, writing, research and design.

**Abundance doesn't abolish craft. It changes which craft is scarce.**

## There is a trap here

Of course, this argument is wonderfully convenient for people using AI.

“My genius is in the judgement,” says the man who generated 700 pull requests before lunch.

So judgement needs evidence too.

Verification isn't interchangeable with judgement. It's one of the instruments by which engineering judgement makes claims answerable to reality.

If AI-mediated engineering is going to claim the status of serious engineering, it should be unusually willing to show its receipts.

The answer to accusations of vibe coding shouldn't be wounded insistence that prompting is a skill.

It should be **better engineering**.

Make the process auditable. Make failures visible. Preserve negative results. Separate observation from inference. Test the thing you claim to have built.

Don't trust the agent because it sounds pleased with itself.

The models will get better.

That's almost the boring part now.

The more capable they become, the more consequential our judgement about where and how to use them becomes.

## Show me

There is an asymmetry here, and I think it matters.

I've just argued elsewhere that artists shouldn't have to defend their legitimacy because a generative model touched their work. Now I'm arguing that engineers using the same technology should be unusually willing to show their receipts.

I don't think those positions conflict.

An artwork doesn't have to prove that it is correct.

A production system fucking does.

The artist says: **I made this.**

Fine. Look at the thing. Ask what it does to you. Ask whether it's interesting. Hate it if you like.

The engineer says: **this works.**

Now we're making a claim about reality.

Show me.

Show me the test. Show me the failure you considered. Show me what you measured. Show me what remains uncertain. Show me why the evidence establishes the claim you're making.

The machine complicates authorship in both cases.

It does not abolish responsibility in either.

But responsibility means different things when you're making an image and when you're making a system somebody else may have to trust.

## I don't want to compete with the machine at typing

There is a strange instinct in parts of software culture to preserve human implementation as though typing the code is the sacred bit.

I don't feel particularly attached to it.

If a machine can write a function faster than I can, good.

If it can write an entire subsystem faster than I can, even better.

I don't need to prove my worth by racing a language model to see who can produce more TypeScript before lunch.

I want to spend my time on the parts that remain difficult.

Understanding systems.

Finding the failure nobody thought to look for.

Working out what the requirement actually means.

Designing constraints.

Constructing experiments.

Connecting things that weren't supposed to connect.

Deciding what deserves to exist.

And, increasingly, building environments in which machines can do extraordinary amounts of work without being permitted to confuse confidence with truth.

Maybe we'll eventually call that something other than programming.

Fine.

I've been a DJ who apparently wasn't a musician, made electronic music that apparently wasn't music, played with digital art that apparently wasn't art, and now make things with AI that apparently don't count because the machine was involved.

I'm used to the nouns moving around.

The work is still there.

It's just somewhere new.

When generation becomes cheap, the most valuable person in the room isn't necessarily the one who can produce the most.

It's the one who knows what is worth keeping, what is actually true, and when the machine is wrong.
