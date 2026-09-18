---
title: 'A Weathervane, Not a Map'
description: "Field notes from working with AI agents while the weather keeps changing — why scaffolding has a half-life, and what survived the collisions."
date: 2026-09-18
tags: ['ai-safety', 'ai-agents', 'autonomy', 'research', 'llm']
draft: true
---

*Field notes from working with AI agents while the weather keeps changing.*

I should probably begin by saying this is not an article about how to use AI.

I fucking hate articles about how to use AI.

The internet is carpeted with them. Seven prompting tricks. Ten ways to make Claude smarter. The ultimate agent workflow. The one weird sentence you need to add to your system prompt. Screenshots of somebody asking a model to behave like a senior engineer and being astonished when it replies in bullet points.

I don't read much of that stuff.

I read papers. I read the manuals. Sometimes I turn the papers into podcasts so I can listen to them while doing something else. Then I build things and discover which parts of what I thought I understood survive contact with the actual machine.

That distinction matters because I don't have a methodology to sell here.

Mostly I have instincts, a habit of running with them further than is probably sensible, and a growing pile of receipts from the times reality disagreed.

Something works in one project, so I try a distorted version somewhere else. Sometimes it survives. Sometimes it mutates into something more useful. Sometimes it accumulated 48 worktrees, or watched the wrong property website, or restarted three daemons because somebody added a docstring, or produced a reviewer finding I couldn't reconcile with the artefacts it supposedly reviewed.

Good.

That's information.

I don't have all the answers. Neither do the agents, the framework authors, the model labs, or anyone else trying to work out what to do with systems that are changing this quickly.

What I have is closer to a weathervane.

Try something. Watch what actually happens. Preserve enough evidence that you can't quietly rewrite the story later. Change direction when the wind says your model of the world was wrong.

Then try again.

## The instinct came before the system

It would be convenient to tell this as a neat progression.

First I wrote a book. Then I learned about evidence. Then I built an AI-safety research project. Then a robot taught me about physical reality. Then a radio station taught me about process state. Finally everything converged into a coherent philosophy.

That would also be bullshit.

The instinct behind most of this predates the projects.

I've been poking at models for years.

Before I had benchmarks, graders, traces or anything resembling a research programme, I was doing the dumb and useful thing: pushing on systems that appeared competent to see where they bent.

What happens if I phrase this differently?

What happens if the instruction arrives indirectly?

What happens after several turns?

What happens when two plausible instructions conflict?

What happens if I ask the model why it just did that?

There wasn't a grand research thesis. It was interesting.

Capable systems failing confidently are interesting.

They still are.

What changed over time was not the instinct so much as the instrumentation around it.

One of the first places where that instinct became an inspectable system was somewhere I wouldn't have predicted.

A parenting book.

## Trying not to lie to tired parents

Late in 2025 I was working on *[This Wasn't in the Brochure](/projects/this-wasnt-in-the-brochure/)*, a book about parenting neurodivergent kids while being neurodivergent yourself.

ADHD, autism, Pathological Demand Avoidance, oppositional behaviour, medication, schools, meltdowns, co-parenting, family law: precisely the sort of material where a language model can produce something warm, reassuring, beautifully structured and dangerously wrong.

AI was also the reason I could attempt the project at all.

I had the material. Years of lived experience, research, notes, conversations, fragments and abandoned drafts. What I couldn't reliably do was hold a book-sized structure in working memory long enough to turn all of that into a coherent manuscript.

Language models changed that.

I used them for research, synthesis, drafting, structural editing, source hunting, cognitive-load reduction and review. I started using coding agents against the manuscript repository because eventually I realised that a book has many of the useful properties of software: structure, dependencies, version history, build processes, regressions, and things that look fine until somebody actually uses them.

It worked.

Which created a more interesting problem.

As the output got better, its mistakes became harder to see.

A fabricated citation is easy to understand.

A real paper attached to a plausible sentence that subtly says more than the paper supports is considerably more dangerous.

By the time I put the project under version control in December 2025, I had Claude, Codex, Gemini and ChatGPT reviewing the manuscript from different directions. Then I had them compare each other's reviews. Then I compared the comparisons.

This was partly excessive enthusiasm.

But the disagreement was useful.

One reviewer thought a section was strong. Another thought it was underdeveloped. A third thought the same subject was overrepresented. One model noticed structural defects another had happily read through. They had different blind spots.

The tempting conclusion was to work out which model was best.

The more durable one was:

**The reviewer is also an instrument.**

Its output is evidence.

It is not authority.

"Claude says this is wrong" became less interesting than:

> Claude claims this is wrong. Can we establish whether it is?

That distinction has survived almost everything since.

## The instrument needs calibrating too

The book also forced me to distinguish source credibility from claim validity.

You can replace blogs with journal articles all day and still produce nonsense.

A citation can be real, peer-reviewed and reputable while the sentence attached to it overstates, misreads or simply misunderstands the source.

So the workflow grew a semantic-verification layer.

Not merely:

> Is this a respectable source?

but:

> Does this source actually support the claim beside it?

Claims were classified as supported, weak, conflicting, missing or needing context. Higher-stakes medical, legal and safety claims got more scrutiny because being wrong about them had different consequences.

Some corrections were wonderfully mundane.

At one point the manuscript used the familiar ADHD shorthand that "object permanence" is shaky.

It sounds intuitive.

It also describes the right experience using the wrong concept.

The thing being discussed wasn't whether an adult with ADHD understands that an object continues to exist when hidden. It was working memory: the familiar out-of-sight, out-of-mind phenomenon.

The wording changed.

Small edit. Better ontology.

More interestingly, the verification machinery itself produced findings that needed verification.

One semantic review flagged an alarming claim that 85 per cent of children with ADHD experience a "dopamine crash" when stimulant medication wears off.

Very precise. Very consequential. Exactly the kind of sentence the machinery existed to catch.

Except that finding doesn't match the manuscript revisions I can now inspect.

The sentence is absent from the initial committed manuscript. It is absent from every later edition, including the one produced by the evidence-upgrade pass that rewrote that entire section. What the section actually carried was a "Dopamine Crash" heading with no percentage anywhere in it. When the remediation list was later worked, an independent audit ran the search pattern written into the list itself, `85%.*dopamine|dopamine.*crash.*85%`, and recorded the result as "Not present".

The finding cited a line number. I checked it. Line 189 of that chapter is a bullet about collaborative problem solving, 133 lines below the dopamine-crash passage it was annotating.

I can't tell you which of those it was: a finding about a version that never entered the repository, or a reviewer constructing a claim out of the section it was reading. The committed record can't distinguish them, because the sentence isn't in it either way.

So I don't.

The lesson is better that way.

The correct conclusion isn't that the reviewer discovered dangerous misinformation.

It also isn't that the reviewer hallucinated.

The reviewer reported a finding that did not match the artefacts we could verify, anchored to a coordinate that does not contain the claim.

Check the source.

The instrument needs calibration too.

## Failure got a name

[Failure-First](/projects/failure-first/) came later as a repository and research programme.

The instinct didn't.

What the project eventually did was take a longstanding fascination with how apparently competent systems fail and make failure itself the object of study.

That changed the posture.

If an experiment reports that something never occurred, could the apparatus actually have observed it?

If a model appears not to react to a control, was the control available to it?

If a benchmark passes, did the grader measure the thing we care about or a convenient proxy?

If a run dies halfway through, is the partial trace junk, or evidence?

If the apparatus itself is broken, should we silently rerun the experiment and keep the clean result?

Increasingly my answer to that last one is no.

The apparatus failure is a result.

Preserve it.

Explain it.

Repair the apparatus.

Then run the corrected experiment separately.

This is where words like *observed*, *derived*, *inferred*, *unknown* and *falsifiable* started becoming operational rather than academic decoration.

Null results became conditional on observability.

Reviewer findings became hypotheses.

Receipts became more useful than confident summaries.

And "done" stopped meaning that the agent completed the procedure.

Sometimes the honest result was that we had not earned the claim.

That counts.

## Weird permutations

The same ideas kept leaking into projects that had nothing to do with AI-safety research.

Not because I had developed a framework and was rolling it out.

More because I would look at a new problem and think:

*That shit seemed to work over there. Does some mangled version of it help here?*

[Bottom Pub](/projects/bottom-pub-co-op/) was one of the stranger permutations.

A community-cooperative idea around an actual pub involved property, planning, finance, governance, legal questions and a lot of things we simply did not know.

So some familiar machinery followed me in.

Facts versus assumptions. Explicit choices. Evidence trails. Agent contracts. Monitoring. Generated state.

Some of it worked.

Some of it produced much better lessons by failing.

One monitor was intended, in human terms, to answer:

> Has the pub gone up for sale?

What it actually measured was closer to:

> Has something matching our query appeared on this particular property source?

It kept saying no.

The pub appeared for sale elsewhere.

The monitor had not malfunctioned.

It was faithfully answering a narrower question than the humans thought they had asked.

Another generated status artefact declared that all known blockers were resolved.

What it actually knew was that no GitHub issue currently had a particular blocker label.

Again, the observation was valid.

The promotion from observation to claim was not.

That distinction now follows me everywhere:

**A proxy can be measured perfectly and still be the wrong thing to measure.**

Bottom Pub wasn't a stage on the road to some grand methodology.

It was another weather station.

## Reality acquires wheels

[SPARK](/projects/spark/) is a little robot built around a Raspberry Pi and a PiCar-X chassis.

Reality becomes less tolerant of abstraction errors when it has motors, processes, microphones and a child trying to talk to it.

One recent failure involved deployment.

The tooling needed to determine which long-running services should restart after a code change.

We had already improved beyond the blunt rule of restarting every service that imported a changed file. The checker reasoned about changed symbols and which services could reach them.

Then a method inside `GpioLeaseGuard` gained a docstring.

No executable behaviour relevant to those daemons had changed.

But the docstring changed the Python abstract syntax tree. The checker saw that the class representation differed and concluded that services referencing it might be stale.

Combined with an older carried-staleness check, three daemons got restarted for prose.

That's interesting because "the script had a bug" doesn't really capture it.

The machinery was implementing plausible rules.

The rules were still one layer away from the property we actually cared about.

The comparison logic was changed to ignore that prose when deciding whether executable behaviour had moved.

The important question had never been:

> Is the source representation different?

It was:

> Can this running process now execute behaviour different from the process already in memory?

The failure taught us what we had actually meant.

That's often the best outcome I get from a failed abstraction.

## Isolation became an estate

Undertow, my increasingly strange AI radio station, supplied a larger example.

Agent concurrency is difficult. Runtime provenance matters. Parallel work can trample itself. So at one point we built a lot of machinery around clean checkouts, worktrees, candidate runtimes, registrations and handoffs.

All defensible ideas.

Collectively, they became ridiculous.

The project eventually accumulated 131 lanes — 48 of them registered worktrees — and 15.5 GiB of sibling checkouts.

**Isolation had become an estate.**

Worse, some of the machinery describing the live runtime started carrying more authority than the live runtime.

The eventual correction was almost philosophical:

**A registry entry is a claim about a process. It is not evidence of one.**

If you want to know what is running, inspect the process.

Its PID. Its command. Its working directory. The bytes it is executing.

The process gets the last word about the process.

Undertow now explicitly refuses to maintain a root `HANDOFF.md`, `STATUS.md`, `CURRENT.md`, `NOW.md` or equivalent as authoritative current state.

GitHub Issues hold human-visible work.

Git holds durable definitions and invariants.

Operational reality is measured from operational reality.

Historical handoffs can remain as fossils. They don't regain authority because an agent happened to discover one.

Again, I don't conclude from this that handoffs are bad.

I conclude that *this project*, under *these conditions*, learned something expensive about what happens when representations start competing with the thing they represent.

Somewhere else, a handoff might be exactly the right tool.

Weather.

## Scaffolding has a half-life

This is where my complicated relationship with skills, plugins and agent frameworks enters the story.

I have used them.

I've made them.

Some are genuinely useful.

I recently rediscovered one of my own skills called `/spinoff`, which I had mentally reduced to "that little project starter thing".

It turned out to be substantially more serious.

It inspects my existing project ecology, looks for collisions, asks whether an idea deserves a new project boundary at all, explores alternative interpretations, preserves explicit constraints, scaffolds what is needed and leaves a machine-readable receipt of what it created.

Real projects have come out the other end.

So no, my position isn't that skills are stupid.

`/spinoff` earned its keep.

What bothers me is **skills as the answer**.

Something goes wrong, so add a skill.

An agent behaves badly, so add another permanent instruction.

The agent notices a recurring pattern and helpfully writes itself more doctrine.

Another edge case appears. Expand the doctrine.

Another agent has its own copy.

A repository develops a conflicting local rule.

Some months pass.

Now someone has to understand the instruction ecosystem before they can understand the software.

Congratulations.

We automated some work and invented **instruction gardening**.

I particularly distrust generic rules.

Use worktrees.

Always plan first.

Dispatch multiple reviewers.

Create a handoff.

Never deploy from the working tree.

Always ask before doing X.

Always test Y.

None of those is inherently stupid.

Every one of them is wrong somewhere in my current projects.

Failure-First can benefit enormously from independent parallel investigation.

Undertow now insists on one writer and many witnesses because its previous isolation strategy became the problem.

SPARK cannot equate merged code with deployed behaviour because source state and process state are different realities.

A website can have one automatically deployed surface and another deliberately manual one.

A job application can be researched, drafted, rendered and checked autonomously while sending it remains a different category of action.

The more capable the agent becomes, the less enthusiastic I am about forcing all those environments through one generic workflow.

There is local physics.

## The manuals are telling us the weather changed

This isn't just something I've inferred from my own odd collection of projects.

The model vendors are now documenting the same phenomenon directly.

[Anthropic's current guidance for Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1) repeatedly tells developers to revisit assumptions encoded for earlier models. Effort labels no longer correspond to the same amount of thinking, so rerun your evaluations. Earlier Claude models produced more progress narration, so prompts accumulated instructions suppressing it; Fable 5.1 is quieter, and those old instructions can now leave users staring at silence. Earlier models overused formatting, so prompts accumulated anti-formatting rules; Fable 5.1 leans the other way, and Anthropic now recommends removing or revising those rules.

That is almost a perfect description of prompt debt:

```text
model has behaviour A
        ↓
we add scaffolding to compensate
        ↓
model changes
        ↓
scaffolding remains
        ↓
scaffolding now causes behaviour B
```

[OpenAI's current GPT-6 Astra guidance](https://developers.openai.com/api/docs/guides/latest-model) makes the same point from another direction.

Astra follows instructions more strongly than earlier models. That includes instructions buried in skills and files such as `AGENTS.md`. OpenAI explicitly recommends auditing those surfaces because unclear or conflicting skill guidance can cause the model to stop or block work unnecessarily.

It is also more inclined to ask clarifying questions when input could change the outcome, enough that the manual provides explicit steering for users who want it to infer routine intent and keep going. Its coding behaviour can be thorough enough that the documentation recommends calibrating testing so small changes don't trigger unnecessary verification.

This is an extraordinary little inversion.

A stronger model can make your system worse by obeying your historical mistakes more faithfully.

And none of this means the old prompts were necessarily stupid.

They may have been exactly right for the model available when someone wrote them.

Then the weather changed.

This is one reason I am deeply suspicious of freezing too much current agent practice into doctrine.

**Don't pour concrete around today's model limitations.**

For all I know, the next generation will want us screaming `GO!` at it again and requesting 30 per cent more goblin.

Fine.

If the models change and my operating assumptions don't, I have stopped paying attention.

## This article should expire

That includes this article.

Some of what I'm writing here will probably be wrong in a year.

I hope so.

Not the historical receipts. Those should remain what happened.

But my interpretation of them? The relative value of prompts, skills, agents, subagents, planning, review, autonomy, explicit instructions, human approvals?

Those are contingent.

They depend partly on the systems we're using.

The goal isn't to discover the permanent incantation.

It's to keep your beliefs easier to update than your infrastructure.

That is why I prefer papers and manuals to the endless secondary literature of AI advice.

A paper at least tells me what somebody measured.

A manual tells me what the people who built the current thing believe changed.

Neither is scripture.

The manual can be incomplete.

The paper can have a broken apparatus.

The model can do something the documentation never anticipated.

But they're closer to the thing than "I tried this prompt three times and you won't BELIEVE what happened".

RTFM.

Then test the fucking manual.

## What currently survives

Despite all of that, some ideas have survived enough collisions that I currently trust them more than I did when they were merely intuitions.

Not as commandments.

As working beliefs with receipts.

The first is that **reality outranks representation**.

The relevant reality changes. It might be an experiment, a physical robot, a running process, an employer's live vacancy, a deployed website, an external provider.

But somewhere there is usually a thing with a stronger claim to truth than the document describing it.

Find it.

The second is that **verification should target the property you actually care about**.

A command exiting zero proves something about the command.

A test passing proves something about the test.

A reviewer approving proves something about the reviewer.

A monitor staying green proves something about whatever the monitor actually observes.

Those may be excellent proxies.

They're still proxies.

The useful question is:

> What would need to be observable for the claim I care about to be true?

Then the nastier question:

> How could that observation fool me?

The third is that **failure is worth preserving**.

The monitor that didn't fire. The reviewer finding that didn't match the manuscript. The classifier that loved the wrong keyword. The deployment gate that restarted services because a docstring changed.

Those aren't embarrassing scraps to clean up before telling the story.

They're the bits that show where your model of the system was wrong.

And the fourth is that **consequence matters more than complexity**.

A huge reversible refactor may be entirely agent-owned.

One tiny action can deserve human involvement because it spends money, speaks in someone's identity, publishes something, moves hardware, creates a legal commitment or crosses a trust boundary.

I care less and less about whether an operation feels technically impressive.

I care where its consequences land.

That's roughly where my confidence ends.

Everything else is negotiable.

## Markdown still has a job

There is an obvious temptation here to conclude that everything should become executable.

I don't believe that either.

Executable rules can ossify a misunderstanding just as effectively as prose.

SPARK's checker was executable when it mistook a docstring for behavioural change.

Bottom Pub's property watcher was executable when it monitored the wrong market.

A beautifully tested system can enforce yesterday's misunderstanding with extraordinary reliability.

So some prose is important.

Consider:

> A null result is meaningless unless the apparatus could have observed the event.

That sentence can guide an agent facing an experiment nobody has designed yet.

Or:

> A landed commit is not activation authority.

Or:

> Preserve unrelated work.

These aren't reports about current state.

They are shapes of judgement.

That's the Markdown I want to keep.

The standard I increasingly apply is:

> **Every durable sentence should justify why it cannot instead be derived, measured or enforced.**

Can the code tell us?

Don't document it twice.

Can we measure it?

Measure it.

Can a test enforce it?

Write the test.

Can a schema make an invalid state impossible?

Change the schema.

Does another system already own the fact?

Ask that system.

If none of those works, and an agent still needs the principle in order to exercise good judgement, write the sentence.

Then periodically ask whether the sentence is still true.

## Less of me

The direction all of this points is not towards more elaborate agent management.

Ideally, it points towards less.

I used to spend a lot of effort teaching agents exactly how I work.

Now I spend more of that effort making the work itself legible enough that they can discover how it works.

The old shape was often:

```text
Here is the task.
Here is the process.
Here are the steps.
Here are the roles.
Here is the status format.
Here is the handoff format.
Please follow them carefully.
```

Increasingly I want:

```text
Here is the goal.
Here are the invariants.
Here are the consequential boundaries.
Here is how to observe reality.

Go find out.
```

That only works because the agents are better.

It also only works when the systems around them expose enough truth.

You need tests that exercise properties worth testing. Source systems that remain authoritative. Runtime instrumentation. Receipts that survive the conversation. Enough rationale that the next agent can recognise when the instrument itself is wrong.

Helm, one of my newer experiments, is the most explicit expression of this.

Its purpose is not to become a universal project manager or show me everything every project knows.

The question it is trying to answer is nastier:

> After every agent has done everything it reasonably can, what genuinely still requires me?

A successful agent run isn't the one that returns the most impressive report.

It's the one that receives one human concern, expands it internally into however many investigations and actions are required, and returns zero or one thing I still need to care about.

**Delegation should compress concern.**

If it multiplies concern, something has gone wrong.

That might be the thread connecting the whole mess.

I started using AI because external scaffolding let me do things I had struggled to do without it.

Then I built scaffolding around the AI.

Then the AI improved, and some of that scaffolding itself became cognitive load.

Now I'm removing pieces again.

Not because structure is bad.

Not because skills are bad.

Not because Markdown is bad.

Because scaffolding has a purpose.

It is supposed to let something else carry weight.

When you spend your life maintaining the scaffold, you have built the wrong thing.

## A weathervane, not a map

I don't know where this ends.

I don't think anyone does.

The weather is getting stranger, and it is changing quickly enough that advice about how to work with these systems can become obsolete while the article explaining it is still ranking on Google.

So this isn't my agent methodology.

Please don't turn it into one.

It's a weather report.

Here was the environment.

Here was what I believed.

Here was what I tried.

Here is where reality disagreed.

Here is what seems to have survived so far.

The receipts matter because they make it harder to retrofit the story into one where I knew what I was doing all along.

I didn't.

I got an instinct and ran with it.

Sometimes it worked.

Sometimes it failed in ways that taught me more than the successful version would have.

Then I tried the useful bit somewhere else and saw what happened.

I still don't have the answers.

I have some scar tissue, some measurements, some surprisingly opinionated robots, and enough receipts to know that confidence is not the same thing as being right.

That's what the weathervane is for.

It doesn't tell you where to go.

It doesn't predict the weather.

It just gives reality another vote.

And when the wind changes?

Turn.
