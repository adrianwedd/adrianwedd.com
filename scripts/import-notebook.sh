#!/usr/bin/env bash
set -euo pipefail

# Import an existing NotebookLM notebook export as draft blog posts.
#
# Usage:
#   ./scripts/import-notebook.sh <notebook-export-path> [options]
#
# Options:
#   --topic <name>    Apply tags from a topic config
#   --tags <t1 t2>    Override tags (space-separated)
#   --dry-run         Show what would be created without writing
#   --no-draft        Publish immediately (default: draft)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

NOTEBOOK_PATH=""
TOPIC=""
TAGS=""
DRY_RUN=false
DRAFT=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --topic)    TOPIC="$2"; shift 2 ;;
    --tags)     shift; TAGS=""; while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do TAGS="$TAGS $1"; shift; done ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --no-draft) DRAFT=false; shift ;;
    -h|--help)  sed -n '3,11p' "$0" | sed 's/^# \?//'; exit 0 ;;
    *)
      if [[ -z "$NOTEBOOK_PATH" ]]; then
        NOTEBOOK_PATH="$1"; shift
      else
        echo "Error: unexpected argument: $1" >&2; exit 1
      fi
      ;;
  esac
done

[[ -z "$NOTEBOOK_PATH" ]] && { echo "Error: notebook export path required" >&2; exit 1; }
[[ -e "$NOTEBOOK_PATH" ]] || { echo "Error: path does not exist: $NOTEBOOK_PATH" >&2; exit 1; }

# Resolve tags
if [[ -z "$TAGS" && -n "$TOPIC" ]]; then
  TOPIC_FILE="$SCRIPT_DIR/topics/${TOPIC}.yaml"
  if [[ -f "$TOPIC_FILE" ]]; then
    TAGS=$(TOPIC_FILE_PATH="$TOPIC_FILE" python3 -c "
import yaml, os
with open(os.environ['TOPIC_FILE_PATH']) as f:
    cfg = yaml.safe_load(f)
tags = cfg.get('tags', ['research'])
print(' '.join(tags))
")
  fi
fi

[[ -z "$TAGS" ]] && TAGS="research"

# Build export command
# shellcheck disable=SC2086
read -ra TAG_ARRAY <<< "$TAGS"
EXPORT_ARGS=(
  python3 "$SCRIPT_DIR/export_astro.py"
  "$NOTEBOOK_PATH"
  --target "$REPO_ROOT/src/content/blog"
  --public-dir "$REPO_ROOT/public"
  --tags "${TAG_ARRAY[@]}"
)
$DRAFT && EXPORT_ARGS+=(--draft) || EXPORT_ARGS+=(--no-draft)
$DRY_RUN && EXPORT_ARGS+=(--dry-run)

echo "Importing notebook: $NOTEBOOK_PATH"
echo "Tags: $TAGS"
echo ""

"${EXPORT_ARGS[@]}"
