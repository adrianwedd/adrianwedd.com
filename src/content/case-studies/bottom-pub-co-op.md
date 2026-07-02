---
title: 'A website that is not allowed to accidentally lie'
description: 'Looking back at the Bottom Pub Co-op build: enforcing legal discipline in the code, not just in the copy, for a community proposal.'
date: 2026-07-01
tags: ['case-study', 'community', 'governance', 'ai']
category: 'Community platform'
url: 'https://bottom.pub'
draft: false
---

The Commercial Hotel in Cygnet had closed, and a community group wanted to ask their neighbours a genuinely good question: could Cygnet take it on as a co-operative? Answering that badly on a public website — implying a guaranteed return, a confirmed sale, a promise nobody had actually made — would have done real damage, to community trust and potentially to people's legal exposure.

## The brief
The gap between "gauging interest" and "making an investment offer" is sometimes one phrase. The brief wasn't "write careful copy" — it was "build a system that can't accidentally publish the wrong phrase," because copy drifts and humans miss things under deadline pressure.

## What I built
A claim scanner that runs before every deploy and fails the build if risky language slips in — fixed returns, guaranteed repayment dates, confirmed owner willingness to sell. A second check verifies rendered pages still match their source documents. A third probes the access-gated admin paths on every live URL before deploy, to confirm nothing leaks to the public that shouldn't.

## Best parts
The honest proof it was worth building: a multi-model QA pass found the scanner itself had a bug — one whole subdirectory had been silently bypassing the check. It was caught and fixed before anything reached the public. The system found its own failure, which is exactly the job it was hired to do.

## Why it matters for local businesses
Most local sites don't have investment-offer stakes, but everyone eventually publishes something that quietly goes wrong — a discontinued service still listed, a compliance detail that changed, a claim that was true when it was written and isn't now. A build/deploy check that actually reads your own content before it goes live catches the thing a person reviewing it once, months ago, never will.

[Read the full technical write-up →](/projects/bottom-pub-co-op/) · [Visit the site →](https://bottom.pub/)
