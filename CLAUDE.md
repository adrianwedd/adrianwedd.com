# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal website for Adrian Wedd. Astro 5 on GitHub Pages. Dark-first design with botanical earth-tone palette (dusty copper accent).

## Commands

```
npm run dev        # dev server (localhost:4321)
npm run build      # production build
npm run preview    # preview production build
```

No linter, formatter, or test suite is configured.

## Stack

- **Framework:** Astro 5 with TypeScript strict
- **Styling:** Tailwind CSS 3 with CSS custom properties for theming
- **Islands:** Preact for interactive components (AudioPlayer, Personalisation, Transparency)
- **Content:** Astro Content Collections (blog, projects, gallery, audio) in `src/content/`
- **Hosting:** GitHub Pages via GitHub Actions (fully static output)
- **Analytics:** GA4 consent-gated via `ConsentBanner.astro` + `Analytics.astro`

## Architecture

### Theming (spans 3 files)
CSS custom properties define all colors in `src/styles/global.css` (`:root` = dark, `.light` = light). Tailwind maps these via `tailwind.config.mjs` (e.g. `bg-surface`, `text-accent`). Theme flash is prevented by an inline script in `BaseLayout.astro` that reads `localStorage('theme')` before paint. ThemeToggle toggles `.light` on `<html>`.

**Never use Tailwind's `dark:` prefix** — theming is driven by CSS custom properties, not Tailwind dark mode classes.

### Content collections
Defined in `src/content.config.ts` with four collections:
- **blog:** title, description, date, tags (required), draft, heroImage, updatedDate
- **projects:** title, description, date, tags, status (`active|complete|archived|experiment`), featured, url, repo, heroImage
- **gallery:** title, date, tags, images array (`{src, alt, caption?}`), medium, collection, coverImage
- **audio:** title, description, date, tags, audioUrl, duration, transcript, heroImage

### Routing
File-based in `src/pages/`. Dynamic routes use `[...slug].astro` for blog, projects, gallery, audio detail pages. Blog has a tag index at `blog/tag/[tag].astro`.

### Islands architecture
Preact islands in `src/components/islands/` are client-hydrated interactive components. All other components are Astro (server-rendered, zero JS).

## Key patterns

- **Slug utility:** Astro 5 collection IDs include `.md` extension. Always use `slug()` from `src/lib/utils.ts` when generating hrefs from collection IDs.
- **No custom fonts:** System font stack only — zero font downloads.
- **Consent-first:** No tracking before user consent. ConsentBanner dispatches `consent-updated` CustomEvent.
- **Class-based selectors:** ThemeToggle and Header use class selectors (not IDs) to avoid duplicate ID issues when rendered in both desktop and mobile nav.

## Content authoring

```
scripts/new-post.sh "Title"       # scaffold blog post
scripts/new-project.sh "Title"    # scaffold project page
scripts/import-gallery.sh dir/    # import image directory as gallery
scripts/import-audio.sh file.mp3  # import audio as episode
```

## NotebookLM Automation

**Location**: `scripts/notebooklm/` (within the repo)

Automated generation of audio overviews, video summaries, and other Studio assets for blog posts and projects.

### Quick Start

```bash
cd scripts/notebooklm

# Authenticate (one-time)
nlm login

# Generate audio + video for a project
./scripts/automate-notebook.sh --config my-config.json --parallel
```

### Key Scripts

**`automate-notebook.sh`** - End-to-end automation from JSON config:
- Creates notebook from title
- Adds sources (URLs, text files, Google Drive)
- Generates artifacts (audio, video, quiz, flashcards, etc.)
- Exports to directory structure
- Returns JSON summary

**`generate-parallel.sh`** - Concurrent artifact generation:
- Generate multiple artifacts at once (3x faster)
- Real-time progress monitoring
- Use with `--wait --download ./output`

**`research-topic.sh`** - Smart notebook creation from topics:
- DuckDuckGo + Wikipedia source discovery
- URL deduplication
- Automatic source addition

### Generating Assets for Projects

**1. Create config JSON** (per project):

```json
{
  "title": "Project Name - Audio Overview",
  "sources": [
    "textfile:src/content/projects/project-name.md"
  ],
  "studio": [
    {"type": "audio"},
    {"type": "video"}
  ]
}
```

**2. Run automation**:

```bash
cd scripts/notebooklm
./scripts/automate-notebook.sh \
  --config project-config.json \
  --parallel \
  --export ./exports/project-name
```

**3. Move assets to site**:

```bash
# Create asset directory
mkdir -p public/notebook-assets/project-name

# Copy generated files
cp scripts/notebooklm/exports/project-name/studio/audio/*.mp3 \
   public/notebook-assets/project-name/audio.mp3

cp scripts/notebooklm/exports/project-name/studio/video/*.mp4 \
   public/notebook-assets/project-name/video.mp4
```

**4. Update project frontmatter**:

```markdown
---
title: "Project Name"
audioUrl: "/notebook-assets/project-name/audio.mp3"
videoUrl: "/notebook-assets/project-name/video.mp4"
---
```

**5. Create audio collection entry** (for cross-linking):

```markdown
---
title: "Project Name Overview"
description: "Audio deep dive into..."
date: 2026-02-13
tags: ["notebooklm", "relevant-tags"]
audioUrl: "/notebook-assets/project-name/audio.mp3"
duration: "8:47"
relatedProject: "project-name"
---

NotebookLM Studio overview generated from project materials...

[View the full project →](/projects/project-name/)
```

### Asset Types

**Fast** (~30-60 seconds):
- `quiz` - Quiz questions (JSON)
- `flashcards` - Study cards (JSON)
- `data-table` - Data table (CSV)
- `report` - Written report (Markdown)

**Slow** (2-10 minutes):
- `audio` - Audio overview (MP3, 20-60MB)
- `video` - Video summary (MP4, 30-100MB)

**Visual**:
- `infographic` - Visual infographic (PNG)
- `mindmap` - Mind map diagram (JSON)
- `slides` - Presentation slides (PDF)

### Batch Generation Helper

For generating assets for all projects without them:

```bash
# From adrianwedd.com repo
./scripts/generate-all-notebook-assets.sh
```

This script:
1. Identifies projects without audioUrl/videoUrl
2. Creates NotebookLM config for each
3. Runs parallel generation
4. Moves assets to public/notebook-assets/
5. Creates audio collection entries
6. Updates project frontmatter

### Daily Quota

NotebookLM has generation limits:
- ~50 audio generations per day
- ~50 video generations per day
- Unlimited text-based artifacts (quiz, flashcards, reports)

Plan accordingly for batch generation.

### Authentication

Cookie-based via Chrome DevTools Protocol:
- Stored in `~/.notebooklm-mcp-cli/profiles/default`
- Re-auth when cookies expire: `nlm login`
- Use dedicated Google account (ToS violation risk)

### Export Structure

```
exports/project-name/
├── metadata.json
├── sources/
│   ├── index.json
│   └── content--<id>.md
└── studio/
    ├── manifest.json
    ├── audio/
    │   └── overview.mp3
    └── video/
        └── overview.mp4
```

## Gotchas

- Content collection IDs include file extension (`.md`/`.mdx`) — always strip with `slug()`
- Light mode accent color is `#8a5e42` (umber) for WCAG AA on warm cream backgrounds
- Tailwind color utilities (`bg-surface`, `text-muted`, `text-accent`) resolve through CSS custom properties, not static values — inspect `tailwind.config.mjs` and `global.css` together
- **NotebookLM audio/video generation takes 2-10 minutes per asset** — batch generation of 30 projects = ~1-5 hours total
