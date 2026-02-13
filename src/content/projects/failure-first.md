---
title: "Failure First"
description: "A methodology for AI safety that starts with what can go wrong."
tags: ["ai-safety", "methodology", "research"]
url: "https://failurefirst.org"
repo: "failure-first"
status: "active"
featured: true
date: 2026-02-09
---

Most AI safety work begins with capability: what should the system do? What are its goals? How do we align it with human values? These are reasonable questions. They are also the wrong place to start—because they assume you understand the system well enough to specify positive outcomes, and that assumption is increasingly fragile.

Failure First inverts the approach. It begins with the question every engineer learns to ask first and every product manager learns to suppress: what must this system never do? What are the failure modes that are unrecoverable? Where are the cliff edges?

The methodology builds safety from the failure cases inward. You map the catastrophic outcomes first—not as edge cases, but as the primary design constraints. The architecture is what's left after you've ruled out the unacceptable. This is not pessimism. It's engineering: the acknowledgement that in complex systems, the space of harmful outcomes is larger, more varied, and more creative than the space of intended ones.

The framework draws on pre-mortem analysis, red teaming, and the aviation industry's approach to incident reporting—where the goal is not to prevent all failure, but to ensure that no single failure is unsurvivable. Applied to AI, this means designing systems where the worst-case outcome is bounded, even when the average-case outcome is uncertain.

---

[Read more at failurefirst.org](https://failurefirst.org)
