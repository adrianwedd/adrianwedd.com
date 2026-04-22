---
title: 'Safety-First Therapeutic AI'
description: "Building AI for trauma therapy means the safety architecture has to exist before a single therapeutic feature does. Here's why."
date: 2026-03-15
tags: ['ai', 'ai-safety', 'health', 'typescript']
draft: false
heroImage: '/notebook-assets/safety-first-therapeutic-ai/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/safety-first-therapeutic-ai/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/safety-first-therapeutic-ai/video.mp4'
faq:
  - q: 'What is EMDR and why does it require AI safety?'
    a: 'EMDR (Eye Movement Desensitization and Reprocessing) is a trauma therapy with precise protocols and serious failure modes. AI-assisted EMDR requires safety architecture first because the therapeutic mechanism — activating distress — is also the primary risk.'
  - q: "Why can't safety be added to therapeutic AI later?"
    a: 'Therapeutic AI cannot treat safety as a guardrail because a person processing trauma is neurologically vulnerable. The safety system must continuously monitor whether distress is therapeutic or crisis in real time during the session.'
  - q: 'What are the safety layers in AI-assisted EMDR?'
    a: 'Layer 1 monitors distress thresholds using SUD scores with deterministic gates. Layer 2 monitors session duration and safety profile. Layer 3 deploys hardcoded grounding techniques and crisis resources when the system intervenes.'
  - q: 'Is AI-assisted EMDR a replacement for professional therapy?'
    a: 'No. EMDR Agent is a research and education project, not a clinical tool. It exists to explore what responsible AI-assisted therapeutic architecture looks like, not to replace professional mental health treatment.'
---

EMDR — Eye Movement Desensitization and Reprocessing — is one of the most evidence-based trauma therapies available. Its protocols are precise. Its failure modes are serious. Push too quickly through a traumatic memory, miss a dissociative response, or get the bilateral stimulation timing wrong, and you've done harm.

I built [EMDR Agent](/projects/emdr-agent/) to explore a specific question: what safety architecture does AI-assisted trauma therapy require before it has any business existing?

The answer, it turns out, is that safety has to come first — not as a feature you add after the therapeutic logic works, but as the foundation everything else is built on.

## The problem with "add safety later"

Most AI applications treat safety as a guardrail. Build the capability, then wrap it in filters, content policies, and disclaimers. For customer service bots and code assistants, this is often sufficient. The failure mode of a bad chatbot response is annoyance or wasted time.

Therapeutic AI doesn't have that luxury. A person processing a traumatic memory is neurologically vulnerable. Their distress is the point — EMDR works by activating traumatic material under controlled conditions and allowing the brain to reprocess it. The therapeutic mechanism _is_ the risk. You can't eliminate distress without eliminating the therapy.

This means the safety system can't be a boundary that prevents bad things from happening. It has to be a continuous monitor that distinguishes between therapeutic distress (expected, productive) and crisis (dangerous, requiring intervention). And it has to make that distinction in real time, every few minutes, for the duration of a session.

## Three layers of continuous monitoring

The safety architecture runs independently of the therapeutic agent. It doesn't ask the AI whether the user is okay — it measures it directly.

**Layer 1: Distress thresholds.** Every EMDR session tracks SUD — Subjective Units of Distress, a 0–10 scale that's standard in clinical practice. The safety system watches SUD in real time. A score of 8 or above triggers a HIGH severity indicator. A score of 9 or above is CRITICAL. A rapid increase of 3 or more points from baseline triggers HIGH; a jump of 5 or more is CRITICAL.

These aren't suggestions to the AI. They're deterministic gates. When the risk level reaches CRITICAL — defined as one or more critical indicators present — the system issues an `EMERGENCY_STOP`. The session state changes to `EMERGENCY_STOPPED`, and control passes to pre-written safety scripts: grounding techniques, crisis resources, referral pathways.

**Layer 2: Session-level monitoring.** Distress isn't the only signal. The system monitors session duration (over 120 minutes triggers a MEDIUM indicator; over 180 minutes is HIGH), the user's safety profile (assessed at intake and updated over time), and recent safety history (prior emergency interventions elevate the baseline).

Risk levels cascade: CRITICAL if any critical indicator is present, HIGH if two or more high indicators, MEDIUM if one high or two medium, LOW otherwise. The logic is in 741 lines of `SafetyProtocolService` — explicit, auditable, and not mediated by a language model.

**Layer 3: Grounding and crisis intervention.** When the system intervenes, it doesn't improvise. Three grounding techniques are hardcoded: 5-4-3-2-1 sensory grounding (five minutes), box breathing with a 4-4-4-4 count (three minutes), and safe place visualisation (seven minutes). Four crisis resources are always available: 988 Suicide Prevention Lifeline, Crisis Text Line, 911, and the EMDR professional directory.

The grounding techniques aren't generated by the AI. They're evidence-based, clinically validated, and deterministic. The system doesn't ask Claude what to do when someone is dissociating. It runs the protocol.

## The therapeutic engine

Underneath the safety system, the therapeutic agent implements the eight phases of standard EMDR protocol: preparation, assessment, desensitization, installation, body scan, closure, reevaluation, and resource installation. Phase transitions are governed by clinical criteria — you don't move from desensitization to installation until SUD drops to target levels.

Bilateral stimulation supports four modalities: visual (configurable shape, colour, and path — horizontal, diagonal, figure-8), auditory (tone patterns including binaural), tactile (alternating, simultaneous, or wave patterns with intensity control), and combined. Default sessions run 30-second sets at 0.7 intensity.

The architecture defines five agent roles — therapist, session orchestrator, safety monitor, progress analyst, and crisis intervention — each with distinct responsibilities and priority levels from LOW through URGENT to CRITICAL. The therapist agent handles guidance and psychoeducation; the safety monitor runs continuous assessment; the crisis intervention role activates only under high-risk conditions.

## What this is not

This is not a replacement for professional mental health treatment. The README states this clearly, the agent's system prompt reinforces it, and the CLAUDE.md repeats it. The application is designed for research and education — exploring what responsible AI-assisted therapeutic tooling looks like, not deploying it unsupervised.

But the question matters. Mental health services have an access problem. Wait times, cost, geographic isolation, and stigma keep people from treatment. If AI can eventually play a role in extending access — and that's a significant "if" — the safety architecture needs to be designed now, not retrofitted later.

The patterns here — deterministic safety gates, continuous monitoring independent of the AI, hardcoded intervention protocols, escalation to human professionals — are applicable beyond therapy. Any AI system operating in a high-stakes domain needs to answer the same question: what happens when the model gets it wrong, and how do you ensure the safety response doesn't depend on the model getting it right?

---

_[EMDR Agent](/projects/emdr-agent/) is open source at [github.com/adrianwedd/emdr-agent](https://github.com/adrianwedd/emdr-agent). It is a research project, not a clinical tool._
