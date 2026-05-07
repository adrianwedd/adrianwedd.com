---
title: 'Scraping Job Boards Without Getting Blocked'
description: 'I built job search automation for my own hunt. Here is what actually works — and why most evasion guides send you in the wrong direction.'
date: 2026-05-04
tags: ['engineering', 'python', 'automation', 'security']
draft: true
---

I needed a job. More specifically, I needed to scan 40+ AI and security roles a week without spending 40+ minutes a day doing it manually. So I built a scraper.

This is the story of what I actually built, what broke, and what the evasion playbooks you'll find online get wrong.

## The first mistake: assuming you need a browser

Every guide starts the same way. "Use Playwright. Use Selenium. Patch the `navigator.webdriver` flag. Inject Bézier curves for mouse movement. Rotate residential proxies."

That advice is right for _some_ sites. For others it's completely unnecessary — and layering stealth techniques onto a site that doesn't need them just adds surface area for things to break.

Many professional networks and job platforms back their UI with an internal JSON API — the same API the browser calls on your behalf. If you have valid session cookies, you can call it directly. No headless browser. No stealth patches. No proxy rotation. Just `requests` and a `Cookie` header.

Two cookies from your browser's DevTools, a `RequestsCookieJar`, and you're an authenticated API client. The fingerprinting that these platforms do is largely aimed at browser automation detection — which is irrelevant when you're not driving a browser at all.

The lesson: **understand what the site actually serves before reaching for evasion techniques**. An authenticated API call beats a headless browser every time.

## Where you do need Playwright

Cloudflare-protected sites are a different story. Turnstile challenges, TLS fingerprinting (JA3/JA4), behavioural scoring — a plain `requests` call returns a 403 in under 100ms.

Here Playwright earns its place. But with a narrower brief than the guides suggest:

**What actually matters:**

1. **Use a real Chromium build** — not a patched headless variant. Browser fingerprinting checks Canvas, WebGL, and audio context rendering. Headless builds have consistent, detectable divergences in rendered output.
2. **Run with a persistent profile** — a fresh browser context with no history, no cookies, and no prior activity scores poorly on behavioural heuristics. Persist the profile between runs.
3. **Don't overdo the human emulation** — Bézier mouse curves and Perlin-noise typing cadence are real techniques but they're fragile to implement and rarely the thing that trips you. Simpler wins: randomise waits between page actions, don't hit pages at regular intervals, scroll before clicking.
4. **Residential network helps more than proxy services** — if your IP is genuinely residential (not a known datacenter range or a commercial proxy pool), most network-level checks pass by default. Rotating proxies are necessary at scale; for a personal scraper they introduce more problems than they solve.

Some job boards are server-rendered with no bot protection whatsoever — `requests` + `BeautifulSoup` works fine. The point is that different targets need different tools, and the tool selection should follow a quick assessment of what you're actually up against.

## The detection layer nobody talks about: your own patterns

The fingerprinting content in most evasion guides focuses on _what your client looks like at the network layer_. What it skips: **what your behaviour looks like over time**.

A single well-crafted request that passes TLS and browser fingerprinting can still get flagged if:

- You hit the same endpoint at identical intervals (cron jobs are obvious)
- Your session token has no activity history before the scrape started
- You request enrichment data for every result in a set, in sequence, with consistent timing

Randomise your loops with small jitter. Cap enrichment requests per run. Don't sweep every result — stop short of the last few. Not because detection is sophisticated enough to catch you at personal scale — it probably isn't — but because the habit is right.

For a production system running at volume, this matters considerably more. The evasion guides that spend pages on mouse movement physics are fighting the wrong battle. Session-level behavioural patterns over time are harder to spoof and more likely to be what actually gets you blocked.

## The CI/CD problem

The current setup runs locally. Session cookies are in a `.env` file. This works, but it means running things manually, and session cookies expire — roughly every few weeks in my experience.

If you wanted this running on a schedule in GitHub Actions, the cookie problem becomes architectural. You can't commit credentials. You can't prompt for a browser login in a headless CI runner. And if you store a session token as a repository secret, you need a way to refresh it when it expires without automating around MFA.

The pattern that makes sense here involves a two-part approach to secret management:

**Local Helper (manual, triggered when credentials expire):** Opens a browser, completes authentication interactively including MFA, captures the session cookies, and updates the local secret store. This workflow needs a human in the loop — that's intentional, not a limitation to work around.

**CI Job (scheduled, daily):** Pulls the session cookies from the secret store as environment variables, runs the scraper, and processes the results.

The insight is that authentication and scraping have completely different risk profiles and cadences. Conflating them means either running MFA-protected auth on every scheduled run (can't automate) or keeping credentials in plaintext (bad). Splitting them lets you keep the sensitive step manual and human-gated while automating everything downstream.

I haven't shipped this yet — the local setup is sufficient for my use case.

## What the evasion playbooks get right

The good content, in my reading:

- **CDP leak detection is real and underappreciated.** Chrome DevTools Protocol emits `Runtime.enable` and `Console.enable` events that some anti-bot systems detect as automation tells. `playwright-extra`'s stealth plugin patches some of this; `patchright` patches more. Most guides don't mention it.
- **Residential proxies don't guarantee anonymity.** Known residential proxy pools get flagged because scrapers have been abusing them for years. A fresh IP from a recognisable ASN scores poorly on day one. Proxy reputation lags well behind the marketing.
- **TLS fingerprinting (JA3/JA4) is table stakes now.** Any site worth protecting checks this. A standard Python `requests` session has a distinctive TLS fingerprint that differs from Chrome. For unauthenticated scraping of protected sites, this is often the first thing that blocks you.

## What they get wrong

- **Browser-level stealth doesn't defeat server-side ML scoring.** Cloudflare, PerimeterX, DataDome and similar systems build behavioural profiles over time. A session that looks clean at the network layer can still score badly based on aggregate account behaviour, IP reputation history, and request graph analysis. Stealth techniques delay detection — they don't prevent it.
- **The ethics section is always an afterthought.** Most guides bury a paragraph about "respect robots.txt" after 15,000 words of evasion techniques. The legal landscape is not simple. The _hiQ v. LinkedIn_ litigation (9th Circuit, 2022) established that scraping publicly available data may be protected under the CFAA — but that's a US ruling about _public_ data. If you're using session cookies to call private authenticated API endpoints, you're in different territory entirely. Understand what you're actually doing before you do it.
- **Platform-specific advice goes stale fast.** Internal API endpoint paths change. Libraries that wrap them have their own maintenance lag. Anything more than a few months old should be treated as a starting point, not a recipe.

## The actual takeaway

Job search automation is a legitimate use case. Spending hours manually checking the same boards every day is the wrong use of time when you could be preparing for interviews.

But "how do I scrape without getting blocked" is often the wrong question. The right questions are: what does this site actually serve (HTML, JSON API, SPA?), what does it actually protect (public listings, authenticated feeds, rate-limited endpoints?), and what's the simplest thing that works?

For sites with an accessible authenticated API: two cookies, `requests`, not much code. No browser required.

For Cloudflare-protected sites: Playwright with a persistent profile, sensible jitter, residential network. No exotic patches required.

The rest is noise.

---

_The output of this tooling — ranked job listings, application tracking — is visible at [adrianwedd.github.io/job-search](https://adrianwedd.github.io/job-search/dashboard.html)._
