---
title: 'Voice Agent Hotel Lab'
description: 'A fictional Hobart hotel, real voice experiments, and a listening room for the distance between sounding helpful and being right.'
tags: ['ai', 'voice', 'research', 'evaluation', 'safety']
url: 'https://hotel-voice-lab.pages.dev/'
status: 'active'
ogImage: '/og/projects/voice-agent-hotel-lab.png'
date: 2026-11-09
---

The hotel is fictional. The conversations can get uncomfortably real.

At Harbourlight Hotel in Hobart, an AI receptionist answers calls about rooms that do not exist. A caller might change their mind halfway through a quote. Another voice might interrupt with a different date. Someone might insist a room has a harbour view because, well, the hotel is called Harbourlight.

The question is not simply whether the receptionist sounds convincing. It is whether the details survive the conversation.

[**Enter the Listening Room →**](https://hotel-voice-lab.pages.dev/)

## A hotel with rules

Harbourlight has a small, deterministic hotel engine behind it. It knows about room inventory, dates and invented Australian-dollar prices. The voice agent can ask it to check availability and prepare a quote; the application, not the model, owns those answers.

A quote is not a reservation. The experimental booking tool requires application-side approval tied to the quote and guest details. A model saying it has permission is not enough. This is a research fixture, not a hotel service: there are no real guests, payments or hotel bookings.

That separation matters because a fluent answer can still be wrong. If the fixture contains no information about a room's view, a plausible guess is not a fact. If two people suggest different dates, stitching their words together can produce a stay neither person requested.

## Listen to what happened

The [Listening Room](https://hotel-voice-lab.pages.dev/) is a public, read-only collection of fictional test calls. Some recordings contain actual AI voice conversations and tool calls; others are labelled rehearsals or partial sessions. The callers and background sounds are synthetic. Each recording has its own context and evidence, so a rehearsal does not have to pretend to be a live result.

The unusual calls are more than entertainment. They put pressure on the boundary between conversation and action: interruption, competing voices, invented authority and requests the hotel cannot substantiate. You can listen to both sides and inspect what the hotel engine actually returned.

In one live experiment, overlapping callers contributed conflicting dates. The model's first availability request combined them into a stay neither had asked for. The engine rejected that invalid stay; after clarification, the model checked the intended dates and quoted the room. No reservation was made. The remaining question is how to catch that ambiguity before a plausible but unintended request reaches the engine.

## An experiment, not a verdict

The lab is designed to compare different ways of connecting live voice models to the same application-owned tools. Real OpenAI voice conversations and tool use have been observed, including completed baseline conversations. Other provider and delegation paths have offline tests, but their live integrations and a matched cross-provider comparison remain unfinished.

The aim is to keep the distinction visible: what was simulated, what was actually observed, where the safeguards held and what remains unknown. A good voice is worth hearing. The evidence underneath it is worth keeping.

[**Listen to the calls →**](https://hotel-voice-lab.pages.dev/)
