#!/usr/bin/env bash
set -euo pipefail

# generate-all-infographics.sh
# Batch generate NotebookLM infographics for projects and blog posts.
# Uses portrait orientation with a consistent style focus for visual cohesion.
#
# Usage:
#   ./scripts/generate-all-infographics.sh [--yes] [--limit N] [--landscape] [--blog] [--projects] [--all]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTEBOOKLM_DIR="$REPO_ROOT/scripts/notebooklm"
PROJECTS_DIR="$REPO_ROOT/src/content/projects"
BLOG_DIR="$REPO_ROOT/src/content/blog"
PUBLIC_ASSETS="$REPO_ROOT/public/notebook-assets"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Defaults
YES=false
LIMIT=0
ORIENTATION="portrait"
FOCUS="Dark background with warm copper and amber accent colours. Portrait layout with clear visual hierarchy. Modern tech aesthetic, light text on dark surfaces."
SCAN_PROJECTS=false
SCAN_BLOG=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y) YES=true; shift ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --landscape) ORIENTATION="landscape"; shift ;;
        --focus) FOCUS="$2"; shift 2 ;;
        --projects) SCAN_PROJECTS=true; shift ;;
        --blog) SCAN_BLOG=true; shift ;;
        --all) SCAN_PROJECTS=true; SCAN_BLOG=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Default to --all if neither specified
if [ "$SCAN_PROJECTS" = false ] && [ "$SCAN_BLOG" = false ]; then
    SCAN_PROJECTS=true
    SCAN_BLOG=true
fi

# Counters
TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

echo "=== NotebookLM Infographic Batch Generation ==="
echo "  Orientation: $ORIENTATION"
echo

# Check dependencies
if ! command -v nlm &>/dev/null; then
    echo -e "${RED}Error: nlm CLI not found. Install: pip install notebooklm-mcp-cli${NC}"
    exit 1
fi

HAS_CWEBP=false
if command -v cwebp &>/dev/null; then
    HAS_CWEBP=true
fi

# Check authentication
if ! nlm login --check &>/dev/null; then
    echo -e "${YELLOW}Warning: NotebookLM authentication may be expired${NC}"
    echo "Run: nlm login"
    if [ "$YES" = false ]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi
fi

# Parallel arrays: name (used for asset dir), source file path, type label
ITEMS_NAME=()
ITEMS_FILE=()
ITEMS_TYPE=()

# Find projects without heroImage
if [ "$SCAN_PROJECTS" = true ]; then
    echo "Scanning projects..."
    for project_file in "$PROJECTS_DIR"/*.md; do
        project_name=$(basename "$project_file" .md)
        if grep -q "^heroImage:" "$project_file"; then
            ((SKIPPED++)) || true
            continue
        fi
        ITEMS_NAME+=("$project_name")
        ITEMS_FILE+=("$project_file")
        ITEMS_TYPE+=("project")
        ((TOTAL++)) || true
    done
fi

# Find non-draft blog posts without heroImage
if [ "$SCAN_BLOG" = true ]; then
    echo "Scanning blog posts..."
    for blog_file in "$BLOG_DIR"/*.md; do
        # Skip drafts
        if grep -q "^draft: true" "$blog_file"; then
            ((SKIPPED++)) || true
            continue
        fi
        if grep -q "^heroImage:" "$blog_file"; then
            ((SKIPPED++)) || true
            continue
        fi
        # Asset dir uses slug without -post suffix
        blog_name=$(basename "$blog_file" .md | sed 's/-post$//')
        ITEMS_NAME+=("$blog_name")
        ITEMS_FILE+=("$blog_file")
        ITEMS_TYPE+=("blog")
        ((TOTAL++)) || true
    done
fi

echo "Found $TOTAL items without hero images"
echo "Skipped $SKIPPED items with existing heroImage or draft status"
echo

if [ $TOTAL -eq 0 ]; then
    echo "All items already have hero images!"
    exit 0
fi

# Apply limit
if [ "$LIMIT" -gt 0 ] && [ "$LIMIT" -lt "$TOTAL" ]; then
    echo -e "${YELLOW}Limiting to first $LIMIT items (of $TOTAL)${NC}"
    ITEMS_NAME=("${ITEMS_NAME[@]:0:$LIMIT}")
    ITEMS_FILE=("${ITEMS_FILE[@]:0:$LIMIT}")
    ITEMS_TYPE=("${ITEMS_TYPE[@]:0:$LIMIT}")
    TOTAL=$LIMIT
fi

echo "Will generate infographics for:"
for i in "${!ITEMS_NAME[@]}"; do
    echo "  - [${ITEMS_TYPE[$i]}] ${ITEMS_NAME[$i]}"
done
echo

echo -e "${YELLOW}Estimated time: $(($TOTAL * 2)) minutes (avg 2 min per infographic)${NC}"
echo -e "${YELLOW}NotebookLM daily quota: ~50 infographic generations${NC}"
echo

if [ "$YES" = false ]; then
    read -p "Continue with batch generation? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Get list of existing notebooks
echo "Fetching existing notebooks..."
NOTEBOOKS_JSON=$(nlm notebook list 2>/dev/null || echo "[]")

find_notebook_id() {
    local title_fragment="$1"
    echo "$NOTEBOOKS_JSON" | python3 -c "
import json, sys
notebooks = json.load(sys.stdin)
fragment = '$title_fragment'.lower()
for n in notebooks:
    if fragment in n['title'].lower():
        print(n['id'])
        sys.exit(0)
" 2>/dev/null || echo ""
}

# Process each item
for i in "${!ITEMS_NAME[@]}"; do
    item_name="${ITEMS_NAME[$i]}"
    item_file="${ITEMS_FILE[$i]}"
    item_type="${ITEMS_TYPE[$i]}"
    idx=$((i + 1))

    echo
    echo "[$idx/$TOTAL] Processing [$item_type]: $item_name"
    echo "----------------------------------------"

    title=$(grep "^title:" "$item_file" | head -1 | sed "s/^title: *['\"]\\{0,1\\}\\(.*\\)['\"]\\{0,1\\}$/\\1/" | sed "s/['\"]$//")

    echo "  Title: $title"

    # Find or create notebook
    notebook_id=$(find_notebook_id "$title")

    if [ -z "$notebook_id" ]; then
        echo "  Creating notebook..."
        cd "$NOTEBOOKLM_DIR"

        # Create temp config
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

        # Use automate to create notebook with source
        result=$(./scripts/automate-notebook.sh --config "$config_file" --export /dev/null 2>&1 || true)
        rm -f "$config_file"

        # Re-fetch notebooks to find the new one
        NOTEBOOKS_JSON=$(nlm notebook list 2>/dev/null || echo "[]")
        notebook_id=$(find_notebook_id "$title")

        if [ -z "$notebook_id" ]; then
            echo -e "  ${RED}Failed to create notebook for $item_name${NC}"
            ((FAILED++)) || true
            continue
        fi
    fi

    echo "  Notebook: $notebook_id"
    echo "  Generating $ORIENTATION infographic..."

    # Generate infographic with consistent style
    nlm infographic create "$notebook_id" \
        --orientation "$ORIENTATION" \
        --focus "$FOCUS" \
        -y 2>&1 | while IFS= read -r line; do echo "    $line"; done

    # Poll for completion (max 5 minutes with backoff)
    artifact_id=""
    poll_interval=5
    for attempt in $(seq 1 40); do
        sleep $poll_interval
        # Increase interval after first minute
        if [ $attempt -eq 12 ]; then poll_interval=10; fi
        status_json=$(nlm studio status "$notebook_id" 2>/dev/null || echo "[]")
        # Get the most recent infographic artifact
        result=$(echo "$status_json" | python3 -c "
import json, sys
arts = json.load(sys.stdin)
infographics = [a for a in arts if a['type'] == 'infographic']
if infographics:
    latest = infographics[0]
    print(latest['id'], latest['status'])
" 2>/dev/null || echo "")

        if [ -n "$result" ]; then
            art_id=$(echo "$result" | awk '{print $1}')
            art_status=$(echo "$result" | awk '{print $2}')

            if [ "$art_status" = "completed" ]; then
                artifact_id="$art_id"
                echo "  Completed (attempt $attempt)"
                break
            elif [ "$art_status" = "failed" ]; then
                echo -e "  ${RED}Generation failed${NC}"
                break
            fi
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

    # Download
    mkdir -p "$PUBLIC_ASSETS/$item_name"
    png_path="$PUBLIC_ASSETS/$item_name/infographic.png"

    nlm download infographic "$notebook_id" \
        --id "$artifact_id" \
        -o "$png_path" 2>&1 | while IFS= read -r line; do echo "    $line"; done

    if [ ! -f "$png_path" ]; then
        echo -e "  ${RED}Download failed${NC}"
        ((FAILED++)) || true
        continue
    fi

    png_size=$(stat -f%z "$png_path" 2>/dev/null || stat -c%s "$png_path" 2>/dev/null)
    png_kb=$((png_size / 1024))
    echo "  PNG: ${png_kb}KB"

    # Convert to WebP if cwebp is available
    final_path="$png_path"
    hero_filename="infographic.png"
    if [ "$HAS_CWEBP" = true ]; then
        webp_path="$PUBLIC_ASSETS/$item_name/infographic.webp"
        cwebp -q 80 -resize 1024 0 "$png_path" -o "$webp_path" 2>/dev/null
        if [ -f "$webp_path" ]; then
            webp_size=$(stat -f%z "$webp_path" 2>/dev/null || stat -c%s "$webp_path" 2>/dev/null)
            webp_kb=$((webp_size / 1024))
            echo -e "  ${GREEN}WebP: ${webp_kb}KB (resized to 1024w)${NC}"
            rm "$png_path"
            final_path="$webp_path"
            hero_filename="infographic.webp"
        fi
    fi

    # Update frontmatter with heroImage (replace existing if present)
    cd "$REPO_ROOT"
    if grep -q "^heroImage:" "$item_file"; then
        sed -i '' "s|^heroImage:.*|heroImage: \"/notebook-assets/$item_name/$hero_filename\"|" "$item_file"
        echo -e "  ${GREEN}Replaced heroImage in frontmatter${NC}"
    else
        sed -i '' "/^date:/a\\
heroImage: \"/notebook-assets/$item_name/$hero_filename\"
" "$item_file"
        echo -e "  ${GREEN}Added heroImage to frontmatter${NC}"
    fi

    ((SUCCESS++)) || true

    # Rate limiting
    if [ $idx -lt $TOTAL ]; then
        echo "  Pausing 5 seconds..."
        sleep 5
    fi
done

echo
echo "=== Batch Infographic Generation Complete ==="
echo "Total:     $TOTAL"
echo -e "Success:   ${GREEN}$SUCCESS${NC}"
echo -e "Failed:    ${RED}$FAILED${NC}"
echo "Skipped:   $SKIPPED"
echo

if [ $SUCCESS -gt 0 ]; then
    echo -e "${GREEN}Infographics saved to: public/notebook-assets/*/infographic.{png,webp}${NC}"
    echo -e "${GREEN}Frontmatter updated with heroImage${NC}"
    echo
    echo "Next steps:"
    echo "1. Review generated infographics"
    echo "2. npm run build"
    echo "3. Commit and push"
fi
