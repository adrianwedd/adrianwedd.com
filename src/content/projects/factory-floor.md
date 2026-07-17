---
title: 'Factory Floor'
description: 'A reproducible 3D-printing pipeline: every part starts as a project.yaml, gets validated and dry-run sliced, and nothing prints without a human sign-off.'
tags: ['3d-printing', 'cad', 'automation', 'python', 'reproducibility']
url: 'https://factory.wedd.au'
heroImage: '/notebook-assets/factory-floor/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/factory-floor/audio.m4a'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/factory-floor/video.mp4'
audioDuration: '21:34'
status: 'experiment'
featured: false
date: 2026-07-17
---

Most of my 3D-printing workflow used to live in my head: rough dimensions in a note, a slicer profile I vaguely remembered tuning, a print that came out fine but that I couldn't recreate if I had to. Factory Floor is the attempt to fix that — a private workshop for making printed things *properly*: measured, validated, sliced, reviewed, then printed, in that order, never skipped.

The point is reproducibility. Every project starts as a `project.yaml` — the single source of truth — and everything downstream is generated from it. Nothing reaches the printer without a human looking at the report first.

## The pipeline

```text
idea / photo / measurements
  → project.yaml (source of truth)
  → parametric CAD (build123d)
  → STEP + STL export
  → geometry validation
  → slicer dry run (BambuStudio CLI)
  → Markdown report
  → human approval
  → print
  → notes → revised version
```

Parametric CAD means the geometry is code, not a mouse-dragged mesh — change a dimension in the YAML and the STEP and STL regenerate. Geometry validation checks the fundamentals that a bad export gets wrong — watertightness, positive volume, dimensions, and printer-bed fit — and a separate `forge` checker runs a heuristic thin-wall test to flag features the nozzle can't resolve. The BambuStudio CLI then does a dry-run slice so the toolpath is inspected *before* filament is committed, and the whole thing collapses into a Markdown report a human reads and signs off on.

## Why gate on a human

The temptation with a pipeline like this is to close the loop and let it print unattended. Factory Floor deliberately doesn't. The approval step is the point: automation does the tedious, error-prone, easy-to-forget work — measuring, validating, slicing, documenting — and a person makes the go/no-go call with a full report in front of them. It's the same instinct as gating a deploy: the machine prepares the change and proves it's sound; a human owns the decision to ship it.

The next planning track is the workshop itself — Gridfinity storage, 19-inch rack infrastructure — brought under the same discipline: measured, modelled, validated, and printed from a source of truth rather than improvised.
