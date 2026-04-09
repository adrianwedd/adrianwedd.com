#!/usr/bin/env bash
set -euo pipefail

# batch-regenerate.sh
# Processes remaining items one at a time, with state tracking.
# Resilient to process kills — reads progress from state file.
#
# Usage: ./scripts/batch-regenerate.sh [--limit N] [--wait SECONDS]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$REPO_ROOT/.regenerate-state.txt"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

LIMIT=0
WAIT=5

while [[ $# -gt 0 ]]; do
    case $1 in
        --limit) LIMIT="$2"; shift 2 ;;
        --wait) WAIT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Build list of items that still need regeneration
# (files not modified today)
TODAY=$(date +%Y-%m-%d)
TODO=()

while IFS= read -r webp; do
    slug=$(basename "$(dirname "$webp")")
    mtime=$(stat -f "%Sm" -t "%Y-%m-%d" "$webp" 2>/dev/null || echo "unknown")
    if [ "$mtime" != "$TODAY" ]; then
        TODO+=("$slug")
    fi
done < <(find "$PUBLIC_ASSETS" -name "infographic.webp" | sort)

echo "=== Batch Regeneration ==="
echo "Items remaining: ${#TODO[@]}"

if [ ${#TODO[@]} -eq 0 ]; then
    echo "All infographics are up to date!"
    exit 0
fi

count=0
for slug in "${TODO[@]}"; do
    if [ "$LIMIT" -gt 0 ] && [ "$count" -ge "$LIMIT" ]; then
        echo "Reached limit of $LIMIT"
        break
    fi

    echo
    echo ">>> Processing: $slug <<<"
    if "$SCRIPT_DIR/regenerate-one-infographic.sh" "$slug"; then
        echo "SUCCESS: $slug"
        echo "$slug" >> "$STATE_FILE"
    else
        echo "FAILED: $slug"
        echo "FAILED:$slug" >> "$STATE_FILE"
    fi

    ((count++)) || true

    if [ "$count" -lt "${#TODO[@]}" ]; then
        sleep "$WAIT"
    fi
done

echo
echo "=== Batch Complete: $count items processed ==="
echo "Check $STATE_FILE for progress"