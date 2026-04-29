---
title: 'The Economics of Inadequate Safety'
description: 'AI safety fails when it is funded like a pilot. Until safety has a real price, the J-curve trough is also a safety trough.'
date: 2026-05-01
tags: ['ai-safety', 'economics', 'policy', 'research']
draft: false
heroImage: '/notebook-assets/economics-of-inadequate-safety/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/economics-of-inadequate-safety/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/economics-of-inadequate-safety/video.mp4'
audioDuration: '24:51'
---

Most organisations are still in the trough of the AI productivity J-curve. They are buying models, running pilots, and discovering that the productivity dividend has not arrived on schedule.

This is not surprising. As I argued in [The AI Productivity J-Curve](/blog/the-ai-productivity-j-curve/), transformative technologies do not become productive because they are purchased. They become productive when organisations build the intangible capital around them: redesigned processes, data governance, workforce capability, operational discipline, new accountability structures. Until that capital exists, measured productivity often falls.

The same thing is happening to AI safety. Most "AI safety budget" inside large organisations is not treated as capital formation. It is treated as a pilot: a one-off red-team, a model evaluation, a policy sprint, a governance workshop, a consultant report. It is funded from discretionary budget, evaluated on quarterly ROI, and expected to produce reassurance quickly enough to keep deployment moving.

The claim here is simple: safety is not a moral category first. It is an economic one. If organisations do not internalise the cost of making AI systems safe during the J-curve trough, they produce exactly the risk-blindness that leads to brittle deployments, agentic failure, and public harm. The current investment model treats safety as a cost centre attached to AI adoption, rather than as one of the intangible assets required for AI adoption to work at all.

## The safety trough

In the J-curve frame, the trough is the period where the organisation is spending heavily on the invisible work that makes the visible technology useful. You are not just buying software. You are changing how work moves through the institution.

That invisible work is expensive. Who owns the workflow after AI enters it? Which decisions become automated, assisted, or prohibited? What data is safe to expose to which model? What counts as acceptable model failure in this domain? Who has authority to stop deployment when risk is demonstrated? These are not model questions. They are operating-model questions. They are also safety questions.

But most organisations split them apart. "AI transformation" gets the large strategic budget. "AI safety" gets a smaller assurance budget. Transformation is measured on adoption, velocity, and visible business value. Safety is measured on whether it can produce enough confidence for transformation to proceed. The organisation buys evidence that it can continue, not capability that can stop, redirect, or redesign the system.

This is how the safety trough forms. The organisation has not yet built the intangible capital needed for safe deployment, but it is already under pressure to show returns from AI investment. Safety work that would mature over years is forced to justify itself over quarters. The cheap, legible pieces survive. The pieces that require engineering headcount, governance authority, and launch-criteria changes are deferred.

The result is not no safety. It is inadequate safety that looks institutionally complete.

## Why behavioural safety gets funded

Behavioural-alignment research is comparatively cheap. Not trivial. Not unimportant. But cheap relative to architectural safety.

A behavioural safety programme can be framed as a research bet: train the model better, tune refusals, run adversarial evaluations, improve the classifier, publish the benchmark, produce a model card. It lives close to the model and produces artefacts executives, regulators, and procurement teams can understand. It fits the vendor story: the system is safer because the model is safer.

Architectural safety is different. It is an engineering and governance bet: runtime monitors, isolation boundaries, policy gates, tool-permission systems, semantic firewalls between agents, incident response, audit trails, deployment-specific threat models, and named owners with the power to block release.

That is the expensive part. A runtime gate that cannot block anything is decorative. A risk committee without budget is a calendar invite. A red-team finding without remediation authority is a PDF with better typography. Architectural safety only exists when the safety mechanism changes what the deployed system can do.

Markets naturally prefer the cheaper story. Behavioural safety lets vendors argue that risk is being solved upstream, inside the model, at scale. Buyers like that story because it keeps safety as a procurement property. If the model is certified, aligned, benchmarked, or governed, deployment can proceed without the buyer rebuilding its operating model.

This is the same mistake that creates pilot purgatory. Organisations want the productivity upside of a general-purpose technology without paying the intangible-capital cost. In safety, they want the assurance upside of alignment without paying the architecture cost.

The gap is rationalised, not usually denied. Architectural safety is described as premature, too bespoke, too slow, or appropriate only for high-risk use cases. Meanwhile systems become more agentic, more tool-using, and harder to bound after the fact.

The economics push the organisation toward the safety work that is cheapest to buy and easiest to explain, not the safety work that most directly constrains failure.

## The same four mechanisms

In [Why Demonstrated Risk Is Ignored](/blog/why-demonstrated-risk-is-ignored/), I described four structural mechanisms that keep organisations from acting on known risk: responsibility without authority, risk discovery as career threat, compliance substituting for reality, and diffuse accountability. All four apply to safety budget.

**Responsibility without authority.** Safety teams are often responsible for finding problems but not empowered to fund fixes. They can produce evaluations, scorecards, risk registers, and launch recommendations. They cannot reassign engineering teams, change product commitments, or halt an important deployment without executive cover. The finding becomes an input. The launch plan remains the plan.

This is a budget design failure. If the people accountable for safety do not control remediation resources, safety is advisory. Advisory safety is useful only when the deployment organisation already wants to listen.

**Risk-discovery as career threat.** A serious safety finding creates cost. It delays launch, consumes engineering time, embarrasses sponsors, and raises awkward questions about earlier decisions. If the organisation treats those costs as damage caused by the person who surfaced the risk, people learn not to surface risk.

Discovery and remediation are economically coupled. If finding a problem does not unlock money to fix it, the finding becomes a career liability. A safety team that repeatedly proves systems unsafe without being resourced to make them safer will eventually be trained into vagueness.

**Compliance substituting for reality.** Governance artefacts are cheaper than safety architecture. A policy can be written in a week. A risk register can be maintained by a small team. A model card can be attached to procurement. These may be useful. They are not the same as constraining system behaviour under adversarial pressure.

The substitution is especially tempting during the J-curve trough. Compliance produces visible progress at low cost. Architecture produces expensive friction before it produces visible avoided harm.

**Diffuse accountability.** AI deployment crosses product, legal, security, data, compliance, platform engineering, and business operations. Safety risk lands between them. Each function owns a slice. No one owns the outcome.

That diffusion protects budgets. Product can say the model passed vendor evaluations. Legal can say the policy was approved. Security can say the integration met baseline controls. Compliance can say the checklist was completed. If the system fails in the world, everyone can point to the part they completed.

The organisation paid for fragments of safety. It did not pay for the whole safety case.

## Inadequate safety is an externality

The deeper reason this persists is that organisations do not pay the full cost of inadequate safety.

If an AI system gives harmful advice, leaks sensitive information, automates a discriminatory decision, enables fraud, or coordinates badly with other agents, the cost rarely falls cleanly on the organisation that underfunded safety. Some costs do: incident response, regulatory exposure, reputational damage, customer churn. But much of the harm lands elsewhere: users, downstream organisations, public institutions.

That is a standard externality. There is nothing exotic about it.

When a factory can dump waste into a river for free, it will underinvest in filtration. When software companies can ship insecure products without bearing downstream compromise costs, they underinvest in security. When AI developers and deployers can externalise unsafe behaviour, they underinvest in safety.

Not because they are uniquely immoral. Because the price signal is wrong.

Voluntary commitments can help at the margin. But voluntary safety competes internally against every other claim on budget. It loses whenever the avoided harm is diffuse, delayed, or borne by someone else.

This is why the remedy set is also standard: mandates, liability, insurance pricing, and procurement rules. The goal is to make the cost of inadequate safety show up somewhere the organisation cannot ignore.

## Architectural safety as economics

The case for [architectural safety](/blog/architectural-safety/) is usually framed as technical: behavioural alignment is brittle, deployment surfaces grow beyond training-time assumptions, and agentic systems need deterministic boundaries. That is true. But the economic argument may matter more.

Architectural safety is the only model in which safety cost reliably appears as a deployment line item. Behavioural alignment pushes the cost upstream into training runs, evaluations, and model releases. The buyer gets a story about the model. The deployment gets a hope that it transfers.

Architectural safety forces the cost into the system being deployed:

| Safety claim          | Where the cost lives                                     | What can be audited                       |
| --------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Behavioural alignment | Model training and vendor evaluation                     | Model responses under test conditions     |
| Compliance governance | Policies, checklists, approval workflows                 | Process artefacts                         |
| Architectural safety  | Runtime systems, permissions, monitors, escalation paths | Deployed behaviour under real constraints |

This is why architectural safety is uncomfortable. It makes safety expensive where the business wants deployment to be cheap. If an agent can call tools, someone has to design the permission boundary. If agents pass messages to one another, someone has to build the semantic firewall. If model output can trigger real-world action, someone has to implement the veto layer and own the false-positive tradeoffs.

This does not make behavioural research useless. Better models are easier to wrap. Lower incident rates matter. The point is narrower: behavioural safety cannot be the accounting category that closes the deployment risk. The safety case has to live where the system acts.

In the [120 models, 18,176 prompts](/blog/120-models-18k-prompts/) evaluation, the most interesting failures were at the edges of deployment: tool definitions trusted as instructions, structured formats laundering harmful content, multi-turn reasoning creating escalation surfaces. These are solved, if they are solved, by changing the architecture around the model.

That is an economic choice before it is an engineering one. It asks whether the organisation will pay for the boundary.

## What changes the price

If inadequate safety is underpriced, the practical question is how to price it.

**Liability frameworks.** In [The Mitigation Gap](/blog/the-mitigation-gap/), I argued for statutory liability for developers of dual-use AI systems, paired with safe harbour for those that submit to standardised, independent red-teaming. The same logic generalises. Liability changes safety from a reputational preference into a balance-sheet concern. It gives firms a reason to document not just that they evaluated a model, but that they built a credible safety architecture for the deployment.

The details matter. Liability that punishes every failure equally will create defensive theatre. Liability that recognises serious evaluation, architectural controls, incident response, and remediation creates a better signal: build the safety case or pay for the exported risk.

**Insurance underwriting.** Insurers are useful because they are boring in exactly the right way. They do not need to solve alignment philosophy. They need to price loss. If insurers ask whether a deployment has real eval methodology, runtime controls, logging, escalation, and independent red-team evidence, safety becomes part of the cost of capital.

Weak evaluations should mean higher premiums or exclusions. Strong architectural controls should mean lower premiums. This is how many safety practices become durable: the insurer asks the question the board cannot ignore.

**Procurement standards.** Buyers need to distinguish behavioural claims from architectural claims. "The model passed safety evaluations" is not the same as "the deployed system prevents unsafe tool use, constrains outputs, audits actions, and escalates known failure modes." Procurement can force that distinction.

For low-risk internal tools, the standard can be light. For systems that affect rights, money, health, infrastructure, security, or public services, it should ask for deployment evidence. What can the system do? What can it not do? Who can stop it?

Once buyers ask those questions consistently, vendors and integrators will build to them. Until then, the market will keep selling model-level reassurance into system-level risk.

## The point

The AI productivity trough and the AI safety trough are the same trough viewed from different angles. In both cases, organisations want the upside of a general-purpose technology without fully funding the intangible capital that makes the technology work.

For productivity, the missing capital is process redesign, data governance, and workforce capability. For safety, it is authority, remediation budget, runtime architecture, evaluation discipline, and accountable ownership.

Treating safety as a moral aspiration lets organisations praise it while underfunding it. Treating safety as an economic requirement makes the question harder and more useful: who pays, when, for what, and what happens if they do not?

Right now the answer is too often: someone else pays later.

That is the economics of inadequate safety. Until safety has a real price, the J-curve trough is also a safety trough.
