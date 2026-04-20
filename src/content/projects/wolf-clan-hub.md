---
title: 'Wolf Clan Zen Do Kai Hub'
description: 'A three-zone operations platform for a martial arts club. Public site, password-gated ops hub, JWT member portal. Zero build tools.'
tags: ['web', 'cloudflare', 'community', 'operations']
url: 'https://wolfclanmartialarts.com'
status: 'active'
featured: true
date: 2026-03-02
heroImage: '/notebook-assets/wolf-clan-hub/infographic.webp'
audioUrl: 'https://cdn.adrianwedd.com/notebook-assets/wolf-clan-hub/audio.mp3'
videoUrl: 'https://cdn.adrianwedd.com/notebook-assets/wolf-clan-hub/video.mp4'
---

Every local club I've trained at runs on a Facebook page and a spreadsheet. Wolf Clan has a complete operations platform — and it runs on zero-build tools.

## Three-zone architecture

The system serves three audiences through a single codebase with path-based auth gating:

- **Public site** — marketing pages, blog, class schedules, enrollment pathway. Schema.org structured data, dark/light theming, responsive glassmorphism nav. 24 blog posts across four series, including a Warriors Library with NotebookLM audio overviews of classical martial arts texts.
- **Ops hub** (`/hub/`) — password-gated with timing-safe SHA-256 verification. Live GitHub Issues kanban board, markdown document viewer serving 40+ operational docs (syllabus, compliance, policies, research papers), all behind an allowlist that prevents directory traversal.
- **Member portal** (`/member/`) — JWT-authenticated via magic-link email login. Member profiles, attendance tracking, training logs, belt progression, grading eligibility calculator. 79 structured lesson plans. Instructor-only views for roster management, attendance analytics, and grading administration.

## Why vanilla

No npm. No React. No build step. Vanilla HTML, CSS, and JavaScript — nine CSS files, all driven by design tokens. The security model is simpler to reason about when there's no abstraction layer between you and the request. Development iterations are faster when deployment means pushing a file. Hosting cost is negligible.

Cloudflare Pages handles the edge compute: D1 (SQLite) for structured data, Pages Functions for 20+ API endpoints, Pages middleware for the auth gates. The entire platform runs at the edge with no origin server.

## What's under the hood

**Security-first middleware** — a single 480-line entry point handles all three zones. Timing-safe password comparison, CSRF origin validation, HTML injection prevention, HttpOnly session cookies, redirect URL sanitisation. Email magic links expire in 15 minutes with UUID tokens.

**Engagement heartbeat** — instead of naive event tracking, the portal sends lightweight heartbeat signals every 30 seconds during active sessions. The server logs these to calculate real engagement metrics: sessions per week, average duration, training consistency. Identifies inactive members before they disappear.

**Family accounts** — guardians can manage billing and view progress for multiple children. Stripe integration supports per-member subscriptions with guardian relationship enforcement at the API level.

**79 lesson plans** — structured warmup-to-cooldown sequences mapped to belt progression (white through black). Instructor-only access, tied to curriculum forms: Senjo, Freeform, Sanchin, Applied Karate, Kidz Karate.

## Brand system

The design draws from the Senjo ceremony — three colours mapping to the pillars of Zen Do Kai: red (body), gold (mind), blue (spirit). A 3px gradient accent bar runs across every page. Dark theme by default with a warm off-white light mode. Impact headings, system font stack, fluid typography via `clamp()`.

[Visit the site →](https://wolfclanmartialarts.com/) | [Read the engineering deep-dive →](/blog/zero-build-web-development/)
