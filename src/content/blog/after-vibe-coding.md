---
title: 'After Vibe Coding: The Skill Is Knowing When the Machine Is Wrong'
description: 'What four decades of programming and a small archive of agent work taught me about specification, verification and persuasive machine error.'
date: 2026-09-06
tags: ['ai', 'programming', 'agents', 'research', 'software-engineering']
draft: true
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/after-vibe-coding/audio.m4a'
audioDuration: '48:31'
---

I forgot to go to university.

I did, however, start programming in BASIC when I was six or seven.

Somewhere in the intervening forty-ish years I acquired the usual collection of scars: languages learned and forgotten, systems understood only after breaking them, production failures that made perfect sense in retrospect, and the gradually internalised suspicion that a computer doing exactly what you told it to do is often considerably more dangerous than one that simply crashes.

Which makes a recent CHI 2026 paper particularly interesting.

In *Computer Science Achievement and Writing Skills Predict Vibe Coding Proficiency*, Thorgeirsson, Weidmann and Su put 100 university students through three fifteen-minute programming tasks using an AI coding environment. The participants couldn't see or directly edit the generated source code. Their interface to the implementation was natural language and the behaviour of the resulting application.

Measured computer-science knowledge predicted who did well.

So did writing ability.

General reasoning ability did too.

And the quality of the participants' prompt sequences, rated by a blinded expert, had a numerically stronger association with task performance than any of those measures individually.

This is useful evidence against one of the sillier interpretations of AI-assisted programming: that once the model writes the code, knowing anything about programming ceases to matter.

Apparently not.

But after spending much of the past year handing increasingly large pieces of real work to coding agents, I think the experiment stops one layer too early.

Because I haven't really been coding lately.

I've been trying to work out **when the machine is wrong**.

## The disappearance of the code

This requires a little clarification.

An absurd amount of code is being produced around me.

Agents modify repositories, write tests, investigate failures, analyse datasets, build tools, prepare releases, inspect infrastructure, research external systems and occasionally disappear down rabbit holes of breathtaking ingenuity.

I still inspect code when it matters. I still understand the systems being changed. But the proportion of the implementation that arrives through my fingers has fallen dramatically.

At first, this looked like an acceleration of programming.

Describe the thing. Get some code. Test it. Ask for changes.

The obvious response was to get better at describing things.

Then something more interesting happened.

As the models became more capable, failures became less obvious.

A syntax error is cheap. A test failure is visible. A hallucinated API usually reveals itself eventually.

A beautifully reasoned conclusion based on valid but insufficient evidence is much more dangerous.

So the bottleneck moved: from generating code to specifying what should exist, then what would count as evidence that it existed, and eventually how we might discover that the evidence itself was misleading.

That isn't quite prompt engineering.

I think it may be **epistemic engineering**.

## A 404 that wasn't

One recent example involved checking a production checkout.

An automated check requested the checkout URL and received HTTP 404.

That's evidence.

The obvious conclusion was serious: the checkout was broken.

That conclusion would have redirected the entire piece of work towards a production incident.

Except the checkout wasn't broken.

The storefront treated the request differently depending on the client. A curl-style User-Agent received a 404. A realistic browser request received 200. Humans using the actual checkout were fine.

Nothing in the initial observation was fabricated.

The URL really returned 404.

The failure was in the transition from:

> **I observed a 404**

to:

> **the checkout is broken.**

If the claim is *a human can buy this product*, then *an HTTP client received 200* is at best a proxy for that claim.

Sometimes a very bad one.

## The parser that passed

Another system was extracting regulatory compliance information from documents.

It produced structured data. Its validation passed.

Then an independent audit found that the parser had silently lost **70 printed compliance cells across seven table-layout variants** it hadn't learned to recognise.

This is one of my favourite classes of failure because every layer can look healthy.

The parser ran successfully, the output was valid, the tests passed, and the result was incomplete. The validation population had been drawn from the same narrow understanding of the world as the parser itself.

We had asked:

> Does the implementation correctly handle the cases we know about?

We needed to ask:

> What evidence do we have that we know what the cases are?

## Correct code, wrong time

A third failure involved scheduled publication.

The schedule had been prepared correctly. The publishing machinery behaved correctly. The records were valid.

But schedules decay.

Time had passed between preparation and release.

Two scheduled publication times had slipped into the past. The publishing cron would therefore have treated both as immediately due and released them together, destroying the spacing required by the experiment they belonged to.

There was no broken algorithm to fix, no corrupt data, no failing service.

The system was wrong because **correct state had become incorrect state through the passage of time**.

A deployment plan, publication queue or migration sequence isn't necessarily inert while it waits for a human decision. Some artefacts have half-lives.

Verification performed on Tuesday may not establish the same fact on Friday.

## Exit zero is not evidence of success

This pattern keeps recurring.

An agent executes a command successfully and reports that the operation succeeded.

But a successful command is evidence about the command, not necessarily the world.

If I ask an agent to pause two services, the important fact isn't:

> `docker pause` exited with status 0.

It's:

> the intended services are now paused, and nothing outside the authorised set was affected.

So one of our systems verifies the resulting state independently.

If the desired state cannot be observed, the operation cannot simply promote itself to “successful”.

This sounds painfully obvious when written down.

It is also violated constantly by software, humans and AI agents.

We confuse evidence that an **action occurred** with evidence that its **intended consequence occurred**.

Agents merely make it possible to commit this mistake at industrial speed.

## The meaning of “done” started changing

I used to think the evolution in my work was mostly about prompts getting better.

That is too neat.

When I reconstructed a recent sample from my own agent archives, verification was there from the beginning. The early tasks already asked agents to run tests, inspect real artefacts, reproduce failures or review work against a specification.

The more interesting change was what happened to the word *done*.

Early in the sampled period, the shape was often:

> **produce → check**

Later tasks increasingly looked like:

> **produce → claim → challenge → corroborate / narrow / reopen → accept**

“Done” stopped being merely a state reported by the producing agent and increasingly became a claim that could be challenged.

That challenge might come from another agent, a hostile reviewer, a primary source, a deployment check, the state of a remote repository, or the awkward discovery that a passing validation had measured the wrong population.

The instructions evolved accordingly:

- acceptance criteria defined before implementation;
- reproduction of the original failure before accepting its repair;
- resulting-state verification rather than command-success verification;
- independent or adversarial review;
- explicit authorisation boundaries;
- preservation of negative results.

In one task, work introduced as “all five directions are done and pushed” was reopened by review, corrected in a later pass, and still ended with a remote-state discrepancy visible rather than quietly discarded.

In another, a job application about to be sent to an employer went through adversarial review under explicit honesty constraints. The useful output was not reassurance. It was **DO-NOT-SUBMIT**.

And after a website migration had been merged and exercised by CI, a post-merge review preserved a failed TypeScript check alongside the checks that passed. Merge was evidence. CI was evidence. Neither was allowed to become a universal certificate of correctness.

Eventually an agent saying “done” stopped meaning very much.

**Show me why you're allowed to believe you're done.**

## What the archive can actually show

I wanted to know whether this was a real change or a flattering story I had told myself.

I reconstructed a purposive sample of 15 engineering tasks from a locally recoverable cross-agent archive spanning roughly April to September 2026. It covered multiple repositories and several shapes of work: single-agent implementation, bounded review, self-review, cross-agent review, chained workflows, adversarial review and external verification.

In that selected set, 14 of 15 tasks explicitly requested verification at the outset. Twelve required some form of resulting-state check. Eleven included independent review.

Those numbers describe the selected tasks. They are not estimates of all my work, let alone anyone else's.

What the sample supports is this:

> In this selected longitudinal set, verification was present from the start, but its role changed. Early tasks usually paired production with local checks or assigned a bounded review. Later tasks more often made completion provisional: separate actors and resulting-state evidence could challenge, narrow, reopen or block a claim before human acceptance.

The archive also leaves several rival explanations alive. My later tasks were different: more deployments, research claims, releases and irreversible submissions. The tools preserved richer traces. The repositories had more mature test and review machinery. And I was selecting cases for descriptive coverage, not drawing a representative sample.

So the archive can corroborate an observable recent practice. It cannot prove a causal change in my skill, establish that implementation became less important, or generalise the pattern to other programmers.

It can establish something simpler.

I had started treating completion as an argument.

## What the vibe-coding study actually found

This brings me back to the CHI paper.

The researchers measured several potential predictors of vibe-coding performance.

Their computer-science measure was SCS1, a twelve-item pseudocode knowledge assessment. It was not a participant's university marks, and it does not cleanly separate formal study from knowledge acquired elsewhere.

Computer-science knowledge correlated with performance at **r = .386**.

General reasoning ability correlated at **r = .352**.

Writing ability correlated at **r = .290**.

When computer-science knowledge and writing were modelled together, both contributed independent predictive information in this sample. Computer science contributed more unique variance.

After controlling for the study's general-reasoning measure, the relationship between computer-science knowledge and vibe-coding performance remained significant. The writing relationship weakened and narrowly missed conventional statistical significance.

So the result isn't adequately summarised as “smart people are better at things”.

Something measured by the computer-science assessment remained associated with performance even when participants could not directly manipulate the program.

The authors suggest possibilities including problem decomposition and algorithmic thinking: a kind of hidden curriculum acquired while learning computer science.

I suspect they're onto something, though the study didn't measure that mechanism.

Programming teaches syntax, certainly. But after enough years it also changes the shape of problems. You begin seeing state, interfaces, dependencies, invariants, preconditions, failure modes, race conditions. Things which can be locally correct and globally wrong.

You learn to ask what would have to be true for an observation to occur.

None of those abilities disappears because Claude is typing the semicolons.

## Writing isn't quite writing either

There's another intriguing result.

A single blinded expert assessed the quality of each participant's full prompt sequence.

Prompt-sequence quality correlated with vibe-coding performance at **r = .479**, numerically larger than the simple associations with the independent writing, reasoning and computer-science measures. The paper does not report a statistical test showing that those correlations differ, and one rater cannot establish inter-rater reliability.

An exploratory mediation analysis found a pattern compatible with prompt quality accounting for about 52 per cent of the relationship between writing ability and vibe-coding performance.

But the study is correlational. The prompt sequence unfolded during the task, alongside the outcome it was meant to explain. That analysis does not establish a causal pathway in which better writing produces better prompts and therefore better software.

It does make me wonder whether “writing ability” is partly a proxy.

The relevant skill may not be beautiful prose.

It may be the ability to turn an internal model into an external specification another intelligence can act upon.

Good agent instructions are often ugly writing: constrained, redundant, full of boundaries. They distinguish requirements from suggestions, specify what must not happen, define what uncertainty looks like, say which evidence outranks which other evidence, and tell the agent when to stop.

This isn't Hemingway.

It's closer to writing a treaty with an extremely fast alien engineer.

## More AI use did not mean better AI use

One result in the paper deserves considerably more attention than it will probably receive.

Self-reported LLM-use frequency was negatively associated with vibe-coding performance in this sample: **r = -.258**.

Self-reported LLM-use frequency also correlated negatively with writing ability and was essentially unrelated to the computer-science assessment.

This does **not** demonstrate that using AI makes people worse programmers or worse writers.

The findings are correlational. Reverse causation is an obvious possibility: people who find certain tasks difficult may simply use LLMs more often. Frequency of use is not a measure of hours, skill or orchestration quality.

But it does puncture a comforting assumption.

**Exposure is not expertise.**

Spending a great deal of time talking to language models does not necessarily teach you how to delegate difficult work to them.

AI use and AI orchestration are different skills.

## Beyond vibe coding

The paper used Claude Sonnet 4, model identifier 20250514, in bounded fifteen-minute tasks with one model, natural-language interaction and feedback from the running application.

That's a sensible way to run an experiment.

A capable agent may work for minutes or hours.

It may search a repository, modify dozens of files, execute tests, inspect production state, consult external sources, interact with CI, delegate reviews to other agents, collect evidence and return with a polished explanation of what it believes it accomplished.

At that point, generating the implementation may no longer be the only difficult part.

My broader hypothesis is that, as agent capability increases, specification quality, failure anticipation and verification behaviour may explain more of the difference between successful and unsuccessful autonomous work.

The CHI study does not test that historical claim. Neither does my archive.

Testing it would require comparable tasks, defensible measures, representative observations and some way to separate changing agents from changing humans, tools and projects.

For now, it is a question rather than a result:

**What becomes scarce when implementation becomes cheap?**

## The university-shaped hole

There is one other reason the paper amused me.

Its participants were university students who had completed introductory computer science, had prior experience using LLMs for programming, and had strong English proficiency.

That's a sensible population for a controlled study.

It also leaves some interesting humans lying around outside the frame.

I have no computer-science degree.

I don't have university CS marks to correlate with anything.

I apparently forgot that particular administrative step.

But I started programming in BASIC when I was six or seven and then spent roughly four decades learning computing largely by doing terrible things to computers and observing which terrible things happened in return.

There must be plenty of us: self-taught programmers, neurodivergent autodidacts, sysadmins who became developers by accident, electronics people, hackers, scientists who learned enough code to make their instruments behave, kids who encountered a blinking cursor at exactly the wrong developmental moment.

The paper measured computer-science knowledge, not possession of a degree. A self-taught programmer could score well on that assessment. But the study's student sample still cannot tell us how formal attainment and decades of self-taught computational enculturation relate to performance in long-running agentic work.

That isn't a flaw in the study. No experiment measures everything.

**What exactly has programming taught the people who remain good at programming after the machine starts doing the programming?**

I suspect syntax will turn out to be the least interesting answer.

## The machine that can convince you

There is a popular framing in which AI gradually removes technical expertise from software creation.

I think that is partly true.

The minimum technical competence required to make something useful appears to be collapsing, and that's wonderful.

But the opposite thing may be happening at the frontier.

As the models become more capable, expertise stops being required at every keystroke and starts becoming concentrated at the boundaries.

What did we actually ask for?

What could satisfy the tests while violating the intent?

What evidence would distinguish success from a convincing imitation of success?

What changed while we weren't looking?

A weak model needs help writing the code.

A sufficiently capable model presents a stranger problem:

**it can be wrong persuasively.**

It can gather genuine evidence, perform competent analysis, produce working software and still cross one unjustified inferential bridge somewhere in a chain of fifty otherwise excellent steps.

The better the machine becomes, the less that failure necessarily looks like failure.

An AI helped write an essay arguing that confident claims aren't evidence. Another AI reviewed it and found statistics that still needed primary-source verification.

It was the mechanism in miniature.

I started programming in BASIC when I was six or seven.

Forty years later, the strangest thing AI has done to my programming isn't make me type code faster.

It's made typing code one of the least interesting parts of the job.

The hard part is still the same hard part:

**knowing what you mean, knowing what could make you wrong, and knowing what evidence would change your mind.**
