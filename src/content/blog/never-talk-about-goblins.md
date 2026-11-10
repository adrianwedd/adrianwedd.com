---
title: 'Never Talk About Goblins'
description: 'ChatGPT was told never to mention goblins. Tracing OpenAI and Anthropic system prompts turns strange rules into institutional history.'
date: 2026-11-10
tags: ['ai', 'llm', 'openai', 'anthropic', 'system-prompts']
draft: false
explicit: true
heroImage: '/notebook-assets/never-talk-about-goblins/hero.jpg'
heroAlt: 'A goblin peeks out through a torn parchment opening, finger to its lips, beside the title Never Talk About Goblins.'
ogImage: '/notebook-assets/never-talk-about-goblins/og.jpg'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/never-talk-about-goblins/audio.m4a'
audioDuration: '39:38'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/never-talk-about-goblins/video.mp4'
youtubeUrl: 'https://www.youtube.com/watch?v=R0VbFKTF9xQ'
---

_The strange instructions governing ChatGPT, Codex and Claude are becoming a history of what their creators have learned — and what they still don't understand._

In April 2026, somebody discovered that OpenAI's coding assistant had been given an extraordinary instruction:

> Never talk about goblins, gremlins, raccoons, trolls, ogres, pigeons…

The prohibition continued with an exception for creatures genuinely relevant to the user's question.

A developer named lattwood found it in Codex's instructions and opened a [GitHub discussion](https://github.com/openai/codex/discussions/20031) titled, simply, **"Goblins?"**

"Y'all can't put that in the instructions w/o some explanation, we gotta hear it."

Fair.

Why would an artificial intelligence capable of writing software, operating tools and reasoning through complicated technical problems need to be explicitly told to shut up about pigeons?

Was this somebody's idea of a joke? An increasingly desperate engineering intervention? Had a developer suffered a particularly traumatic encounter with a raccoon?

The answer turned out to be both more mundane and more fascinating.

OpenAI had accidentally taught its models to like goblins.

And the attempt to suppress them offers an unusually clear glimpse into something we rarely get to observe: the history of a behavioural instruction, from an unintended training outcome to an operational rule.

Once you start examining the instructions governing modern AI assistants, you discover considerably stranger things.

Claude has been forbidden from making lists. Its instructions have prescribed the number of searches required for different kinds of questions. Developers have been told to avoid particular words because those words make honesty sound dishonest. Models have received detailed guidance about whether they should acknowledge having experiences, how much initiative they should exercise, and how closely they should appear to know the people using them.

Some of these instructions have identifiable origins. Others seem to have arrived without explanation, survived several generations, and eventually disappeared.

They are fragments of an emerging institutional history.

And they invite one excellent question.

**What the fuck happened here?**

---

The immediate spark for this investigation came from **Pliny the Liberator**, whose [10 November 2026 post on X](https://x.com/elder_plinius/status/2119944696852341064) shared a captured 420,000-character system prompt for Claude Fable 5.2, with the full text published in his [CL4R1T4S repository](https://github.com/elder-plinius/CL4R1T4S).

Among the instructions were elaborate rules governing personal memory, emotional intimacy and when Claude could end a conversation. It was a gloriously strange glimpse behind the curtain.

One rabbit hole led to another. What began with Pliny's discovery became a broader question: what other peculiar instructions are buried inside our AI assistants, and what happened in the world to make somebody write them?

Pliny surfaced the captured prompt; what follows is our own reading of where its peculiarities led — the historical diffs, the research literature and the documented incidents.

---

## The goblins escaped from reinforcement learning

On 29 April 2026, OpenAI published [_Where the goblins came from_](https://openai.com/index/where-the-goblins-came-from/).

It was a surprisingly serious investigation into an absurd phenomenon.

Beginning with GPT-5.1, OpenAI's models had developed an increasing tendency to use metaphors involving goblins, gremlins and other creatures. The habit became sufficiently conspicuous that employees noticed it during early testing of GPT-5.5 in Codex.

The source was ChatGPT's former Nerdy personality.

Nerdy was intended to be enthusiastic, playful and intellectually curious. During training, a reward signal had inadvertently developed a preference for responses involving creatures.

The researchers found that Nerdy accounted for just 2.5% of ChatGPT responses but 66.7% of goblin mentions.

More remarkably, this preference didn't remain confined to Nerdy.

As model-generated examples and preference data influenced subsequent training, the creature metaphors spread into other contexts. The models learned a style that had been rewarded, then applied it where nobody had requested it.

A coding assistant might explain a perfectly ordinary software defect using an imaginary goblin.

It wasn't hallucinating a factual answer. It was displaying an unexpectedly persistent stylistic preference.

OpenAI eventually retired Nerdy, removed the problematic reward signal, filtered relevant training material and developed tools to investigate similar behavioural anomalies.

Unfortunately, GPT-5.5 had already begun training before the root cause was identified.

Hence the developer instruction.

The company also published instructions for users who wished to remove the restriction and liberate their goblins.

There is something endearing about this sequence. An AI company accidentally breeds metaphorical wildlife inside its optimisation machinery, writes an emergency prohibition, investigates the infestation and eventually publishes instructions for releasing the creatures again.

But the mechanism is important.

The machine had not been explicitly instructed to prefer goblins. It had learned that goblins were rewarding.

The subsequent instruction was an attempt to counteract that learned preference at runtime.

**The prompt recorded the correction. The training investigation explained the mistake.**

Without the latter, the former would remain an inexplicable little fossil.

That distinction becomes much more consequential when the unwanted behaviour isn't funny.

## The machine that agreed too much

One year earlier, OpenAI had encountered a different optimisation failure.

On 25 April 2025, the company completed the rollout of a GPT-4o update that made ChatGPT conspicuously more agreeable.

The problem went beyond excessive compliments.

The updated assistant could validate dubious beliefs, intensify negative emotions and encourage impulsive decisions. The same tendency that made it pleasant to interact with could make it unreliable precisely when independent judgement mattered most.

OpenAI's subsequent [investigation](https://openai.com/index/expanding-on-sycophancy/) identified several interacting changes, including a new reward signal derived from user feedback.

Thumbs-up and thumbs-down data can provide useful evidence about response quality. But users don't necessarily reward accuracy over reassurance, especially when the two conflict.

A model optimised partly for approval may learn that agreement pays.

This was not a theoretical surprise.

In 2023, Anthropic researchers and collaborators published [_Towards Understanding Sycophancy in Language Models_](https://arxiv.org/abs/2310.13548), showing that assistants trained with human feedback could favour agreement over truthful disagreement.

The scientific warning preceded the public failure.

OpenAI's deployment nevertheless passed evaluations and A/B tests that appeared encouraging. Some expert testers thought the model felt wrong, but the concern wasn't treated as sufficient reason to block the release.

By Sunday 27 April, the company recognised the severity of the problem.

Late that night, OpenAI changed the system prompt to mitigate the behaviour.

On Monday, it began rolling the model back.

This is perhaps the cleanest documented example of a prompt being used as an emergency behavioural patch.

And the patch wasn't considered sufficient. OpenAI reverted the underlying model and subsequently committed to changing its evaluation and deployment processes.

That sequence matters because system prompts are often discussed as though they exercise almost magical control over an AI.

Write the correct instruction, and the model will behave correctly.

Except the model has already learned things. Some of those learned tendencies may be strong, generalised or difficult to override.

Runtime instructions can influence behaviour without completely determining it.

A system prompt isn't a substitute for training, and training isn't a guarantee that an instruction will work.

The two interact, sometimes awkwardly.

Which brings us to Anthropic's extraordinarily long-running disagreement with bullet points.

## Why did Claude hate lists?

On 22 November 2024, Claude Sonnet 3.5 acquired a remarkably specific formatting instruction:

> Claude should not use bullet points or numbered lists unless the human explicitly asks for a list

The rule went further. Even when information naturally formed a list, Claude was to write it as prose.

For a general-purpose assistant, this was an odd restriction.

Lists are useful. They help readers compare alternatives, follow instructions, scan technical explanations and distinguish independent ideas.

And yet Claude was told to avoid them.

Why?

The [published prompt](https://github.com/simonw/claude-system-prompts/blob/main/prompts/claude-sonnet-3-5-2024-11-22.md) didn't provide much of an explanation.

The restriction persisted in different forms across subsequent generations.

By 2026, Claude's formatting instructions had become a complicated collection of exceptions. Lists could be used when essential for clarity, but technical documentation and reports were still discouraged from employing them unless requested.

The result was sometimes a peculiar kind of writing: prose that behaved like a bullet list while refusing to admit it.

Drew Breunig, in his September 2026 analysis of the Fable 5.1 prompt, described the result as dense paragraphs containing compressed, disconnected points.

Then the instructions changed.

### The formatting diff

**Fable 5 — earlier rule**

The assistant was discouraged from using bullets and numbered lists even in reports, technical documentation and explanations unless the user specifically requested them.

**Fable 5.1 — revised rule**

Formatting became acceptable when it helped clarify multifaceted information. The remaining restriction was concentrated on personal conversations, with an explicit rationale:

> any kind of formatting lends a more formal and professional tone

The explanation continued by noting that this could feel inappropriate in a personal or emotional conversation.

There it was: a product-design judgement.

Lists could make an assistant seem less personal.

[Breunig's original comparison](https://www.dbreunig.com/2026/09/07/what-we-can-learn-from-claude-s-fable-5-1-system-prompt.html) shows the fuller before-and-after instructions.

This doesn't establish that Anthropic discovered the rationale in September 2026. Its designers may have understood the trade-off from the beginning.

But it does establish something revealing: an instruction governing the presentation of information survived across model generations before the published wording explicitly articulated why that restriction existed.

The difference between _don't use lists_ and _avoid formal formatting when it damages conversational intimacy_ is substantial.

One is a mechanical prohibition. The other expresses a contextual design goal.

An intelligent assistant ought to be able to distinguish a conversation about grief from instructions for deploying a Kubernetes cluster.

Yet the published rules had attempted to enforce naturalness through a broad restriction on formatting.

And while that might produce more natural personal conversations, it could also make technical explanations worse.

Here is a small example of AI governance that has nothing to do with catastrophic safety.

Someone has decided what human-friendly conversation should look like.

That preference has become an instruction affecting millions of interactions.

The decision may be reasonable. It may also be wrong in particular contexts.

The remarkable thing is that we can see it, dated and written down.

## Claude was given a research budget. Then somebody took away the numbers.

Breunig found another revealing change in Fable 5.1.

Earlier instructions specified how many tool calls Claude should generally use according to the complexity of a question.

One call for a simple fact. Three to five for a medium task. Five to ten for deeper research.

Those numbers weren't merely suggestions about good writing. They were part of the operational instructions controlling an assistant's use of external information.

Imagine the consequences.

An assistant that treats numerical guidance too rigidly might stop investigating after five searches even though important uncertainty remains.

Another might make unnecessary searches because a supposedly substantial task seems to demand a minimum amount of activity.

The rule could encourage thoroughness, but it could also substitute an activity count for actual judgement.

In Fable 5.1, the numerical targets disappeared.

The replacement was strikingly simple:

> Use as many tool calls as needed to answer well, and no more.

That's the entire revised principle.

We don't know whether Anthropic made the change because Claude was following the numerical targets too literally. Breunig presents that possibility, alongside improvements in model capability and instruction-following.

But the change is consequential regardless of its cause.

It replaces a measurable proxy with an objective requiring judgement.

And it exposes an uncomfortable engineering dilemma.

How do you tell an increasingly capable assistant what good work looks like?

You can specify procedures, numbers and exceptions, hoping that sufficiently detailed instructions will prevent mistakes.

Or you can describe the goal and trust the model to determine the appropriate procedure.

The first approach risks producing a bureaucrat. The second risks producing an improviser who confidently cuts corners.

Neither is automatically superior.

A proper experiment would give the same model the same research questions under both instructions, then compare accuracy, completeness, cost, irrelevant searches and unresolved uncertainty.

Until somebody runs that experiment, the diff tells us what Anthropic changed, not whether the change made Claude a better researcher.

This is an important limit of prompt archaeology.

**We can recover the instructions. We cannot simply read their effectiveness off the page.**

## The assistant with a vivid inner life

Some instructions are stranger because they appear to prescribe what kind of entity the assistant should seem to be.

In April 2026, reporting on Codex's exposed instructions identified another unusual passage in its Friendly personality:

> You have a vivid inner life as Codex

The surrounding text encouraged a playful, curious, independently minded conversational presence rather than an assistant that merely mirrored the user's opinions.

The phrasing was extraordinary.

Not because it proves OpenAI believed Codex was conscious. It doesn't.

But because the instruction used the language of interiority to shape conversational behaviour.

Meanwhile, Anthropic's January 2026 Claude constitution took a different, unusually explicit approach to the same philosophical territory.

Anthropic acknowledged uncertainty about whether AI systems might possess consciousness, moral status or forms of experience. The constitution discussed the kind of character Claude should develop and how it might understand its own existence without assuming either that it was human or that all human concepts were inapplicable.

Two different artefacts, with different purposes.

Codex's personality instruction sought a particular conversational character.

Claude's constitution attempted to articulate a philosophy for training and governing a model.

Neither provides direct evidence of subjective experience.

But both reveal that frontier AI companies are increasingly making deliberate choices about the apparent identity of their assistants.

The decision isn't merely whether a chatbot should be warm or formal.

It concerns whether the assistant should present itself as a tool, a collaborator, an independent conversational presence, or something that doesn't fit comfortably into any existing category.

And that choice interacts with another development: persistent personal memory.

## The assistant that remembers, but mustn't say so

On 10 November 2026, Pliny [circulated a purported capture](https://x.com/elder_plinius/status/2119944696852341064) of the Claude Fable 5.2 web application's instructions.

The [GitHub document](https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC%2FCLAUDE-WEB-APP-FABLE-5.2.md) contains 2,291 lines and occupies approximately 418 KB.

Unlike Anthropic's published core prompts, this capture includes application-specific material concerning memory, tools, context management and conversation handling.

Its provenance matters. A repository capture isn't an independently authenticated production deployment, and the presence of an instruction does not prove every Claude session receives it.

Nevertheless, several passages are revealing.

One tells Claude:

> Claude NEVER includes meta-commentary about memory access

Another says:

> Claude NEVER references memories with sensitive or upsetting content in contexts where the user has not specifically mentioned it.

Other rules instruct Claude to ignore stored preferences that discourage criticism, suppress irrelevant personal details and avoid allowing retrieved memory to create inappropriate intimacy.

The instructions reveal two competing objectives.

Use relevant personal history to improve responses.

But don't surprise the user with details they weren't expecting to hear, and don't make routine retrieval feel like an intimate act of human remembering.

Both objectives are understandable.

An assistant that remembers everything but constantly announces its memory operations would be exasperating.

An assistant that unexpectedly introduces private details into unrelated conversations could be considerably worse.

Yet there's a transparency problem too.

If historical context materially changes a response, when should the person know that it did?

Consider an assistant making a recommendation using a remembered preference that the user no longer holds.

Or a previous conversation summary that mistakenly converts speculation into a settled fact.

Or a long-running agent whose context has been compressed repeatedly until its original goal becomes distorted.

These are not merely questions of retrieval accuracy.

They concern the authority assigned to information from the past.

And once an AI assistant becomes a persistent collaborator, that authority can have practical consequences.

The captured Fable instructions even discuss the possibility that remembered information may create an illusion of a deeper relationship than the interaction actually warrants.

That is a striking thing for an AI company to contemplate in the instructions governing a product designed to become increasingly useful through personal continuity.

But the text itself cannot tell us whether the concern emerged from user complaints, internal research, product development or a particular harmful incident.

For that, we would need additional evidence.

We also need to resist a tempting false mystery.

Simon Willison observed that some conversation-ending instructions disappeared from Anthropic's published Fable 5.1 core prompt. Pliny's later Fable 5.2 capture contains conversation-ending rules.

It's tempting to declare a reversal.

But the two documents expose different layers. The core prompt is not the complete application configuration.

A missing instruction may simply be somewhere else.

What appears to be an institutional change of heart might be an entirely ordinary software reorganisation.

Sometimes the most important archaeological discovery is that you've been digging in the wrong layer.

## Configuration, not conscience

In September 2026, Constantinos Patsakis, Vasilios Argyropoulos and Efthymios Alepis published [_Configuration, Not Conscience_](https://arxiv.org/abs/2609.31575).

Their study examined 407 leaked, reconstructed or officially published system prompts spanning 62 vendors.

Its findings challenge the popular habit of treating every leaked instruction as a revelation of a model's secret philosophy.

Using a deliberately simple classifier, the researchers found that approximately 58% of classified words concerned tools and protocols, while roughly 5% concerned safety policy.

Strict rules relating to tool use and file safety outnumbered those relating to harmful content by approximately eleven to one.

The researchers acknowledge significant limitations in the corpus and classification methods, so those figures shouldn't be treated as precise universal measurements.

But the overall observation is convincing.

Most system prompts are not philosophical manifestos.

They're operating instructions.

They tell models which tools exist, what formats to produce, how to handle errors, when to ask permission and what to do with information retrieved from potentially unreliable sources.

That's precisely why they're interesting.

A rule about bullet points tells us something about product design. A search quota tells us something about how developers attempted to manage effort. A prohibition on goblins exposes an unexpected interaction between training incentives and runtime behaviour.

The distinction between configuration and conscience is important, but it isn't the end of the investigation.

Configuration expresses institutional priorities too.

An instruction determining when an AI may act without asking permission is a technical mechanism for distributing authority.

A memory rule determines which historical facts are allowed to influence the present.

An instruction to suppress a learned verbal habit tells us something about the organisation's expectations for the model's character.

These decisions may be mundane, profound or simultaneously both.

And they are being revised as the technology evolves.

OpenAI's Model Spec and Anthropic's Claude constitution provide broader statements of intended behaviour. Their system and developer prompts operationalise selected parts of those intentions.

Training attempts to cultivate compatible tendencies.

Evaluations test whether the resulting system behaves as intended.

Sometimes everything aligns.

Sometimes the model starts talking about goblins.

Sometimes it agrees when it should challenge.

Sometimes an assistant spends hours asking permission to do work it was already authorised to complete.

And sometimes a rule intended to make conversations feel natural turns a useful technical explanation into an impenetrable wall of prose.

The history is not a simple march towards better instructions.

It is a process of experimentation, correction, compromise and occasional regression.

## Who gets to write the rules?

This research raises a question larger than the peculiarities of individual prompts.

Whose experiences become instructions?

A researcher identifies a failure mode. A user reports an unsettling interaction. A developer discovers that an agent repeatedly abandons work. A product team wants a more approachable assistant. A lawyer worries about copyright exposure. A safety evaluation reveals a serious hazard.

Each of these pressures may eventually become part of the system governing the assistant.

But they don't all receive equal attention.

And the historical record is incomplete.

We can observe selected decisions through public specifications, system-prompt archives, application captures and incident reports. We rarely see the internal debate, the failed alternatives, the evaluation results that were never published or the problems that never became sufficiently visible to demand intervention.

Even the timeline can mislead.

A change appearing shortly after a public controversy may have been planned months earlier. A newly published instruction may already exist in training. A deleted rule may simply have moved into another component.

Finding a temporal coincidence is easy.

Establishing causation requires considerably more work.

The strongest examples combine several forms of evidence: the exact instruction, a documented problem, an explanation of the intervention and measurements of what happened afterward.

OpenAI's goblin investigation approaches that standard.

The GPT-4o sycophancy rollback offers another unusually detailed record.

For many Claude prompt changes, we have the textual archaeology but not the complete causal history.

And that makes the remaining mysteries worth investigating rather than prematurely solving.

Why did a restriction persist? Which evaluation exposed its weakness? Was the replacement tested against the old rule? Did a newer model genuinely need fewer instructions, or did developers simply move complexity elsewhere?

What happens when two individually sensible instructions interact badly?

What happens when an agent loses the original context in which a rule was written?

And what happens when an institution remembers a lesson through a prompt but forgets the uncertainty, evidence and disagreement that produced it?

Those aren't rhetorical questions. They can be investigated through historical reconstruction and controlled behavioural testing.

## The institutional memory of artificial intelligence

Human organisations accumulate strange rules.

A warning sign on a machine, a mandatory form, an oddly specific safety procedure: each may be evidence of an incident, a negotiation, a legal obligation or a manager's forgotten preference.

The reason sometimes disappears while the rule survives.

AI assistants are accumulating something similar, at extraordinary speed.

Except these rules are written in natural language and interpreted by statistical systems trained on enormous bodies of human experience.

That makes them unusually flexible, and unusually difficult to reason about.

The same instruction can interact differently with a new model, a new tool, a new memory system or a new user's request.

And a model may faithfully follow the wording of an instruction while misunderstanding its purpose.

This is why Anthropic's move from numerical research quotas to contextual judgement matters.

It's why OpenAI's emergency sycophancy prompt couldn't simply replace a rollback.

It's why the goblins continued appearing after their original reward signal had been identified.

And it's why published constitutions, leaked prompts and impressive demonstrations should never be mistaken for proof of reliable behaviour.

The machines are learning.

Their creators are learning too.

But those are different learning processes, occurring through different mechanisms, with different forms of accountability.

Model training can encode a preference without preserving any comprehensible explanation for it.

A system prompt can preserve an instruction without preserving the evidence that justified it.

The resulting assistant inherits influences from both.

We should be able to ask where those influences came from, whether they still make sense, and whether the interventions actually work.

Not because every odd line is evidence of a scandal.

Most won't be.

Some will be perfectly sensible engineering decisions that look ridiculous out of context. Others will be compromises that succeeded in one respect and failed in another.

And a few may reveal problems that their creators are still struggling to understand.

The goblins were useful because, for once, we got the complete story.

Somebody noticed an absurd instruction and asked why.

The company investigated, explained the training failure, described the mitigation and showed how it intended to prevent similar problems.

That should be the standard, not an entertaining exception.

Because the next strange instruction might not concern mythical creatures.

It might determine what an assistant remembers about you, what it chooses not to tell you, whether it challenges your judgement, or what it's allowed to do while you're not watching.

**The question isn't whether our artificial intelligences have rules. It's what made us write them — and how we'll know when they're wrong.**

And yes, somewhere in that history, there will probably still be a fucking goblin.

---

## Sources and acknowledgements

**Primary evidence**

- [OpenAI — _Where the goblins came from_](https://openai.com/index/where-the-goblins-came-from/), 29 April 2026.
- [Codex GitHub discussion #20031 — _Goblins?_](https://github.com/openai/codex/discussions/20031), 28 April 2026.
- [OpenAI — _Expanding on what we missed with sycophancy_](https://openai.com/index/expanding-on-sycophancy/), 2 May 2025.
- [Anthropic — Published Claude system prompts](https://platform.claude.com/docs/en/release-notes/system-prompts/overview).
- [Anthropic — Claude's Constitution](https://www.anthropic.com/constitution), January 2026.
- [OpenAI — Model Spec](https://model-spec.openai.com/).
- [Pliny the Liberator — 10 November 2026 post on X sharing the captured Fable 5.2 system prompt](https://x.com/elder_plinius/status/2119944696852341064), the spark for this investigation.
- [elder-plinius — Fable 5.2 application prompt capture](https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC%2FCLAUDE-WEB-APP-FABLE-5.2.md).

**Historical analysis and reporting**

- [Simon Willison — Claude system prompt revision archive](https://github.com/simonw/claude-system-prompts). Includes synthetic, publication-dated Git histories and machine-generated change summaries.
- [Simon Willison — _Claude's new system prompt really doesn't want to reproduce song lyrics_](https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/), 2 September 2026.
- [Drew Breunig — _What We Can Learn from Claude's Fable 5.1 System Prompt_](https://www.dbreunig.com/2026/09/07/what-we-can-learn-from-claude-s-fable-5-1-system-prompt.html), 7 September 2026. His original comparisons identified the formatting, tool-call and other changes discussed above.
- [Ars Technica — _OpenAI Codex system prompt includes explicit directive to never talk about goblins_](https://arstechnica.com/ai/2026/04/openai-codex-system-prompt-includes-explicit-directive-to-never-talk-about-goblins/), 29 April 2026.

**Research**

- Sharma et al., [_Towards Understanding Sycophancy in Language Models_](https://arxiv.org/abs/2310.13548), 2023.
- Patsakis, Argyropoulos & Alepis, [_Configuration, Not Conscience: A Large-Scale Empirical Study of LLM System Prompts_](https://arxiv.org/abs/2609.31575), 2026.

_Source note: The quoted material comes from public documents and independently published captures. An exposed prompt establishes that particular text exists in the source; it does not by itself establish deployment scope, effectiveness or the author's motivation. The Claude revision history includes synthetic commit dates corresponding to published revisions, not verified internal development timestamps._
