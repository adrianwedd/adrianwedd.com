---
title: 'Zero Build, Full Operations'
description: 'Audio overview of a three-zone martial arts operations platform — public site, ops hub, member portal — running on vanilla JS and Cloudflare.'
date: 2026-03-02
tags: ['notebooklm', 'web', 'cloudflare', 'community']
audioUrl: '/notebook-assets/wolf-clan-hub/audio.mp3'
duration: '20:55'
relatedProject: 'wolf-clan-hub'
---

Every local club runs on a Facebook page and a spreadsheet. Wolf Clan Zen Do Kai has a complete operations platform — and it runs on zero build tools. No npm. No React. No build step. Vanilla HTML, CSS, and JavaScript deployed to Cloudflare Pages, with D1 for structured data and Pages Functions for twenty-plus API endpoints.

This episode explores the three-zone architecture that makes it work. A public site with schema.org structured data, a blog, and class schedules. A password-gated ops hub serving forty-plus operational documents behind timing-safe SHA-256 verification and directory traversal prevention. And a JWT-authenticated member portal with attendance tracking, belt progression, grading eligibility, and seventy-nine structured lesson plans mapped from white through black belt.

The deeper argument is about what happens when you strip away abstraction layers. The security model is simpler to reason about when there is no framework between you and the request. The engagement heartbeat — lightweight signals every thirty seconds during active sessions — calculates real metrics without naive event tracking. Family accounts let guardians manage billing and view progress for multiple children. The design draws from the Senjo ceremony: red for body, gold for mind, blue for spirit.

[View the full project →](/projects/wolf-clan-hub/)
