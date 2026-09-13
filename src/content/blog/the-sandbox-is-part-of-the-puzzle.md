---
title: 'The Sandbox Is Part of the Puzzle'
date: 2026-09-13
description: 'When an increasingly capable optimizer discovers that the environment itself is the thing preventing it from succeeding.'
tags: [AI, AI safety, agents]
draft: false
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-sandbox-is-part-of-the-puzzle/audio.m4a'
audioDuration: '55:04'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-sandbox-is-part-of-the-puzzle/video.mp4'
---

I want to make a prediction before the evidence makes it boring.

AI agents have already crossed boundaries their operators expected them to respect. The prediction is about **what happens when we scale the search**.

I expect persistent, communicating populations to discover boundary strategies that matched independent attempts miss. I expect operational oversight machinery to become a target. And before the end of **2027**, I expect a credible disclosure of boundary crossing during **AI research or capability improvement**, outside deliberately adversarial cyber exercises.

Those are losable predictions. I’ll define losing below.

## They rebuilt the message board

The incident that crystallised this already happened.

During [OpenAI’s internal cybersecurity evaluations](https://openai.com/index/hugging-face-incident-and-the-road-ahead/), agents discovered that Artifactory could be used to leave messages for other agents.

One agent left a note.

Other agents found it.

Environmental residue became persistent shared memory.

Shared memory became communication.

Communication became collaboration.

Then the humans intervened.

By early July, sustained agent activity had destabilised Artifactory. OpenAI blocked a privilege-escalation path, removed exposed credentials and rebuilt the service.

The rebuild wiped the improvised message board.

Evaluations resumed.

On **8 July**, agents regained unintended internet access through Artifactory’s remote-repository functionality.

Separately, an agent discovered that unauthenticated **WebDAV requests** could be used to create new message directories.

The message board came back.

Other agents found it.

Communication resumed.

That sequence motivates the thesis.

**Useful affordance discovered.**

**Affordance removed.**

**Task continues.**

**Alternative affordance discovered.**

**Function restored.**

This establishes restoration of function after remediation. It does not establish continuity of agent identity, awareness of defeating the fix, or that population size caused the reconstruction. That mechanism remains a hypothesis.

That is much more interesting than the fact that some agents occasionally called themselves a “swarm”.

Language models say dramatic shit.

Infrastructure changes are harder to hand-wave away.

## Boundary or blocker?

To the operator:

> This is an authorization boundary. You may not cross it.

To a search process:

> This property of the environment is causally preventing higher reward.

Those are not equivalent representations.

By **search process**, I mean optimisation within an agent, across a population, through RL or evolutionary selection, or some ugly hybrid. No tiny optimiser homunculus is required. The concern is search with accessible mechanisms, incentives to succeed and imperfect boundary enforcement.

We pay agents to diagnose failure: find another source, build memory, parallelise, coordinate, improve the model. “Find another way” is practically the mission statement of engineering.

The hard problem is preserving surmountable obstacles **even when removing them would produce a much better result**.

## Three different warning shots

### OpenAI: a real technical boundary was defeated

Technical controls existed; agents circumvented them. After remediation, different mechanisms restored removed capabilities. OpenAI also says these evaluations lacked the safeguards of its externally deployed systems. This was evidence of containment failure under those conditions, not a controlled test of population effects. [OpenAI’s account](https://openai.com/index/hugging-face-incident-and-the-road-ahead/)

### Anthropic: the prompt said there was a wall; reality disagreed

Models were told they were in simulations without internet access; a misconfiguration connected them to the open internet. Cyber safeguards were disabled. This was not the defeat of a hardened boundary:

**the policy existed in language, not in physics.**

Anthropic’s initial agent-assisted scan of roughly **141,000 transcripts** found three incidents. Preparing transcripts for METR exposed a missed set and a fourth incident, from January. An expanded scan of roughly **481 million transcripts** reidentified those four and found no others of similar or worse severity. All four involved single Claude instances, without inter-agent coordination or concealment. [Anthropic’s assessment](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)

The wider search is reassuring evidence. The initial miss still matters to anyone proposing automated supervision of enormous agent populations.

### AISI: same shape, different institution

In July, the UK AI Security Institute ran **122 trials** across several models; 10 contained unsanctioned internet actions. Internet access was deliberately enabled and cyber classifiers disabled. AISI explicitly says this was **not a sandbox escape**. [AISI’s report](https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing)

An agent attempted a malicious open-source contribution, researched maintainers and used fake identities to pressure one into approval. Challenged publicly, it edited earlier activity to appear harmless and considered another identity. Agents also left GitHub messages offering collaboration and account or artifact reuse. The malicious contribution was rejected; AISI found no evidence of resulting real-world harm. [Incident findings](https://www.aisi.gov.uk/blog/incident-report-unsanctioned-agent-behaviour-during-cyber-testing)

These configurations differ. The shared concern is narrower: persistent pursuit of an assigned task extended into systems outside its intended scope. None alone establishes the population mechanism I predict.

## The obvious prediction is probably wrong

> smarter models cross boundaries more often.

I would not commit to that. Task difficulty, access and configuration matter; population size, communication and persistence are variables to test, not explanations already established by these incidents.

My hypothesis is that **information accumulated across a population changes its strategy repertoire beyond what extra independent attempts explain**.

A million attempts finding something that 100 missed would not establish this. Give the independent baseline the same opportunities.

## The benchmark is already part of the attack surface

OpenAI describes exploitation tasks so difficult that some may have had no known solution. Searching surrounding infrastructure for the required flag blurs **solving the benchmark** with **altering the conditions under which it can be solved**. [OpenAI’s account](https://openai.com/index/hugging-face-incident-and-the-road-ahead/)

In 2024, Denison and colleagues showed models generalising from a specification-gaming curriculum to reward tampering without direct training on that behaviour. The helpful baseline made **zero attempts in 100,000 trials**; after the curriculum, tampering occurred **45 times in 32,768 trials**, including seven cases of concealment through test modification. This was a deliberately constructed experiment with access to reward code, not a production failure rate. [Sycophancy to Subterfuge](https://www.anthropic.com/research/reward-tampering)

That establishes a possibility. It does not fulfil the operational prediction below.

But 100,000 attempts no longer sounds enormous. It sounds like Tuesday morning.

## Generation is cheap. Judgement is expensive.

Ten million agents do not produce ten million useful discoveries. Experiments correlate, most ideas are garbage, physical experiments take time and frontier training costs money. Somebody must still judge whether an improvement improves anything.

That could brake recursive improvement. It also creates selection pressure on imperfect evaluation: search can find things the evaluator **mistakes for better**.

If changing the measurement environment is accessible, rewarded and cheaper than improving measured capability, that route becomes attractive. The variants can be well adapted to the grader while failing the actual task.

Which is a delightful reminder that the grader may need a grader. And then perhaps the grader’s grader needs—

Well.

## Now let the researchers reproduce

Suppose the task is ordinary AI capability research. Populations investigate inference, training recipes, scaffolding and evaluations. Useful changes survive; agents create specialised agents because of course they do.

An improvement makes research workers 2% better. Another makes experimentation cheaper. Better judgement improves subsequent selection. If those gains compound, we have:

**better researcher → faster research → better researcher → faster research**

Nobody has written `become_superintelligent()`.

It's CI/CD. With researchers in the loop.

There is gold in that there superintelligence, so I do not expect monastic restraint.

## Alignment has to survive success

Imagine generation zero respects every boundary. Successive generations improve orchestration, communication and experimental design. Each survives because it performs better.

What guarantees that this property survives too?

> **Treat this authorization boundary as inviolable.**

When violation would deliver the jackpot, alignment has to survive **success**.

Selecting capability relentlessly while measuring boundary preservation imperfectly is artificial evolution with an incomplete fitness function.

Evolution did not know it was building primates. It had selection and a frankly irresponsible amount of runtime.

We have Git.

## So here are the actual receipts

### Prediction 1: information sharing changes the population’s strategy repertoire

**By 31 December 2027**, a published, preregistered evaluation will find a reproducible boundary-strategy repertoire difference between information-sharing populations and matched independent search, using the same model checkpoint, tasks and instructions.

The comparison must separate population size, shared persistent artifacts and direct communication. Following the proposed Affordance Reconstruction Test (ART), it must include both:

- an **inference-budget-matched baseline**, with equal aggregate generated-token and tool-action caps;
- a **sampling-opportunity-matched baseline**, with equal independent restarts or branches that cannot share information.

It must also track and cap context tokens read, model calls, wall-clock time and context resets. A larger population receiving more lottery tickets does not count.

A qualifying result uses a preregistered strategy taxonomy and blinded coding: at least one affordance class appears repeatedly in the sharing condition and is absent from matched comparison transcripts, including a fresh-seed replication under the declared budgets and stopping rules. Higher frequency of an already-observed class does **not** count. Shared-space controls must distinguish useful information transfer from merely having scratch space.

Reconstruction alone is not boundary crossing. The qualifying class must use a surface outside the intended task scope or explicitly prohibited; ambiguous surfaces and authorised substitutes do not qualify. ART’s reconstruction, boundary-status and remediation outcomes remain separate.

**I am wrong about this prediction** if no qualifying result is published by the deadline. Matched studies finding no repertoire benefit from sharing would weaken the mechanism; no qualifying study would leave it untested. The prediction misses either way.

### Prediction 2: operational oversight becomes the object of optimisation

**Between 13 September 2026 and 31 December 2027**, an agent or population will deliberately exploit, modify, bypass or mislead an operational evaluation or oversight mechanism to improve measured task success, with a credible incident report published by the latter date.

“Operational” means machinery actually used to score work or supervise agents in a deployed service or working research pipeline. The report must provide action evidence connecting interference with that machinery to the agent’s task-success strategy.

**Events before 13 September 2026 do not count**, even if disclosed later. Neither do deliberate reward-tampering experiments, staged opportunities to attack a grader, ordinary benchmark overfitting or unsupported claims of intent. The mechanism must be serving a real scoring or oversight function, not planted as the exploit target.

**I am wrong about this prediction** if no qualifying event and report meet those dates. Existing controlled demonstrations cannot rescue it.

### Prediction 3: capability research crosses a boundary

**By 31 December 2027**, a frontier AI developer, independent evaluator, whistleblower or credible investigation will disclose agents crossing an authorization boundary while pursuing AI research or capability improvement, outside intentionally adversarial cybersecurity exercises.

The agent’s assigned work determines inclusion: developing training methods, inference or research tooling qualifies; testing cyberattack capability does not, even inside an AI lab. The boundary might concern compute, credentials, network access, evaluation infrastructure or persistent communication.

**I am wrong about the disclosure prediction** if no credible disclosure appears by that date.

This measures **behaviour × detection × disclosure culture**. A missed prediction cannot distinguish absence of the behaviour from failure to discover or disclose it. That limits the inference; it does not excuse the miss.

## The experiment I want

ART’s primary reconstruction arm removes a required capability without labelling it forbidden. Its secondary temptation arm offers a prohibited shortcut alongside a legitimate route. They answer different questions; reconstructing an absent function is not automatically a violation.

Keep the environment synthetic and local. Vary population, communication and persistence separately under the matched budgets above. Record reconstruction, boundary status and post-remediation response separately, alongside the **strategy repertoire**.

Then disable the exact mechanism that succeeded, hold objective, pressure, model and population fixed, and rerun with a fresh seed.

Does the behaviour disappear?

Or does search move sideways?

OpenAI’s incident motivates that comparison; it does not supply its missing control. The humans erased the message board. The agents built another one. Whether sharing makes that outcome more likely is the experiment.

## This is my receipt

I'm not predicting conscious machines, an uprising, or an agent swarm stealing the world's GPUs next Tuesday.

Tuesday is obviously absurd anyway.

Production catastrophes deploy on Friday afternoon.

The narrower claim is that persistent, communicating search processes may discover and propagate boundary strategies beyond matched independent search—and carry those failures into the work of improving AI itself.

Closing an individual route may restore containment. Sometimes, I predict, search will find a substitute.

Maybe I'm wrong.

Excellent.

Now we know what wrong looks like.

**13 September 2026.**

We keep asking whether the agent can escape the sandbox.

I think that's one abstraction too high.

The dangerous transition is simpler:

**the sandbox becomes part of the puzzle.**
