---
title: "Glasswing's Buried Number"
description: 'Anthropic found 10,000 critical vulnerabilities in one month. Fewer than 1% are patched. The announcement buried that figure — and what it means.'
date: 2026-05-25
tags: ['ai-safety', 'security', 'anthropic', 'research', 'vulnerability', 'governance']
draft: false
heroImage: '/notebook-assets/glasswing-buried-number/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/glasswing-buried-number/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/glasswing-buried-number/video.mp4'
audioDuration: '21:03'
faq:
  - q: 'What is Project Glasswing?'
    a: "Project Glasswing is Anthropic's collaborative program using Claude Mythos Preview to find critical vulnerabilities in widely-used software. Launched April 2026 with ~50 partners, it found over 10,000 high-or-critical severity vulnerabilities in a single month."
  - q: 'Why is the patch rate so low?'
    a: 'Because vulnerability discovery now scales with compute but remediation still scales with human capacity. Open-source maintainers are severely capacity-constrained — some have asked Anthropic to slow down disclosures to give them time to design patches.'
  - q: 'What is the capability diffusion window?'
    a: 'The window between when a frontier model acquires a dangerous capability and when that capability becomes available in open-weight models. For offensive cybersecurity, current estimates are 5.7 to 13.1 months — the window defenders have before Mythos-level exploit generation is widely accessible offline.'
youtubeUrl: 'https://www.youtube.com/watch?v=oXB66RSQTIw'
videoUploadDate: 2026-06-09T00:22:34Z
---

The number Anthropic led with was 10,000. That is the count of high-or-critical severity vulnerabilities Claude Mythos Preview found across critical software infrastructure in a single month of Project Glasswing. It is a striking number. It was meant to be striking.

The number Anthropic did not lead with: fewer than 1% of those vulnerabilities have been patched.

Of the 530 high-or-critical bugs formally disclosed to maintainers, 75 have been patched. That is a 14.1% patch rate on the active disclosure set — itself a fraction of the 10,000-plus total. Meanwhile, a further 827 confirmed critical bugs are queued for disclosure. Maintainers are not behind because they are slow. They are behind because the constraint in software security has structurally shifted, and Glasswing accelerated that shift without resolving it.

## What changed

The Glasswing announcement contains an honest sentence that its framing works hard to obscure: _"Progress on software security used to be limited by how quickly we could find new vulnerabilities. Now it's limited by how quickly we can verify, disclose, and patch."_

That is a precise description of a structural failure, not a progress update. The bottleneck moved from discovery to remediation. Discovery now scales with compute. Remediation still scales with human capacity. Those two curves are not converging.

Open-source maintainers told Anthropic they are _severely capacity constrained_. Some asked Anthropic to slow down the rate of disclosures — not because they lack interest, but because they need time to design patches before the next wave arrives. This is the signal the announcement buried: the people responsible for fixing the vulnerabilities Mythos is finding have explicitly asked the finding to slow down. A system discovering problems faster than it can absorb solutions has not solved the problem. It has industrialised the backlog.

## The attacker's side of the ledger

There is a second number the announcement did not lead with, and it matters more than the patch rate.

The median time from first disclosure to first observed exploitation dropped from 771 days in 2018 to single-digit hours by 2024. By 2025, the majority of exploits were being weaponised _before_ they were publicly disclosed. The 90-day coordinated disclosure window — the standard defenders have been working to — was already obsolete before Glasswing launched.

With AI agents now able to automate sandbox escapes, KASLR bypasses, and ROP chain construction, weaponisation windows have collapsed further. We are talking about sub-five-minute exploitation for capable agents with the right access. Defenders require an average of two weeks to patch a high-or-critical bug found by Mythos. Attackers require minutes. That gap is not a security programme problem. It is a structural mismatch between human-paced remediation and machine-speed exploitation.

The relevant arithmetic: Glasswing is building a backlog of disclosed, unpatched, known-severity vulnerabilities while the time-to-weaponise the unpatched ones trends toward zero.

## The diffusion window

Anthropic's own assessment is that Mythos-level capabilities will become widely available in open-weight models within 6 to 12 months. The data supports a more specific estimate: open-weight models lag the closed-source frontier by 5.7 months (GLM-5) to 13.1 months (DeepSeek V3.1) in offensive cybersecurity capability.

This is the adaptation buffer — the window defenders have to deploy countermeasures before Mythos-level exploit generation is accessible offline, without API rate limits, without content policies, without usage monitoring. When that window closes, the attack surface does not change. The skill barrier does.

The 10,000-vulnerability backlog will still exist when it closes. The 827 queued-but-undisclosed bugs will still be waiting. Defenders are not building toward a solved problem. They are building toward a point where the same problem becomes dramatically cheaper to exploit at scale.

## What Glasswing is and is not

None of this is an argument against Project Glasswing. The vulnerabilities exist whether or not Mythos finds them. Finding them is better than not finding them. Cloudflare's 400 high-or-critical bugs, now known, are better than unknown — even if patching them is hard.

The argument is against the framing. Leading with 10,000 vulnerabilities found and not leading with the patch rate structures the announcement as a capability story rather than a systems problem. The capability story is exciting. The systems problem is urgent. They are not the same.

What Glasswing demonstrates, clearly, is that the binding constraint in software security is not analytical capacity. We have solved that. It is now operational capacity — the human infrastructure for triaging, verifying, disclosing responsibly, and deploying patches across distributed maintainer communities who are already overwhelmed. No amount of better discovery addresses that constraint. Discovery at 10× speed makes it worse.

The three things that would actually close the gap are also in the announcement, in the back third, as recommendations rather than commitments: automated patch generation, structured investment in open-source maintainer infrastructure, and public remediation targets alongside discovery metrics. The first two require substantial effort. The third would have required burying a different number.

## The buried number and what it asks

There is a pattern in AI safety announcements where capability milestones lead and structural constraints follow. The capability is real and the constraint is real, but the lead shapes what people take away. Most readers of the Glasswing announcement will remember 10,000 vulnerabilities found. Fewer will remember that fewer than 1% have been patched, or that maintainers asked Anthropic to slow down.

The buried number is not a footnote. It is the central question the programme has not answered: given that discovery now scales with AI, what is the plan for remediation?

If the answer is "more time, maintainers will catch up," the data does not support it. If the answer is "automated patch generation is the next milestone," that needs to be the lead. If the answer is "we don't know yet," that is an honest answer — and an urgent one, because the 6-to-12-month diffusion window is running.

---

_Project Glasswing update published May 22, 2026. Statistics from Anthropic's announcement and subsequent analysis. The adaptation buffer estimates (5.7–13.1 months for open-weight models) are from independent research benchmarking GLM-5 and DeepSeek V3.1 against the closed-source capability trendline. For related analysis on how capability outpaces governance in AI security, see the [Governance Lag Index](/projects/governance-lag-index/) and [alignment regression](/blog/alignment-regression/)._
