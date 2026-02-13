---
title: "Strategic Acquisitions"
description: "AI-powered real estate analysis for public housing—GPT-4 insights, ML valuations, and Tasmanian spatial intelligence."
tags: ["ai", "housing", "python"]
repo: "https://github.com/adrianwedd/strategic-acquisitions"
status: "active"
featured: false
date: 2025-01-15
---

Housing shortages are not information problems, but they have information problems inside them. When a public housing organisation needs to acquire properties, the analysis that should take hours takes weeks. Listing discovery. Valuation modelling. Planning zone verification. Hazard assessment. Infrastructure proximity. Each step involves a different data source and a different manual process.

I built Strategic Acquisitions to automate that pipeline for Australian public and social housing organisations. It fetches listings from the Realty API, generates GPT-4 analytical insights, runs ML-based property valuations, and scores each opportunity against a multi-factor strategic framework.

The spatial intelligence layer is the most interesting part. It integrates with Tasmania's LIST—the Land Information System Tasmania—to pull government-grade data: planning zones, cadastral title references, bushfire and flood hazard assessments, heritage constraints, and proximity to schools, transport, and healthcare. The scoring model weights these factors—infrastructure access at 30%, planning at 25%, hazards at 20%, cadastral at 15%, heritage at 10%—and produces a BUY/CONSIDER/PASS recommendation with detailed reasoning.

The valuation model trains on engineered features—land per bedroom, bed-bath ratios, latitude-longitude interactions—using cross-validated gradient boosting and random forest estimators. Celery Beat schedules nightly listing ingestion. A Flask web interface with role-based access lets analysts and viewers work with the data differently. Everything that fails goes to a dead letter queue for inspection.

Housing deserves better tooling. The data exists. It just was not connected.
