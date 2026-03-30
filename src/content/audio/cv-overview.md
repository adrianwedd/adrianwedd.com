---
title: "A CV That Proves It Isn't Lying"
description: "A self-updating CV pipeline where GitHub Actions runs twice daily, Claude refines content, and a hallucination detector gates deployment."
date: 2026-02-04
tags: ["notebooklm", "craft", "web", "career"]
audioUrl: "/notebook-assets/cv/audio.mp3"
duration: "15:06"
relatedProject: "cv"
---

Every static CV is a snapshot that begins decaying the moment you export the PDF. It claims to summarise a career, but the format enforces a lie: that work is linear, that skills accumulate neatly, that the most recent role is the most important one.

This CV is not a document. It's a pipeline. GitHub Actions runs twice daily. An activity tracker collects real commit data, language statistics, and contribution metrics from the live work. A Claude AI enhancement pipeline processes that data and regenerates the content. Then two gates run before anything deploys: a hallucination detector that validates every claim against actual GitHub metrics, and a content guardian that maintains a registry of verified facts and blocks fabricated ones. The pipeline won't ship an invented achievement — not because it can't, but because it's been specifically built not to.

The multi-locale architecture handles something subtler: competence is signalled differently across cultures. The same experience presented to a Japanese employer needs different emphasis than when presented to an Australian one. Not dishonesty — contextual framing. The document lives in version control, changes are tracked and reversible, and when the work shifts, the CV shifts with it on the next scheduled run.

[View the full project →](/projects/cv/)
