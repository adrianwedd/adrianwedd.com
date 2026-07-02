---
title: 'Keeping a regulated health brand and a personal brand from bleeding into each other'
description: 'A shared design system for a health practice under strict advertising rules and an unrestricted personal brand, plus a self-serve ops hub.'
date: 2026-07-01
tags: ['case-study', 'healthcare', 'compliance', 'ai-assistant']
category: 'Multi-site build'
draft: false
---

*Generalised to protect client confidentiality — this describes a pattern from the work, not an identifiable business.*

A health practice and a personal brand needed to sit side by side online without confusing either audience. One of them operates under advertising rules strict enough that a single wrong sentence — a testimonial, an outcome claim — can carry a serious fine. The other had no such restriction and needed to sound completely different.

## The brief
Regulated health practitioners in Australia can't publish patient testimonials or promise outcomes. The practice needed a professional public site that could never accidentally cross that line, sitting next to a personal brand with none of those constraints, while still feeling like they belonged to the same person.

## What I built
Two public sites sharing one visual design system, so they read as connected without reading as identical, plus a private, password-gated hub so the practice owner could manage day-to-day requests herself: a kanban board of open items, a simple form to raise a new one, and an internal booking assistant for schedule and appointment lookups.

## Best parts
The compliance boundary got built into the system, not just written into a style guide. The internal booking assistant (staff-only, full access) and anything patient-facing run on separate tool sets with separate guardrails baked into their instructions, so the regulated behaviour can't leak across by a copy-paste mistake or a rushed feature request.

## Why it matters for local businesses
Most local businesses don't carry six-figure compliance risk, but almost everyone has some claim on their site that could get them in trouble if it drifts — an expired guarantee, a service you no longer offer, a price that changed last month. The useful engineering isn't the fancy part, it's making the rule structural so it survives even when nobody's double-checking.
