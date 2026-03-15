---
title: "Zero-Build Web Development"
description: "What happens when you build a three-zone operations platform for a martial arts club with no framework, no build step, and no npm."
date: 2026-03-14
tags: ["engineering", "web", "security"]
draft: false
heroImage: "/notebook-assets/zero-build-web-development/infographic.webp"
---

I built a complete operations platform for my Zen Do Kai club. Public marketing site, password-gated ops hub, JWT-authenticated member portal with attendance tracking, grading administration, lesson plans, and Stripe billing. Three zones, 20+ API endpoints, a D1 database, and security-hardened middleware.

No React. No npm. No build step. Vanilla HTML, CSS, and JavaScript.

This isn't a manifesto against frameworks. It's a report on what happens when you skip them for a real project — and where the tradeoffs actually land.

## The decision

The club needed a website. I could have reached for Astro (which I use for [this site](/blog/building-a-personal-site-in-2026/)) or Next.js or anything with a component model and a build pipeline. Instead I started with an `index.html` and never stopped.

The reasoning was practical, not ideological. Cloudflare Pages serves static files and runs edge functions. If I write HTML files and JavaScript functions, deployment is pushing to GitHub. No build cache to debug. No dependency tree to audit. No framework release cycle to track. The mental model is: files go up, site comes down.

Two weeks later, the site is nine CSS files, all driven by design tokens. The middleware is 480 lines. The member portal has 79 lesson plans, engagement analytics, and family billing. And the deployment story is still "push to GitHub."

## Three zones, one middleware

The architecture that makes this work is path-based auth gating in a single Cloudflare Pages middleware:

```
Request → _middleware.js
  ├─ /hub/*    → password gate (SHA-256 cookie, 30-day TTL)
  ├─ /member/* → JWT session validation, member object injection
  └─ /*        → public (pass-through)
```

Every request hits one file. That file decides what you're allowed to see based on the path. The public site is zero-auth. The ops hub checks a timing-safe password hash. The member portal validates a session token against D1, looks up the member record, and injects it into the request context so every downstream function gets `data.member` for free.

This pattern is simple enough to audit by reading one file. There's no auth library, no middleware chain, no configuration object. The security boundary is visible.

## Security without a framework

When there's no abstraction layer, you write security code yourself. That sounds worse until you realise you also *read* security code yourself.

**Timing-safe password comparison.** A naive string comparison leaks information about which characters matched based on how long it takes to return. The middleware uses `crypto.subtle.timingSafeEqual` on SHA-256 hashes — every comparison takes the same time regardless of input.

**CSRF origin validation.** Every state-changing request checks that the `Origin` header matches the expected domain. For a single-origin deployment behind Cloudflare, this is sufficient — no tokens to manage, no cookies to configure beyond what's already there.

**Magic-link authentication.** The member portal doesn't store passwords. You enter your email, the server generates a UUID token with a 15-minute TTL, sends it via Gmail OAuth2, and the link logs you in. The token is single-use and scoped to the email address. Session cookies are HttpOnly and SameSite.

**Document allowlist.** The ops hub serves markdown files through a viewer, which is a directory traversal attack waiting to happen. The fix is a hardcoded array of allowed document paths. If the requested path isn't in the array, you get a 404. No regex, no path normalisation, no clever sanitisation — just a list.

These are not novel patterns. They're well-understood, well-documented, and easy to implement when you're not fighting a framework's opinion about how auth should work.

## The heartbeat model

Standard engagement tracking counts page views or button clicks. That tells you someone was present. It doesn't tell you they were engaged.

The member portal sends a lightweight heartbeat signal every 30 seconds during an active session. The server logs each heartbeat with a timestamp. From there, you can calculate meaningful metrics: how many training sessions per week, average session duration, consistency over time.

This lets the club identify members who are drifting before they cancel. A member who logged in three times last month but only once this month is worth a check-in call. Page views wouldn't surface that pattern.

## What I'd do differently

**Component reuse.** Without a framework, shared UI elements are copy-pasted across HTML files. The header, footer, and nav are injected by a shared script, but page-specific patterns get duplicated. A template system (even just server-side includes) would reduce this.

**Type safety.** The API endpoints pass data as plain objects. In a codebase this size, TypeScript would catch bugs that currently surface as runtime errors. Vanilla JS is fine until your D1 query returns a column name you typo'd — and nothing catches it until a user hits the endpoint.

**CSS architecture.** Design tokens via custom properties work well for theming, but nine files with no tooling means no dead code elimination and no minification. It's manageable today. It might not stay manageable.

These are real costs. They just happen to be smaller, for this project, than the costs of the tooling that would prevent them.

## When to skip the build step

Not always. Probably not most of the time. But the conditions where it works are clear:

- **Small team** (one or two developers who can hold the whole system in their heads)
- **Edge-first hosting** that runs your functions without a build pipeline
- **Security model simple enough to audit by reading** (not by trusting a dependency)
- **Deployment speed matters more than DX polish** (push and it's live)

For Wolf Clan, these conditions held. The platform is in production, the club uses it daily, and when something breaks, I fix a file and push.

---

*[Wolf Clan Zen Do Kai Hub](/projects/wolf-clan-hub/) is live at [wolfclanmartialarts.com](https://wolfclanmartialarts.com/).*
