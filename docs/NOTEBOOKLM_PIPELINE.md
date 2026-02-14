# NotebookLM Content Pipeline

How NotebookLM automation generates rich media assets for project and blog pages on adrianwedd.com.

---

## Overview

Each project page can display up to 8 NotebookLM-generated asset types: audio overview, video summary, report, slides, infographic, mind map, quiz, and flashcards. These are stored in `public/notebook-assets/<slug>/` and referenced via frontmatter fields.

The pipeline scripts are self-contained in `scripts/notebooklm/` within this repo.

| Component | Role |
|-----------|------|
| `scripts/notebooklm/` | Core automation toolkit — create notebooks, add sources, generate artifacts, export |
| `failure-first-embodied-ai` (external) | Production example — 3 Python tools for batch research synthesis |
| `adrianwedd.com` | Consumer — imports exports, renders via NotebookAssets.astro + Preact islands |

---

## Architecture

```
Source material (URLs, text, PDFs)
    ↓
scripts/notebooklm/scripts/automate-notebook.sh --config config.json
    ↓
[nlm CLI: create notebook → add sources → generate artifacts → export]
    ↓
Export directory:
  metadata.json / sources/ / studio/ (audio, video, documents, visual, interactive)
    ↓
adrianwedd.com/scripts/export_astro.py <export-dir>
    ↓
Copies assets → public/notebook-assets/<slug>/
Injects frontmatter: audioUrl, videoUrl, mindmap, quiz, etc.
    ↓
NotebookAssets.astro renders interactive islands
```

---

## Prerequisites

```bash
pip install notebooklm-mcp-cli
nlm login          # Opens Chrome DevTools → extracts session cookies
nlm login --check  # Verify authentication
```

Authentication is cookie-based via the `nlm` CLI. Cookies are stored in `~/.notebooklm-mcp-cli/profiles/default`. Sessions expire — re-run `nlm login` as needed.

---

## Step 1: Create a Notebook Config

Create a JSON config per project. Place in `adrianwedd.com/tmp/notebook-configs/`:

```json
{
  "title": "ordr.fm — Music Library Organisation",
  "sources": [
    "https://github.com/adrianwedd/ordr.fm",
    "text:ordr.fm is a precision-engineered CLI for intelligent music library organisation..."
  ],
  "studio": [
    {"type": "audio"},
    {"type": "report"},
    {"type": "quiz"},
    {"type": "flashcards"},
    {"type": "mindmap"}
  ]
}
```

### Source types

| Prefix | Example | Notes |
|--------|---------|-------|
| `https://...` | URL | Web page — fetched by NotebookLM |
| `text:...` | Inline text | Pasted directly into notebook |
| `textfile:/path` | Local file | Auto-chunked at 8KB boundaries |
| `drive://doc-id` | Google Drive | Requires Drive access |

### Artifact types (9 total)

| Type | Format | Time | Notes |
|------|--------|------|-------|
| `audio` | MP3 | 2–10 min | Conversational overview |
| `video` | MP4 | 2–10 min | Visual summary |
| `report` | Markdown | <1 min | Written synthesis |
| `slides` | PDF | <1 min | Presentation deck |
| `infographic` | PNG | <1 min | Visual diagram |
| `mindmap` | JSON | <1 min | Tree structure |
| `quiz` | JSON | ~30s | Multiple choice Q&A |
| `flashcards` | JSON | ~30s | Front/back pairs |
| `data-table` | CSV | ~30s | Requires `"description"` field |

---

## Step 2: Run the Automation

### Single project

```bash
cd scripts/notebooklm
./scripts/automate-notebook.sh \
  --config ../../tmp/notebook-configs/ordr-fm.json \
  --parallel \
  --export ./exports
```

### Batch (all projects)

```bash
for config in ../../tmp/notebook-configs/*.json; do
  echo "=== Processing: $config ==="
  ./scripts/automate-notebook.sh \
    --config "$config" \
    --parallel \
    --export ./exports
done
```

### Smart research (auto-discover sources)

```bash
./scripts/research-topic.sh "music library organisation metadata" \
  --depth 8 \
  --auto-generate audio,report,quiz
```

### Parallel artifact generation

```bash
./scripts/generate-parallel.sh <notebook-id> audio quiz report mindmap \
  --wait --download ./artifacts
```

---

## Step 3: Import into adrianwedd.com

```bash
python3 scripts/export_astro.py \
  scripts/notebooklm/exports/ordr-fm-music-library-organisation \
  --target src/content/projects \
  --public-dir public \
  --tags music cli audio
```

This:
1. Copies studio artifacts to `public/notebook-assets/<slug>/`
2. Injects frontmatter fields (`audioUrl`, `videoUrl`, etc.) into the project's `.md` file
3. Preserves existing body content

### Manual alternative

If you prefer manual control, add frontmatter fields directly:

```yaml
---
title: "ordr.fm"
# ... existing fields ...
audioUrl: "/notebook-assets/ordr-fm/audio.mp3"
videoUrl: "/notebook-assets/ordr-fm/video.mp4"
mindmap: "/notebook-assets/ordr-fm/mindmap.json"
quiz: "/notebook-assets/ordr-fm/quiz.json"
flashcards: "/notebook-assets/ordr-fm/flashcards.json"
---
```

Then copy the files into `public/notebook-assets/ordr-fm/`.

---

## How Assets Render

`src/components/NotebookAssets.astro` conditionally renders each asset type:

| Asset | Component | Hydration |
|-------|-----------|-----------|
| Audio | `AudioPlayer.tsx` (Preact) | `client:idle` — play/pause, seek, speed control |
| Video | Native `<video>` | Server-rendered, `preload="metadata"` |
| Infographic | `<img>` with zoom link | Server-rendered, lazy loaded |
| Mind map | `MindMap.tsx` (Preact) | `client:idle` — interactive tree |
| Quiz | `Quiz.tsx` (Preact) | `client:idle` — multiple choice with scoring |
| Flashcards | `Flashcards.tsx` (Preact) | `client:idle` — flip cards |
| Data table | `DataTable.tsx` (Preact) | `client:idle` — sortable table |
| Slides | Download link (PDF) | Server-rendered |

The section only appears if at least one asset exists. Heading: "Explore".

---

## Production Example: failure-first-embodied-ai

The `failure-first-embodied-ai` repo demonstrates a research-grade NotebookLM pipeline with three custom Python tools:

### `notebooklm_ingest_sources.py`
- Reads URL lists from bibliographies (OpenAlex API output)
- Chunks URLs (default 10/notebook) to avoid overwhelming single notebooks
- Creates notebooks + triggers report generation
- Logs everything to JSONL manifests for reproducibility

### `notebooklm_sync_export.py`
- Downloads completed artifacts from notebooks created earlier
- Supports selective sync (`--types report,audio`)
- Creates sync logs with timestamps

### `notebooklm_asset_bundle.py`
- Generates comprehensive artifact bundles from a single notebook
- Includes 3 custom report prompts (executive brief, research gap map, policy bridge)
- Plus 8 standard artifacts (audio, mindmap, slides, infographic, quiz, flashcards, data table)
- Polls every 8 seconds until completion (900s timeout)

### Workflow used

```
Bibliography curation (OpenAlex API)
    ↓
URL list → notebooklm_ingest_sources.py (creates chunked notebooks)
    ↓
Wait 15–30 min for async artifact generation
    ↓
notebooklm_sync_export.py (downloads reports + audio)
    ↓
notebooklm_asset_bundle.py (generates full 11-artifact bundle)
    ↓
research/business/notebooklm_exports/<report-name>/
```

4 export directories exist with full provenance chains.

---

## Template System

The `scripts/notebooklm/` directory includes pre-built templates in `templates/`:

| Template | Sources | Artifacts |
|----------|---------|-----------|
| `research/academic-paper` | 15 (smart research) | report, mindmap, quiz, flashcards |
| `learning/course-notes` | 10 (smart research) | report, quiz, flashcards |
| `content/podcast-prep` | 8 (smart research) | audio, report |
| `content/presentation` | 12 (smart research) | slides, report, mindmap |

Usage with variable substitution:

```bash
./scripts/create-from-template.sh research/academic-paper \
  --var paper_topic="embodied AI safety"
```

---

## Export Formats

The `export-notebook.sh` script supports 4 output formats:

| Format | Structure | Use case |
|--------|-----------|----------|
| `notebooklm` (default) | Native directory structure | adrianwedd.com import |
| `obsidian` | Vault with wikilinks + YAML frontmatter | Personal knowledge base |
| `notion` | Single markdown with callout blocks | Notion import |
| `anki` | CSV (Front, Back, Tags) | Spaced repetition study |

---

## Current Coverage

| Project | Assets | Status |
|---------|--------|--------|
| tanda-pizza | audio, video | Live |
| All others (30+) | none | Configs needed |

---

## Generating Assets for All Projects

To bring all projects up to parity with tanda-pizza:

1. **Create configs** — one JSON per project in `tmp/notebook-configs/`
2. **Authenticate** — `nlm login`
3. **Batch run** — loop `automate-notebook.sh` over all configs
4. **Import** — run `export_astro.py` for each export
5. **Build** — `npm run build` to verify
6. **Commit** — assets in `public/notebook-assets/`, frontmatter updates in `src/content/`

Estimated time: ~5 min per project for generation + import. ~2.5 hours for 30 projects with parallel artifact generation.

---

## Known Limitations

- **Authentication** — cookie-based via Chrome DevTools extraction, expires periodically
- **No CI/CD** — manual invocation only (authentication can't run headless)
- **Chat history** — not exportable (API limitation)
- **File uploads** — not supported via CLI; upload to Google Drive first
- **Rate limiting** — bulk operations may trigger Google rate limits
- **API stability** — reverse-engineered RPCs, may break with NotebookLM updates
