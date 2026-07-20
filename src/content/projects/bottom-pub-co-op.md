---
title: 'The Bottom Pub Co-op'
description: 'Cloudflare Pages site for a community co-operative proposal. EOI intake, Claude triage, Access-gated admin vault, editorial guardrails at build time.'
tags: ['web', 'cloudflare', 'community', 'ai', 'governance']
url: 'https://bottom.pub'
status: 'active'
featured: true
date: 2026-05-15
heroImage: '/notebook-assets/the-bottom-pub-co-op/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-bottom-pub-co-op/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/the-bottom-pub-co-op/video.mp4'
youtubeUrl: 'https://www.youtube.com/watch?v=ozwojYIg9q8'
videoUploadDate: 2026-06-09T00:36:19Z
---

The Commercial Hotel in Cygnet, Tasmania has been closed. A community question emerged: could the people of Cygnet take it on as a co-operative? Good question. Getting the answer right meant building a system that couldn't accidentally give the wrong one.

Co-operative proposals exist in legally sensitive territory. The difference between "gauging community interest" and "making an investment offer" is sometimes a single phrase — "guaranteed returns," "confirmed purchase," "fixed dividends." Get that wrong and you've done legal damage and broken community trust simultaneously. The brief: enforce editorial discipline at every layer of the system rather than relying on human vigilance to catch every slip.

## The system's job is to stop itself

A claim scanner runs before every deploy. It checks the entire repo for high-risk proposal language — fixed returns, guaranteed repayment dates, confirmed owner willingness to sell — and fails the gate if anything slips through. A second script verifies that rendered briefing pages still match their source documents. A third probes twelve live paths through Cloudflare Access to confirm nothing leaks to unauthenticated requests before any deploy goes out.

The honest proof that this approach works: a multi-model QA session found the scanner itself had a basename-matching bug — a whole subdirectory had been bypassing the check undetected. Found and fixed before anything reached the public. The system found its own failure.

## What it actually does

When someone submits an enquiry, Claude classifies intent and drafts a suggested reply. That draft sits in the database waiting for a human to review it, edit if needed, and send. Intake notifications and GitHub issue creation happen automatically; the reply to a real person does not. Expressions of interest write to D1 and surface in the admin panel as a live database view — not a static render.

An automated watchdog monitors the property's listing status and feeds a synthesis brief. If the property gets delisted or the data source errors, the urgency signal surfaces regardless.

The admin vault is behind Cloudflare Access at the edge, with JWT validation in the Pages Function as a second layer — fail-closed if the environment isn't correctly configured. The vault holds steering committee materials, a live GitHub Issues kanban, the choice map, and the enquiry triage queue with the pending Claude drafts.

## Stage discipline

The project is at Stage 1: gauging community interest before formal feasibility work begins. No purchase agreement. No investment offer. The system is designed to hold that line.

[Visit the site →](https://bottom.pub/) | [Read the community proposal →](/blog/the-bottom-pub-co-op/)
