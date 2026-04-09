#!/usr/bin/env bash
set -euo pipefail

# regenerate-branded-infographics.sh
# Regenerate ALL existing infographics with a custom --focus flag
# that carries the adrianwedd.com brand style (dark botanical, plum-tinted,
# dusty copper accent, WCAG AA contrast).
#
# Usage:
#   ./scripts/regenerate-branded-infographics.sh [--yes] [--limit N] [--dry-run] [--focus "custom focus"]
#
# This script:
#   1. Finds all content items with existing infographic.webp files
#   2. Maps each slug to its NotebookLM notebook (or creates one)
#   3. Generates a new infographic with the branded --focus flag
#   4. Downloads and converts to WebP
#   5. Replaces the existing file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECTS_DIR="$REPO_ROOT/src/content/projects"
BLOG_DIR="$REPO_ROOT/src/content/blog"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Brand focus prompt — carries both visual style and content direction
# This is the single source of truth for the adrianwedd.com infographic aesthetic
DEFAULT_FOCUS="Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Elegant editorial layout with strong typographic hierarchy. Professional data visualisation with muted, saturated colour palette. WCAG AA contrast ratios. Minimal, sophisticated, Australian dark-mode design."

# Defaults
YES=false
LIMIT=0
DRY_RUN=false
FOCUS="$DEFAULT_FOCUS"
SKIP=()

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y) YES=true; shift ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --focus) FOCUS="$2"; shift 2 ;;
        --skip) SKIP+=("$2"); shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Counters
TOTAL=0
SUCCESS=0
FAILED=0
SKIPPED=0

echo "=== Branded Infographic Regeneration ==="
echo "  Focus: $FOCUS"
echo "  Orientation: portrait (1536x2752)"
echo "  Output: WebP @ 80% quality"
echo

# Check dependencies
if ! command -v nlm &>/dev/null; then
    echo -e "${RED}Error: nlm CLI not found. Install: pip install notebooklm-mcp-cli${NC}"
    exit 1
fi

if ! command -v cwebp &>/dev/null; then
    echo -e "${YELLOW}Warning: cwebp not found. Will save as PNG only.${NC}"
fi

# Check authentication
if ! nlm login --check &>/dev/null; then
    echo -e "${YELLOW}Warning: NotebookLM authentication may be expired${NC}"
    echo "Run: nlm login"
    exit 1
fi

# Collect all content items with existing infographics
ITEMS_SLUG=()
ITEMS_FILE=()
ITEMS_TYPE=()

# Scan projects
for asset_dir in "$PUBLIC_ASSETS"/*/; do
    slug=$(basename "$asset_dir")
    if [ ! -f "$asset_dir/infographic.webp" ] && [ ! -f "$asset_dir/infographic.png" ]; then
        continue
    fi

    # Match slug to content file
    project_file="$PROJECTS_DIR/${slug}.md"
    blog_file="$BLOG_DIR/${slug}-post.md"

    if [ -f "$project_file" ]; then
        ITEMS_SLUG+=("$slug")
        ITEMS_FILE+=("$project_file")
        ITEMS_TYPE+=("project")
        ((TOTAL++)) || true
    elif [ -f "$blog_file" ]; then
        ITEMS_SLUG+=("$slug")
        ITEMS_FILE+=("$blog_file")
        ITEMS_TYPE+=("blog")
        ((TOTAL++)) || true
    else
        # Try without -post suffix
        blog_file_alt="$BLOG_DIR/${slug}.md"
        if [ -f "$blog_file_alt" ]; then
            ITEMS_SLUG+=("$slug")
            ITEMS_FILE+=("$blog_file_alt")
            ITEMS_TYPE+=("blog")
            ((TOTAL++)) || true
        else
            echo -e "${YELLOW}Warning: No content file found for $slug${NC}"
        fi
    fi
done

echo "Found $TOTAL items with existing infographics"
echo

if [ $TOTAL -eq 0 ]; then
    echo "No infographics to regenerate!"
    exit 0
fi

# Apply limit
if [ "$LIMIT" -gt 0 ] && [ "$LIMIT" -lt "$TOTAL" ]; then
    echo -e "${YELLOW}Limiting to first $LIMIT items (of $TOTAL)${NC}"
    ITEMS_SLUG=("${ITEMS_SLUG[@]:0:$LIMIT}")
    ITEMS_FILE=("${ITEMS_FILE[@]:0:$LIMIT}")
    ITEMS_TYPE=("${ITEMS_TYPE[@]:0:$LIMIT}")
    TOTAL=$LIMIT
fi

echo "Will regenerate infographics for:"
for i in "${!ITEMS_SLUG[@]}"; do
    echo "  - [${ITEMS_TYPE[$i]}] ${ITEMS_SLUG[$i]}"
done
echo
echo -e "${YELLOW}Estimated time: ~$(($TOTAL * 2)) minutes (avg 2 min per infographic)${NC}"
echo -e "${YELLOW}NotebookLM daily quota: ~50 infographic generations${NC}"
echo

if [ "$DRY_RUN" = true ]; then
    echo "Dry run — exiting without generating"
    exit 0
fi

if [ "$YES" = false ]; then
    read -p "Continue with regeneration? (y/N) " -n 1 -r
    echo
    [[ ! $rPLY =~ ^[Yy]$ ]] && exit 1
fi

# Fetch existing notebooks for lookup
echo "Fetching existing notebooks..."
NOTEBOOKS_JSON=$(nlm list notebooks --json 2>/dev/null)

find_notebook_id() {
    local search_term="$1"
    # Search with both hyphenated and space-separated versions
    local search_hyphen search_space
    search_hyphen="$search_term"
    search_space=$(echo "$search_term" | tr '-' ' ')
    echo "$NOTEBOOKS_JSON" | python3 -c "
import json, sys, re
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
# No match
sys.exit(1)
" 2>/dev/null || echo ""
}

# Process each item
for i in "${!ITEMS_SLUG[@]}"; do
    slug="${ITEMS_SLUG[$i]}"
    item_file="${ITEMS_FILE[$i]}"
    item_type="${ITEMS_TYPE[$i]}"
    idx=$((i + 1))

    # Skip items in the skip list
    if [[ " ${SKIP[*]} " == *" $slug "* ]]; then
        echo -e "  ${YELLOW}Skipping $slug (in --skip list)${NC}"
        ((SKIPPED++)) || true
        continue
    fi

    echo
    echo -e "${CYAN}[$idx/$TOTAL] Regenerating [$item_type]: $slug${NC}"
    echo "----------------------------------------"

    # Extract title from frontmatter
    title=$(grep "^title:" "$item_file" | head -1 | sed "s/^title: *['\"]\\{0,1\\}\\(.*\\)['\"]\\{0,1\\}$/\\1/" | sed "s/['\"]$//")
    echo "  Title: $title"

    # Find existing notebook
    notebook_id=$(find_notebook_id "$slug")

    # Also try the title
    if [ -z "$notebook_id" ]; then
        notebook_id=$(find_notebook_id "$title")
    fi

    if [ -z "$notebook_id" ]; then
        echo -e "  ${YELLOW}No existing notebook found for '$slug'${NC}"
        echo "  Creating new notebook..."
        cd "$REPO_ROOT/scripts/notebooklm"

        config_file=$(mktemp)
        cat > "$config_file" <<EOFCONFIG
{
  "title": "$title - Overview",
  "sources": [
    "textfile:$item_file"
  ],
  "studio": []
}
EOFCONFIG

        result=$(./scripts/automate-notebook.sh --config "$config_file" --export /dev/null 2>&1 || true)
        rm -f "$config_file"

        # Re-fetch notebooks
        NOTEBOOKS_JSON=$(nlm list notebooks --json 2>/dev/null)
        notebook_id=$(find_notebook_id "$slug")
        if [ -z "$notebook_id" ]; then
            notebook_id=$(find_notebook_id "$title")
        fi

        if [ -z "$notebook_id" ]; then
            echo -e "  ${RED}Failed to create notebook for $slug${NC}"
            ((FAILED++)) || true
            continue
        fi
    fi

    echo "  Notebook: $notebook_id"
    echo "  Generating branded portrait infographic..."

    # Generate infographic with branded focus
    # IMPORTANT: Use "nlm infographic create" not "nlm create infographic"
    # The latter is broken in nlm 0.5.17
    create_output=$(nlm infographic create "$notebook_id" \
        --orientation portrait \
        --focus "$FOCUS" \
        -y 2>&1 || true)

    # Extract artifact ID from output (prefer line with "Artifact ID:")
    artifact_id=$(echo "$create_output" | grep "Artifact ID:" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
    if [ -z "$artifact_id" ]; then
        artifact_id=$(echo "$create_output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
    fi

    if [ -z "$artifact_id" ]; then
        echo -e "  ${RED}Infographic creation failed — no artifact ID returned${NC}"
        echo "  Output: $create_output"
        ((FAILED++)) || true
        continue
    fi

    echo "  Artifact ID: $artifact_id"

    # Poll for completion (max 5 minutes with backoff)
    poll_interval=5
    for attempt in $(seq 1 40); do
        sleep "$poll_interval"
        if [ "$attempt" -eq 12 ]; then poll_interval=10; fi

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
            echo -e "  ${GREEN}Completed (attempt $attempt)${NC}"
            break
        elif [ "$art_status" = "failed" ]; then
            echo -e "  ${RED}Generation failed${NC}"
            artifact_id=""
            break
        fi

        elapsed=$(( (attempt <= 12 ? attempt * 5 : 60 + (attempt - 12) * 10) ))
        if [ $((attempt % 6)) -eq 0 ]; then
            echo "  Still generating... (${elapsed}s)"
        fi
    done

    if [ -z "$artifact_id" ]; then
        echo -e "  ${RED}Timed out or failed${NC}"
        ((FAILED++)) || true
        continue
    fi

    # Download to temp location
    tmp_png=$(mktemp /tmp/infographic-XXXXXX.png)
    echo "  Downloading..."

    if ! nlm download infographic "$notebook_id" \
        --id "$artifact_id" \
        -o "$tmp_png" 2>&1; then
        echo -e "  ${RED}Download failed${NC}"
        rm -f "$tmp_png"
        ((FAILED++)) || true
        continue
    fi

    if [ ! -f "$tmp_png" ]; then
        echo -e "  ${RED}Downloaded file not found${NC}"
        ((FAILED++)) || true
        continue
    fi

    png_size=$(stat -f%z "$tmp_png" 2>/dev/null || stat -c%s "$tmp_png" 2>/dev/null)
    png_kb=$((png_size / 1024))
    echo "  PNG: ${png_kb}KB"

    # Convert to WebP at portrait size (1536w)
    webp_dir="$PUBLIC_ASSETS/$slug"
    mkdir -p "$webp_dir"
    webp_path="$webp_dir/infographic.webp"

    if command -v cwebp &>/dev/null; then
        cwebp -q 80 -resize 1536 0 "$tmp_png" -o "$webp_path" 2>/dev/null
        if [ -f "$webp_path" ]; then
            webp_size=$(stat -f%z "$webp_path" 2>/dev/null || stat -c%s "$webp_path" 2>/dev/null)
            webp_kb=$((webp_size / 1024))
            echo -e "  ${GREEN}WebP: ${webp_kb}KB (1536w @ 80%)${NC}"
        else
            # Fallback: just copy the PNG
            cp "$tmp_png" "$webp_dir/infographic.png"
            echo -e "  ${YELLOW}WebP conversion failed, saved as PNG${NC}"
        fi
    else
        cp "$tmp_png" "$webp_dir/infographic.png"
        echo -e "  ${YELLOW}cwebp not available, saved as PNG${NC}"
    fi

    # Cleanup temp file
    rm -f "$tmp_png"

    # Verify the heroImage in frontmatter points to the right place
    hero_line="/notebook-assets/$slug/infographic"
    if ! grep -q "$hero_line" "$item_file"; then
        echo -e "  ${YELLOW}Warning: frontmatter heroImage doesn't match expected path${NC}"
    fi

    ((SUCCESS++)) || true

    # Rate limiting — pause between items
    if [ "$idx" -lt "$TOTAL" ]; then
        echo "  Pausing 5 seconds..."
        sleep 5
    fi
done

echo
echo "=== Regeneration Complete ==="
echo "Total:     $TOTAL"
echo -e "Success:   ${GREEN}$SUCCESS${NC}"
echo -e "Failed:    ${RED}$FAILED${NC}"
echo -e "Skipped:   $SKIPPED"
echo

if [ $SUCCESS -gt 0 ]; then
    echo -e "${GREEN}Branded infographics saved to: public/notebook-assets/*/infographic.webp${NC}"
    echo
    echo "Next steps:"
    echo "1. Review generated infographics visually"
    echo "2. npm run build"
    echo "3. git add -A && git commit -m 'feat: regenerate infographics with branded focus'"
fi