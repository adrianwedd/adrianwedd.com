---
title: "Housing Deserves Better Tooling"
description: "Audio overview of an AI-powered property analysis pipeline for public housing — spatial intelligence, ML valuations, and Tasmania's LIST."
date: 2025-01-15
tags: ["notebooklm", "ai", "housing", "python"]
audioUrl: "/notebook-assets/strategic-acquisitions/audio.mp3"
duration: "0:00"
relatedProject: "strategic-acquisitions"
---

Housing shortages are not information problems, but they have information problems inside them. When a public housing organisation needs to acquire properties, the analysis that should take hours takes weeks — listing discovery, valuation modelling, planning zone verification, hazard assessment, infrastructure proximity. Each step involves a different data source and a different manual process.

This episode walks through Strategic Acquisitions, an automated pipeline that connects all of those sources into a single analytical flow. GPT-4 generates insights. ML-based property valuations train on engineered features — land per bedroom, bed-bath ratios, latitude-longitude interactions — using cross-validated gradient boosting. The spatial intelligence layer integrates with Tasmania's Land Information System to pull government-grade data on planning zones, bushfire risk, flood hazards, heritage constraints, and proximity to schools, transport, and healthcare.

The most interesting part is the scoring model: infrastructure access weighted at 30%, planning at 25%, hazards at 20%, cadastral at 15%, heritage at 10% — producing a BUY/CONSIDER/PASS recommendation with detailed reasoning. The data existed. It just was not connected.

[View the full project →](/projects/strategic-acquisitions/)
