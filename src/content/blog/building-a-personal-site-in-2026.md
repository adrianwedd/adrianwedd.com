---
title: "Building a Personal Site in 2026"
description: "Astro, static generation, zero custom fonts, and the case for shipping a website that doesn't need a framework team to maintain."
date: 2026-02-15
tags: ["engineering", "web", "astro"]
heroImage: "/og/building-a-personal-site-in-2026.png"
---

This site is built with Astro. It generates 65 static HTML pages, serves them from GitHub Pages, and loads zero custom fonts. The entire JavaScript budget is a handful of Preact islands that hydrate on idle. The rest is HTML and CSS.

This was a deliberate choice, and it runs against the prevailing current.

## Why not Next.js

I like Next.js. I've built production applications with it. But for a personal site — a collection of writing, project descriptions, and multimedia — it's architecturally wrong.

Next.js is a React framework. It assumes your pages need client-side interactivity as a baseline. Every page ships a React runtime. Server components help, but you're still paying for a framework designed for web applications, not web documents.

A personal site is a document. It should behave like one.

## Why Astro

Astro's model is simple: everything is server-rendered by default. Zero JavaScript ships unless you explicitly opt in with a client directive. Components are Astro files (essentially HTML with frontmatter logic) that compile away completely.

When I need interactivity — an audio player, a search box, an analytics dashboard — I write a Preact island and mark it `client:idle` or `client:load`. The island hydrates independently. The rest of the page is static HTML that works without JavaScript.

This means:

- **Performance is structural, not optimised.** You don't need to profile and tree-shake your way to a fast page. The page is fast because it's HTML.
- **Content collections are first-class.** Markdown and MDX files with typed frontmatter (via Zod schemas). Blog posts, projects, audio episodes, and gallery collections each have their own schema and routing.
- **The build is the deployment.** `astro build` produces a `dist/` directory. Push it to GitHub Pages. There's no server, no edge function, no cold start.

## The design constraints

I set three constraints before writing any code:

1. **Zero custom fonts.** System font stack only. This eliminates layout shift, saves bandwidth, and looks native on every platform.
2. **Dark-first.** The default is a dark botanical palette with dusty copper accents. Light mode exists but isn't the primary design target.
3. **No tracking before consent.** GA4 loads only after explicit opt-in via a consent banner. The analytics dashboard fetches data at build time, not runtime.

These constraints made decisions easier. When a design choice conflicted with a constraint, the constraint won.

## What I'd do differently

The [NotebookLM pipeline](/blog/the-notebooklm-pipeline/) generates assets that are too large for a static site. Audio files are 20–60MB each. The `public/notebook-assets/` directory is 495MB. For a site hosted on GitHub Pages with no CDN, this is pushing it.

If I started over, I'd host media assets on a dedicated CDN (R2, S3, or similar) and reference them by URL in the frontmatter. The site itself would stay static and tiny. The media would live elsewhere.

## The case for simplicity

The best thing about this site is that it's boring infrastructure. There's no build server to maintain, no database to back up, no serverless functions to debug at 2am. It's files on disk, pushed to a CDN.

When I want to write something, I create a Markdown file. When I want to ship it, I push to main. The feedback loop is measured in seconds, not minutes.

That's the whole argument for building a personal site this way: it should be easy enough that the infrastructure never becomes the reason you don't publish.
