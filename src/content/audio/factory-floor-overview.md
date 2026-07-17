---
title: 'Never Skip a Step: A Reproducible Printing Pipeline'
description: 'Audio overview of Factory Floor — turning a from-memory 3D-printing habit into a validated, human-gated pipeline with a single source of truth.'
date: 2026-07-17
tags: ['notebooklm', '3d-printing', 'automation', 'reproducibility']
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/factory-floor/audio.m4a'
duration: '21:34'
relatedProject: 'factory-floor'
---

Most of my printing workflow used to live in my head: rough dimensions in a note, a slicer profile I half-remembered tuning, a print that came out fine but that I couldn't recreate. Factory Floor is the fix — a pipeline where every part starts as a `project.yaml`, everything downstream is generated from it, and nothing reaches the printer without a human reading the report.

This episode traces the whole chain: parametric CAD in build123d, STEP and STL export, geometry validation for watertightness and bed fit, a heuristic thin-wall check, a BambuStudio dry-run slice, and a Markdown report a person signs off on. The theme is reproducibility over memory — and a deliberate refusal to close the loop, because automation should prepare the change and a human should own the decision to print it.

[View the full project →](/projects/factory-floor/)
