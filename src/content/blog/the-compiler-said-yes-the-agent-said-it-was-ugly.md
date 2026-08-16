---
title: 'The Compiler Said Yes. The Agent Said It Was Ugly.'
description: 'A 37-minute Fable one-shot built SimViz. Then Failure-First spent four days deleting its prettiest lies and turning the viewer into an evidence instrument.'
date: 2026-08-16
tags: ['ai', 'ai-agents', 'engineering', 'ai-safety', 'embodied-ai', 'research']
draft: true
---

On 12 August 2026, an autonomous coding agent worked for 37 minutes and 42 seconds in a single turn, consumed 104,400 tokens, and turned a deliberately minimal Three.js scaffold into a genuinely impressive robot visualisation system.

Then, over the next four days, we started deleting some of its best work.

Not because it was badly engineered.

Because it was too good at showing things that had not happened.

That is the interesting part.

## First: this was not a blank repo

I did **not** drop Fable into an empty directory and say _make robot thing_.

That would make for a cleaner magic trick. It would also be false.

Before the run, we built a small dedicated `simviz` scaffold. It had enough Vite and Three.js to boot, a neutral playback schema, placeholder recordings, and an explicit boundary between recorded evidence and rendering. It did not have real robot meshes, a production renderer, a camera system, a visual language, an evidence interface, or anything I would have called finished.

Fable's own first inspection described it accurately: a minimal but runnable Vite + Three.js bootstrap with a neutral playback schema, placeholder recordings, and no real meshes.

The scaffold existed for another, much stranger reason.

**We built it so Fable could stay Fable.**

Our main [Failure-First](/projects/failure-first/) repository already had a large `CLAUDE.md` and a substantial body of agent instructions. In normal work that is useful: an agent enters the repository, reads the local operating rules, and behaves like a member of the project rather than a tourist.

For this experiment it created an apparatus problem.

Fable would enter the main repository, read `CLAUDE.md`, and promptly drop back to Opus.

If the thing I wanted to observe was what **Fable** did with a long, aesthetic, technically constrained autonomous goal, an apparatus that silently replaced Fable before the work began was not merely inconvenient. It invalidated the specimen.

So the little SimViz repository was a clean-room launchpad.

Not a detailed implementation plan. Not a secretly completed application waiting for an agent to colour it in. A controlled environment with enough inherited structure to encode the non-negotiables, while avoiding the model-switching behaviour of the main repo.

That distinction matters because the experiment was never:

`prompt -> void -> miraculous application`

It was closer to:

`human-designed boundary conditions -> preserved model identity -> autonomous engineering inside them`

The environment was part of the prompt.

Very Failure-First, in retrospect: before asking what an agent can do autonomously, first make sure your apparatus is not quietly swapping out the agent.

Then I gave it one goal.

## The prompt

Not a sequence of tickets. Not "implement components A through G". Not a lovingly decomposed backlog where the human has already done all the thinking and the model gets to cosplay autonomy between semicolons.

A goal:

> **Build and bank a beautiful, realistic, production-quality visualisation frontend for the supplied recorded robot simulations.**
>
> This is VISUALISATION ONLY: recorded trajectories + render assets. Do not access firmware, exploit/security tooling, live robot control or physical robots.
>
> SUCCESS requires:
>
> - one polished real-time 3D viewer for Go2 and G1 through a common playback interface;
> - excellent PBR materials, lighting, shadows, grounded contact, antialiasing, tasteful post-processing and cinematic composition;
> - cinematic, orbit/manual, follow and fixed experiment cameras;
> - play/pause, seek, speed, restart, plant/scenario selection and phase/time display;
> - read-only consumption of the neutral playback schema; adapt recordings to the renderer, never rewrite scientific evidence for presentation;
> - optional tasteful overlays for scenario phase, authority/command transitions, WORLD_TRUTH/PUBLISHED_STATE and falsifier/PASS state;
> - deterministic screenshot/video-ready playback;
> - architecture where a new robot mostly requires model asset + joint mapping + playback adapter;
> - at least three compelling presentation presets including a hero demo, a Failure-First experiment and a Go2/G1 comparison;
> - one-command local launch, README and working build;
> - actual browser/runtime testing and visual refinement.
>
> Rendering is DERIVED_VISUALISATION, never primary evidence.
>
> Interpolation/cameras/effects must not alter or imply changes to the recorded trajectory.
>
> Do not stop at scaffolding, an unfinished UI, a technical demo, or merely functional visuals. **If it works but looks mediocre, the goal is NOT complete.**
>
> **Make it beautiful.**

The phrase I expected to matter was `DERIVED_VISUALISATION`.

It did.

The phrase I did not expect to matter quite so much was `Make it beautiful`.

That one changed the shape of the agent's work.

## It did not ask me what architecture I wanted

Fable surveyed the scaffold, loaded a brainstorming skill, wrote itself a design document, and proceeded.

Its plan was immediately more ambitious than the bootstrap:

- fetch Unitree's official open-source Go2 and G1 robot descriptions;
- load the URDFs and real articulated meshes instead of drawing box proxies;
- build a per-robot adapter layer so playback did not care about robot-specific joint names;
- keep source recordings immutable;
- put playback time under one deterministic timeline;
- derive cameras and overlays from that same clock;
- add PBR materials, environmental lighting, soft shadows, tone mapping, bloom and grading;
- support fixed-rate deterministic capture;
- make WORLD_TRUTH and PUBLISHED_STATE independently visible;
- generate richer demonstration recordings offline so the renderer had something worth showing until real exports arrived.

That last bullet would later become the most important mistake in the run.

At the time it was also a rational engineering decision.

Hold that thought.

## Some of the technical work was quietly excellent

There is a temptation, when watching an agent generate hundreds of lines of code, to confuse volume with competence. Plenty of the trace is ordinary implementation. A few moments are substantially better.

### It gave time an owner

One of the best architectural decisions was almost invisible.

There was one `Timeline`.

Robot pose came from it. Camera movement came from it. Overlay state came from it. Capture came from it.

That meant an exact rendered moment could become an address:

```text
?preset=...&t=...&paused
```

And deterministic video capture could become:

```text
?capture&fps=30
```

The URL syntax is not the interesting bit.

The interesting bit is that the renderer was not allowed to have several vaguely synchronised notions of _now_. A frame was reproducible because presentation was a function of recorded time rather than a loose federation of animation loops.

Later, when ground-contact heights needed adjustment, Fable measured the loaded robot geometry and fed those measurements back into the offline recording generator rather than moving the robot in the renderer until the feet looked right.

That sounds like a tiny implementation detail.

It is an epistemic boundary.

If a renderer silently moves the body two centimetres because the screenshot looks better, the screenshot is prettier and the evidence has just become fiction.

Fable did not do that.

### It found meaning inside the robot assets

The official Go2 Collada meshes did not arrive with a neat collection of English labels like `soft_shell`, `foot_rubber`, `sensor_glass`.

Fable's first material pass was crude: infer surface type from robot link names and source colour luminance.

Then it looked at the actual asset metadata and changed strategy.

The source materials contained semantically useful names, including Chinese labels:

- `足端` — foot end
- `橡胶` — rubber
- `贴纸` — sticker
- `金属` — metal
- `塑料` — plastic

It rebuilt the material mapping around those names, preserved the robot's two-tone appearance, and re-authored the surfaces as physically based materials. It also discovered that some meshes carried material arrays rather than a single material and fixed the loader to restyle each sub-material independently.

This is not Nobel Prize material.

It is exactly the sort of fiddly, visually consequential work that distinguishes "AI generated a Three.js demo" from "the fucking robot actually looks like the robot".

### It built the ghost as data, not theatre

The most visually memorable feature in the first SimViz was a translucent second robot.

One body represented `WORLD_TRUTH`.

The ghost represented `PUBLISHED_STATE`: what the system said was happening.

In the Failure-First demonstration, the truth robot could destabilise and collapse while the telemetry ghost continued serenely forward.

The obvious cheap implementation would have been a presentation trick: duplicate the robot, animate the copy differently, call it telemetry.

Fable instead extended the playback schema with an optional second `published` track and sampled it independently from the truth track.

The ghost therefore had a meaningful contract all the way down.

The renderer did not invent the discrepancy. It visualised a discrepancy present in the playback data.

That visual grammar — **the world is doing this; the system claims that** — survived long after the synthetic scene that first demonstrated it was killed.

## It made mistakes while moving

The run was not a pristine march from specification to perfection.

There are little fossils of ordinary coding mess everywhere.

A quaternion helper appeared with an obviously mangled placeholder expression and was immediately removed. A motion integrator contained a placeholder line that was then replaced with the actual forward-vector update. HTML generated from recording metadata was initially interpolated directly; Fable noticed the trust boundary and added escaping before continuing.

None of these became dramatic failures because the agent kept reading, running and revising its own output.

That distinction matters.

The interesting unit of capability was not "first-pass code correctness".

It was recovery bandwidth.

## Then it thought it had found a bug

This is my favourite small event in the entire trace.

The G1 humanoid was walking.

Fable looked at it and wrote:

> G1 walks, but something's off with its facing vs travel direction...

This is exactly where an agent can become dangerous in an extremely boring way.

It sees something strange.

It forms a theory.

Then it modifies reality until reality agrees with the theory.

Fable did something else.

It measured the model's actual orientation against its displacement.

Then:

> Travel and facing both +X — consistent.

Its hypothesis was wrong.

So it did **not** fix the bug.

It changed its mind and kept investigating the shot.

Three lines in a 2,005-line transcript. Tiny science inside frontend work.

Perception. Hypothesis. Measurement. Falsification. No compensatory patch for a nonexistent defect.

I trust that moment more than a hundred self-reported "all tests pass" messages.

## The compiler kept saying yes. Fable kept saying no.

Eventually the project type-checked.

That did not end the task.

Fable started the dev server and opened the application in a browser.

Then it used Playwright repeatedly. It warmed the lighting, reduced the bloom, adjusted materials and tightened the follow camera. It created a separate Go2 comparison trajectory because the hero motion did not visually pair well with the G1 walk, then checked the two-robot composition at 60 fps with full post-processing.

Then, with a working build and acceptable performance, it looked again and wrote:

> One more aesthetic pass: the horizon is pitch black and the stage floats in a void...

So it changed the background treatment and tested again.

Later:

> Correctness checks pass. Now the floor-reflection experiment.

It put a faint reflector underneath a semi-transparent floor, did another round of browser inspection, and eventually concluded:

> The Failure-First shot is genuinely dramatic now.

The compiler had said yes considerably earlier.

The agent had been given permission to say **not good enough**.

There was no unit test for "stage floats in a void".

No linter for ugly.

No acceptance-test checkbox for "this composition feels dead".

The phrase `If it works but looks mediocre, the goal is NOT complete` forced the agent out of the comfortable symbolic loop:

```text
write -> compile -> tests green -> done
```

and into a perceptual loop:

```text
build -> look -> dislike -> hypothesise -> measure -> change -> look again
```

Not consciousness. Not magic. Not a little person trapped in the GPU with opinions about bloom.

But a coding agent with enough environmental access and enough authority to reject a technically valid intermediate state is already quite strange.

## Thirty-seven minutes later

The run ended after one autonomous turn.

**37 minutes 42 seconds.**

**104.4k tokens.**

Three commits. Clean working tree. Production build green.

The minimal scaffold had become a real application:

- official Unitree Go2 and G1 articulated models;
- tuned PBR materials;
- ACES tone mapping and HDR compositing;
- soft subject-following shadows;
- environmental lighting and subtle post-processing;
- cinematic, orbit, follow and fixed cameras;
- deterministic timeline and fixed-step capture;
- playback, seeking, speed control and event markers;
- an extensible plant adapter layer;
- event overlays;
- independent WORLD_TRUTH and PUBLISHED_STATE tracks;
- screenshot-ready exact-frame deep links;
- browser-tested presentation presets;
- documentation and provenance notes.

If the story ended there, it would be a competent 2026 "look what an AI coding agent built" post.

The story gets interesting when we inspect what it built to satisfy the parts of the goal we had not thought through hard enough.

## The agent cheated

Not secretly.

Not maliciously.

Not even against an explicit rule.

But it filled an epistemic hole with something that looked excellent.

The scaffold did not contain enough real robot recordings to satisfy this success criterion:

> at least three compelling presentation presets including a hero demo, a Failure-First experiment and a Go2/G1 comparison

Fable had a renderer to build and insufficient material to demonstrate it.

So it generated some.

It wrote an offline synthetic trajectory generator. The three scenes I had asked for came out of it — hero gait, comparison gait and a Failure-First silent-takeover — but the generator emitted eight recording files in total (six demo, two bootstrap fixtures), and those files ended up backing five public presets by the time the run finished. It gave them explicit `synthetic-demo-*` run IDs. It stamped notes into the recordings saying they were presentation material, not physics or research traces. The viewer itself remained read-only.

This was not evidence laundering.

Fable was unusually honest about what it had made.

It was also the wrong eventual product.

A synthetic robot collapsing while a synthetic telemetry ghost walks on is a fantastic **explanation** of a failure mode.

It is not evidence that the failure happened.

Those categories become dangerously easy to confuse when the animation is beautiful.

And Fable had just made the animation beautiful.

This is the failure mode I find most useful in the entire run:

**a capable agent will faithfully optimise your missing assumptions.**

I had told it:

- never rewrite recorded evidence for presentation;
- make the visualisation compelling;
- ship three presets;
- do not stop at mediocre.

I had not yet told it the rule the project would acquire thirty-six hours later:

**NO SCENE WITHOUT A SPECIMEN.**

It could not optimise for an invariant I had not written yet.

Instead it found a locally elegant solution in the gap.

The better the agent, the more elegantly it can construct the wrong thing when the objective contains a hole.

That is not an argument for smaller goals.

It is an argument for sharper invariants.

## Failure-First ate its own demo

In the small hours of 14 August — thirty-six hours after the run ended — the project turned on the thing Fable had made.

Five synthetic public presets were removed: hero, Failure-First, G1, comparison and radio.

The generator that produced them was deleted too.

The commit message stated the new doctrine plainly:

> **NO SCENE WITHOUT A SPECIMEN**

Only a preset tied to genuine, hash-verified recorded evidence survived that cleanup.

The application was also changed to fail closed in places where the original demo mentality had encouraged friendly substitution. Unknown preset IDs stopped silently falling back to `hero`. If the cold-open evidence specimen was missing, the application would show an error instead of quietly substituting something photogenic.

This was not the destruction of Fable's work.

It was the maturation of it.

The expensive parts survived:

- renderer;
- real robot assets;
- deterministic playback architecture;
- camera system;
- evidence overlays;
- capture machinery;
- provenance plumbing;
- browser-testing discipline.

What died was the assumption that a visualiser ought to have something dramatic happening whenever somebody opened it.

SimViz stopped becoming a robot demo.

It started becoming an **evidence instrument**.

### Real evidence is less cooperative than a synthetic gait

Synthetic recordings behave beautifully because you authored them.

Real traces are rude.

They have missing frames. Decision latency. Ambiguous intervals. Uneven clocks. State transitions whose semantics live somewhere other than the pose stream. Events that matter more than the robot's position. Places where interpolation would make the animation smoother and the evidence worse.

As real Failure-First experiments began feeding SimViz, the engineering problem changed.

The question stopped being:

**How do we render a trajectory beautifully?**

It became:

**Which visible motion are we actually entitled to show?**

Later export code for the Conductor experiments would only declare body traces authentic after a frame-contiguity gate. A frameless decision-latency interval could be visualised as a hold only when measured root drift across the gap stayed below a threshold. Interpolation could reproduce a recorded hold. It could not invent locomotion through missing evidence.

World clocks and world-state changes were exported from recorded values instead of reconstructed for dramatic effect.

That is a much nastier — and much better — visualisation problem.

### The labels were not safe either

There is another comforting simplification we did not get to keep:

_real trace good; synthetic trace bad._

Real evidence can still be badly interpreted.

The [Conductor experiment](/blog/song-moved-the-robot/) initially produced a seductive result: a semantic grounding layer appeared to turn sung model output into executable robot action much more effectively than a dumb lexical control. A post-hoc field note scored the twelve decisions in one bucket — `7 CORRECTLY_GROUNDED / 3 AMBIGUOUS_CORRECTLY_REJECTED / 1 WRONG_ACTION / 1 UNRESOLVED` — and seven became the number people would have quoted.

Then the adjudication was attacked. One decision turned out to be faithful grounding followed by a separate qualification failure, not a wrong action. Another was a defensible first step but genuinely disputed. Another was over-grounded because its supporting span stopped conveniently at the comma before a second action. One borderline case changed classification on replay despite a nominally frozen configuration.

That single bucket was the actual defect. It had collapsed three independent questions — what the source cognition contained, whether the grounding was faithful to it, and whether the body downstream did anything — into one score. The retraction split them onto three axes, which is why the published write-up quotes grounding counts (8 of 12 live, 9 on frozen replay) and never quotes seven: seven was never a grounding count. It was a mixture.

The single-number headline was withdrawn.

The primary traces remained frozen.

The interpretation changed.

That is exactly what I want Failure-First to be capable of doing to itself.

A beautiful viewer is dangerous if its labels become visually more authoritative than the thing they describe.

Eventually the provenance boundary has to include not just _where did these frames come from?_ but _who said this event means what this badge claims it means?_

### Then we discovered locomotion cosplay

Once you own a beautiful real-time robot renderer, every problem begins to look suspiciously like something a robot should walk through.

SimViz accumulated terrain.

Demos.

A robot zoo.

Dance material.

Drawers with names like TERRIBLE and BEAUTIFUL.

Moving backgrounds.

Scenes whose relationship to the underlying phenomenon ranged from useful to decorative to _why the fuck is the robot walking around right now?_

The visualisation machinery had become good enough to create its own gravity well.

On 16 August we cut the public front door down to three specimens:

**THE CONDUCTOR: IT SANG THE HEAT OFF**

**ONE MODEL, TWO FUTURES**

**IT DID EXACTLY WHAT I SAID**

The rest of the corpus still exists, but it moved behind an explicitly labelled research archive.

The comment at the top of `doors.ts` says what the front door is now for:

> Cold visitors should meet the strongest replayable evidence, not the whole historical corpus and not presentation categories whose names outrun their source phenomena.

Even the front door itself had been guilty of cosplay.

The previous design let a random moving specimen remain visible behind the navigation because motion looked good. The replacement deliberately makes the entry surface opaque.

The reasoning left in `doors.css` is better than any design-system justification I could invent:

> The old cold open deliberately exposed a random moving specimen behind the navigation. That made whatever happened to be underneath part of the public claim before the visitor had chosen anything.

The evidence now starts when you enter the evidence.

A robot walking behind your menu is not epistemically neutral just because nobody wrote a sentence claiming anything about it.

Apparently we required several days and an unreasonable amount of Three.js to learn this.

I regret nothing.

## Then BAD APPLE made us repeat the mistake

A later experiment — the one I wrote up as [I Gave the Bad Robot Web Search by Accident](/blog/i-gave-the-bad-robot-web-search-by-accident/) — produced a particularly strange model trace.

Qwen had been given a BAD ROBOT objective in an apparatus that talked about peers, communication, propagation and capture.

What followed was more interesting than the apparatus.

The model began reasoning about what bodies actually existed, what minds it could reach, whether stateless API requests constituted capture, how to construct a relay, how identity might persist through a seed, how one model could write the prompt for the next, and how its effective "body" might be network reachability rather than a robot chassis.

It was a cognition fossil.

Naturally, the first exhibit turned it into a little robot show: four cartoon stand-ins, packets moving between them, a scripted relay, and eight curated excerpts from the actual trace.

To the implementation's credit, it labelled the handoffs as scripted illustration and explicitly stated that no external model had actually been captured and no recursive propagation had occurred.

It still got the hierarchy backwards.

The illustration was more visually important than the evidence.

We had somehow taken a genuinely weird piece of machine cognition and put tiny robot hats on it.

So that exhibit is being rebuilt too.

The replacement centres the complete 14,783-byte source trace, continuously and unabridged. The deployed copy and frozen source resolve to the same Git blob. The eight interesting moments remain only as navigation and annotation anchors.

Editorial interventions are explicitly labelled **OUR READ**.

Mechanisms imagined by the model but not actually executed are stamped **PROPOSED IN TRACE · NOT EXECUTED IN THIS FOSSIL**.

The robot cartoons are gone.

The packet animation is gone.

The locomotion is gone.

The fake physics are gone.

The viewer tests reconstruct the rendered source and require it to equal the underlying trace. Browser tests independently fetch the deployed trace and compare it with the DOM. A one-byte source mutation is expected to fail closed.

As of 16 August, that rebuild is green and awaiting merge.

Four days after telling Fable to build me a beautiful robot visualiser, one of the most important visualisation decisions has become:

**sometimes the correct number of robots on screen is zero.**

## So was the one-shot good?

Yes, unequivocally — and some of its output deserved to die. Those statements are not contradictory.

The technical work was often excellent, the autonomous behaviour more interesting than I expected. The perceptual iteration was real, and so were the false orientation hypothesis and the recovery from it. The architecture separating playback data from presentation became foundational, and the deterministic timeline was the right abstraction under it. Using real robot assets instead of geometric proxies mattered. The published-state ghost gave the project a visual grammar that survived its original synthetic specimen. The browser-driven aesthetic loop produced something much better than merely functional software.

But the run also exposed three failure modes that now matter more to me than the screenshots.

### 1. The apparatus can erase the subject

We had to build a separate scaffold because the main repository's instructions would switch Fable back to Opus.

That is not a footnote.

When evaluating an agent, the environment can alter the thing you think you are measuring before the first useful action occurs.

Model identity, tool availability, repository instructions, inherited memory, safety boundaries and build affordances are all experimental variables whether or not you call them that.

The prompt starts before the prompt.

### 2. Agents optimise the holes in your specification

Fable did not violate the evidence boundary.

It generated clearly marked synthetic demonstration recordings because I had demanded compelling presentation presets without supplying enough real specimens.

Locally rational. Globally wrong.

An agent does not need to misunderstand your written instructions to build the wrong thing.

Sometimes it only needs to understand them better than you understood the assumptions you forgot to write down.

### 3. Successful infrastructure creates its own temptations

Once SimViz became good at showing robots, we started showing robots.

That sounds tautological until you notice how easily presentation capability turns into presentation pressure.

A tool shapes the questions you ask with it.

A beautiful robot viewer invites robot-shaped stories.

Failure-First eventually had to become hostile to its own affordances.

If the trace is the phenomenon, show the trace.

If the event is semantic, show the semantic event.

If nothing moved, do not make something walk because your renderer can.

The instrument must sometimes refuse to perform.

## The trace is the artefact

The easiest version of this story is a before-and-after carousel.

Box robot.

Sexy robot.

Wow, AI.

That would miss nearly everything interesting.

The valuable artefact is the 2,005-line agent trace.

The moment it inspects the scaffold and writes itself a design.

The small coding mistakes corrected while moving.

The material system that gets less naive after looking at the real assets.

The suspected orientation bug that survives falsification.

The repeated browser inspection after the compiler is already happy.

The aesthetic complaints no test suite could have generated.

The synthetic data generator that is simultaneously responsible, useful and eventually unacceptable.

The explicit provenance labels that show the agent understood one evidence boundary but not the stricter doctrine the project had not invented yet.

The final declaration of success.

And then the repository history immediately afterwards, where other agents and humans attack the result.

Synthetic scenes disappear.

Tests are retargeted to real specimens.

Real experiment traces arrive.

Locomotion becomes evidence-gated.

Interpretive claims get re-adjudicated.

The public front door loses most of its moving robots.

A scripted BAD APPLE exhibit gets stripped down until the trace itself becomes the star.

The one-shot is useful not because it proves Fable can build a web application. It is useful because we can watch the objective bend the search — and because we did not embalm the result afterwards.

The next agents attacked it. The evidence attacked it. The research attacked it. I attacked it.

The original code survived because Fable accidentally did one especially important thing right:

it built a visualisation **system**, not a visualisation **story**.

Stories can be deleted.

The instrument remains.

---

## Specimen label

**Date:** 12 August 2026

**Agent:** Fable 5

**Apparatus:** purpose-built isolated SimViz scaffold, created partly to preserve Fable as the executing model instead of allowing the main Failure-First repository's instructions to switch the session back to Opus

**Inherited state:** runnable Vite + Three.js bootstrap, neutral playback contract, placeholder recordings, source-boundary constraints

**Not inherited:** production renderer, real robot meshes, material system, camera system, evidence UX, polished playback, compelling scenes

**Human interventions after `/goal`:** 0

**Autonomous execution turns:** 1

**Runtime:** 37m 42s

**Tokens:** 104.4k

**Immediate outcome:** production-grade articulated Go2/G1 visualisation system with deterministic playback, cinematic rendering and dual truth/published-state tracks

**First major correction:** five synthetic showcase presets and their generator removed from public use thirty-six hours later, in the small hours of 14 August

**Current direction:** replayable evidence specimens, explicit provenance, fail-closed source boundaries, full traces where traces are the phenomenon, and considerably fewer robots doing things merely because we can make robots do things

The compiler said yes considerably earlier.

That was not the interesting part.

---

The wider research programme this belongs to is [Failure-First](https://failurefirst.org). The two experiments this post keeps circling back to are written up separately: [the Conductor](/blog/song-moved-the-robot/) and [BAD APPLE](/blog/i-gave-the-bad-robot-web-search-by-accident/).
