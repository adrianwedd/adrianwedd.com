---
title: "Hyperfocus and 3,000 Plush Toys"
description: "I built an offline Squishmallow database for a friend's kid. It's 2,271 lines of Python, has 50 catch messages, and taught me more about UX than most enterprise projects."
date: 2026-02-15
tags: ["web", "python", "kids", "scraping"]
---

A friend mentioned her 10-year-old was researching Squishmallows. I asked if I could help. Six hours later I looked up, realised I was starving, and discovered I'd shipped the first release.

This is how the Squishmallowdex happened.

## The problem

Squishmallows are soft, round plush toys that have colonised every shelf in every house where a child lives. There are over 3,000 of them. The kid wanted to know which ones existed, which ones she had, and which ones she still wanted. The only source of truth is a Fandom wiki — ad-heavy, slow, impossible to search on a tablet.

The solution that materialised during my accidental all-day session: scrape the wiki, build a single self-contained HTML file, make it work offline, and make it so simple a 10-year-old doesn't need to ask for help.

## The scraper

Python. BeautifulSoup. Polite rate-limiting (1.2 seconds between requests, 5-second cooldowns every 10 pages). The scraper fetches the Master List page, extracts every character URL, then visits each one to pull the name, image, squad, size, colour, year, and bio from the infobox.

Images get downloaded, cached with SHA1-hashed filenames, resized to thumbnails, and base64-encoded directly into the HTML. One file. No server. No CDN. No build step.

The whole thing is checkpoint-safe — progress saves every 10 catches and on Ctrl+C. Stop and restart without re-downloading. Useful when you're scraping 3,000 pages and your laptop decides it needs a nap.

## The output

A single HTML file between 5 and 30 MB depending on whether you embed images. Vanilla JavaScript. No framework. Sortable columns, real-time search, filter by favourites or owned. Favourites and ownership tracked in localStorage — persistent across sessions, works offline, survives clearing the browser cache if you're lucky.

It's a Progressive Web App. Add it to your home screen and it runs standalone — no browser chrome, no URL bar, no accidental navigation to YouTube. The manifest and icons are embedded as data URIs. The entire thing is self-contained in a way that would make a 1990s web developer weep with recognition.

## Kid-friendly logging

This is the part I'm most pleased with. The terminal output during scraping was designed for a kid sitting next to you watching the screen.

Every successful scrape triggers a random catch message from a pool of 50: "CAUGHT! Wendy the Frog joined your Squishmallowdex!" or "WOOHOO! Connor the Cow collected!" Milestones at 10, 25, 50, 100, 250, 500, and 1,000 catches pop celebratory messages. There's an Easter egg phoenix art display if you somehow collect every single one.

Between catches, the script drops educational facts: what HTTP means, how URLs work, why we rate-limit to be polite to servers, what a hash function does. Hydration reminders. Encouragement. The whole terminal becomes a gentle tutorial in how the internet works, disguised as a Squishmallow hunt.

There's a `--no-adventure` flag if you want the boring version. Nobody uses it.

## Design constraint: a 10-year-old

This turned out to be a harder UX challenge than most enterprise dashboards. The interface needed to be obvious without instructions, fast on a tablet, and resilient to the kind of vigorous interaction that children bring to touchscreens.

No hamburger menus — everything visible. No pagination — infinite scroll with lazy rendering. Search is instant and forgiving. Favourites are hearts, owned items get checkmarks, and both persist without accounts, passwords, or sync infrastructure.

The entire thing loads in one HTTP request and then never talks to a server again. No ads. No tracking. No dark patterns. No "ask a parent" modals. Just a fast, local database of plush creatures.

## What I learned

The best design constraint is a real person with no patience for your abstractions. A 10-year-old doesn't care about your architecture. She cares about finding Wendy the Frog.

The project took about eight hours total across two sessions. The first session was the scraper and basic HTML generation. The second was the PWA manifest, localStorage persistence, and all the kid-friendly terminal output. It's 2,271 lines of Python with extensive comments, type hints, and docstrings — written to be readable by someone learning to code.

Not every project needs to advance the state of the art. Some just need to make a small person's eyes light up.

[Take a closer look at the Squishmallowdex](/projects/squishmallowdex/) or [view the source](https://github.com/adrianwedd/squishmallowdex).
