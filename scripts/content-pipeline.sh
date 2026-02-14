#!/usr/bin/env bash
set -euo pipefail

# Content pipeline — discover papers, research, export Astro blog posts.
#
# Usage:
#   ./scripts/content-pipeline.sh --topic <name> [options]
#
# Options:
#   --topic <name>            Topic config name (matches scripts/topics/<name>.yaml)
#   --dry-run                 Show what would happen without writing anything
#   --since <date>            Only papers published after this date (YYYY-MM-DD)
#   --max-papers <n>          Limit number of papers to process (default: 5)
#   --import-notebook <path>  Import an existing NotebookLM export instead of discovering
#   --skip-research           Skip NotebookLM research step (discovery + export only)
#   --verbose                 Print extra diagnostics

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FAILURE_FIRST_REPO="$(cd "$REPO_ROOT/../failure-first-embodied-ai" 2>/dev/null && pwd || echo "")"
NOTEBOOKLM_REPO="$REPO_ROOT/scripts/notebooklm"

# Defaults
TOPIC=""
DRY_RUN=false
SINCE=""
MAX_PAPERS=5
IMPORT_NOTEBOOK=""
SKIP_RESEARCH=false
VERBOSE=false

usage() {
  sed -n '3,14p' "$0" | sed 's/^# \?//'
  exit 1
}

log() { echo "[$1] $2" >&2; }
info() { log "INFO" "$1"; }
warn() { log "WARN" "$1"; }
die() { log "ERROR" "$1"; exit 1; }
verbose() { $VERBOSE && log "DEBUG" "$1" || true; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)      TOPIC="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --since)      SINCE="$2"; shift 2 ;;
    --max-papers) MAX_PAPERS="$2"; shift 2 ;;
    --import-notebook) IMPORT_NOTEBOOK="$2"; shift 2 ;;
    --skip-research)   SKIP_RESEARCH=true; shift ;;
    --verbose)    VERBOSE=true; shift ;;
    -h|--help)    usage ;;
    *)            die "Unknown option: $1" ;;
  esac
done

# --- Import notebook shortcut ---
if [[ -n "$IMPORT_NOTEBOOK" ]]; then
  info "Importing notebook from $IMPORT_NOTEBOOK"
  EXPORT_ARGS=(
    "$SCRIPT_DIR/export_astro.py"
    "$IMPORT_NOTEBOOK"
    --target "$REPO_ROOT/src/content/blog"
    --draft
  )
  if [[ -n "$TOPIC" ]]; then
    TOPIC_FILE="$SCRIPT_DIR/topics/${TOPIC}.yaml"
    if [[ -f "$TOPIC_FILE" ]]; then
      # Extract tags from topic config (uses env var to avoid injection)
      TAGS=$(TOPIC_FILE_PATH="$TOPIC_FILE" python3 -c "
import yaml, os
with open(os.environ['TOPIC_FILE_PATH']) as f:
    cfg = yaml.safe_load(f)
tags = cfg.get('tags', ['research'])
print(' '.join(tags))
")
      # shellcheck disable=SC2086
      read -ra TAG_ARRAY <<< "$TAGS"
      EXPORT_ARGS+=(--tags "${TAG_ARRAY[@]}")
    fi
  fi
  $DRY_RUN && EXPORT_ARGS+=(--dry-run)
  python3 "${EXPORT_ARGS[@]}"
  exit 0
fi

# --- Validate ---
[[ -z "$TOPIC" ]] && die "Missing required --topic flag. Use --help for usage."
TOPIC_FILE="$SCRIPT_DIR/topics/${TOPIC}.yaml"
[[ -f "$TOPIC_FILE" ]] || die "Topic config not found: $TOPIC_FILE"

# Parse topic config (uses env var to avoid shell injection)
parse_yaml() {
  TOPIC_FILE_PATH="$TOPIC_FILE" python3 -c "
import yaml, json, os, sys
with open(os.environ['TOPIC_FILE_PATH']) as f:
    cfg = yaml.safe_load(f)
print(json.dumps(cfg))
"
}

TOPIC_JSON=$(parse_yaml)
verbose "Topic config: $TOPIC_JSON"

# Extract fields
QUERIES=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); [print(q) for q in cfg.get('queries',[])]")
TAGS=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); print(' '.join(cfg.get('tags',['research'])))")
TARGET=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); print(cfg.get('target','src/content/blog/'))")
DOMAIN_KW=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); [print(k) for k in cfg.get('domain_keywords',[])]")
SECURITY_KW=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); [print(k) for k in cfg.get('security_keywords',[])]")
EXCLUDE_TITLES=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); [print(k) for k in cfg.get('exclude_titles',[])]")
NLM_DEPTH=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); print(cfg.get('notebooklm',{}).get('depth',15))")
NLM_MODE=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); print(cfg.get('notebooklm',{}).get('mode','scholarly'))")
NLM_AUTO=$(echo "$TOPIC_JSON" | python3 -c "import json,sys; cfg=json.load(sys.stdin); print(cfg.get('notebooklm',{}).get('auto_generate','report'))")

# Work directory
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/content-pipeline-XXXXXX")
cleanup() { [[ -d "$WORK_DIR" ]] && rm -rf "$WORK_DIR"; }
trap cleanup EXIT
info "Work directory: $WORK_DIR"

# ============================
# Step 1: DISCOVER — find papers via OpenAlex
# ============================
info "Step 1: Discovering papers for topic '$TOPIC'..."

if [[ -z "$FAILURE_FIRST_REPO" ]]; then
  die "failure-first-embodied-ai repo not found at ../failure-first-embodied-ai/"
fi

BIBLIO_TOOL="$FAILURE_FIRST_REPO/tools/build_top_cited_bibliography.py"
[[ -f "$BIBLIO_TOOL" ]] || die "build_top_cited_bibliography.py not found at $BIBLIO_TOOL"

BIBLIO_ARGS=(
  python3 "$BIBLIO_TOOL"
  --out-dir "$WORK_DIR/bibliography"
  --limit "$MAX_PAPERS"
  --per-query 20
  --max-pages 1
  --no-download
  --json
  --no-default-title-filters
)

# Add queries
while IFS= read -r query; do
  [[ -n "$query" ]] && BIBLIO_ARGS+=(--query "$query")
done <<< "$QUERIES"

# Add domain keywords
while IFS= read -r kw; do
  [[ -n "$kw" ]] && BIBLIO_ARGS+=(--domain-keyword "$kw")
done <<< "$DOMAIN_KW"

# Add security keywords
while IFS= read -r kw; do
  [[ -n "$kw" ]] && BIBLIO_ARGS+=(--security-keyword "$kw")
done <<< "$SECURITY_KW"

# Add exclude titles
while IFS= read -r ex; do
  [[ -n "$ex" ]] && BIBLIO_ARGS+=(--exclude-title "$ex")
done <<< "$EXCLUDE_TITLES"

# Add since filter
if [[ -n "$SINCE" ]]; then
  BIBLIO_ARGS+=(--query "from_publication_date:$SINCE")
fi

# Add mailto if available
if [[ -n "${OPENALEX_MAILTO:-}" ]]; then
  BIBLIO_ARGS+=(--mailto "$OPENALEX_MAILTO")
elif [[ -n "${OPENALEX_EMAIL:-}" ]]; then
  BIBLIO_ARGS+=(--mailto "$OPENALEX_EMAIL")
fi

if $DRY_RUN; then
  info "[dry-run] Would run: ${BIBLIO_ARGS[*]}"
  # Still run discovery in dry-run to show what papers were found
fi

verbose "Running: ${BIBLIO_ARGS[*]}"
BIBLIO_OUTPUT=$("${BIBLIO_ARGS[@]}" 2>&1) || {
  warn "Bibliography discovery failed. Output:"
  echo "$BIBLIO_OUTPUT" >&2
  die "Paper discovery failed"
}

WORKS_FILE="$WORK_DIR/bibliography/works.jsonl"
if [[ ! -f "$WORKS_FILE" ]]; then
  warn "No works.jsonl produced. Discovery may have found no papers."
  info "Bibliography output: $BIBLIO_OUTPUT"
  exit 0
fi

PAPER_COUNT=$(wc -l < "$WORKS_FILE" | tr -d ' ')
info "Discovered $PAPER_COUNT papers"

if [[ "$PAPER_COUNT" -eq 0 ]]; then
  info "No papers found. Try broader queries or an earlier --since date."
  exit 0
fi

# Show top papers
info "Top papers:"
python3 -c "
import json, sys
with open('$WORKS_FILE') as f:
    for i, line in enumerate(f):
        if i >= $MAX_PAPERS: break
        w = json.loads(line)
        title = w.get('title', 'Untitled')
        cited = w.get('cited_by_count', 0)
        year = w.get('publication_year', '?')
        doi = w.get('doi', '')
        print(f'  {i+1}. [{cited} cites, {year}] {title}')
        if doi: print(f'     DOI: {doi}')
"

# ============================
# Step 2: RESEARCH — create NotebookLM notebooks (optional)
# ============================
if ! $SKIP_RESEARCH; then
  if [[ -z "$NOTEBOOKLM_REPO" ]]; then
    warn "notebooklm scripts not found at scripts/notebooklm/ — skipping research step"
    SKIP_RESEARCH=true
  fi
fi

if ! $SKIP_RESEARCH && ! $DRY_RUN; then
  RESEARCH_TOOL="$NOTEBOOKLM_REPO/scripts/research-topic.sh"
  if [[ -f "$RESEARCH_TOOL" ]]; then
    info "Step 2: Creating NotebookLM notebooks..."

    python3 -c "
import json
with open('$WORKS_FILE') as f:
    for i, line in enumerate(f):
        if i >= $MAX_PAPERS: break
        w = json.loads(line)
        print(w.get('title', 'Untitled'))
" | while IFS= read -r paper_title; do
      info "  Researching: $paper_title"
      NLM_OUTPUT=$("$RESEARCH_TOOL" "$paper_title" \
        --depth "$NLM_DEPTH" \
        --mode "$NLM_MODE" \
        --auto-generate "$NLM_AUTO" \
        --json \
        --quiet 2>&1) || {
        warn "  NotebookLM research failed for: $paper_title"
        continue
      }
      NB_ID=$(echo "$NLM_OUTPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('notebook_id',''))" 2>/dev/null || echo "")
      if [[ -n "$NB_ID" ]]; then
        echo "$NB_ID" >> "$WORK_DIR/notebook_ids.txt"
        info "  Created notebook: $NB_ID"
      fi
    done
  else
    warn "research-topic.sh not found — skipping research step"
    SKIP_RESEARCH=true
  fi
elif $DRY_RUN && ! $SKIP_RESEARCH; then
  info "[dry-run] Step 2: Would create NotebookLM notebooks for top $MAX_PAPERS papers"
fi

# ============================
# Step 3: EXPORT — convert to Astro blog posts
# ============================
info "Step 3: Exporting to Astro blog posts..."

# For each paper in works.jsonl, create a post from the bibliography data
# shellcheck disable=SC2086
read -ra TAG_ARRAY <<< "$TAGS"
EXPORT_ARGS=(
  python3 "$SCRIPT_DIR/export_astro.py"
  --target "$REPO_ROOT/$TARGET"
  --tags "${TAG_ARRAY[@]}"
  --draft
)
$DRY_RUN && EXPORT_ARGS+=(--dry-run)

# Generate individual markdown files from works.jsonl for export
POSTS_DIR="$WORK_DIR/posts"
mkdir -p "$POSTS_DIR"

export WORKS_FILE POSTS_DIR MAX_PAPERS
python3 << 'PYEOF'
import json, sys, os, re
from pathlib import Path

works_file = os.environ["WORKS_FILE"]
posts_dir = os.environ["POSTS_DIR"]
max_papers = int(os.environ["MAX_PAPERS"])

with open(works_file) as f:
    for i, line in enumerate(f):
        if i >= max_papers:
            break
        w = json.loads(line)
        title = w.get("title", "Untitled")
        abstract = w.get("abstract", "") or ""
        if not abstract and "abstract_inverted_index" in w:
            idx = w["abstract_inverted_index"]
            if idx:
                words = {}
                for word, positions in idx.items():
                    for pos in positions:
                        words[pos] = word
                abstract = " ".join(words[k] for k in sorted(words))

        doi = w.get("doi", "")
        year = w.get("publication_year", "")
        cited = w.get("cited_by_count", 0)
        authors = w.get("authorships", [])
        author_names = [a.get("author", {}).get("display_name", "") for a in authors[:5]]
        author_str = ", ".join(n for n in author_names if n)

        slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
        slug = re.sub(r"[\s-]+", "-", slug).strip("-")
        slug = "-".join(slug.split("-")[:8])

        lines = [f"# {title}\n"]
        if author_str:
            lines.append(f"**Authors:** {author_str}\n")
        if year:
            lines.append(f"**Published:** {year} | **Citations:** {cited}\n")
        if doi:
            lines.append(f"**DOI:** [{doi}]({doi})\n")
        if abstract:
            lines.append(f"\n## Abstract\n\n{abstract}\n")

        out = Path(posts_dir) / f"{slug}.md"
        out.write_text("\n".join(lines), encoding="utf-8")
PYEOF

# Export generated posts
if [[ -d "$POSTS_DIR" ]] && ls "$POSTS_DIR"/*.md &>/dev/null; then
  "${EXPORT_ARGS[@]}" "$POSTS_DIR"
else
  warn "No posts generated to export"
fi

# ============================
# Summary
# ============================
echo ""
info "Pipeline complete for topic: $TOPIC"
info "Papers discovered: $PAPER_COUNT"
if $DRY_RUN; then
  info "Mode: dry-run (no files written)"
else
  info "Posts written to: $REPO_ROOT/$TARGET"
  info "All posts marked as draft: true"
fi

# Cleanup handled by trap EXIT
