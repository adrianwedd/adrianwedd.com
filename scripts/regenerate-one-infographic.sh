#!/usr/bin/env bash
set -euo pipefail

# regenerate-one-infographic.sh
# Regenerate a SINGLE infographic with the branded focus.
# Designed to be called iteratively — resilient to process kills.
#
# Usage:
#   ./scripts/regenerate-one-infographic.sh <slug> [notebook_id]
#
# If notebook_id is not provided, it will be looked up from the notebook list.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

# Brand focus prompt
FOCUS="Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Elegant editorial layout with strong typographic hierarchy. Professional data visualisation with muted, saturated colour palette. WCAG AA contrast ratios. Minimal, sophisticated, Australian dark-mode design."

slug="${1:?Usage: $0 <slug> [notebook_id]}"
shift || true
notebook_id="${1:-}"

echo "=== Regenerating: $slug ==="

# Find notebook ID if not provided
if [ -z "$notebook_id" ]; then
    # Search with both hyphenated and space-separated versions
    search_hyphen="$slug"
    search_space=$(echo "$slug" | tr '-' ' ')
    NOTEBOOKS_JSON=$(nlm list notebooks --json 2>/dev/null)
    notebook_id=$(echo "$NOTEBOOKS_JSON" | python3 -c "
import json, sys
notebooks = json.load(sys.stdin)
search_hyphen = '$search_hyphen'.lower()
search_space = '$search_space'.lower()
# Best match: dedicated infographic notebook
for n in notebooks:
    title = n.get('title', '').lower()
    if (search_hyphen in title or search_space in title) and 'infographic' in title:
        print(n['id'])
        sys.exit(0)
# Fallback: any notebook containing the search term
for n in notebooks:
    title = n.get('title', '').lower()
    if search_hyphen in title or search_space in title:
        print(n['id'])
        sys.exit(0)
sys.exit(1)
" 2>/dev/null || echo "")
fi

if [ -z "$notebook_id" ]; then
    echo "ERROR: No notebook found for $slug"
    exit 1
fi

echo "Notebook: $notebook_id"
echo "Generating branded portrait infographic..."

# Create infographic
create_output=$(nlm infographic create "$notebook_id" \
    --orientation portrait \
    --focus "$FOCUS" \
    -y 2>&1 || true)

# Extract artifact ID
artifact_id=$(echo "$create_output" | grep "Artifact ID:" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
if [ -z "$artifact_id" ]; then
    artifact_id=$(echo "$create_output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
fi

if [ -z "$artifact_id" ]; then
    echo "ERROR: No artifact ID returned"
    echo "Output: $create_output"
    exit 1
fi

echo "Artifact ID: $artifact_id"

# Poll for completion (max 5 minutes)
for attempt in $(seq 1 40); do
    sleep 5
    art_status=$(nlm studio status "$notebook_id" --json 2>/dev/null | python3 -c "
import json, sys
arts = json.load(sys.stdin)
target = [a for a in arts if a['id'] == '$artifact_id']
if target:
    print(target[0]['status'])
else:
    print('not_found')
" 2>/dev/null || echo "error")

    if [ "$art_status" = "completed" ]; then
        echo "Completed (attempt $attempt)"
        break
    elif [ "$art_status" = "failed" ]; then
        echo "ERROR: Generation failed"
        exit 1
    fi
    if [ $((attempt % 6)) -eq 0 ]; then
        echo "Still generating... (${attempt}x5s)"
    fi
done

# Download
tmp_png=$(mktemp /tmp/infographic-XXXXXX.png)
echo "Downloading..."
nlm download infographic "$notebook_id" \
    --id "$artifact_id" \
    -o "$tmp_png" 2>&1

if [ ! -f "$tmp_png" ]; then
    echo "ERROR: Download failed"
    exit 1
fi

png_kb=$(($(stat -f%z "$tmp_png" 2>/dev/null || stat -c%s "$tmp_png" 2>/dev/null) / 1024))
echo "PNG: ${png_kb}KB"

# Convert to WebP
webp_dir="$PUBLIC_ASSETS/$slug"
mkdir -p "$webp_dir"
webp_path="$webp_dir/infographic.webp"

if command -v cwebp &>/dev/null; then
    cwebp -q 80 -resize 1536 0 "$tmp_png" -o "$webp_path" 2>/dev/null
    if [ -f "$webp_path" ]; then
        webp_kb=$(($(stat -f%z "$webp_path" 2>/dev/null || stat -c%s "$webp_path" 2>/dev/null) / 1024))
        echo "WebP: ${webp_kb}KB (1536w @ 80%)"
    else
        cp "$tmp_png" "$webp_dir/infographic.png"
        echo "WebP conversion failed, saved as PNG"
    fi
else
    cp "$tmp_png" "$webp_dir/infographic.png"
    echo "cwebp not available, saved as PNG"
fi

rm -f "$tmp_png"
echo "Done: $slug"