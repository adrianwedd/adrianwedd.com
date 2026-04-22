#!/usr/bin/env bash
set -euo pipefail

# generate-all-videos.sh
# Batch generate NotebookLM cinematic video summaries for projects and blog posts.
# Uses the branded dark botanical aesthetic via --focus.
#
# Usage:
#   ./scripts/generate-all-videos.sh [--yes] [--limit N] [--blog] [--projects] [--all] [--focus "custom"]
#
# Pipeline: generate video → download MP4 → upload to R2 → update frontmatter with CDN URL
#
# Daily quota: ~20 video generations. 57 missing = 3-day run.
# Day 1: 20 projects. Day 2: 12 projects + 8 blog. Day 3: 17 blog.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NOTEBOOKLM_DIR="$REPO_ROOT/scripts/notebooklm"
PROJECTS_DIR="$REPO_ROOT/src/content/projects"
BLOG_DIR="$REPO_ROOT/src/content/blog"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

DEFAULT_FOCUS="Dark botanical aesthetic. Deep plum-tinted backgrounds (#1a181c to #2e2a34). Warm cream text (#e2ddd8) with dusty copper accents (#c48b6e). Moody earth tones, no bright or neon colours. Cinematic visual storytelling. Professional motion graphics with muted, saturated colour palette. WCAG AA contrast ratios. Minimal, sophisticated, Australian dark-mode design."

YES=false
LIMIT=0
FOCUS="$DEFAULT_FOCUS"
SCAN_PROJECTS=false
SCAN_BLOG=false
DRY_RUN=false
REGENERATE=false
SKIP_SLUGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y) YES=true; shift ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --focus) FOCUS="$2"; shift 2 ;;
        --projects) SCAN_PROJECTS=true; shift ;;
        --blog) SCAN_BLOG=true; shift ;;
        --all) SCAN_PROJECTS=true; SCAN_BLOG=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --regenerate) REGENERATE=true; shift ;;
        --skip) SKIP_SLUGS="$SKIP_SLUGS $2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

slug_skipped() {
    for s in $SKIP_SLUGS; do
        [ "$1" = "$s" ] && return 0
    done
    return 1
}

if [ "$SCAN_PROJECTS" = false ] && [ "$SCAN_BLOG" = false ]; then
    SCAN_PROJECTS=true
    SCAN_BLOG=true
fi

TOTAL=0
SUCCESS=0
SKIPPED=0
FAILED=0

CDN_BASE="https://cdn.adrianwedd.com/notebook-assets"
EXPORT_DIR="$REPO_ROOT/exports/videos"
mkdir -p "$EXPORT_DIR"

echo "=== NotebookLM Video Batch Generation ==="
echo "  Focus: ${FOCUS:0:60}..."
echo "  Export: $EXPORT_DIR"
echo

if ! command -v nlm &>/dev/null; then
    echo -e "${RED}Error: nlm CLI not found. Install: pip install notebooklm-mcp-cli${NC}"
    exit 1
fi

if ! nlm login --check &>/dev/null; then
    echo -e "${YELLOW}Warning: NotebookLM authentication may be expired${NC}"
    echo "Run: nlm login"
    if [ "$YES" = false ]; then
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
    fi
fi

ITEMS_NAME=()
ITEMS_FILE=()
ITEMS_TYPE=()

has_video() { grep -q "^videoUrl:" "$1"; }

if [ "$SCAN_PROJECTS" = true ]; then
    echo "Scanning projects..."
    for f in "$PROJECTS_DIR"/*.md; do
        name=$(basename "$f" .md)
        if grep -q "^draft: true" "$f"; then
            ((SKIPPED++)) || true
            continue
        fi
        if slug_skipped "$name"; then
            ((SKIPPED++)) || true
            continue
        fi
        # In normal mode: skip items that already have a video.
        # In regenerate mode: only process items that DO have a video (we're replacing them).
        if [ "$REGENERATE" = true ]; then
            has_video "$f" || { ((SKIPPED++)) || true; continue; }
        else
            if has_video "$f"; then ((SKIPPED++)) || true; continue; fi
        fi
        ITEMS_NAME+=("$name")
        ITEMS_FILE+=("$f")
        ITEMS_TYPE+=("project")
        ((TOTAL++)) || true
    done
fi

if [ "$SCAN_BLOG" = true ]; then
    echo "Scanning blog posts..."
    for f in "$BLOG_DIR"/*.md; do
        if grep -q "^draft: true" "$f"; then
            ((SKIPPED++)) || true
            continue
        fi
        if [ "$REGENERATE" = true ]; then
            has_video "$f" || { ((SKIPPED++)) || true; continue; }
        else
            if has_video "$f"; then ((SKIPPED++)) || true; continue; fi
        fi
        blog_name=$(basename "$f" .md | sed 's/-post$//')
        ITEMS_NAME+=("$blog_name")
        ITEMS_FILE+=("$f")
        ITEMS_TYPE+=("blog")
        ((TOTAL++)) || true
    done
fi

echo "Found $TOTAL items without video"
echo "Skipped $SKIPPED items with existing videoUrl or draft status"
echo

if [ $TOTAL -eq 0 ]; then
    echo "All items already have videos!"
    exit 0
fi

if [ "$LIMIT" -gt 0 ] && [ "$LIMIT" -lt "$TOTAL" ]; then
    echo -e "${YELLOW}Limiting to first $LIMIT items (of $TOTAL)${NC}"
    ITEMS_NAME=("${ITEMS_NAME[@]:0:$LIMIT}")
    ITEMS_FILE=("${ITEMS_FILE[@]:0:$LIMIT}")
    ITEMS_TYPE=("${ITEMS_TYPE[@]:0:$LIMIT}")
    TOTAL=$LIMIT
fi

echo "Will generate videos for:"
for i in "${!ITEMS_NAME[@]}"; do
    echo "  - [${ITEMS_TYPE[$i]}] ${ITEMS_NAME[$i]}"
done
echo

echo -e "${YELLOW}Estimated time: $(($TOTAL * 8)) minutes (avg 5-10 min per video)${NC}"
echo -e "${YELLOW}NotebookLM daily quota: ~20 video generations${NC}"
echo

if [ "$YES" = false ]; then
    read -p "Continue with batch generation? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}DRY RUN — showing sources that would be attached to each notebook${NC}"
    echo
    for i in "${!ITEMS_NAME[@]}"; do
        item_name="${ITEMS_NAME[$i]}"
        item_file="${ITEMS_FILE[$i]}"
        item_type="${ITEMS_TYPE[$i]}"

        echo "[$((i+1))/$TOTAL] $item_type: $item_name"
        echo "  • textfile:$item_file"

        if [ "$item_type" = "project" ]; then
            echo "  • https://adrianwedd.com/projects/$item_name/"
        else
            echo "  • https://adrianwedd.com/blog/$item_name/"
        fi

        if [ "$item_type" = "project" ]; then
            repo_raw=$(grep "^repo:" "$item_file" 2>/dev/null | head -1 | sed -E "s/^repo:[[:space:]]*['\"]?//; s/['\"]?[[:space:]]*\$//" || true)
            if [[ "$repo_raw" =~ ^https?://github\.com/([^/]+)/([^/]+)/?$ ]]; then
                repo_owner="${BASH_REMATCH[1]}"
                repo_name="${BASH_REMATCH[2]}"
            elif [ -n "$repo_raw" ]; then
                repo_owner="adrianwedd"
                repo_name="$repo_raw"
            else
                repo_owner=""; repo_name=""
            fi
            if [ -n "$repo_name" ]; then
                code=$(curl -sL "https://raw.githubusercontent.com/$repo_owner/$repo_name/main/README.md" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
                if [ "$code" != "200" ]; then
                    code=$(curl -sL "https://raw.githubusercontent.com/$repo_owner/$repo_name/master/README.md" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "000")
                fi
                if [ "$code" = "200" ]; then
                    echo "  • textfile: README from $repo_owner/$repo_name"
                else
                    echo "  • (README unavailable for $repo_owner/$repo_name — HTTP $code)"
                fi
            else
                echo "  • (no repo field — skipping README)"
            fi
        fi
        echo
    done
    exit 0
fi

echo "Fetching existing notebooks..."
NOTEBOOKS_JSON=$(nlm notebook list 2>/dev/null || echo "[]")

find_notebook_id() {
    local title_fragment="$1"
    echo "$NOTEBOOKS_JSON" | python3 -c "
import json, sys
notebooks = json.load(sys.stdin)
fragment = sys.argv[1].lower()
for n in notebooks:
    if fragment in n['title'].lower():
        print(n['id'])
        sys.exit(0)
" "$title_fragment" 2>/dev/null || echo ""
}

RESULTS_LOG="$EXPORT_DIR/batch-results.log"
: > "$RESULTS_LOG"

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

    notebook_id=$(find_notebook_id "$title")

    if [ -z "$notebook_id" ]; then
        echo "  Creating notebook..."

        # Build sources: markdown + public site URL + (for projects) GitHub repo README
        readme_tmp=""
        sources_json="\"textfile:$item_file\""

        if [ "$item_type" = "project" ]; then
            sources_json+=", \"https://adrianwedd.com/projects/$item_name/\""
        elif [ "$item_type" = "blog" ]; then
            sources_json+=", \"https://adrianwedd.com/blog/$item_name/\""
        fi

        if [ "$item_type" = "project" ]; then
            repo_raw=$(grep "^repo:" "$item_file" 2>/dev/null | head -1 | sed -E "s/^repo:[[:space:]]*['\"]?//; s/['\"]?[[:space:]]*\$//" || true)
            if [[ "$repo_raw" =~ ^https?://github\.com/([^/]+)/([^/]+)/?$ ]]; then
                repo_owner="${BASH_REMATCH[1]}"
                repo_name="${BASH_REMATCH[2]}"
            elif [ -n "$repo_raw" ]; then
                repo_owner="adrianwedd"
                repo_name="$repo_raw"
            else
                repo_owner=""
                repo_name=""
            fi

            if [ -n "$repo_name" ]; then
                readme_tmp=$(mktemp "$EXPORT_DIR/README-$item_name-XXXXXX")
                mv "$readme_tmp" "$readme_tmp.txt"
                readme_tmp="$readme_tmp.txt"
                if curl -sL "https://raw.githubusercontent.com/$repo_owner/$repo_name/main/README.md" -o "$readme_tmp" -f 2>/dev/null && [ -s "$readme_tmp" ]; then
                    echo "  Fetched README from $repo_owner/$repo_name (main)"
                    sources_json+=", \"textfile:$readme_tmp\""
                elif curl -sL "https://raw.githubusercontent.com/$repo_owner/$repo_name/master/README.md" -o "$readme_tmp" -f 2>/dev/null && [ -s "$readme_tmp" ]; then
                    echo "  Fetched README from $repo_owner/$repo_name (master)"
                    sources_json+=", \"textfile:$readme_tmp\""
                else
                    echo "  README fetch failed for $repo_owner/$repo_name (private or not found)"
                    rm -f "$readme_tmp"
                    readme_tmp=""
                fi
            fi
        fi

        echo "  Sources: $(echo "[$sources_json]" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))") total"

        cd "$NOTEBOOKLM_DIR"

        config_file=$(mktemp)
        cat > "$config_file" <<EOFCONFIG
{
  "title": "$title - Overview",
  "sources": [$sources_json],
  "studio": []
}
EOFCONFIG

        ./scripts/automate-notebook.sh --config "$config_file" --export /dev/null 2>&1 | tail -3 || true
        rm -f "$config_file"
        [ -n "$readme_tmp" ] && rm -f "$readme_tmp"
        cd "$REPO_ROOT"

        NOTEBOOKS_JSON=$(nlm notebook list 2>/dev/null || echo "[]")
        notebook_id=$(find_notebook_id "$title")

        if [ -z "$notebook_id" ]; then
            echo -e "  ${RED}Failed to create notebook for $item_name${NC}"
            echo "FAILED|$item_name|no notebook" >> "$RESULTS_LOG"
            ((FAILED++)) || true
            continue
        fi
    fi

    echo "  Notebook: $notebook_id"

    # Check for existing video to avoid duplicate generation
    existing_info=$(nlm studio status "$notebook_id" 2>/dev/null | python3 -c "
import json, sys
arts = json.load(sys.stdin)
videos = [a for a in arts if a.get('type') == 'video']
if videos:
    v = videos[-1]
    print(f\"{v.get('id', '')}|{v.get('status', '')}\")
" 2>/dev/null || echo "")
    existing_id="${existing_info%%|*}"
    existing_status="${existing_info##*|}"

    # Only delete completed/failed videos — leave in_progress alone.
    if [ "$REGENERATE" = true ] && [ -n "$existing_id" ] && [ "$existing_status" != "in_progress" ]; then
        echo "  Regenerate mode — deleting existing video ($existing_status)..."
        nlm studio delete "$notebook_id" "$existing_id" -y 2>&1 | tail -1 || true
        existing_status=""
    fi

    if [ "$existing_status" = "completed" ]; then
        echo "  Video already completed — skipping generation, will download"
    elif [ "$existing_status" = "in_progress" ]; then
        echo "  Video already in progress — skipping generation, will wait"
    else
        echo "  Generating cinematic video..."
        nlm video create "$notebook_id" \
            --format cinematic \
            --focus "$FOCUS" \
            -y 2>&1 | while IFS= read -r line; do echo "    $line"; done
    fi

    # Poll until status=completed (max ~45 min — cinematic videos run long)
    video_status=""
    poll_interval=20
    for attempt in $(seq 1 135); do
        sleep $poll_interval

        status_json=$(nlm studio status "$notebook_id" 2>/dev/null || echo "[]")
        video_status=$(echo "$status_json" | python3 -c "
import json, sys
arts = json.load(sys.stdin)
videos = [a for a in arts if a.get('type') == 'video']
if videos:
    print(videos[-1].get('status', ''))
" 2>/dev/null || echo "")

        if [ "$video_status" = "completed" ]; then
            echo -e "  ${GREEN}Video ready${NC}"
            break
        fi
        if [ "$video_status" = "failed" ]; then
            echo -e "  ${RED}Video generation failed${NC}"
            echo "FAILED|$item_name|generation failed" >> "$RESULTS_LOG"
            ((FAILED++)) || true
            break
        fi

        echo "    Waiting... ($attempt, status=${video_status:-pending})"
    done

    if [ "$video_status" != "completed" ]; then
        if [ "$video_status" != "failed" ]; then
            echo -e "  ${RED}Timed out waiting for video${NC}"
            echo "FAILED|$item_name|timeout" >> "$RESULTS_LOG"
            ((FAILED++)) || true
        fi
        continue
    fi

    # Download via nlm CLI (handles URL resolution internally)
    item_export="$EXPORT_DIR/$item_name"
    mkdir -p "$item_export"
    output_file="$item_export/video.mp4"

    echo "  Downloading via nlm..."
    if nlm download video "$notebook_id" -o "$output_file" --no-progress 2>&1 | tail -3; then
        if [ -s "$output_file" ]; then
            size=$(du -h "$output_file" | cut -f1)
            echo "  Downloaded: $output_file ($size)"
        else
            echo -e "  ${RED}Download produced empty file${NC}"
            echo "FAILED|$item_name|empty download" >> "$RESULTS_LOG"
            ((FAILED++)) || true
            continue
        fi
    else
        echo -e "  ${RED}Download failed${NC}"
        echo "FAILED|$item_name|download failed" >> "$RESULTS_LOG"
        ((FAILED++)) || true
        continue
    fi

    # Upload to R2
    echo "  Uploading to R2..."
    r2_key="notebook-assets/$item_name/video.mp4"
    upload_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X PUT \
        "https://api.cloudflare.com/client/v4/accounts/eb44f406e11df8adec20cc1e7b66f151/r2/buckets/adrianwedd-com-media/objects/${r2_key}" \
        -H "Authorization: Bearer ${CF_R2_API_TOKEN:-$(grep CF_R2_API_TOKEN "$REPO_ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2)}" \
        -H "Content-Type: video/mp4" \
        --data-binary "@${output_file}" \
        --max-time 600)

    if [ "$upload_code" = "200" ]; then
        echo -e "  ${GREEN}Uploaded to R2: $r2_key${NC}"
    else
        echo -e "  ${RED}R2 upload failed (HTTP $upload_code)${NC}"
        echo "FAILED|$item_name|r2 upload $upload_code" >> "$RESULTS_LOG"
        ((FAILED++)) || true
        continue
    fi

    # Update frontmatter
    cdn_url="$CDN_BASE/$item_name/video.mp4"
    if grep -q "^videoUrl:" "$item_file"; then
        sed -i '' "s|^videoUrl:.*|videoUrl: '$cdn_url'|" "$item_file"
    else
        # Insert videoUrl after audioUrl, or after heroImage, or after date
        if grep -q "^audioUrl:" "$item_file"; then
            sed -i '' "/^audioUrl:/a\\
videoUrl: '$cdn_url'" "$item_file"
        elif grep -q "^heroImage:" "$item_file"; then
            sed -i '' "/^heroImage:/a\\
videoUrl: '$cdn_url'" "$item_file"
        else
            sed -i '' "/^date:/a\\
videoUrl: '$cdn_url'" "$item_file"
        fi
    fi

    echo -e "  ${GREEN}Updated frontmatter: videoUrl${NC}"
    echo "SUCCESS|$item_name|$cdn_url" >> "$RESULTS_LOG"
    ((SUCCESS++)) || true
done

echo
echo "=== Video Generation Complete ==="
echo -e "  ${GREEN}Success: $SUCCESS${NC}"
echo -e "  ${RED}Failed:  $FAILED${NC}"
echo "  Skipped: $SKIPPED"
echo "  Results: $RESULTS_LOG"

if [ $SUCCESS -gt 0 ]; then
    echo
    echo "Next steps:"
    echo "  1. Review generated videos in $EXPORT_DIR"
    echo "  2. Commit frontmatter updates: git add src/content/ && git commit -m 'content: add video URLs'"
    echo "  3. Clean up exports: rm -rf $EXPORT_DIR"
fi
